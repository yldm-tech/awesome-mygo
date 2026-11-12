// What the distribution workflow's plan step (distribution.ts) decides about an app's latest GitHub release, without touching the network: which system and format each file of the release is, told by its name alone; how the app updates itself on each system; which file the macOS and Windows runners check; the GraphQL that reads the releases and how its answer is read; and which checks a run queues and which it carries over from the last run. Pure functions, so they are tested on their own (dist-assets.test.ts) against real asset names.

import { DIST_CHECK_FORMATS, DIST_FORMATS, DIST_OSES, DIST_UPDATERS, type DistCheck, type DistFormat, type DistOs, type DistPlatform, type DistRecord, type DistUpdater, type DistributionFile } from '../../catalog/src/dist.ts';

const DAY = 86_400_000;

// ---- one file of a release ----

// The processor a file is built for, as the release names it: amd64 (also x64, x86_64, intel), arm64 (also aarch64, apple-silicon), universal (a macOS build for both) or 386 (32-bit x86).
export type Arch = 'amd64' | 'arm64' | 'universal' | '386';

// What a file of a release is for: a system, one of that system's formats, and the processor when its name says.
export interface AssetClass {
	os: DistOs;
	format: DistFormat;
	arch?: Arch;
}

const OS_TOKENS: Record<string, DistOs> = { darwin: 'mac', macos: 'mac', mac: 'mac', osx: 'mac', apple: 'mac', applesilicon: 'mac', windows: 'win', win: 'win', win32: 'win', win64: 'win', linux: 'linux' };
// win32 is no processor: Node's 'win32-x64' is Windows on amd64.
const ARCH_TOKENS: Record<string, Arch> = { amd64: 'amd64', x64: 'amd64', x8664: 'amd64', intel: 'amd64', win64: 'amd64', arm64: 'arm64', aarch64: 'arm64', applesilicon: 'arm64', universal: 'universal', '386': '386', x86: '386', i386: '386', i686: '386' };
// Tokens of a file that is not the app for a desktop system: its source, firmware for a device, a browser extension, debug symbols, a list of checksums ('SHA256SUMS-linux-amd64').
const SKIP_TOKENS = new Set(['source', 'src', 'firmware', 'esp32', 'xcarchive', 'extension', 'dsym', 'symbols', 'pdb', 'sha256sums', 'sha512sums', 'checksums', 'sums', 'sbom']);
// Tokens of a mobile build, which is skipped unless the name also names a desktop system, as an app called android-tools built for Windows does.
const MOBILE_TOKENS = new Set(['ios', 'android']);
// Tokens of an Android package built per processor, which shares the .apk extension and x86_64 with an Alpine package ('app-x86_64-release.apk').
const ANDROID_APK_TOKENS = new Set(['release', 'debug', 'armeabi', 'v7a', 'v8a', 'android']);
// Executables a release bundles beside the app, and helpers that are not the app: never the file a Windows user installs.
const HELPER_TOKENS = new Set(['ffmpeg', 'ffprobe', 'dlp', 'migrate']);
const SETUP_TOKENS = new Set(['setup', 'installer', 'install']);
// Tokens of a build of another program than the app a release may ship beside it: its command-line tool, its server, a daemon or a relay ('gotrust-cli_0.6.0_windows_amd64.zip' beside 'gotrust_0.6.0_windows_amd64.zip', 'kero-server-2.1.35-windows-amd64.zip'). Such a file stands for a system only when the release offers that system nothing else; a token that is part of the repository's own name is no variant ('lark-server' of a repository named so).
const VARIANT_TOKENS = new Set(['cli', 'server', 'daemon', 'headless', 'relay', 'gateway']);

// The tokens of a repository's name (owner/name), which a variant token or an extra word of a file name is not.
export function repoTokens(repo: string): ReadonlySet<string> {
	return new Set(nameTokens(repo.split('/').pop() ?? ''));
}

// Whether a file is a build of a variant of the app (VARIANT_TOKENS), for a repository whose name has the tokens own.
export function isVariant(name: string, own: ReadonlySet<string> = new Set()): boolean {
	return nameTokens(name).some((t) => VARIANT_TOKENS.has(t) && !own.has(t));
}

// The tokens of a file name, lowercase, split on dashes, underscores, dots, spaces and brackets, never raw substrings: 'darwin' inside another word or 'win' inside 'twin' is no token. x86_64 and apple-silicon are kept whole first, as their parts would read as other tokens.
export function nameTokens(name: string): string[] {
	const lower = name.toLowerCase().replace(/x86[-_]64/g, 'x8664').replace(/apple[-_ ]silicon/g, 'applesilicon');
	return lower.split(/[-_.\s+()[\]]+/).filter(Boolean);
}

// The system a name's tokens name, the last one when several do: the app's own name comes first and may contain one ('mac-cleaner-1.0-windows-x64.zip').
function osOf(tokens: readonly string[]): DistOs | undefined {
	const t = tokens.findLast((x) => Object.hasOwn(OS_TOKENS, x));
	return t === undefined ? undefined : OS_TOKENS[t];
}

