import { describe, expect, it } from 'vitest';
import type { DistRecord, DistributionFile } from '../../catalog/src/dist.ts';
import type { CheckItem, PlanFile } from './dist-assets.ts';
import { type ResultsFile, changedKeys, commitMessage, mergeReport, mergeResults, readResults, recordSummary, serializeDistribution } from './dist-merge.ts';

const MUSIC: DistRecord = {
	repo: 'egoist/mygo-music',
	tag: 'v0.1.24',
	published: '2026-11-11',
	mac: { formats: ['dmg', 'tar.gz', 'install.sh'], updates: 'mygo', deltas: true, check: { file: 'mygo-music-0.1.24-arm64.dmg', asset: 736032440, status: 'notarized', signer: 'Developer ID Application: Kevin Titor (ABCDE12345)', stapled: true, checked: '2026-11-12' } },
	win: { formats: ['setup', 'tar.gz', 'install.ps1'], updates: 'mygo', deltas: true, check: { file: 'mygo-music-setup-0.1.24-amd64.exe', asset: 736033836, status: 'unsigned', checked: '2026-11-12' } },
	linux: { formats: ['deb', 'rpm', 'tar.gz', 'install.sh'], updates: 'mygo', deltas: true },
};
const VITALS: DistRecord = { repo: 'xbenduan/vitals', tag: 'v0.3.2', published: '2026-10-11', mac: { formats: ['dmg'], check: { file: 'Vitals.0.3.2.dmg', asset: 629921812, status: 'unknown', checked: '2026-11-12', note: 'no app bundle in the disk image' } } };
const PRE: DistRecord = { repo: 'o/pre', tag: 'v2-beta', published: '2026-10-01', prerelease: true, linux: { formats: ['AppImage'] } };

describe('distribution.json', () => {
	it('is written with tabs, each record on one line in the contract’s field order, and a trailing newline', () => {
		const bytes = serializeDistribution({ asOf: '2026-11-12', entries: { 'app:vitals': VITALS, 'app:mygo-music': MUSIC, 'app:pre': PRE } });
		expect(bytes).toBe(
			[
				'{',
				'\t"$schema": "./schema/distribution.schema.json",',
				'\t"asOf": "2026-11-12",',
				'\t"entries": {',
				'\t\t"app:mygo-music": { "repo": "egoist/mygo-music", "tag": "v0.1.24", "published": "2026-11-11", "mac": { "formats": ["dmg", "tar.gz", "install.sh"], "updates": "mygo", "deltas": true, "check": { "file": "mygo-music-0.1.24-arm64.dmg", "asset": 736032440, "status": "notarized", "signer": "Developer ID Application: Kevin Titor (ABCDE12345)", "stapled": true, "checked": "2026-11-12" } }, "win": { "formats": ["setup", "tar.gz", "install.ps1"], "updates": "mygo", "deltas": true, "check": { "file": "mygo-music-setup-0.1.24-amd64.exe", "asset": 736033836, "status": "unsigned", "checked": "2026-11-12" } }, "linux": { "formats": ["deb", "rpm", "tar.gz", "install.sh"], "updates": "mygo", "deltas": true } },',
				'\t\t"app:pre": { "repo": "o/pre", "tag": "v2-beta", "published": "2026-10-01", "prerelease": true, "linux": { "formats": ["AppImage"] } },',
				'\t\t"app:vitals": { "repo": "xbenduan/vitals", "tag": "v0.3.2", "published": "2026-10-11", "mac": { "formats": ["dmg"], "check": { "file": "Vitals.0.3.2.dmg", "asset": 629921812, "status": "unknown", "checked": "2026-11-12", "note": "no app bundle in the disk image" } } }',
				'\t}',
				'}',
				'',
			].join('\n'),
		);
	});

	it('has the same bytes whatever order the records and their fields come in, and leaves undefined fields out', () => {
		const shuffled: DistRecord = { linux: MUSIC.linux, win: { check: MUSIC.win?.check, deltas: true, updates: 'mygo', formats: ['setup', 'tar.gz', 'install.ps1'] }, mac: MUSIC.mac, published: MUSIC.published, tag: MUSIC.tag, repo: MUSIC.repo, prerelease: undefined };
		const a = serializeDistribution({ asOf: '2026-11-12', entries: { 'app:mygo-music': MUSIC, 'app:vitals': VITALS } });
		const b = serializeDistribution({ asOf: '2026-11-12', entries: { 'app:vitals': VITALS, 'app:mygo-music': shuffled } });
		expect(b).toBe(a);
	});

	it('reads back as the records it was written from', () => {
		const file: DistributionFile = { asOf: '2026-11-12', entries: { 'app:mygo-music': MUSIC, 'app:vitals': VITALS, 'app:pre': PRE } };
		const parsed = JSON.parse(serializeDistribution(file));
		expect(parsed.$schema).toBe('./schema/distribution.schema.json');
		expect({ asOf: parsed.asOf, entries: parsed.entries }).toEqual(file);
		expect(serializeDistribution({ asOf: parsed.asOf, entries: parsed.entries })).toBe(serializeDistribution(file));
	});

	it('writes no records as an empty object, and asOf null before the first run', () => {
		expect(serializeDistribution({ asOf: null, entries: {} })).toBe('{\n\t"$schema": "./schema/distribution.schema.json",\n\t"asOf": null,\n\t"entries": {}\n}\n');
	});
});

