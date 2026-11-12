import distributionJson from '../data/distribution.json';
import type { App } from './catalog';
import { DIST_CHECK_FIELDS, DIST_FORMATS, DIST_OSES, DIST_PLATFORM_FIELDS, DIST_RECORD_FIELDS, DIST_UPDATERS, type DistCheck, type DistOs, type DistPlatform, type DistRecord, type DistributionFile, MAC_SIGN, WIN_SIGN } from './dist';
import { scoreKey, scoreTarget } from './score';
import { CatalogError, Reader } from './validate';

export * from './dist';

// How each app is shipped, as the scheduled Update distribution workflow records it in data/distribution.json (dist.ts), checked as it loads. Only the workflow writes the file, and it runs the tests before it commits: a mistake in it fails them with the app's key and the field, such as mac.check.status.

const SCHEMA = './schema/distribution.schema.json';
const KEY = /^app:\S+$/;
const REPO = /^[^/\s]+\/[^/\s]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// A calendar day as YYYY-MM-DD, and one that exists, as scores.json's days are read.
function readDay(r: Reader, field: string): string {
	const v = r.match(field, DAY, 'a day like 2026-11-02');
	const t = Date.parse(`${v}T00:00:00Z`);
	if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== v) r.fail(field, `must be a day that exists, got "${v}"`);
	return v;
}

// A Reader of an object inside a record, whose mistakes name the field by its path in the record, such as mac.check.status.
class PartReader extends Reader {
	readonly at: string;

	constructor(file: string, at: string, raw: Record<string, unknown>) {
		super(file, raw);
		this.at = at;
	}

	override fail(field: string, why: string): never {
		return super.fail(`${this.at}.${field}`, why);
	}
}

// The object in field of r's object, read by its path at.
function part(r: Reader, field: string, at: string): PartReader {
	const v = r.raw[field];
	if (!v || typeof v !== 'object' || Array.isArray(v)) r.fail(field, 'must be an object');
	return new PartReader(r.file, at, v as Record<string, unknown>);
}

// The check of a system's file. The status is one the system's own tools can give (MAC_SIGN, WIN_SIGN), a file that is unsigned or signed ad hoc has no signer, an unknown status comes with the note that says why, and only macOS staples a notarization ticket or checks an installer package's own signature.
function readCheck(r: PartReader, os: 'mac' | 'win'): DistCheck {
	r.only(DIST_CHECK_FIELDS);
	const file = r.str('file');
	const asset = r.raw.asset;
	if (typeof asset !== 'number' || !Number.isInteger(asset) || asset < 1) r.fail('asset', `must be the release asset's GitHub id, a whole number from 1, got ${JSON.stringify(asset)}`);
	const status: string = r.oneOf('status', os === 'mac' ? MAC_SIGN : WIN_SIGN);
	const signer = r.optStr('signer');
	if (signer !== undefined && (status === 'unsigned' || status === 'adhoc')) r.fail('signer', `is not recorded for a file that is ${status}`);
	if (r.raw.stapled !== undefined && os !== 'mac') r.fail('stapled', 'is recorded only on mac, where a notarization ticket can be stapled');
	const stapled = r.raw.stapled === undefined ? undefined : r.bool('stapled');
	if (r.raw.pkg !== undefined && os !== 'mac') r.fail('pkg', 'is recorded only on mac, where an installer package is checked by its own signature');
	if (r.raw.pkg !== undefined && r.raw.pkg !== true) r.fail('pkg', 'is written only as true, and left out otherwise');
	const pkg = r.raw.pkg === true ? true : undefined;
	const checked = readDay(r, 'checked');
	const note = r.optStr('note');
	if (status === 'unknown' && note === undefined) r.fail('note', 'is required when the status is unknown: it says why the file could not be checked');
	return { file, asset, status, signer, stapled, pkg, checked, note };
}