// The processor a name's tokens name, the last one, for the same reason ('universal-s3-gui_0.13.2_arm64.deb').
function archOf(tokens: readonly string[]): Arch | undefined {
	const t = tokens.findLast((x) => Object.hasOwn(ARCH_TOKENS, x));
	return t === undefined ? undefined : ARCH_TOKENS[t];
}

// Whether a name says it is an installer: a token setup, installer or install (electron-builder's 'Althea.Setup.1.0.0.exe', where GitHub turned the spaces into dots, Tauri's '_x64-setup.exe'), or a word ending in Setup or Installer written in camel case ('MyAppSetup.exe').
function isSetup(name: string, tokens: readonly string[]): boolean {
	return tokens.some((t) => SETUP_TOKENS.has(t)) || /[a-z0-9](Setup|Installer)(?=[-_.\s]|$)/.test(name);
}

// Files that are never a format: checksums and signatures, update metadata (read by releaseUpdaters instead), notes, licenses, Python wheels and electron-builder's block maps.
const SKIP_NAME = /(\.(sha\d*|sha\d+sum|md5|sig|asc|minisig|pem|crt|cert|sbom|blockmap|txt|md|json|ya?ml|xml|whl|ipa|log|html?|pdf|png|jpe?g|svg|gif|webp|ico|icns|bundle|intoto\.jsonl|jsonl|delta)$|^(sha\d+sums?|checksums?|license|licence|readme|changelog|notice)(\.|$))/i;

// The extension of a file whose name has one, among those classifyAsset knows, longest first, so that '.pkg.tar.zst' is an Arch Linux package rather than a macOS installer and '.app.zip' a zipped app bundle.
const EXTENSIONS = ['.pkg.tar.zst', '.pkg.tar.xz', '.app.zip', '.app.tar.gz', '.tar.gz', '.tar.xz', '.tar.zst', '.tar.bz2', '.tgz', '.zip', '.dmg', '.pkg', '.msi', '.msixbundle', '.appxbundle', '.msix', '.appx', '.exe', '.deb', '.rpm', '.appimage', '.flatpak', '.snap', '.apk', '.sh', '.ps1'] as const;
type Extension = (typeof EXTENSIONS)[number];

function extensionOf(lower: string): Extension | undefined {
	return EXTENSIONS.find((ext) => lower.endsWith(ext));
}

// Whether a name without a known extension ends in no extension at all, as a Go binary's 'tool-1.2.3-darwin-arm64' does: its last dot part, when there is one, is a version, a system or a processor, not a file type.
function looksExtensionless(lower: string): boolean {
	const dot = lower.lastIndexOf('.');
	if (dot < 0) return true;
	const last = lower.slice(dot + 1);
	return !/^[a-z][a-z0-9]{0,9}$/.test(last) || Object.hasOwn(OS_TOKENS, last) || Object.hasOwn(ARCH_TOKENS, last);
}

const TARBALLS = new Set<Extension>(['.tar.gz', '.tar.xz', '.tar.zst', '.tar.bz2', '.tgz']);

// Whether a name names two systems after its first version or processor token, as a helper built on one system for another does ('mutagen-0.18.1-chisa.2-windows-amd64-linux-amd64.zip'). A system named before it is the app's own name ('mac-cleaner-1.0-windows-x64.zip').
function namesTwoSystems(tokens: readonly string[]): boolean {
	const from = tokens.findIndex((t) => /^v?\d/.test(t) || Object.hasOwn(ARCH_TOKENS, t));
	if (from < 0) return false;
	return new Set(tokens.slice(from).flatMap((t) => (Object.hasOwn(OS_TOKENS, t) ? [OS_TOKENS[t]] : []))).size > 1;
}

