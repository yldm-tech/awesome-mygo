import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { MacSign, WinSign } from '../../catalog/src/dist.ts';
import { type CheckResult, type PlannedCheck, type ResultsFile, type Verdict, checkOf, macAppVerdict, macKind, macPkgVerdict, parseAuthenticode, parseCodesign, parsePkgutil, parseSpctl, parseStapler, pickMainExe, safeFileName, toolMessage, winKind, winVerdict } from './dist-check-parse.ts';

// Run by .github/workflows/distribution.yml on a macOS and on a Windows runner, between the plan (distribution.ts) and the merge (distribution-merge.ts). It checks the installers the plan queued for its own system (PLAN_FILE's checks of os mac on macOS, of os win on Windows) with the system's own tools, and writes what they said to RESULTS_FILE for the merge to record in packages/catalog/data/distribution.json. The tools' output is read by dist-check-parse.ts.
//
// On macOS a disk image is mounted read-only, without opening a window or running anything, and the app bundle at its top is checked; an installer package is checked as it is; a zip is extracted with ditto, which keeps the signatures, and a tarball with tar, whatever its compression, and the app bundle at most two folders deep is checked. An app is read by codesign -dv (its signer, or an ad hoc signature, or none), codesign --verify --deep --strict (whether the signature still holds), spctl -a -t exec (whether Gatekeeper accepts it, and as notarized or not) and xcrun stapler validate on the app and the disk image (whether a notarization ticket is stapled); a package by pkgutil --check-signature, spctl -a -t install and stapler. On Windows, Get-AuthenticodeSignature reads an installer, MSI, MSIX or executable directly, and the app's executable inside a zip or a tarball (MyGo's update archive), extracted with Windows' own tar.
//
// Every file is downloaded into a new, empty folder of its own under WORK_DIR, under a name made safe (safeFileName), and the folder is removed, the disk image detached first, as soon as the file is checked. Nothing downloaded is ever run: the tools only read signatures, and every tool is started without a shell, with the file's path as an argument of its own. A file that cannot be downloaded, or a tool that fails for a reason that is not the file's (it cannot start, runs past its time, or gives no verdict), makes an error result, which the merge does not record, so the next run checks the file again; a file whose contents cannot be checked, such as an archive without an app, makes a check of status unknown with a note.
//
// Downloads go without a token: release assets are public, and a token sent to github.com would follow the redirect to another host for nothing.
//
// Environment: PLAN_FILE (the plan's JSON), RESULTS_FILE (where the results are written), WORK_DIR (where the downloads go, default the system's temporary folder).

const env = process.env;
const OS = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : undefined;
// Files checked at once: each is a download and a few tool runs, so a few at a time keep the runner's network and disk busy without filling the disk.
const CONCURRENCY = 3;
const DOWNLOAD_TIMEOUT = 15 * 60_000;
const TOOL_TIMEOUT = 5 * 60_000;
// The plan queues no file larger than this; a plan that did is not followed.
const MAX_BYTES = 1024 ** 3;

const today = () => new Date().toISOString().slice(0, 10);
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

interface Ran {
	code: number;
	stdout: string;
	stderr: string;
}

// A tool started without a shell, with input written to its standard input (hdiutil reads its answer to a disk image's license agreement there). It resolves with the exit code and the output whatever the code is, as codesign, spctl and stapler answer with their exit codes; it rejects when the tool cannot start or runs past TOOL_TIMEOUT, which is the runner's failure, not the file's.
function run(cmd: string, args: string[], input = ''): Promise<Ran> {
	return new Promise((resolve, reject) => {
		// In the C locale, so that the tools that follow it answer in English, as the parsers read them. (hdiutil follows the language of macOS instead, which is English on the runners.)
		const child = spawn(cmd, args, { env: { ...env, LANG: 'C', LC_ALL: 'C' }, stdio: ['pipe', 'pipe', 'pipe'], timeout: TOOL_TIMEOUT, windowsHide: true });
		let stdout = '';
		let stderr = '';
		child.stdout.setEncoding('utf8').on('data', (d: string) => {
			stdout += d;
		});
		child.stderr.setEncoding('utf8').on('data', (d: string) => {
			stderr += d;
		});
		// A tool that exits before reading its input closes the pipe; that is not a failure of the tool.
		child.stdin.on('error', () => {});
		child.on('error', (err) => reject(new Error(`${cmd} could not start: ${err.message}`)));
		child.on('close', (code, signal) => {
			if (signal) reject(new Error(`${cmd} ${args[0] ?? ''} was stopped by ${signal}${signal === 'SIGTERM' ? `, past ${TOOL_TIMEOUT / 60_000} minutes` : ''}`));
			else resolve({ code: code ?? 1, stdout, stderr });
		});
		child.stdin.end(input);
	});
}

