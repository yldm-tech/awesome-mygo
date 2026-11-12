import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DistributionFile } from '../../catalog/src/dist.ts';
import type { PlanFile } from './dist-assets.ts';
import { type ResultsFile, commitMessage, mergeReport, mergeResults, readResults, serializeDistribution } from './dist-merge.ts';
import { ENTRY_DIRS } from './source.ts';

// The merge step of .github/workflows/distribution.yml, run on Linux after the macOS and Windows runners checked the files the plan queued (distribution.ts, distribution-check.ts). It puts each runner's results into the plan's records (dist-merge.ts) and writes packages/catalog/data/distribution.json. A check that failed, or that its runner did not report, leaves its system not yet checked, or keeps the current file's check of that same file; more than a fifth of the queued checks failing (and more than 3) throws before anything is written, as that is a broken runner rather than files that cannot be read.
//
// Environment: PLAN_FILE (the plan step's output), RESULTS_DIR (the runners' results-mac.json and results-win.json; a missing one throws when the plan queued checks for its system, unless ALLOW_MISSING_RESULTS=true), DRY_RUN=true to write distribution.json for the catalog's tests that follow and no commit message, as a dry run never commits (the workflow commits only when DRY_RUN is not true), REPORT_FILE (a Markdown summary of the run) and COMMIT_FILE (where the commit message of the change is written, when there is one).

const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = join(ROOT, 'packages/catalog/data');
const DISTRIBUTION_FILE = join(DATA_DIR, 'distribution.json');

const env = process.env;
const DRY_RUN = env.DRY_RUN === 'true';
const ALLOW_MISSING = env.ALLOW_MISSING_RESULTS === 'true';

let report = '';

// A file's text, or undefined when it does not exist.
async function readIfThere(path: string): Promise<string | undefined> {
	try {
		return await readFile(path, 'utf8');
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
		throw err;
	}
}

// The keys of the apps the catalog lists now, as the merge runs on a newer main than the plan may have.
async function catalogKeys(): Promise<Set<string>> {
	const dir = join(DATA_DIR, ENTRY_DIRS.app);
	const keys = new Set<string>();
	for (const name of await readdir(dir)) {
		if (!name.endsWith('.json')) continue;
		const e = JSON.parse(await readFile(join(dir, name), 'utf8')) as { slug: unknown };
		keys.add(`app:${String(e.slug)}`);
	}
	return keys;
}

async function main(): Promise<void> {
	if (!env.PLAN_FILE) throw new Error('PLAN_FILE is not set');
	if (!env.RESULTS_DIR) throw new Error('RESULTS_DIR is not set');
	const plan = JSON.parse(await readFile(env.PLAN_FILE, 'utf8')) as PlanFile;
	const results: Partial<Record<'mac' | 'win', ResultsFile>> = {};
	for (const os of ['mac', 'win'] as const) {
		const text = await readIfThere(join(env.RESULTS_DIR, `results-${os}.json`));
		if (text !== undefined) results[os] = readResults(JSON.parse(text), os);
	}
	const raw = await readIfThere(DISTRIBUTION_FILE);
	const current = raw === undefined ? { asOf: null, entries: {} } : (JSON.parse(raw) as DistributionFile);
	const prev: DistributionFile = { asOf: current.asOf, entries: current.entries };
	const merged = mergeResults(plan, results, prev, { allowMissing: ALLOW_MISSING, apps: await catalogKeys() });
	report = mergeReport(prev, merged, plan);
	console.log(report);
	for (const f of merged.failed) console.log(`::warning::${f.key} ${f.os}: ${f.file} could not be checked: ${f.error}`);

	const bytes = serializeDistribution(merged.file);
	const end = (line: string) => {
		report += `\n${line}\n`;
		console.log(line);
	};
	if (bytes === raw) return end('distribution.json is unchanged.');
	// A dry run writes the file too, so that the catalog's tests after it read what this run made rather than the committed file.
	await writeFile(DISTRIBUTION_FILE, bytes);
	if (DRY_RUN) return end('A dry run: wrote distribution.json for the catalog\'s tests, and nothing is committed.');
	if (env.COMMIT_FILE) await writeFile(env.COMMIT_FILE, commitMessage(prev, merged.file));
	end('Wrote distribution.json.');
}

try {
	await main();
} catch (err) {
	report += `\n### Failed\n\n${err instanceof Error ? err.message : String(err)}\n\nNothing was written; the next run tries again.\n`;
	throw err;
} finally {
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, report);
}