describe('a runner’s results', () => {
	it('are read when each has a check of the runner’s statuses or an error', () => {
		const json = { os: 'mac', results: [{ key: 'app:a', asset: 1, check: { file: 'a.dmg', asset: 1, status: 'adhoc', checked: '2026-11-12' } }, { key: 'app:b', asset: 2, error: 'download failed: 502' }] };
		expect(readResults(json, 'mac')).toBe(json);
	});

	it('are refused when malformed, as that is a broken check step', () => {
		expect(() => readResults({ os: 'win', results: [] }, 'mac')).toThrow(/not one of mac results/);
		expect(() => readResults({ os: 'mac', results: [{ key: 'app:a', asset: 1, check: { file: 'a.dmg', asset: 1, status: 'trusted', checked: '2026-11-12' } }] }, 'mac')).toThrow(/malformed check/);
		expect(() => readResults({ os: 'mac', results: [{ key: 'app:a', asset: 1, check: { file: 'a.dmg', asset: 2, status: 'adhoc', checked: '2026-11-12' } }] }, 'mac')).toThrow(/malformed check/);
		expect(() => readResults({ os: 'win', results: [{ key: 'app:a', asset: 1 }] }, 'win')).toThrow(/neither a check nor an error/);
	});
});

describe('the merge', () => {
	const item = (key: string, os: 'mac' | 'win', asset: number): CheckItem => ({ key, os, file: `${key.slice(4)}-${os}`, asset, url: `https://example.com/${asset}`, size: 1000 });
	const record = (repo: string): DistRecord => ({ repo, tag: 'v1', published: '2026-11-10', mac: { formats: ['dmg'] }, win: { formats: ['setup'] } });
	const planOf = (keys: string[], extra: Partial<PlanFile> = {}): PlanFile => ({
		asOf: '2026-11-12',
		entries: Object.fromEntries(keys.map((k) => [k, record(`o/${k.slice(4)}`)])),
		checks: keys.flatMap((k, i) => [item(k, 'mac', 100 + i), item(k, 'win', 200 + i)]),
		...extra,
	});
	const macCheck = (asset: number, status = 'notarized') => ({ file: 'f', asset, status, checked: '2026-11-12' });
	const winCheck = (asset: number, status = 'trusted') => ({ file: 'f', asset, status, checked: '2026-11-12' });
	const empty: DistributionFile = { asOf: null, entries: {} };
	const allOk = (plan: PlanFile): Record<'mac' | 'win', ResultsFile> => ({
		mac: { os: 'mac', results: plan.checks.filter((c) => c.os === 'mac').map((c) => ({ key: c.key, asset: c.asset, check: macCheck(c.asset) as ResultsFile['results'][number]['check'] })) },
		win: { os: 'win', results: plan.checks.filter((c) => c.os === 'win').map((c) => ({ key: c.key, asset: c.asset, check: winCheck(c.asset) as ResultsFile['results'][number]['check'] })) },
	});

	it('puts each check into its record’s system, without touching the plan', () => {
		const plan = planOf(['app:a', 'app:b']);
		const merged = mergeResults(plan, allOk(plan), empty, { allowMissing: false });
		expect(merged.file.asOf).toBe('2026-11-12');
		expect(merged.file.entries['app:a'].mac?.check).toEqual(macCheck(100));
		expect(merged.file.entries['app:b'].win?.check).toEqual(winCheck(201));
		expect(merged.checked).toHaveLength(4);
		expect(merged.failed).toEqual([]);
		expect(plan.entries['app:a'].mac?.check).toBeUndefined();
	});

	it('leaves a system unchecked when its check failed, or its result is of another file, unless the current file has a check of the same file', () => {
		const plan = planOf(['app:a', 'app:b', 'app:c', 'app:d', 'app:e', 'app:f']);
		const results = allOk(plan);
		results.mac.results[0] = { key: 'app:a', asset: 100, error: 'download failed: 502' };
		results.mac.results[1] = { key: 'app:b', asset: 999, check: macCheck(999) as ResultsFile['results'][number]['check'] };
		const prev: DistributionFile = { asOf: '2026-11-01', entries: { 'app:a': { ...record('o/a'), mac: { formats: ['dmg'], check: { file: 'a', asset: 100, status: 'developer-id', checked: '2026-10-01' } } }, 'app:b': { ...record('o/b'), mac: { formats: ['dmg'], check: { file: 'b', asset: 55, status: 'adhoc', checked: '2026-10-01' } } } } };
		const merged = mergeResults(plan, results, prev, { allowMissing: false });
		expect(merged.file.entries['app:a'].mac?.check).toEqual({ file: 'a', asset: 100, status: 'developer-id', checked: '2026-10-01' });
		expect(merged.file.entries['app:b'].mac?.check).toBeUndefined();
		expect(merged.failed).toEqual([
			{ key: 'app:a', os: 'mac', file: 'a-mac', error: 'download failed: 502', kept: true },
			{ key: 'app:b', os: 'mac', file: 'b-mac', error: 'the runner reported nothing of it', kept: false },
		]);
	});

	it('throws when a runner wrote no results for the checks queued for it, unless that is allowed', () => {
		const plan = planOf(['app:a']);
		expect(() => mergeResults(plan, { mac: allOk(plan).mac }, empty, { allowMissing: false })).toThrow(/win runner wrote no results/);
		const merged = mergeResults(plan, { mac: allOk(plan).mac }, empty, { allowMissing: true });
		expect(merged.skipped).toEqual(['win']);
		expect(merged.failed).toEqual([]);
		expect(merged.file.entries['app:a'].win?.check).toBeUndefined();
		// A system with nothing queued needs no results.
		expect(mergeResults({ ...plan, checks: plan.checks.filter((c) => c.os === 'mac') }, { mac: allOk(plan).mac }, empty, { allowMissing: false }).failed).toEqual([]);
	});

	it('throws when more than a fifth of the queued checks, and more than three, failed', () => {
		const plan = planOf(['app:a', 'app:b', 'app:c', 'app:d', 'app:e', 'app:f', 'app:g', 'app:h', 'app:i', 'app:j']);
		const failing = (n: number) => {
			const r = allOk(plan);
			r.win.results = r.win.results.map((x, i) => (i < n ? { key: x.key, asset: x.asset, error: 'timeout' } : x));
			return r;
		};
		expect(mergeResults(plan, failing(4), empty, { allowMissing: false }).failed).toHaveLength(4);
		expect(() => mergeResults(plan, failing(5), empty, { allowMissing: false })).toThrow(/5 of the 20 queued checks failed/);
		const small = planOf(['app:a', 'app:b']);
		const r = allOk(small);
		r.mac.results = r.mac.results.map((x) => ({ key: x.key, asset: x.asset, error: 'timeout' }));
		r.win.results = r.win.results.map((x, i) => (i === 0 ? { key: x.key, asset: x.asset, error: 'timeout' } : x));
		expect(mergeResults(small, r, empty, { allowMissing: false }).failed).toHaveLength(3);
	});

	it('leaves out the records of apps the catalog no longer lists', () => {
		const plan = planOf(['app:a', 'app:b']);
		const merged = mergeResults(plan, allOk(plan), empty, { allowMissing: false, apps: new Set(['app:a']) });
		expect(Object.keys(merged.file.entries)).toEqual(['app:a']);
		expect(merged.dropped).toEqual(['app:b']);
	});
});

