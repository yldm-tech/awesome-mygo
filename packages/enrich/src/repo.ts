import { join } from 'node:path';
import { github, rawFile, rawUrl as rawRepoUrl } from './github.ts';
import { downloadImage, fetchImage, isDefaultIcon, writeIcon, writeShot } from './image.ts';
import { iconOf, isArtwork, parseMygoConfig, pickMygoConfig, repoIcons } from './source.ts';

// What the completing script (main.ts) and the check of listed entries (verify.ts) read from a project's repository, and the images they take from it, by the same rules: the app's own icon, and the first image of a list of sources that is a screenshot.

const ROOT = join(import.meta.dirname, '../../..');
const PUBLIC = 'apps/web/public';

export interface RepoFacts {
	repo: string;
	branch: string;
	paths: string[];
	readme?: { path: string; text: string };
	// The MyGo configuration, mygo.json or mygo.config.ts, with the fields read from it.
	mygo?: { path: string; text: string; json: unknown };
	// The homepage in the repository's settings.
	homepage?: string | null;
	// The repository's social preview: the image its owner set, or else the card GitHub draws of its name, description and owner.
	preview?: { url: string; custom: boolean };
}

// note: where a problem worth reporting goes, such as a MyGo configuration that is not valid JSON.
export async function repoFacts(repo: string, note: (line: string) => void): Promise<RepoFacts | undefined> {
	const info = await github<{ default_branch: string; private: boolean; homepage: string | null }>(`/repos/${repo}`);
	if (!info) return undefined;
	const branch = info.default_branch;
	const tree = await github<{ tree: { path: string; type: string }[]; truncated: boolean }>(`/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
	const paths = (tree?.tree ?? []).filter((t) => t.type === 'blob').map((t) => t.path);
	const facts: RepoFacts = { repo, branch, paths, homepage: info.homepage };
	const readme = await github<{ path: string; content: string; encoding: string }>(`/repos/${repo}/readme`);
	if (readme?.encoding === 'base64') facts.readme = { path: readme.path, text: Buffer.from(readme.content, 'base64').toString('utf8') };
	const og = await github<{ data?: { repository: { openGraphImageUrl: string; usesCustomOpenGraphImage: boolean } | null } }>('/graphql', { method: 'POST', body: { query: 'query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { openGraphImageUrl usesCustomOpenGraphImage } }', variables: { owner: repo.split('/')[0], name: repo.split('/')[1] } } }).catch(() => undefined);
	const preview = og?.data?.repository;
	if (preview?.openGraphImageUrl) facts.preview = { url: preview.openGraphImageUrl, custom: preview.usesCustomOpenGraphImage };
	const mygoPath = pickMygoConfig(paths);
	if (mygoPath) {
		const text = await rawFile(repo, branch, mygoPath);
		if (text !== undefined) {
			try {
				facts.mygo = { path: mygoPath, text, json: parseMygoConfig(mygoPath, text) };
			} catch {
				note(`- \`${mygoPath}\` is not valid JSON, so its icon could not be read.`);
			}
		}
	}
	return facts;
}

// The file names of the repository's latest release, prereleases included, as the platforms it ships for (a .dmg, a windows-amd64 archive, a .deb); empty when it has no release. Read only when an app's platforms are picked, so the check of listed entries (verify.ts) does not pay a request per entry for it.
export async function latestReleaseAssets(repo: string): Promise<string[]> {
	const releases = await github<{ tag_name: string; assets: { name: string }[] }[]>(`/repos/${repo}/releases?per_page=1`);
	return releases?.[0]?.assets.map((a) => a.name) ?? [];
}

export const rawUrl = (facts: RepoFacts, path: string) => rawRepoUrl(facts.repo, facts.branch, path);

// Where the app's own icon is: where MyGo takes it from, or, without a MyGo configuration to name it (as in a repository that keeps MyGo as a submodule), an icon file where projects usually keep one (guessed); why there is none otherwise.
export function iconSource(facts: RepoFacts): { path: string; url: string; guessed: boolean } | { why: string } {
	const configured = facts.mygo ? iconOf(facts.mygo.path, facts.mygo.json, facts.paths) : undefined;
	if (configured && !('macOnly' in configured)) return { path: configured.path, url: rawUrl(facts, configured.path), guessed: false };
	const found = repoIcons(facts.paths)[0];
	if (found) return { path: found, url: rawUrl(facts, found), guessed: true };
	if (!facts.mygo) return { why: 'the repository has neither a MyGo configuration (mygo.json or mygo.config.ts) nor an icon file where projects usually keep one' };
	if (!configured) return { why: `neither \`${facts.mygo.path}\` nor resources/ beside it has an icon` };
	return { why: `the app's only icon is \`${configured.macOnly}\` (macos.icon), which cannot be converted here` };
}

// The app's own icon (iconSource), written as the app's icon file. Returns the file it came from when there was one, so the screenshot search can pass over the same image, and why there is none otherwise.
export async function ownIcon(slug: string, facts: RepoFacts): Promise<{ path: string; url: string; guessed: boolean } | { why: string; url?: string }> {
	const src = iconSource(facts);
	if ('why' in src) return src;
	const url = src.url;
	const img = await downloadImage(url);
	if (!img) return { why: `\`${src.path}\` could not be downloaded as a supported raster image under 10 MB` };
	if (await isDefaultIcon(img)) return { why: `\`${src.path}\` is MyGo's default icon (as \`mygo init\` leaves it)`, url };
	if (!(await writeIcon(img, join(ROOT, PUBLIC, 'icons', `${slug}.webp`)))) return { why: `\`${src.path}\` is smaller than 128 px`, url };
	return src;
}

// Where a screenshot may come from: its links in order, how many of them to try, and whether someone picked it (a visitor's link, the repository's social preview), so it is taken as it is, while the repository's own images may be artwork.
export interface ShotSource {
	from: string;
	urls: string[];
	tries: number;
	picked: boolean;
}

// Writes the first image of the sources that is a screenshot as out, and says which it was. Each source gets its own number of tries, so a README full of badges does not use up the next source's turn. tried and skipped are the caller's, for its report: the links looked at, and why each image passed over was not taken.
export async function firstShot(sources: readonly ShotSource[], out: string, iconUrl: string | undefined, tried: string[], skipped: string[]): Promise<{ url: string; from: string } | undefined> {
	for (const source of sources) {
		let n = 0;
		for (const url of source.urls) {
			if (tried.includes(url)) continue;
			tried.push(url);
			if (url === iconUrl) {
				skipped.push(`${url} (the app icon)`);
				continue;
			}
			if (!source.picked && isArtwork(url)) {
				skipped.push(`${url} (named as artwork, not a screenshot)`);
				continue;
			}
			const img = await fetchImage(url);
			const result = typeof img === 'string' ? img : await writeShot(img, out);
			if (result === 'ok') return { url, from: source.from };
			skipped.push(`${url} (${result === 'square' ? 'square, likely a logo' : result === 'narrow' ? 'under 600 px wide' : result === 'portrait' ? 'taller than wide' : result === 'banner' ? 'a banner, far wider than a window' : result})`);
			if (++n >= source.tries) break;
		}
	}
	return undefined;
}
