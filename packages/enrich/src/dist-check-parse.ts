// What the check step (distribution-check.ts) makes of the tools it runs on a downloaded installer, without running them: the output of codesign, spctl, stapler and pkgutil on the macOS runner and of Get-AuthenticodeSignature on the Windows runner, read into the signing state a record shows (MAC_SIGN, WIN_SIGN in packages/catalog/src/dist.ts), which file of an archive stands for the app, and the files the check step and the merge pass to each other. Pure functions, so they are tested on fixtures captured from real runs of the tools.

import type { DistCheck, MacSign, WinSign } from '../../catalog/src/dist.ts';

// ---- the files between the stages ----

// One check the plan queued (PLAN_FILE's checks): the release asset that stands for a system of an app, by its GitHub id, its file name, its browser_download_url and its size in bytes.
export interface PlannedCheck {
	key: string;
	os: 'mac' | 'win';
	file: string;
	asset: number;
	url: string;
	size: number;
}

// What the check step found of one planned check: check when the tools ran, including an unknown status with a note when the file holds nothing to check; error when the file could not be downloaded or a tool failed for a reason that is not the file's, which the merge does not record, so that the next run checks it again.
export interface CheckResult {
	key: string;
	asset: number;
	check?: DistCheck<MacSign | WinSign>;
	error?: string;
}

// RESULTS_FILE, as the check step of one system writes it and the merge reads it.
export interface ResultsFile {
	os: 'mac' | 'win';
	results: CheckResult[];
}

// What the checks say of a file, before it is stamped with its name, its asset id and the day (checkOf).
export interface Verdict<S extends string> {
	status: S;
	signer?: string;
	stapled?: boolean;
	pkg?: true;
	note?: string;
}

// A check in DIST_CHECK_FIELDS order, with the fields the verdict leaves out left out, so the file the merge writes lists them in the same order whatever wrote them.
export function checkOf<S extends string>(item: { file: string; asset: number }, verdict: Verdict<S>, checked: string): DistCheck<S> {
	return {
		file: item.file,
		asset: item.asset,
		status: verdict.status,
		...(verdict.signer === undefined ? {} : { signer: verdict.signer }),
		...(verdict.stapled === undefined ? {} : { stapled: verdict.stapled }),
		...(verdict.pkg ? { pkg: true as const } : {}),
		checked,
		...(verdict.note === undefined ? {} : { note: verdict.note }),
	};
}

// ---- what to do with a file ----

// The tarballs the plan counts as the tar.gz format (classifyAsset), whose compression tar tells by itself.
const TARBALL = /\.(tar\.(gz|xz|zst|bz2)|tgz)$/;

// How the macOS runner opens a file, by its name: the formats pickCheckAsset chooses from on macOS (a disk image, an installer package, a zipped app, an app in a tarball), or undefined for any other file, which the plan should not have queued.
export function macKind(file: string): 'dmg' | 'pkg' | 'zip' | 'tar.gz' | undefined {
	const name = file.toLowerCase();
	if (name.endsWith('.dmg')) return 'dmg';
	if (name.endsWith('.pkg')) return 'pkg';
	if (name.endsWith('.zip')) return 'zip';
	if (TARBALL.test(name)) return 'tar.gz';
	return undefined;
}

// How the Windows runner opens a file, by its name: a file Get-AuthenticodeSignature reads itself (an installer, an MSI, an MSIX or APPX package, a portable executable), an archive (a zip or a tarball) to look into for the app's executable, or undefined for any other file.
export function winKind(file: string): 'file' | 'archive' | undefined {
	const name = file.toLowerCase();
	if (/\.(exe|msi|msix|msixbundle|appx|appxbundle)$/.test(name)) return 'file';
	if (name.endsWith('.zip') || TARBALL.test(name)) return 'archive';
	return undefined;
}

// The name a download is saved under: the asset's name with every character but letters, digits, dots, hyphens and underscores replaced, and no leading dot or hyphen, so that a third party's file name can neither leave its directory nor read as a tool's option. The extension is kept, as Windows picks how it reads a signature by it.
export function safeFileName(file: string): string {
	const name = file.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^[.-]+/, '_');
	return name === '' || name === '_' ? 'download' : name;
}