// The file downloaded to path, tried up to three times when the connection drops or GitHub answers 5xx; another answer, such as a 404 for an asset deleted since the plan, is not tried again. Throws when it cannot be downloaded, or when its size is not the one the release lists.
async function download(item: PlannedCheck, path: string): Promise<void> {
	if (item.size > MAX_BYTES) throw new Error(`${item.file} is larger than 1 GiB, which the plan does not queue`);
	for (let attempt = 0; ; attempt++) {
		try {
			const res = await fetch(item.url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT) });
			if (!res.ok && res.status < 500) attempt = 2;
			if (!res.ok || !res.body) throw new Error(`downloading ${item.file} answered ${res.status}`);
			await pipeline(Readable.fromWeb(res.body), createWriteStream(path));
			const { size } = await stat(path);
			if (size !== item.size) throw new Error(`downloaded ${size} bytes of ${item.file}, where the release lists ${item.size}`);
			return;
		} catch (err) {
			await rm(path, { force: true });
			if (attempt === 2) throw err;
		}
		await new Promise((r) => setTimeout(r, 2_000 * 3 ** attempt));
	}
}

// ---- macOS ----

// The first app bundle (a folder named *.app, not a link) in root, by name, or at most depth folders deep, a folder before those inside it; __MACOSX, the resource forks a zip made on a Mac carries, is passed over.
async function findApp(root: string, depth: number): Promise<string | undefined> {
	const dirs = (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory() && e.name !== '__MACOSX').sort((a, b) => (a.name < b.name ? -1 : 1));
	const app = dirs.find((e) => e.name.toLowerCase().endsWith('.app'));
	if (app) return join(root, app.name);
	if (depth > 1) {
		for (const e of dirs) {
			const found = await findApp(join(root, e.name), depth - 1);
			if (found) return found;
		}
	}
	return undefined;
}

// The first installer package at the top of a disk image, for one that holds a package instead of an app.
async function findPkg(root: string): Promise<string | undefined> {
	const pkgs = (await readdir(root, { withFileTypes: true })).filter((e) => (e.isFile() || e.isDirectory()) && /\.m?pkg$/i.test(e.name)).map((e) => e.name);
	return pkgs.length ? join(root, pkgs.sort()[0]) : undefined;
}

async function stapled(path: string): Promise<boolean> {
	const r = await run('xcrun', ['stapler', 'validate', path]);
	return parseStapler(r.stdout, r.code);
}

// A notarized app or package says whether its ticket is stapled, to it or to the disk image it came in; for any other state a ticket says nothing, so it is left out.
function withTicket(verdict: Verdict<MacSign>, ticket: boolean): Verdict<MacSign> {
	return verdict.status === 'notarized' ? { ...verdict, stapled: ticket } : verdict;
}

async function checkApp(app: string, imageTicket: boolean): Promise<Verdict<MacSign>> {
	const codesign = await run('codesign', ['-dv', '--verbose=4', app]);
	const verify = await run('codesign', ['--verify', '--deep', '--strict', app]);
	const spctl = await run('spctl', ['-a', '-vv', '-t', 'exec', app]);
	const verdict = macAppVerdict(parseCodesign(codesign.stderr, codesign.code), { code: verify.code, message: toolMessage(verify.stderr) }, parseSpctl(spctl.stderr));
	return withTicket(verdict, imageTicket || (verdict.status === 'notarized' && (await stapled(app))));
}

async function checkPkg(pkg: string, imageTicket: boolean): Promise<Verdict<MacSign>> {
	const pkgutil = await run('pkgutil', ['--check-signature', pkg]);
	const spctl = await run('spctl', ['-a', '-vv', '-t', 'install', pkg]);
	const verdict = macPkgVerdict(parsePkgutil(pkgutil.stdout), parseSpctl(spctl.stderr));
	return withTicket(verdict, imageTicket || (verdict.status === 'notarized' && (await stapled(pkg))));
}

// Detaches a disk image, forcing it, and tries twice more a few seconds apart when macOS holds it busy (Spotlight or the security scan may still be reading it). Throws when it stays mounted, which stops the run rather than leave it so.
async function detach(mount: string): Promise<void> {
	for (let attempt = 0; ; attempt++) {
		const r = await run('hdiutil', ['detach', '-force', mount]);
		if (r.code === 0) return;
		if (attempt === 2) throw new Error(`hdiutil could not detach ${mount}: ${toolMessage(r.stderr)}`);
		await new Promise((res) => setTimeout(res, 3_000));
	}
}

