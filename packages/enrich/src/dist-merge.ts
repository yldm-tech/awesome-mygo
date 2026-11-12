// What the distribution workflow's merge step (distribution-merge.ts) decides, without touching the network or the disk: how the macOS and Windows runners' results are read and put into the plan's records, data/distribution.json's bytes, and what the report and the commit say. Pure functions, so they are tested on their own (dist-merge.test.ts).

import { DIST_CHECK_FIELDS, DIST_OSES, DIST_PLATFORM_FIELDS, DIST_RECORD_FIELDS, type DistCheck, type DistOs, type DistPlatform, type DistRecord, type DistributionFile, MAC_SIGN, WIN_SIGN } from '../../catalog/src/dist.ts';
import type { CheckItem, PlanFile, SystemCheck } from './dist-assets.ts';

const SCHEMA = './schema/distribution.schema.json';
const CHECKED_OSES = ['mac', 'win'] as const;
type CheckedOs = (typeof CHECKED_OSES)[number];
const STATUSES: Record<CheckedOs, readonly string[]> = { mac: MAC_SIGN, win: WIN_SIGN };

// ---- the file ----

const ordered = (keys: string[]) => keys.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

// An object on one line with its fields in the given order, those left undefined out: { "a": 1, "b": ["x", "y"] }.
function line(o: object, fields: readonly string[], value: (field: string, v: unknown) => string): string {
	const parts = fields.filter((f) => (o as Record<string, unknown>)[f] !== undefined).map((f) => `${JSON.stringify(f)}: ${value(f, (o as Record<string, unknown>)[f])}`);
	return `{ ${parts.join(', ')} }`;
}