// What one file of a release is, by its name alone, or undefined for a file that is no app for a desktop system or whose system the name does not tell, or that names two. install.sh is left to classifyRelease, as whether it installs on macOS, Linux or both depends on the rest of the release. A name that says unsigned, self-signed or notarized proves nothing: the checks measure signing.
export function classifyAsset(name: string): AssetClass | undefined {
	const lower = name.toLowerCase();
	if (SKIP_NAME.test(lower)) return undefined;
	const tokens = nameTokens(name);
	const os = osOf(tokens);
	if (tokens.some((t) => SKIP_TOKENS.has(t)) || (!os && tokens.some((t) => MOBILE_TOKENS.has(t))) || namesTwoSystems(tokens)) return undefined;
	const arch = archOf(tokens);
	const at = (o: DistOs, format: DistFormat): AssetClass => (arch ? { os: o, format, arch } : { os: o, format });
	const ext = extensionOf(lower);
	switch (ext) {
		case '.pkg.tar.zst':
		case '.pkg.tar.xz':
			return at('linux', 'arch');
		case '.app.zip':
			return at('mac', 'zip');
		case '.app.tar.gz':
			return at('mac', 'tar.gz');
		case '.dmg':
			return at('mac', 'dmg');
		case '.pkg':
			return at('mac', 'pkg');
		case '.msi':
			return at('win', 'msi');
		case '.msix':
		case '.msixbundle':
		case '.appx':
		case '.appxbundle':
			return at('win', 'msix');
		case '.exe':
			if (tokens.some((t) => HELPER_TOKENS.has(t))) return undefined;
			return at('win', isSetup(name, tokens) ? 'setup' : 'exe');
		case '.deb':
			return at('linux', 'deb');
		case '.rpm':
			return at('linux', 'rpm');
		case '.appimage':
			return at('linux', 'AppImage');
		case '.flatpak':
			return at('linux', 'flatpak');
		case '.snap':
			return at('linux', 'snap');
		// An Alpine package has a -r<n> release suffix or names its processor as Alpine does; any other .apk is an Android app.
		case '.apk':
			return (/-r\d+\.apk$/.test(lower) || /x86[-_]64|aarch64/.test(lower)) && !tokens.some((t) => ANDROID_APK_TOKENS.has(t)) ? at('linux', 'apk') : undefined;
		case '.ps1':
			return lower === 'install.ps1' ? { os: 'win', format: 'install.ps1' } : undefined;
		// install.sh itself is placed by classifyRelease; a script that names its system and says it installs is that system's ('install-linux-amd64.sh'). Other scripts install a server or a helper, not the app.
		case '.sh':
			return lower !== 'install.sh' && tokens.includes('install') && (os === 'mac' || os === 'linux') ? { os, format: 'install.sh' } : undefined;
		case '.zip':
			// Linux has no zip format: an archive of a Linux build counts as its tarball would.
			if (!os) return undefined;
			return at(os, os === 'linux' ? 'tar.gz' : 'zip');
		case undefined:
			// A bare binary: Windows has none, as its executables end in .exe.
			if (!looksExtensionless(lower) || (os !== 'mac' && os !== 'linux')) return undefined;
			return at(os, 'binary');
		default:
			if (TARBALLS.has(ext) && os) return at(os, 'tar.gz');
			return undefined;
	}
}

// ---- a whole release ----

// A file of a release as the plan step reads it: GitHub's id of the asset, its name, size in bytes and download link.
export interface ReleaseAsset {
	id: number;
	name: string;
	size: number;
	url: string;
}

export interface ClassifiedAsset extends AssetClass {
	asset: ReleaseAsset;
}

// MyGo's update manifests (update-<goos>-<arch>.json) and delta updates (<name>-<from>-to-<to>-<goos>-<arch>.delta), by the system they are for.
const GOOS: Record<string, DistOs> = { darwin: 'mac', windows: 'win', linux: 'linux' };
const MANIFEST = /^update-(darwin|windows|linux)-[a-z0-9_]+\.json$/i;

function manifestOs(name: string): DistOs | undefined {
	const m = MANIFEST.exec(name);
	return m ? GOOS[m[1].toLowerCase()] : undefined;
}

// A zip whose name names no system ('pitstop-x64.zip'), with its processor when the name says, or undefined for any other file.
function systemlessZip(name: string): { arch?: Arch } | undefined {
	const lower = name.toLowerCase();
	if (!lower.endsWith('.zip') || lower.endsWith('.app.zip') || SKIP_NAME.test(lower)) return undefined;
	const tokens = nameTokens(name);
	if (osOf(tokens) || tokens.some((t) => SKIP_TOKENS.has(t) || MOBILE_TOKENS.has(t))) return undefined;
	const arch = archOf(tokens);
	return arch ? { arch } : {};
}

// Every file of a release that is a format of a system. Two kinds of file are placed by the rest of the release. A zip that names no system is Windows's when the release's other files are for Windows and none for macOS, as a release of a Windows app alone ships portable zips named after the processor only; otherwise it is left out rather than guessed, as electron-builder's macOS zip beside a disk image is named the same way. install.sh is macOS's and Linux's when the release also has MyGo's update manifest or archive for that system, as MyGo's install script serves both; with neither, Linux's alone when the release has other Linux files.
export function classifyRelease(assets: readonly ReleaseAsset[]): ClassifiedAsset[] {
	const out: ClassifiedAsset[] = [];
	const zips: ClassifiedAsset[] = [];
	for (const asset of assets) {
		const c = classifyAsset(asset.name);
		if (c) out.push({ ...c, asset });
		const zip = c ? undefined : systemlessZip(asset.name);
		if (zip) zips.push({ os: 'win', format: 'zip', ...zip, asset });
	}
	if (out.some((c) => c.os === 'win') && !out.some((c) => c.os === 'mac')) out.push(...zips);
	const script = assets.find((a) => a.name.toLowerCase() === 'install.sh');
	if (script) {
		const served = (os: DistOs) => assets.some((a) => manifestOs(a.name) === os) || out.some((c) => c.os === os && c.format === 'tar.gz');
		const mac = served('mac');
		const linux = served('linux');
		if (mac) out.push({ os: 'mac', format: 'install.sh', asset: script });
		if (linux || (!mac && out.some((c) => c.os === 'linux'))) out.push({ os: 'linux', format: 'install.sh', asset: script });
	}
	return out;
}

