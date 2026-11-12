import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DIST_OSES, type DistOs, type DistributionFile } from '../../catalog/src/dist.ts';
import { scoreTarget } from '../../catalog/src/score.ts';
import { type CheckItem, type GraphqlAnswer, type PlannedApp, RECHECK_DAYS, RELEASE_BATCH_SIZE, type ReleaseAnswer, TAURI_MANIFEST, TAURI_MANIFEST_LIMIT, buildReleaseQuery, parseReleases, planDistribution, tauriOses } from './dist-assets.ts';
import { github, request } from './github.ts';
import { NOT_FOUND_LIMIT, NOT_FOUND_MIN } from './signals.ts';
import { ENTRY_DIRS, type Entry } from './source.ts';

// The plan step of .github/workflows/distribution.yml, run on Linux before the macOS and Windows runners check any file. It reads the latest GitHub release of every app with a repository (its repo field, or its link when that is a repository, as scoreTarget resolves it) and writes PLAN_FILE: the record each app will have in packages/catalog/data/distribution.json, with the formats each system is offered and how it updates itself (dist-assets.ts), and the files the runners are to check. A system's check from the last run is carried over when it is of the same file and younger than RECHECK_DAYS days; otherwise the file is queued, and the merge step (distribution-merge.ts) puts the runners' results into the records.
//
// A repository's latest release is read, or when it has none its newest published prerelease. A repository GitHub does not find gets no record and is listed in the report; any other GraphQL error, or more than a fifth of the repositories not found (a token that cannot read public repositories), throws before anything is written.
//
// Environment: GITHUB_TOKEN (any token that reads public repositories), PLAN_FILE (required: where the plan is written), REPORT_FILE (this step's part of the run's Markdown summary), FULL=true to check every file again however recent its last check, ONLY (space-separated app slugs: plan only these and keep every other record of the current file as it is), MAX_CHECKS (the most files queued for checking, 0 or unset for no limit; the report names those left for a later run).

const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = join(ROOT, 'packages/catalog/data');
const DISTRIBUTION_FILE = join(DATA_DIR, 'distribution.json');

const env = process.env;
const FULL = env.FULL === 'true';
const ONLY = (env.ONLY ?? '').split(/\s+/).filter(Boolean);
const MAX_CHECKS = Number(env.MAX_CHECKS || 0);
const asOf = new Date().toISOString().slice(0, 10);

const report: string[] = [];
const say = (line: string): void => {
	report.push(line);
	console.log(line);
};
const list = (keys: readonly string[]) => keys.join(', ') || 'none';

interface CatalogApp {
	key: string;
	slug: string;
	repo?: string;
	platforms: DistOs[];
}

// Every app of data/apps/*.json, by its key, with its repository when it has one and the systems it lists as its platforms.
async function catalogApps(): Promise<CatalogApp[]> {
	const dir = join(DATA_DIR, ENTRY_DIRS.app);
	const out: CatalogApp[] = [];
	for (const name of (await readdir(dir)).sort()) {
		if (!name.endsWith('.json')) continue;
		const e = JSON.parse(await readFile(join(dir, name), 'utf8')) as Entry;
		const slug = String(e.slug);
		const { repo } = scoreTarget({ repo: typeof e.repo === 'string' ? e.repo : undefined, url: typeof e.url === 'string' ? e.url : undefined });
		const listed = Array.isArray(e.platforms) ? (e.platforms as unknown[]) : [];
		const platforms = DIST_OSES.filter((os) => listed.includes(os));
		out.push(repo ? { key: `app:${slug}`, slug, repo, platforms } : { key: `app:${slug}`, slug, platforms });
	}
	return out;
}

// The systems each release's latest.json serves as Tauri's updater manifest, by the repository asked, lowercase: the file is read, without a token, as its name alone proves nothing (tauriOses). A file larger than TAURI_MANIFEST_LIMIT is no Tauri manifest. Throws when GitHub cannot serve a file it lists, so that a run never records an updater it could not read.
async function tauriManifests(releases: ReadonlyMap<string, ReleaseAnswer>): Promise<Map<string, ReadonlySet<DistOs>>> {
	const out = new Map<string, ReadonlySet<DistOs>>();
	for (const [repo, answer] of releases) {
		const manifest = answer.release?.assets.find((a) => a.name.toLowerCase() === TAURI_MANIFEST);
		if (!manifest || manifest.size > TAURI_MANIFEST_LIMIT) continue;
		const res = await request(manifest.url, {});
		if (!res.ok) throw new Error(`downloading ${repo}'s ${manifest.name} answered ${res.status}`);
		const oses = tauriOses(await res.text());
		if (oses.size) out.set(repo, oses);
	}
	return out;
}

// The current distribution.json, or an empty one before the workflow first wrote it.
async function currentFile(): Promise<DistributionFile> {
	try {
		const file = JSON.parse(await readFile(DISTRIBUTION_FILE, 'utf8')) as DistributionFile;
		return { asOf: file.asOf, entries: file.entries };
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { asOf: null, entries: {} };
		throw err;
	}
}

const count = (items: readonly CheckItem[], os: 'mac' | 'win') => items.filter((c) => c.os === os).length;
const mib = (bytes: number) => `${Math.round(bytes / 1024 ** 2)} MiB`;