// The executable of an archive (a zip or a tarball) that stands for the app on Windows, and whether its name is exactly the app's slug: among the .exe files at most two folders deep (paths relative to the extracted folder, with / between folders), the one whose name is the slug, else the one whose name and slug contain one another, the larger first; uninstallers never. When no name is related to the slug, the archive's only executable, or its only one at the top, as an app archive puts its own there; with several and none at the top, undefined, as the largest may be a bundled runtime's or a redistributable's (an Erlang release's erts/bin, vc_redist) and its signature is not the app's.
export function pickMainExe(files: readonly { path: string; size: number }[], slug: string): { path: string; exact: boolean } | undefined {
	const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
	const want = squash(slug);
	const rank = (path: string): number => {
		const name = squash((path.split('/').pop() as string).replace(/\.exe$/i, ''));
		if (name === want) return 2;
		return name !== '' && (name.includes(want) || want.includes(name)) ? 1 : 0;
	};
	const exes = files.filter((f) => {
		const parts = f.path.split('/');
		const name = (parts[parts.length - 1] ?? '').toLowerCase();
		return parts.length <= 3 && name.endsWith('.exe') && !/^unins|uninstall/.test(name);
	});
	exes.sort((a, b) => rank(b.path) - rank(a.path) || b.size - a.size || (a.path < b.path ? -1 : 1));
	const best = exes[0];
	if (!best) return undefined;
	const r = rank(best.path);
	if (r > 0) return { path: best.path, exact: r === 2 };
	const top = exes.filter((f) => !f.path.includes('/'));
	if (exes.length === 1) return { path: best.path, exact: false };
	return top.length === 1 ? { path: top[0].path, exact: false } : undefined;
}

// ---- macOS ----

// The first line of a tool's message, without the path of the file it names: codesign and spctl begin with "<path>: ", which holds the runner's folders, and ditto names an entry it could not write by its full path under the folder it extracts to. Each of roots (the item's folders, as given and as their real paths) is cut from the message with the separator after it, so that an entry is named relative to its archive. Warnings, such as hdiutil's that its options are deprecated, are passed over.
export function toolMessage(output: string, roots: readonly string[] = []): string {
	const line = output.split('\n').find((l) => l.trim() !== '' && !/^\S+: WARNING:/.test(l)) ?? '';
	const relative = roots.filter(Boolean).sort((a, b) => b.length - a.length).reduce((m, root) => m.split(`${root}/`).join('').split(`${root}\\`).join('').split(root).join('.'), line);
	return relative.replace(/^.*?\.(?:app|pkg|dmg)\/?: /i, '').trim();
}

// What codesign -dv --verbose=4 says of an app, on stderr: whether it is signed at all, signed ad hoc, the authorities of its certificate chain (the signer first) and its team. error is codesign's message when it could not read the signature for another reason.
export interface CodesignInfo {
	signed: boolean;
	adhoc: boolean;
	authorities: string[];
	team?: string;
	error?: string;
}

export function parseCodesign(stderr: string, code: number): CodesignInfo {
	if (/code object is not signed at all/.test(stderr)) return { signed: false, adhoc: false, authorities: [] };
	if (code !== 0) return { signed: true, adhoc: false, authorities: [], error: toolMessage(stderr) || `codesign exited with ${code}` };
	const team = /^TeamIdentifier=(.+)$/m.exec(stderr)?.[1].trim();
	return {
		signed: true,
		adhoc: /^Signature=adhoc$/m.test(stderr) || /\bflags=0x[0-9a-f]+\([^)]*\badhoc\b/.test(stderr),
		authorities: [...stderr.matchAll(/^Authority=(.+)$/gm)].map((m) => m[1].trim()),
		...(team && team !== 'not set' ? { team } : {}),
	};
}

// What spctl -a -vv says, on stderr: Gatekeeper's verdict (undefined when it gave none, as for a signature it cannot read), the source of the signature it judged (Notarized Developer ID, Unnotarized Developer ID, Developer ID, no usable signature) and its origin, the signer. message is its first line when it gave no verdict.
export interface SpctlInfo {
	verdict?: 'accepted' | 'rejected';
	source?: string;
	origin?: string;
	message?: string;
}