async function checkDmg(dir: string, path: string): Promise<Verdict<MacSign>> {
	const ticket = await stapled(path);
	const mount = join(dir, 'mnt');
	await mkdir(mount);
	// A disk image with a license agreement asks for it on standard input: Y agrees, so the image mounts.
	const attach = await run('hdiutil', ['attach', '-nobrowse', '-readonly', '-noautoopen', '-noverify', '-mountpoint', mount, path], 'Y\n');
	if (attach.code !== 0) return { status: 'unknown', note: `the disk image could not be mounted: ${toolMessage(attach.stderr).replace(/^hdiutil: /, '') || `hdiutil exited with ${attach.code}`}` };
	try {
		const app = await findApp(mount, 1);
		if (app) return await checkApp(app, ticket);
		const pkg = await findPkg(mount);
		if (pkg) return await checkPkg(pkg, ticket);
		return { status: 'unknown', note: 'no app bundle in the disk image' };
	} finally {
		await detach(mount);
	}
}

// The item's folders as given and as their real paths (the runner's temporary folder may be reached through a link, as /var is on macOS), for toolMessage to cut from an extraction tool's message, which the record shows.
async function itemRoots(dir: string, out: string): Promise<string[]> {
	return [out, await realpath(out), dir, await realpath(dir)];
}

async function checkArchive(dir: string, cmd: string, args: string[]): Promise<Verdict<MacSign>> {
	const out = join(dir, 'x');
	await mkdir(out);
	const r = await run(cmd, [...args, out]);
	if (r.code !== 0) return { status: 'unknown', note: `the archive could not be extracted: ${toolMessage(r.stderr, await itemRoots(dir, out)) || `${cmd} exited with ${r.code}`}` };
	const app = await findApp(out, 2);
	return app ? checkApp(app, false) : { status: 'unknown', note: 'no app bundle in the archive' };
}

function checkMac(item: PlannedCheck, dir: string, path: string): Promise<Verdict<MacSign>> {
	switch (macKind(item.file)) {
		case 'dmg':
			return checkDmg(dir, path);
		case 'pkg':
			return checkPkg(path, false);
		case 'zip':
			return checkArchive(dir, 'ditto', ['-x', '-k', path]);
		case 'tar.gz':
			// bsdtar tells the tarball's compression (gzip, xz, zstd, bzip2) by itself.
			return checkArchive(dir, 'tar', ['-xf', path, '-C']);
		default:
			throw new Error(`${item.file} is not a disk image, package, zip or tarball, which the macOS check opens`);
	}
}

// ---- Windows ----

// Get-AuthenticodeSignature of the file named by -Path, printed as one line of JSON (parseAuthenticode). The path arrives as an argument, never inside the command's text, and the output is UTF-8, so that a signer's name in any script survives.
const AUTHENTICODE_SCRIPT = `param([Parameter(Mandatory = $true)][string]$Path)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$s = Get-AuthenticodeSignature -LiteralPath $Path
$subject = if ($s.SignerCertificate) { $s.SignerCertificate.Subject } else { $null }
[pscustomobject]@{ Status = $s.Status.ToString(); StatusMessage = $s.StatusMessage; Subject = $subject } | ConvertTo-Json -Compress
`;

async function authenticode(path: string, script: string): Promise<Verdict<WinSign>> {
	const r = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Path', path]);
	if (r.code !== 0) throw new Error(`Get-AuthenticodeSignature failed: ${r.stderr.trim().slice(0, 300) || `PowerShell exited with ${r.code}`}`);
	return winVerdict(parseAuthenticode(r.stdout));
}

// The files under root at most two folders deep, as paths with / between folders and their sizes; links are not followed.
async function listFiles(root: string, prefix = '', depth = 3): Promise<{ path: string; size: number }[]> {
	const out: { path: string; size: number }[] = [];
	for (const e of await readdir(join(root, prefix), { withFileTypes: true })) {
		const rel = prefix ? `${prefix}/${e.name}` : e.name;
		if (e.isFile()) out.push({ path: rel, size: (await stat(join(root, rel))).size });
		else if (e.isDirectory() && depth > 1) out.push(...(await listFiles(root, rel, depth - 1)));
	}
	return out;
}