async function main(): Promise<void> {
	if (!env.PLAN_FILE) throw new Error('PLAN_FILE is not set');
	if (!Number.isInteger(MAX_CHECKS) || MAX_CHECKS < 0) throw new Error(`MAX_CHECKS must be a whole number, not ${env.MAX_CHECKS}`);
	say(`## Plan distribution as of ${asOf}${FULL ? ' (FULL=true)' : ''}\n`);
	const prev = await currentFile();
	const apps = await catalogApps();
	const unknown = ONLY.filter((slug) => !apps.some((a) => a.slug === slug));
	if (unknown.length) throw new Error(`ONLY names apps the catalog does not have: ${unknown.join(', ')}`);
	const only = new Set(ONLY.map((slug) => `app:${slug}`));
	const planned: PlannedApp[] = apps.flatMap((a) => (a.repo && (!only.size || only.has(a.key)) ? [{ key: a.key, repo: a.repo, platforms: a.platforms }] : []));
	const keep = only.size ? Object.fromEntries(Object.entries(prev.entries).filter(([key]) => !only.has(key))) : {};
	const repos = [...new Map(planned.map((a) => [a.repo.toLowerCase(), a.repo])).values()].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1));
	say(`The catalog lists ${apps.length} apps, ${apps.filter((a) => a.repo).length} with a GitHub repository. This run plans ${planned.length} of them${only.size ? ` (ONLY: ${ONLY.join(' ')}) and keeps the other ${Object.keys(keep).length} records as they are` : ''}, in ${repos.length} repositories.\n`);

	const releases = new Map<string, ReleaseAnswer>();
	const notFoundRepos: string[] = [];
	let requests = 0;
	for (let i = 0; i < repos.length; i += RELEASE_BATCH_SIZE) {
		const batch = repos.slice(i, i + RELEASE_BATCH_SIZE);
		requests++;
		const answer = await github<GraphqlAnswer>('/graphql', { method: 'POST', body: { query: buildReleaseQuery(batch) } });
		if (!answer) throw new Error('GitHub GraphQL answered 404');
		const part = parseReleases(batch, answer);
		for (const [k, v] of part.found) releases.set(k, v);
		notFoundRepos.push(...part.notFound);
	}
	say(`Read the releases in ${requests} GraphQL requests.\n`);
	if (notFoundRepos.length > NOT_FOUND_MIN && notFoundRepos.length > repos.length * NOT_FOUND_LIMIT) throw new Error(`GitHub did not find ${notFoundRepos.length} of the ${repos.length} repositories (${notFoundRepos.join(', ')}), more than ${NOT_FOUND_LIMIT * 100}%: is the token able to read public repositories?`);

	const tauri = await tauriManifests(releases);
	say(`Read ${[...releases.values()].filter((a) => a.release?.assets.some((x) => x.name.toLowerCase() === TAURI_MANIFEST)).length} latest.json files, ${tauri.size} of them Tauri's updater manifest.\n`);

	const result = planDistribution({ asOf, apps: planned, releases, tauri, prev, keep, full: FULL, maxChecks: MAX_CHECKS });
	const { plan } = result;
	const planKeys = Object.keys(plan.entries).filter((key) => !Object.hasOwn(keep, key));
	const systems = (os: 'mac' | 'win' | 'linux') => planKeys.filter((key) => plan.entries[key][os]).length;
	say(`### Records (${planKeys.length})\n`);
	say(`${planKeys.length} apps have a release that offers a system something: macOS ${systems('mac')}, Windows ${systems('win')}, Linux ${systems('linux')}${planKeys.some((key) => plan.entries[key].prerelease) ? `; ${planKeys.filter((key) => plan.entries[key].prerelease).length} only have prereleases, the newest of which is read` : ''}.\n`);

	say(`### Checks\n`);
	say(`Queued ${plan.checks.length} files: ${count(plan.checks, 'mac')} for macOS, ${count(plan.checks, 'win')} for Windows. Carried over ${result.carried.length} checks of the same files younger than ${RECHECK_DAYS} days.\n`);
	if (result.deferred.length) say(`MAX_CHECKS=${MAX_CHECKS} left ${result.deferred.length} files for a later run (a file checked before keeps that check): ${result.deferred.map((c) => `${c.key} ${c.os}`).join(', ')}.\n`);
	if (result.oversized.length) say(`Too big to check (over 1 GiB): ${result.oversized.map((c) => `${c.key} ${c.os} ${c.file} (${mib(c.size)})`).join(', ')}.\n`);

	const fix: string[] = [];
	for (const key of result.notFound) {
		const repo = planned.find((a) => a.key === key)?.repo;
		console.log(`::warning::${key}: GitHub does not find ${repo}`);
		fix.push(`- ${key}: GitHub does not find ${repo}, so it has no record: deleted, made private, or renamed?`);
	}
	for (const r of result.renamed) fix.push(`- ${r.key}: ${r.repo} is now ${r.now}; update the entry's repository.`);
	for (const t of result.truncated) fix.push(`- ${t.key}: release ${t.tag} has ${t.total} files, of which only the first 100 were read.`);
	for (const o of result.otherSystems) fix.push(`- ${o.key}: the release also offers ${o.oses.join(', ')}, which the entry's platforms do not list, so the record leaves ${o.oses.length > 1 ? 'them' : 'it'} out; add ${o.oses.length > 1 ? 'them' : 'it'} to the entry if ${o.oses.length > 1 ? 'they are' : 'it is'} the app's own build.`);
	say(`### To look at (${fix.length})\n\n${fix.join('\n') || 'None.'}\n`);
	say(`Without a published release (${result.noRelease.length}): ${list(result.noRelease)}.\n`);
	say(`With a release that offers no system anything (${result.noSystem.length}): ${list(result.noSystem)}.\n`);

	await writeFile(env.PLAN_FILE, `${JSON.stringify(plan, null, '\t')}\n`);
	say(`Wrote the plan to ${env.PLAN_FILE}.`);
}

try {
	await main();
} catch (err) {
	say(`### Failed\n\n${err instanceof Error ? err.message : String(err)}\n\nNo plan was written; the next run tries again.`);
	throw err;
} finally {
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${report.join('\n')}\n`);
}