// The name of Tauri's updater manifest among a release's files, which the plan reads (tauriOses) as its name alone proves nothing: other apps publish a latest.json of their own shape.
export const TAURI_MANIFEST = 'latest.json';
// The largest latest.json the plan reads; Tauri's lists a signature and a link per system, a few KB.
export const TAURI_MANIFEST_LIMIT = 64 * 1024;

const TAURI_TARGET: Record<string, DistOs> = { darwin: 'mac', windows: 'win', linux: 'linux' };
// How a signature made by Tauri's signer (tauri signer sign, which the Tauri bundler runs) begins once its base64 is read: minisign's untrusted comment, which Tauri writes as its own. Another app's updater may publish a manifest of Tauri's shape signed with its own key ('signature from nootify artifact signer'), which is no Tauri updater.
const TAURI_SIGNATURE = 'untrusted comment: signature from tauri secret key';

// The systems a latest.json serves as Tauri's updater manifest: one with a version and platforms ('darwin-aarch64', 'windows-x86_64-nsis', 'linux-x86_64'), each system named by a platform whose entry has a url and a signature made by Tauri's signer. None for text that is not JSON or JSON of another shape, such as a list of assets or another updater's signed envelope.
export function tauriOses(text: string): Set<DistOs> {
	const out = new Set<DistOs>();
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		return out;
	}
	const manifest = json as { version?: unknown; platforms?: unknown } | null;
	if (!manifest || typeof manifest !== 'object' || typeof manifest.version !== 'string' || !manifest.platforms || typeof manifest.platforms !== 'object' || Array.isArray(manifest.platforms)) return out;
	for (const [target, entry] of Object.entries(manifest.platforms as Record<string, unknown>)) {
		const e = entry as { signature?: unknown; url?: unknown } | null;
		const os = TAURI_TARGET[target.split('-')[0].toLowerCase()];
		if (os && e && typeof e === 'object' && typeof e.url === 'string' && e.url !== '' && typeof e.signature === 'string' && Buffer.from(e.signature, 'base64').toString('utf8').startsWith(TAURI_SIGNATURE)) out.add(os);
	}
	return out;
}

// How the app updates itself on each system, by the files of its release, for the systems it offers something (a system gets updates only when it has formats). In DIST_UPDATERS order when several apply: MyGo's updater, with delta updates when a .delta names the system; Sparkle (macOS) when the release holds an appcast; Tauri's updater on the systems its latest.json names, as read by tauriOses (tauri); electron-updater by latest.yml (Windows), latest-mac.yml and latest-linux.yml.
export function releaseUpdaters(names: readonly string[], oses: ReadonlySet<DistOs>, tauri: ReadonlySet<DistOs>): Partial<Record<DistOs, { updates: DistUpdater; deltas?: true }>> {
	const lower = names.map((n) => n.toLowerCase());
	const found: Record<DistOs, Set<DistUpdater>> = { mac: new Set(), win: new Set(), linux: new Set() };
	for (const os of tauri) found[os].add('tauri');
	for (const n of lower) {
		const goos = manifestOs(n);
		if (goos) found[goos].add('mygo');
		if (n.endsWith('.xml') && nameTokens(n).includes('appcast')) found.mac.add('sparkle');
		if (n === 'latest.yml' || /^latest-(ia32|x64|arm64)\.yml$/.test(n)) found.win.add('electron');
		if (/^latest-(\w+-)?mac\.yml$/.test(n)) found.mac.add('electron');
		if (/^latest-linux(-[\w]+)?\.yml$/.test(n)) found.linux.add('electron');
	}
	const out: Partial<Record<DistOs, { updates: DistUpdater; deltas?: true }>> = {};
	for (const os of DIST_OSES) {
		if (!oses.has(os)) continue;
		const updates = DIST_UPDATERS.find((u) => found[os].has(u));
		if (!updates) continue;
		const goos = Object.keys(GOOS).find((g) => GOOS[g] === os) as string;
		const deltas = updates === 'mygo' && lower.some((n) => n.endsWith('.delta') && n.includes(`-${goos}-`));
		out[os] = deltas ? { updates, deltas: true } : { updates };
	}
	return out;
}

// The largest file a runner downloads to check; a bigger one is left unchecked and named in the report.
export const CHECK_SIZE_LIMIT = 1024 ** 3;

const CHECK_ARCHS: Record<'mac' | 'win', readonly (Arch | undefined)[]> = { mac: ['universal', 'arm64', undefined, 'amd64', '386'], win: ['amd64', 'arm64', 'universal', undefined, '386'] };