export function parseSpctl(stderr: string): SpctlInfo {
	const verdict = /: (accepted|rejected)$/m.exec(stderr)?.[1] as SpctlInfo['verdict'];
	const source = /^source=(.+)$/m.exec(stderr)?.[1].trim();
	const origin = /^origin=(.+)$/m.exec(stderr)?.[1].trim();
	return {
		...(verdict ? { verdict } : { message: toolMessage(stderr) }),
		...(source ? { source } : {}),
		...(origin ? { origin } : {}),
	};
}

// Whether xcrun stapler validate found a notarization ticket stapled to the file: it says so and exits 0; without a ticket it exits 65 ("does not have a ticket stapled to it"), and 66 for a file that cannot hold one.
export function parseStapler(stdout: string, code: number): boolean {
	return code === 0 && stdout.includes('The validate action worked!');
}

// What pkgutil --check-signature says of an installer package, on stdout: its signature status ("no signature", "signed by a developer certificate issued by Apple for distribution", …), whether Apple's notary service trusts it, and the first certificate of its chain, the signer.
export interface PkgutilInfo {
	status?: string;
	notarized: boolean;
	signer?: string;
}

export function parsePkgutil(stdout: string): PkgutilInfo {
	const status = /^\s*Status: (.+)$/m.exec(stdout)?.[1].trim();
	const signer = /^\s*1\. (.+)$/m.exec(stdout)?.[1].trim();
	return {
		...(status ? { status } : {}),
		notarized: /Notarization: trusted by the Apple notary service/.test(stdout),
		...(signer ? { signer } : {}),
	};
}

// The macOS signing state of an app bundle, from codesign -dv, codesign --verify --deep --strict (its exit code and message) and spctl -a -t exec. An app whose signature does not verify is invalid, whatever its certificate, as Gatekeeper refuses it. A Developer ID app is notarized when Gatekeeper accepts it as Notarized Developer ID, and only Developer ID otherwise. Any other certificate (Apple Development, Apple Distribution, a self-signed one) is untrusted. Throws when spctl gave no verdict on an intact Developer ID app, as only it tells whether the app is notarized: the check step records that as an error, to try again.
export function macAppVerdict(codesign: CodesignInfo, verify: { code: number; message: string }, spctl: SpctlInfo): Verdict<MacSign> {
	if (!codesign.signed) return { status: 'unsigned' };
	if (codesign.error) return { status: 'unknown', note: `codesign could not read the signature: ${codesign.error}` };
	if (codesign.adhoc) return { status: 'adhoc' };
	const signer = codesign.authorities[0];
	if (!signer) return { status: 'unknown', note: 'codesign names no certificate of the signature' };
	if (verify.code !== 0) return { status: 'invalid', signer, note: `the signature does not verify: ${verify.message || `codesign exited with ${verify.code}`}` };
	if (!signer.startsWith('Developer ID Application:')) return { status: 'untrusted', signer };
	if (!spctl.verdict) throw new Error(`spctl gave no verdict on the app: ${spctl.message || 'no output'}`);
	return { status: spctl.verdict === 'accepted' && spctl.source === 'Notarized Developer ID' ? 'notarized' : 'developer-id', signer };
}

// The macOS signing state of an installer package, from pkgutil --check-signature and spctl -a -t install: notarized when Gatekeeper accepts it as Notarized Developer ID, Developer ID when pkgutil finds a Developer ID Installer signature, unsigned without a signature, and untrusted for any other (an expired or a self-signed certificate, one for the Mac App Store). Each is marked pkg, as it describes the package's own signature, not the app's.
export function macPkgVerdict(pkgutil: PkgutilInfo, spctl: SpctlInfo): Verdict<MacSign> {
	const signer = pkgutil.signer ?? spctl.origin;
	const by = signer ? { signer } : {};
	if (spctl.verdict === 'accepted' && spctl.source === 'Notarized Developer ID') return { status: 'notarized', ...by, pkg: true };
	if (!pkgutil.status) return { status: 'unknown', pkg: true, note: 'pkgutil could not read the package' };
	if (/^no signature/i.test(pkgutil.status)) return { status: 'unsigned', pkg: true };
	if (/developer certificate issued by Apple for distribution/i.test(pkgutil.status)) return { status: 'developer-id', ...by, pkg: true };
	return { status: 'untrusted', ...by, pkg: true, note: `pkgutil: ${pkgutil.status}` };
}