const scalar = (v: unknown) => (Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(', ')}]` : JSON.stringify(v));
const checkLine = (c: DistCheck) => line(c, DIST_CHECK_FIELDS, (_, v) => scalar(v));
const platformLine = (p: DistPlatform) => line(p, DIST_PLATFORM_FIELDS, (f, v) => (f === 'check' ? checkLine(v as DistCheck) : scalar(v)));

// One record as the file writes it, on one line, its fields in DIST_RECORD_FIELDS order, a system's in DIST_PLATFORM_FIELDS order and a check's in DIST_CHECK_FIELDS order.
export function recordLine(r: DistRecord): string {
	return line(r, DIST_RECORD_FIELDS, (f, v) => ((DIST_OSES as readonly string[]).includes(f) ? platformLine(v as DistPlatform) : scalar(v)));
}

// data/distribution.json's bytes: tabs, the keys in order, each record on one line, so that its history shows each app's change as one line, and a trailing newline. The same records always give the same bytes.
export function serializeDistribution(file: DistributionFile): string {
	const keys = ordered(Object.keys(file.entries));
	const entries = keys.length ? `{\n${keys.map((k) => `\t\t${JSON.stringify(k)}: ${recordLine(file.entries[k])}`).join(',\n')}\n\t}` : '{}';
	return `{\n\t"$schema": ${JSON.stringify(SCHEMA)},\n\t"asOf": ${JSON.stringify(file.asOf)},\n\t"entries": ${entries}\n}\n`;
}

// ---- the runners' results ----

// One result of a runner: the check when its tools ran, or an error when the file could not be downloaded or a tool failed for a reason that is not about the file.
export interface CheckResult {
	key: string;
	asset: number;
	check?: SystemCheck;
	error?: string;
}

// The file a runner writes (distribution-check.ts): its system, and a result for each check of the plan queued for it.
export interface ResultsFile {
	os: CheckedOs;
	results: CheckResult[];
}

const isDay = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// A runner's results file as the merge reads it, checked for its shape: the system it is named for, each result with a check of that system's statuses or an error. Throws on anything else, as a broken file means a broken check step, not checks that failed.
export function readResults(json: unknown, os: CheckedOs): ResultsFile {
	const body = json as { os?: unknown; results?: unknown } | null;
	if (!body || body.os !== os || !Array.isArray(body.results)) throw new Error(`the ${os} results file is not one of ${os} results`);
	for (const r of body.results as CheckResult[]) {
		const what = `the ${os} result ${JSON.stringify(r)}`;
		if (typeof r?.key !== 'string' || !Number.isSafeInteger(r.asset)) throw new Error(`${what} has no key or asset`);
		if (r.check === undefined) {
			if (typeof r.error !== 'string' || !r.error) throw new Error(`${what} has neither a check nor an error`);
			continue;
		}
		const c = r.check;
		if (typeof c.file !== 'string' || c.asset !== r.asset || !STATUSES[os].includes(c.status) || !isDay(c.checked)) throw new Error(`${what} has a malformed check`);
	}
	return body as ResultsFile;
}

// A check that could not be done: its runner said why, or said nothing of it.
export interface CheckFailure {
	key: string;
	os: CheckedOs;
	file: string;
	error: string;
	// Whether the record keeps its last check of the same file instead.
	kept: boolean;
}

export interface Merged {
	file: DistributionFile;
	checked: (CheckItem & { check: SystemCheck })[];
	failed: CheckFailure[];
	// The systems whose runner wrote no results, with ALLOW_MISSING_RESULTS=true: their queued files stay unchecked.
	skipped: CheckedOs[];
	// Records the plan wrote of apps the catalog no longer lists, left out.
	dropped: string[];
}

// More than this share of the queued checks failing means a broken runner, not files that cannot be read: the run stops, writing nothing.
export const FAILED_LIMIT = 0.2;
// A few failed downloads are no broken runner, whatever share of a small run they are: the run stops only past this many as well.
export const FAILED_MIN = 3;

// The file a merge writes: the plan's records, each queued check's result put into its system's part when its runner checked the file the plan picked. A check that failed, or that its runner did not report, leaves the system without a check (not yet checked), unless the current file has a check of that same file, which is then kept: the file has not changed since. A runner that wrote no results throws unless allowMissing; its system's queued checks then stay unchecked the same way. apps, when given, is the catalog's app keys: records of apps it no longer lists are left out. Throws when more than FAILED_LIMIT of the queued checks, and more than FAILED_MIN, failed.
export function mergeResults(plan: PlanFile, results: Partial<Record<CheckedOs, ResultsFile>>, prev: DistributionFile, opts: { allowMissing: boolean; apps?: ReadonlySet<string> }): Merged {
	const entries = structuredClone(plan.entries) as Record<string, DistRecord>;
	const checked: Merged['checked'] = [];
	const failed: CheckFailure[] = [];
	const skipped: CheckedOs[] = [];
	for (const os of CHECKED_OSES) {
		const queued = plan.checks.filter((c) => c.os === os);
		const file = results[os];
		if (!queued.length) continue;
		if (!file) {
			if (!opts.allowMissing) throw new Error(`the plan queued ${queued.length} ${os} checks, but the ${os} runner wrote no results`);
			skipped.push(os);
		}
		const byItem = new Map((file?.results ?? []).map((r) => [`${r.key} ${r.asset}`, r]));
		for (const item of queued) {
			const record = Object.hasOwn(entries, item.key) ? entries[item.key] : undefined;
			const platform = record?.[os] as DistPlatform | undefined;
			if (!platform) throw new Error(`the plan queues a ${os} check of ${item.key}, but its record has no ${os} part`);
			const result = byItem.get(`${item.key} ${item.asset}`);
			if (result?.check) {
				platform.check = result.check;
				checked.push({ ...item, check: result.check });
				continue;
			}
			const before = Object.hasOwn(prev.entries, item.key) ? prev.entries[item.key][os]?.check : undefined;
			const kept = before !== undefined && before.asset === item.asset;
			if (kept) platform.check = before;
			if (file) failed.push({ key: item.key, os, file: item.file, error: result?.error ?? 'the runner reported nothing of it', kept });
		}
	}
	const counted = plan.checks.filter((c) => !skipped.includes(c.os)).length;
	if (failed.length > FAILED_MIN && failed.length > counted * FAILED_LIMIT) throw new Error(`${failed.length} of the ${counted} queued checks failed, more than ${FAILED_LIMIT * 100}%: ${failed.map((f) => `${f.key} ${f.os}: ${f.error}`).join('; ')}`);
	const dropped = opts.apps ? Object.keys(entries).filter((key) => !opts.apps?.has(key)) : [];
	for (const key of dropped) delete entries[key];
	return { file: { asOf: plan.asOf, entries }, checked, failed, skipped, dropped: ordered(dropped) };
}

// ---- the report and the commit ----

// What a record says of a system in a line: its check's status, or that it is not checked yet; Linux is never checked.
function systemWord(r: DistRecord, os: DistOs): string | undefined {
	const p = r[os];
	if (!p) return undefined;
	if (os === 'linux') return 'linux';
	return `${os} ${p.check?.status ?? 'not checked'}`;
}

export const recordSummary = (r: DistRecord) => DIST_OSES.map((os) => systemWord(r, os)).filter(Boolean).join(', ');

// The keys whose record changed, was added or was removed between two files, in order.
export function changedKeys(prev: DistributionFile, next: DistributionFile): { changed: string[]; removed: string[] } {
	const changed = ordered(Object.keys(next.entries).filter((key) => !Object.hasOwn(prev.entries, key) || recordLine(prev.entries[key]) !== recordLine(next.entries[key])));
	const removed = ordered(Object.keys(prev.entries).filter((key) => !Object.hasOwn(next.entries, key)));
	return { changed, removed };
}

// The commit message of a run's change to the file: each record that changed with what its systems' checks say, and each one removed. No attribution lines.
export function commitMessage(prev: DistributionFile, next: DistributionFile): string {
	const { changed, removed } = changedKeys(prev, next);
	const lines = [...changed.map((key) => `- ${key}: ${recordSummary(next.entries[key])}`), ...removed.map((key) => `- ${key}: removed`)];
	const subject = `chore(distribution): latest releases as of ${next.asOf}`;
	return lines.length ? `${subject}\n\n${lines.join('\n')}\n` : `${subject}\n`;
}

const cell = (s: string) => s.replace(/\|/g, '\\|');

// The merge's Markdown report: how many records there are and how each checked system's checks came out across the file, what this run checked, what it could not, the apps whose release offers no system anything, and what changed.
export function mergeReport(prev: DistributionFile, merged: Merged, plan: PlanFile): string {
	const { file } = merged;
	const out: string[] = [];
	const records = Object.values(file.entries);
	out.push(`## Merge distribution as of ${file.asOf}\n`);
	out.push(`${records.length} records: macOS ${records.filter((r) => r.mac).length}, Windows ${records.filter((r) => r.win).length}, Linux ${records.filter((r) => r.linux).length}.\n`);
	out.push('### Checks across the file\n');
	out.push('| Status | macOS | Windows |');
	out.push('| --- | --: | --: |');
	const statusOf = (r: DistRecord, os: CheckedOs) => (r[os] ? (r[os]?.check?.status ?? 'not checked yet') : undefined);
	for (const status of [...new Set([...MAC_SIGN, ...WIN_SIGN, 'not checked yet'])]) {
		const n = (os: CheckedOs) => records.filter((r) => statusOf(r, os) === status).length;
		const mac = (MAC_SIGN as readonly string[]).includes(status) || status === 'not checked yet' ? n('mac') : undefined;
		const win = (WIN_SIGN as readonly string[]).includes(status) || status === 'not checked yet' ? n('win') : undefined;
		if (mac || win) out.push(`| ${status} | ${mac ?? ''} | ${win ?? ''} |`);
	}
	out.push('');
	out.push(`### Checked in this run (${merged.checked.length} of ${plan.checks.length} queued)\n`);
	for (const c of merged.checked) out.push(`- ${cell(c.key)} ${c.os}: ${c.check.status}${c.check.signer ? ` (${cell(c.check.signer)})` : ''}${c.check.stapled ? ', stapled' : ''}${c.check.note ? `: ${cell(c.check.note)}` : ''}, ${cell(c.file)}`);
	if (!merged.checked.length) out.push('None.');
	out.push('');
	const unreported = plan.checks.filter((c) => merged.skipped.includes(c.os)).length;
	out.push(`### Could not be checked (${merged.failed.length + unreported})\n`);
	for (const f of merged.failed) out.push(`- ${cell(f.key)} ${f.os} ${cell(f.file)}: ${cell(f.error)}${f.kept ? ' (keeps its last check of the same file)' : ''}`);
	for (const os of merged.skipped) out.push(`- The ${os} runner wrote no results (ALLOW_MISSING_RESULTS=true): its ${plan.checks.filter((c) => c.os === os).length} queued files stay unchecked.`);
	if (!merged.failed.length && !merged.skipped.length) out.push('None.');
	out.push('');
	const noSystem = plan.noSystem ?? [];
	out.push(`### A release that offers no system anything (${noSystem.length})\n\n${noSystem.join(', ') || 'None.'}\n`);
	if (merged.dropped.length) out.push(`Left out the records of ${merged.dropped.length} apps the catalog no longer lists: ${merged.dropped.join(', ')}.\n`);
	const { changed, removed } = changedKeys(prev, file);
	out.push(`### Changed (${changed.length + removed.length})\n`);
	for (const key of changed) out.push(`- ${cell(key)}: ${Object.hasOwn(prev.entries, key) ? '' : 'new, '}${file.entries[key].tag}${file.entries[key].prerelease ? ' (prerelease)' : ''}, ${recordSummary(file.entries[key])}`);
	for (const key of removed) out.push(`- ${cell(key)}: removed`);
	if (!changed.length && !removed.length) out.push('None.');
	return `${out.join('\n')}\n`;
}