// The tokens of an extension, a version, a system, a processor or an installer, which every build of a release has in some form; the words left are what tells one build of the same format and processor from another ('iroh' of 'hand-iroh-windows-amd64.zip').
const PLAIN_TOKENS = new Set([...EXTENSIONS.flatMap((ext) => ext.slice(1).split('.')), ...SETUP_TOKENS, 'portable']);

// How many words of a file name are not the repository's name, a version, a system, a processor, an extension or an installer's.
function extraWords(name: string, own: ReadonlySet<string>): number {
	return nameTokens(name).filter((t) => !own.has(t) && !PLAIN_TOKENS.has(t) && !/^v?\d/.test(t) && !Object.hasOwn(OS_TOKENS, t) && !Object.hasOwn(ARCH_TOKENS, t)).length;
}

// The file that stands for a system in its check, by DIST_CHECK_FORMATS: on macOS a disk image before an installer package before a zipped app before an app in a tarball, universal before arm64 before no processor named before amd64; on Windows an installer before an MSI before an MSIX before another executable before a zip before a tarball (MyGo's update archive, for an app that ships nothing else), amd64 before arm64 before universal or none before 386. Bare binaries and install scripts are never checked. Among equals, a build of a variant of the app (isVariant) after the app's own, then the name with the fewest words beyond the repository's name and the usual parts (so 'hand-windows-amd64.zip' before 'hand-iroh-windows-amd64.zip'), then the shorter name, then the first by name, so that every run picks the same.
export function pickCheckAsset(os: 'mac' | 'win', assets: readonly ClassifiedAsset[], repo = ''): ClassifiedAsset | undefined {
	const formats: readonly DistFormat[] = DIST_CHECK_FORMATS[os];
	const archs = CHECK_ARCHS[os];
	const own = repoTokens(repo);
	const candidates = assets.filter((c) => c.os === os && formats.includes(c.format));
	const key = (c: ClassifiedAsset) => [formats.indexOf(c.format), archs.indexOf(c.arch), Number(isVariant(c.asset.name, own)), extraWords(c.asset.name, own), c.asset.name.length];
	candidates.sort((a, b) => {
		const ka = key(a);
		const kb = key(b);
		const i = ka.findIndex((v, j) => v !== kb[j]);
		if (i >= 0) return ka[i] - kb[i];
		return a.asset.name < b.asset.name ? -1 : a.asset.name > b.asset.name ? 1 : 0;
	});
	return candidates[0];
}

// ---- reading the releases ----

// A repository's release as the plan reads it: its tag, when it was published, whether it is a prerelease (the repository has only those), its files, and how many it has, which is more than its files when GitHub lists only the first 100.
export interface Release {
	tag: string;
	publishedAt: string;
	prerelease: boolean;
	assets: ReleaseAsset[];
	totalAssets: number;
}

// Up to this many repositories' releases are asked in one GraphQL request.
export const RELEASE_BATCH_SIZE = 20;

const ASSETS = 'releaseAssets(first: 100) { totalCount nodes { id name size downloadUrl } }';
// How many of a repository's newest releases are read beside its latest: a repository of prereleases reads its newest from them, and one whose latest is a variant's (a monorepo that tags cli-, desktop- and mobile- releases in turn) the app's own; GitHub shows drafts only to the repository's maintainers.
const RECENT_RELEASES = 10;
const RELEASE_FIELDS = `nameWithOwner latestRelease { tagName publishedAt ${ASSETS} } releases(first: ${RECENT_RELEASES}, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { tagName publishedAt isPrerelease isDraft ${ASSETS} } }`;