describe('the commit and the report', () => {
	const prev: DistributionFile = { asOf: '2026-11-11', entries: { 'app:mygo-music': { ...MUSIC, tag: 'v0.1.23' }, 'app:old': PRE, 'app:vitals': VITALS } };
	const next: DistributionFile = { asOf: '2026-11-12', entries: { 'app:mygo-music': MUSIC, 'app:pre': PRE, 'app:vitals': VITALS } };

	it('say what each system’s check says', () => {
		expect(recordSummary(MUSIC)).toBe('mac notarized, win unsigned, linux');
		expect(recordSummary({ repo: 'o/r', tag: 'v1', published: '2026-11-01', win: { formats: ['zip'] } })).toBe('win not checked');
	});

	it('list the records that changed, were added or were removed', () => {
		expect(changedKeys(prev, next)).toEqual({ changed: ['app:mygo-music', 'app:pre'], removed: ['app:old'] });
		expect(commitMessage(prev, next)).toBe('chore(distribution): latest releases as of 2026-11-12\n\n- app:mygo-music: mac notarized, win unsigned, linux\n- app:pre: linux\n- app:old: removed\n');
		expect(commitMessage(next, next)).toBe('chore(distribution): latest releases as of 2026-11-12\n');
	});

	it('report the statuses across the file, the checks run and failed, and the apps whose release offers nothing', () => {
		const plan: PlanFile = { asOf: '2026-11-12', entries: next.entries, checks: [{ key: 'app:vitals', os: 'mac', file: 'Vitals.0.3.2.dmg', asset: 629921812, url: 'u', size: 1 }], noSystem: ['app:audiosmith'] };
		const report = mergeReport(prev, { file: next, checked: [{ ...plan.checks[0], check: VITALS.mac?.check as NonNullable<DistRecord['mac']>['check'] & object }], failed: [], skipped: [], dropped: [] }, plan);
		expect(report).toContain('| notarized | 1 |  |');
		expect(report).toContain('| unsigned | 0 | 1 |');
		expect(report).toContain('| unknown | 1 | 0 |');
		expect(report).not.toContain('| developer-id |');
		expect(report).toContain('- app:vitals mac: unknown: no app bundle in the disk image, Vitals.0.3.2.dmg');
		expect(report).toContain('### A release that offers no system anything (1)\n\napp:audiosmith');
		expect(report).toContain('- app:pre: new, v2-beta (prerelease), linux');
		expect(report).toContain('- app:old: removed');
	});
});