// ---- Windows ----

// What the check step's PowerShell script prints for a file, one line of JSON: Get-AuthenticodeSignature's Status as its name (the SignatureStatus enum, which ConvertTo-Json would otherwise write as its number), its StatusMessage and the Subject of the signer's certificate, null when unsigned.
export interface Authenticode {
	status: string;
	statusMessage?: string;
	subject?: string;
}

// SignatureStatus by its number, for output that carries the enum's value rather than its name.
const SIGNATURE_STATUS = ['Valid', 'UnknownError', 'NotSigned', 'HashMismatch', 'NotTrusted', 'NotSupportedFileFormat', 'Incompatible'];

// The script's output read, from its last line of JSON (PowerShell may print a byte order mark or a blank line first, which trim takes away). Throws when the output holds no such object, which the check step records as an error.
export function parseAuthenticode(stdout: string): Authenticode {
	const line = stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('{')).pop();
	if (!line) throw new Error(`Get-AuthenticodeSignature printed no JSON: ${stdout.trim().slice(0, 200) || 'no output'}`);
	const raw = JSON.parse(line) as { Status?: unknown; StatusMessage?: unknown; Subject?: unknown };
	const status = typeof raw.Status === 'number' ? SIGNATURE_STATUS[raw.Status] : raw.Status;
	if (typeof status !== 'string' || !SIGNATURE_STATUS.includes(status)) throw new Error(`Get-AuthenticodeSignature gave an unknown status: ${String(raw.Status)}`);
	return {
		status,
		...(typeof raw.StatusMessage === 'string' && raw.StatusMessage ? { statusMessage: raw.StatusMessage } : {}),
		...(typeof raw.Subject === 'string' && raw.Subject ? { subject: raw.Subject } : {}),
	};
}

// The name a certificate's subject gives its owner: its common name (CN), else its organization (O). A value may be quoted, as "CN="Example, Inc.", O=…" is.
export function subjectName(subject: string | undefined): string | undefined {
	if (!subject) return undefined;
	const parts = new Map<string, string>();
	for (const m of subject.matchAll(/(?:^|,)\s*([A-Za-z.0-9]+)=("(?:[^"]|"")*"|[^,]*)/g)) {
		const key = m[1].toUpperCase();
		const value = m[2].startsWith('"') ? m[2].slice(1, -1).replace(/""/g, '"') : m[2];
		if (!parts.has(key) && value.trim()) parts.set(key, value.trim());
	}
	return parts.get('CN') ?? parts.get('O');
}

// The Windows signing state of a file from its Authenticode status: Valid is trusted; NotSigned unsigned; HashMismatch and Incompatible invalid, and NotSupportedFileFormat when the file carries a signature nonetheless; UnknownError and NotTrusted untrusted, as a self-signed certificate or one chaining to a root Windows does not trust is. NotSupportedFileFormat without a signature is unknown: Windows cannot tell whether such a file is signed.
export function winVerdict(sig: Authenticode): Verdict<WinSign> {
	const signer = subjectName(sig.subject);
	const by = signer ? { signer } : {};
	// The first sentence of Windows' message, unless it names the runner's path of the file.
	const first = sig.statusMessage?.split(/(?<=\.)\s/)[0].trim();
	const message = first && !/[A-Za-z]:\\/.test(first) ? first : undefined;
	switch (sig.status) {
		case 'Valid':
			return { status: 'trusted', ...by };
		case 'NotSigned':
			return { status: 'unsigned' };
		case 'HashMismatch':
			return { status: 'invalid', ...by, note: 'the file does not match the hash in its signature' };
		case 'Incompatible':
			return { status: 'invalid', ...by, note: 'the signature uses a form Windows does not support' };
		case 'NotSupportedFileFormat':
			return signer ? { status: 'invalid', ...by, note: 'Windows does not recognise the format of the signed file' } : { status: 'unknown', note: 'Windows cannot read a signature of a file of this format' };
		default:
			return { status: 'untrusted', ...by, ...(message ? { note: message } : {}) };
	}
}