// The GraphQL query of a request for some repositories (owner/name), repository i aliased r<i>.
export function buildReleaseQuery(repos: readonly string[]): string {
	const parts = repos.map((repo, i) => {
		const [owner, name] = repo.split('/');
		return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${RELEASE_FIELDS} }`;
	});
	return `query {\n${parts.join('\n')}\n}`;
}

// The REST id of a release asset from its GraphQL node id, which GraphQL's ReleaseAsset does not otherwise give: a current id is RA_ followed by base64url of a MessagePack array whose last element is the asset's id; a legacy one is base64 of '012:ReleaseAsset<id>'. The REST id is what the record keeps, so that a later run checks a file again only once the release has another. Throws on an id of another shape, as a run must not record ids it cannot read.
export function assetIdOf(nodeId: string): number {
	const fail = () => new Error(`cannot read the asset id of GitHub's node id ${nodeId}`);
	const current = /^RA_([A-Za-z0-9_-]+)$/.exec(nodeId);
	if (!current) {
		const legacy = /ReleaseAsset(\d+)$/.exec(Buffer.from(nodeId, 'base64').toString('latin1'));
		if (!legacy) throw fail();
		return Number(legacy[1]);
	}
	const bytes = Buffer.from(current[1], 'base64url');
	// A fixarray header, then positive integers: fixint, uint8, uint16, uint32 or uint64.
	if (bytes.length === 0 || (bytes[0] & 0xf0) !== 0x90) throw fail();
	const count = bytes[0] & 0x0f;
	let at = 1;
	let last = -1;
	for (let i = 0; i < count; i++) {
		const tag = bytes[at];
		if (tag === undefined) throw fail();
		if (tag < 0x80) {
			last = tag;
			at += 1;
		} else if (tag === 0xcc) {
			last = bytes.readUInt8(at + 1);
			at += 2;
		} else if (tag === 0xcd) {
			last = bytes.readUInt16BE(at + 1);
			at += 3;
		} else if (tag === 0xce) {
			last = bytes.readUInt32BE(at + 1);
			at += 5;
		} else if (tag === 0xcf) {
			last = Number(bytes.readBigUInt64BE(at + 1));
			at += 9;
		} else throw fail();
	}
	if (at !== bytes.length || last < 0 || !Number.isSafeInteger(last)) throw fail();
	return last;
}

export interface GraphqlAnswer {
	data?: Record<string, unknown> | null;
	errors?: { type?: string; path?: (string | number)[]; message: string }[];
}

interface GqlAssets {
	totalCount: number;
	nodes: { id: string; name: string; size: number; downloadUrl: string }[];
}

interface GqlRepo {
	nameWithOwner: string;
	latestRelease: { tagName: string; publishedAt: string | null; releaseAssets: GqlAssets } | null;
	releases: { nodes: { tagName: string; publishedAt: string | null; isPrerelease: boolean; isDraft: boolean; releaseAssets: GqlAssets }[] } | null;
}

export interface ReleaseAnswer {
	// The repository GitHub answered for, which differs from the one asked after a rename.
	nameWithOwner: string;
	// undefined for a repository without a published release.
	release?: Release;
}

export interface ReleaseBatch {
	// By the repository asked, lowercase.
	found: Map<string, ReleaseAnswer>;
	// The repositories asked that GitHub did not find: deleted, made private, or renamed and gone.
	notFound: string[];
}

const assetsOf = (a: GqlAssets): ReleaseAsset[] => a.nodes.map((n) => ({ id: assetIdOf(n.id), name: n.name, size: n.size, url: n.downloadUrl }));

// The formats that are no installer: archives, a bare binary and install scripts, which a release of a helper (a runtime, a CLI) also ships.
const ARCHIVE_FORMATS = new Set<DistFormat>(['tar.gz', 'binary', 'install.sh', 'install.ps1']);

// The files of a release that are builds of the app itself for some system, not of a variant (isVariant).
function appBuilds(assets: readonly ReleaseAsset[], own: ReadonlySet<string>): ClassifiedAsset[] {
	return classifyRelease(assets).filter((c) => !isVariant(c.asset.name, own));
}

// Reads the answer to buildReleaseQuery(repos): the latest release of each repository, or when it has none the newest published prerelease that offers an installer, else the newest that offers the app for any system, else the newest. A latest release that offers only builds of a variant of the app (a command-line tool, a server) or nothing gives way to the newest published release among those read that offers the app itself, as a monorepo's latest may be its CLI's ('cli-v0.1.25' beside 'desktop-v0.1.21'). A repository GitHub does not find (NOT_FOUND) is listed in notFound; any other error, or an answer without data, throws, so that a run never records part of what it asked.
export function parseReleases(repos: readonly string[], answer: GraphqlAnswer): ReleaseBatch {
	const missing = new Set<number>();
	for (const e of answer.errors ?? []) {
		const alias = typeof e.path?.[0] === 'string' ? /^r(\d+)$/.exec(e.path[0]) : null;
		if (e.type !== 'NOT_FOUND' || !alias || e.path?.length !== 1) throw new Error(`GitHub GraphQL: ${e.type ?? 'error'} at ${e.path?.join('.') ?? 'the query'}: ${e.message}`);
		missing.add(Number(alias[1]));
	}
	if (!answer.data) throw new Error('GitHub GraphQL answered without data');
	const out: ReleaseBatch = { found: new Map(), notFound: [] };
	repos.forEach((repo, i) => {
		const r = answer.data?.[`r${i}`] as GqlRepo | null | undefined;
		if (missing.has(i) || !r) {
			out.notFound.push(repo);
			return;
		}
		const own = repoTokens(repo);
		const latest = r.latestRelease;
		const published = (r.releases?.nodes ?? []).filter((n) => !n.isDraft && n.publishedAt);
		const builds = (n: { releaseAssets: GqlAssets }) => appBuilds(assetsOf(n.releaseAssets), own);
		const of = (n: { tagName: string; publishedAt: string | null; releaseAssets: GqlAssets }, prerelease: boolean): Release => ({ tag: n.tagName, publishedAt: n.publishedAt as string, prerelease, assets: assetsOf(n.releaseAssets), totalAssets: n.releaseAssets.totalCount });
		let release: Release | undefined;
		if (latest && latest.publishedAt) {
			const instead = builds(latest).length ? undefined : published.find((n) => !n.isPrerelease && n.tagName !== latest.tagName && builds(n).length > 0);
			release = of(instead ?? latest, false);
		} else {
			// Releases of the same moment may come in either order, and a repository of prereleases may publish a helper's beside the app's ('runtime-v0.2.1-…-win32-x64', a Node runtime in a tarball, beside 'v0.1.2' with the installer).
			const newest = published.find((n) => builds(n).some((c) => !ARCHIVE_FORMATS.has(c.format))) ?? published.find((n) => builds(n).length > 0) ?? published[0];
			release = newest ? of(newest, true) : undefined;
		}
		out.found.set(repo.toLowerCase(), release ? { nameWithOwner: r.nameWithOwner, release } : { nameWithOwner: r.nameWithOwner });
	});
	return out;
}

// ---- one app's record ----

// What a release offers, before any check: the record without checks, undefined when it offers none of the app's platforms; for macOS and Windows the file the runner would check; and the systems it offers that the catalog does not list for the app, which get no part, as a release often ships a helper or a CLI for other systems ('sectl-windows-amd64.exe' beside a macOS app).
export interface ReleaseRead {
	record?: DistRecord;
	picks: Partial<Record<'mac' | 'win', ClassifiedAsset>>;
	other: DistOs[];
}

// The record of an app from its repository's release, without checks, for the systems in platforms (the app's, from the catalog), or undefined when the release offers no system anything. A system's builds of a variant of the app (isVariant) are left out when it has a build of the app itself. tauri is the systems the release's latest.json serves as Tauri's manifest (tauriOses).
export function readRelease(repo: string, release: Release, platforms: ReadonlySet<DistOs>, tauri: ReadonlySet<DistOs> = new Set()): ReleaseRead | undefined {
	const own = repoTokens(repo);
	const all = classifyRelease(release.assets);
	const classified = all.filter((c) => !isVariant(c.asset.name, own) || !all.some((d) => d.os === c.os && !isVariant(d.asset.name, own)));
	const formats: Record<DistOs, Set<DistFormat>> = { mac: new Set(), win: new Set(), linux: new Set() };
	for (const c of classified) formats[c.os].add(c.format);
	const offered = DIST_OSES.filter((os) => formats[os].size);
	if (!offered.length) return undefined;
	const oses = new Set(offered.filter((os) => platforms.has(os)));
	const other = offered.filter((os) => !platforms.has(os));
	if (!oses.size) return { picks: {}, other };
	const updaters = releaseUpdaters(release.assets.map((a) => a.name), oses, tauri);
	const record: DistRecord = { repo, tag: release.tag, published: release.publishedAt.slice(0, 10), ...(release.prerelease ? { prerelease: true as const } : {}) };
	const picks: ReleaseRead['picks'] = {};
	for (const os of DIST_OSES) {
		if (!oses.has(os)) continue;
		const list = (DIST_FORMATS[os] as readonly DistFormat[]).filter((f) => formats[os].has(f));
		const platform: DistPlatform = { formats: list, ...updaters[os] };
		(record as unknown as Record<DistOs, DistPlatform>)[os] = platform;
		if (os !== 'linux') {
			const pick = pickCheckAsset(os, classified, repo);
			if (pick) picks[os] = pick;
		}
	}
	return { record, picks, other };
}

// ---- the plan ----

// A check is done again once it is this many days old, even of the same file: a certificate can be revoked or a notarization ticket withdrawn after the fact.
export const RECHECK_DAYS = 30;

// A check the plan queues for the runner of its system.
export interface CheckItem {
	key: string;
	os: 'mac' | 'win';
	file: string;
	asset: number;
	url: string;
	size: number;
}

// The file the plan step writes for the check and merge steps: the run's day, every record the run will write (checks carried over, none for a queued one), the checks queued, and the keys of apps whose release offers no system anything, for the merge step's report.
export interface PlanFile {
	asOf: string;
	entries: Record<string, DistRecord>;
	checks: CheckItem[];
	noSystem?: string[];
}

// An app the run plans, by its key, with its repository as the site resolves it (scoreTarget) and the systems the catalog lists for it.
export interface PlannedApp {
	key: string;
	repo: string;
	platforms: readonly DistOs[];
}

export interface PlanInput {
	asOf: string;
	apps: readonly PlannedApp[];
	// What GitHub answered for each repository, by the repository asked, lowercase; a repository missing here was not found.
	releases: ReadonlyMap<string, ReleaseAnswer>;
	// The systems the latest.json of each repository's release serves as Tauri's manifest (tauriOses), by the repository asked, lowercase; a repository missing here has none.
	tauri: ReadonlyMap<string, ReadonlySet<DistOs>>;
	prev: DistributionFile;
	// The records of apps the run does not plan (ONLY), kept as they are.
	keep: Readonly<Record<string, DistRecord>>;
	full: boolean;
	// The most checks queued, 0 for no limit.
	maxChecks: number;
}

export interface PlanResult {
	plan: PlanFile;
	// The checks carried over from the last run, by key and system.
	carried: { key: string; os: 'mac' | 'win' }[];
	// The checks MAX_CHECKS left for a later run; those with a check of the same file keep it.
	deferred: CheckItem[];
	// Files too big to check.
	oversized: CheckItem[];
	notFound: string[];
	noRelease: string[];
	noSystem: string[];
	// Systems a release offers that the catalog does not list for the app, which got no part; an app with none of its own has no record.
	otherSystems: { key: string; oses: DistOs[] }[];
	// Repositories GitHub answered under another name.
	renamed: { key: string; repo: string; now: string }[];
	// Releases with more files than GitHub lists in one page, read from their first 100.
	truncated: { key: string; tag: string; total: number }[];
}

// A check of macOS or Windows as a record holds it.
export type SystemCheck = NonNullable<DistPlatform['check']>;

// The age in days of a check on asOf.
const ageOf = (checked: string, asOf: string) => (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${checked}T00:00:00Z`)) / DAY;

// Whether a check of the same file from the last run still stands: it is of the asset picked now and younger than RECHECK_DAYS, and the run is not a full one.
export function checkStands(check: DistCheck | undefined, asset: number, asOf: string, full: boolean): boolean {
	return check !== undefined && check.asset === asset && !full && ageOf(check.checked, asOf) < RECHECK_DAYS;
}

// What a run writes and checks: for every planned app the record of its release, with each system's check carried over from the last run when it still stands (checkStands) and queued otherwise. With maxChecks, checks of files never checked go first, then the oldest-due by key; one left over keeps its last check of the same file, however old, or has none until a later run. Linux is never checked.
export function planDistribution(input: PlanInput): PlanResult {
	const { asOf, prev, full } = input;
	const entries: Record<string, DistRecord> = { ...input.keep };
	const carried: PlanResult['carried'] = [];
	const queue: { item: CheckItem; old?: SystemCheck }[] = [];
	const oversized: CheckItem[] = [];
	const result: Omit<PlanResult, 'plan' | 'carried' | 'deferred' | 'oversized'> = { notFound: [], noRelease: [], noSystem: [], otherSystems: [], renamed: [], truncated: [] };
	for (const app of [...input.apps].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))) {
		const answer = input.releases.get(app.repo.toLowerCase());
		if (!answer) {
			result.notFound.push(app.key);
			continue;
		}
		if (answer.nameWithOwner.toLowerCase() !== app.repo.toLowerCase()) result.renamed.push({ key: app.key, repo: app.repo, now: answer.nameWithOwner });
		if (!answer.release) {
			result.noRelease.push(app.key);
			continue;
		}
		if (answer.release.totalAssets > answer.release.assets.length) result.truncated.push({ key: app.key, tag: answer.release.tag, total: answer.release.totalAssets });
		const read = readRelease(app.repo, answer.release, new Set(app.platforms), input.tauri.get(app.repo.toLowerCase()));
		if (!read) {
			result.noSystem.push(app.key);
			continue;
		}
		if (read.other.length) result.otherSystems.push({ key: app.key, oses: read.other });
		if (!read.record) continue;
		const { record } = read;
		const old = Object.hasOwn(prev.entries, app.key) ? prev.entries[app.key] : undefined;
		for (const os of ['mac', 'win'] as const) {
			const pick = read.picks[os];
			const platform = record[os];
			if (!pick || !platform) continue;
			const item: CheckItem = { key: app.key, os, file: pick.asset.name, asset: pick.asset.id, url: pick.asset.url, size: pick.asset.size };
			const before = old?.[os]?.check;
			if (checkStands(before, item.asset, asOf, full)) {
				(platform as DistPlatform).check = before;
				carried.push({ key: app.key, os });
			} else if (item.size > CHECK_SIZE_LIMIT) oversized.push(item);
			else queue.push(before && before.asset === item.asset ? { item, old: before } : { item });
		}
		entries[app.key] = record;
	}
	// Files never checked first, then re-checks of the same file, the oldest first; ties by key, then macOS before Windows, as the apps were walked.
	const ordered = queue.map((q, i) => ({ ...q, i })).sort((a, b) => Number(a.old !== undefined) - Number(b.old !== undefined) || (a.old && b.old ? (a.old.checked < b.old.checked ? -1 : a.old.checked > b.old.checked ? 1 : 0) : 0) || a.i - b.i);
	const limit = input.maxChecks > 0 ? input.maxChecks : ordered.length;
	const checks = ordered.slice(0, limit).map((q) => q.item);
	const deferred: CheckItem[] = [];
	for (const q of ordered.slice(limit)) {
		deferred.push(q.item);
		if (q.old) (entries[q.item.key][q.item.os] as DistPlatform).check = q.old;
	}
	checks.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.os < b.os ? -1 : a.os > b.os ? 1 : 0));
	const plan: PlanFile = { asOf, entries, checks, ...(result.noSystem.length ? { noSystem: result.noSystem } : {}) };
	return { plan, carried, deferred, oversized, ...result };
}