async function checkWin(item: PlannedCheck, dir: string, path: string, script: string): Promise<Verdict<WinSign>> {
	const kind = winKind(item.file);
	if (kind === 'file') return authenticode(path, script);
	if (kind !== 'archive') throw new Error(`${item.file} is not an installer, package, executable, zip or tarball, which the Windows check opens`);
	const out = join(dir, 'x');
	await mkdir(out);
	// Windows' own bsdtar reads zips and tarballs alike; the tar of Git for Windows, which may come first on the runner's PATH, does not read zips.
	const tar = join(env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
	const r = await run(tar, ['-xf', path, '-C', out]);
	if (r.code !== 0) return { status: 'unknown', note: `the archive could not be extracted: ${toolMessage(r.stderr, await itemRoots(dir, out)) || `tar exited with ${r.code}`}` };
	const files = await listFiles(out);
	const exe = pickMainExe(files, item.key.replace(/^app:/, ''));
	if (!exe) return { status: 'unknown', note: files.some((f) => /\.exe$/i.test(f.path)) ? 'no executable in the archive is named after the app, and it holds several' : 'no executable in the archive' };
	const verdict = await authenticode(join(out, ...exe.path.split('/')), script);
	// An executable not named exactly after the app is named in the note, so that a wrong pick shows in the record.
	if (exe.exact) return verdict;
	const checked = `checked ${exe.path}`;
	return { ...verdict, note: verdict.note ? `${verdict.note} (${checked})` : checked };
}

// ---- the run ----

async function checkOne(item: PlannedCheck, work: string, script: string): Promise<CheckResult> {
	const dir = await mkdtemp(join(work, 'item-'));
	const started = Date.now();
	try {
		const path = join(dir, safeFileName(item.file));
		await download(item, path);
		const verdict = OS === 'mac' ? await checkMac(item, dir, path) : await checkWin(item, dir, path, script);
		const check = checkOf(item, verdict, today());
		console.log(`${item.key}: ${item.file} ${check.status}${check.signer ? ` (${check.signer})` : ''}${check.stapled ? ', stapled' : ''}${check.note ? `: ${check.note}` : ''} in ${Math.round((Date.now() - started) / 1000)} s`);
		return { key: item.key, asset: item.asset, check };
	} catch (err) {
		const error = errorText(err);
		console.log(`::warning::${item.key}: ${item.file} could not be checked: ${error}`);
		return { key: item.key, asset: item.asset, error };
	} finally {
		// An archive may carry read-only folders (0555, as a Nix store or Go's module cache leaves them) or immutable flags, which bsdtar and ditto keep and which stop rm from emptying them; on macOS the folder is made writable first. chmod and chflags do not follow links while walking it. On Windows rm retries a file a scanner still holds.
		if (OS === 'mac') {
			await run('chflags', ['-R', 'nouchg', dir]);
			await run('chmod', ['-R', 'u+rwX', dir]);
		}
		await rm(dir, { recursive: true, force: true, maxRetries: 3 });
	}
}

async function main(): Promise<void> {
	if (!OS) throw new Error(`The check step runs on macOS or Windows, whose tools it needs, not on ${process.platform}`);
	if (!env.PLAN_FILE || !env.RESULTS_FILE) throw new Error('PLAN_FILE and RESULTS_FILE must be set');
	const plan = JSON.parse(await readFile(env.PLAN_FILE, 'utf8')) as { checks: PlannedCheck[] };
	const queue = plan.checks.filter((c) => c.os === OS);
	console.log(`Checking ${queue.length} ${OS === 'mac' ? 'macOS' : 'Windows'} installers of the ${plan.checks.length} the plan queued.`);

	const root = env.WORK_DIR || tmpdir();
	await mkdir(root, { recursive: true });
	const work = await mkdtemp(join(root, 'distribution-check-'));
	const results: CheckResult[] = [];
	try {
		// The PowerShell script lives in a folder of its own, apart from the downloads.
		const script = join(await mkdtemp(join(work, 'script-')), 'authenticode.ps1');
		if (OS === 'win') await writeFile(script, AUTHENTICODE_SCRIPT);
		let next = 0;
		await Promise.all(
			Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
				while (next < queue.length) {
					const i = next++;
					results[i] = await checkOne(queue[i], work, script);
				}
			}),
		);
	} finally {
		await rm(work, { recursive: true, force: true });
	}

	const file: ResultsFile = { os: OS, results };
	await mkdir(dirname(env.RESULTS_FILE), { recursive: true });
	await writeFile(env.RESULTS_FILE, `${JSON.stringify(file, null, '\t')}\n`);
	const counts = new Map<string, number>();
	for (const r of results) {
		const label = r.check ? r.check.status : 'error';
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	console.log(`Wrote ${results.length} results to ${env.RESULTS_FILE}: ${[...counts].map(([label, n]) => `${n} ${label}`).join(', ') || 'none'}.`);
}

await main();