// One system's part of a record: formats it offers, never none, each once and in the order DIST_FORMATS lists that system's; the updater the release shows, with deltas only for MyGo's; and the check of its file, never on Linux.
function readPlatform<O extends DistOs>(record: Reader, os: O): DistPlatform<O> {
	const r = part(record, os, os);
	r.only(DIST_PLATFORM_FIELDS);
	const order: readonly string[] = DIST_FORMATS[os];
	const formats = r.strings('formats', 1);
	for (const f of formats) if (!order.includes(f)) r.fail('formats', `must hold only formats of ${os} (${order.join(', ')}), got "${f}"`);
	if (formats.some((f, i) => i > 0 && order.indexOf(f) <= order.indexOf(formats[i - 1]))) r.fail('formats', `must list each format once, in the order ${order.join(', ')}, got ${formats.join(', ')}`);
	const updates = r.raw.updates === undefined ? undefined : r.oneOf('updates', DIST_UPDATERS);
	if (r.raw.deltas !== undefined && r.raw.deltas !== true) r.fail('deltas', 'is written only as true, and left out otherwise');
	const deltas = r.raw.deltas === true ? true : undefined;
	if (deltas && updates !== 'mygo') r.fail('deltas', 'is recorded only with the MyGo updater (updates: mygo)');
	if (os === 'linux' && r.raw.check !== undefined) r.fail('check', 'is not recorded on linux, where packages are not signed in a way the system checks at install');
	const check = r.raw.check === undefined ? undefined : readCheck(part(r, 'check', `${os}.check`), os as 'mac' | 'win');
	return { formats, updates, deltas, check } as DistPlatform<O>;
}

// One app's record: the repository and release it was read from, and a part for at least one system.
function readRecord(key: string, json: unknown): DistRecord {
	if (!json || typeof json !== 'object' || Array.isArray(json)) throw new CatalogError(`distribution.json (${key}): must be an object`);
	const r: Reader = new Reader(`distribution.json (${key})`, json as Record<string, unknown>);
	r.only(DIST_RECORD_FIELDS);
	const repo = r.match('repo', REPO, 'owner/name');
	const tag = r.str('tag');
	const published = readDay(r, 'published');
	if (r.raw.prerelease !== undefined && r.raw.prerelease !== true) r.fail('prerelease', 'is written only as true, and left out otherwise');
	const prerelease = r.raw.prerelease === true ? true : undefined;
	const mac = r.raw.mac === undefined ? undefined : readPlatform(r, 'mac');
	const win = r.raw.win === undefined ? undefined : readPlatform(r, 'win');
	const linux = r.raw.linux === undefined ? undefined : readPlatform(r, 'linux');
	if (!mac && !win && !linux) r.fail(DIST_OSES.join(' or '), 'is required: an app whose release offers no system anything has no record');
	return { repo, tag, published, prerelease, mac, win, linux };
}

// data/distribution.json, or a version of it: throws a CatalogError naming the app's key and the field of the first mistake.
export function readDistribution(json: unknown): DistributionFile {
	if (!json || typeof json !== 'object' || Array.isArray(json)) throw new CatalogError('distribution.json: must be an object');
	const r: Reader = new Reader('distribution.json', json as Record<string, unknown>);
	r.only(['$schema', 'asOf', 'entries']);
	if (r.raw.$schema !== SCHEMA) r.fail('$schema', `must be "${SCHEMA}"`);
	const asOf = r.raw.asOf === null ? null : readDay(r, 'asOf');
	const raw = r.raw.entries;
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) r.fail('entries', 'must be an object of records by app key');
	const entries: Record<string, DistRecord> = {};
	for (const [key, record] of Object.entries(raw)) {
		if (!KEY.test(key)) r.fail(`entries.${key}`, 'is not an app key: app:<slug>');
		entries[key] = readRecord(key, record);
	}
	if (asOf === null && Object.keys(entries).length) r.fail('asOf', 'is required once there are entries: it is the day of the run that recorded them');
	return { asOf, entries };
}

// The record in file of the app's release, when it was read from the repository the app names now (scoreTarget: its repo field, or its link when that is a repository): an app whose repository changed shows nothing until the workflow reads the new one, never another repository's release. A record of an app that is gone is never asked for, so removing an app never trips on the file.
export function distributionFor(file: DistributionFile, app: Pick<App, 'slug' | 'repo' | 'url'>): DistRecord | undefined {
	const key = scoreKey('app', app);
	const record = Object.hasOwn(file.entries, key) ? file.entries[key] : undefined;
	return record && record.repo === scoreTarget({ repo: app.repo, url: app.url }).repo ? record : undefined;
}

const FILE = readDistribution(distributionJson);

// The UTC day of the workflow's last run, null before it first runs.
export const DISTRIBUTION_AS_OF: string | null = FILE.asOf;

// How the app is shipped, from the bundled data/distribution.json; undefined when it has no record of the repository the app names now.
export function appDistribution(app: App): DistRecord | undefined {
	return distributionFor(FILE, app);
}
