import type { BenchCase, BenchFramework, BenchRun, BenchValues, StringKey } from '@awesome-mygo/catalog';

// What the comparison page's benchmark tables and charts show, shared by the original look (routes/compare.tsx) and the retro one (retro/pages/Compare.tsx).

// The frameworks in the order the page shows them, as the framework table does: MyGo first, the others alphabetically. A run shows those it measures.
export const BENCH_FWS: { key: BenchFramework; name: string }[] = [
	{ key: 'mygo', name: 'MyGo' },
	{ key: 'fyne', name: 'Fyne' },
	{ key: 'nsgo', name: 'NSGo' },
	{ key: 'wails', name: 'Wails' },
];

export const fwsOf = (run: BenchRun) => BENCH_FWS.filter((f) => run.frameworks.includes(f.key));

export const cpuOf = (v: BenchValues) => v.cpu + (v.compositor ?? 0);

// A row of a benchmark table: what it measures, its unit, whether more is better (frames alone), and its value for a framework the run measures.
export interface BenchRow {
	label: StringKey;
	of?: BenchCase;
	unit: string;
	higher?: boolean;
	value: (run: BenchRun, fw: BenchFramework) => number | undefined;
}

const caseValue = (c: BenchCase, f: (v: BenchValues) => number | undefined) => (r: BenchRun, fw: BenchFramework) => {
	const v = r.cases[c][fw];
	return v ? f(v) : undefined;
};

export const BENCH_ROWS: BenchRow[] = [
	{ label: 'bench_size', unit: 'MB', value: (r, fw) => (r.size[fw] === undefined ? undefined : r.size[fw] / 1e6) },
	...(['counter', 'list', 'quotes'] as const).map((c) => ({ label: 'bench_startup' as const, of: c, unit: 'ms', value: caseValue(c, (v) => v.startup) })),
	...(['counter', 'list', 'quotes'] as const).map((c) => ({ label: 'bench_memory' as const, of: c, unit: 'MB', value: caseValue(c, (v) => v.memory / 1e6) })),
	// The process's CPU and the compositor's added, as the suite says to read them. The counter is left out: it is idle, near 0 for all.
	...(['list', 'quotes'] as const).map((c) => ({ label: 'bench_cpu' as const, of: c, unit: '%', value: caseValue(c, cpuOf) })),
	// The frames each changed per second, which the CPU is for: Fyne and the system webview change 60 where the others follow the display.
	...(['list', 'quotes'] as const).map((c) => ({ label: 'bench_fps' as const, of: c, unit: 'fps', higher: true, value: caseValue(c, (v) => v.fps) })),
];

export const num = (n: number, unit: string) => (unit === 'ms' || unit === 'fps' ? Math.round(n).toString() : n.toFixed(1));

// A row's values for the frameworks the run measures, and the best of them, unless every value shows the same.
export function rowValues(row: BenchRow, run: BenchRun) {
	const values = fwsOf(run).flatMap((f) => {
		const v = row.value(run, f.key);
		return v === undefined ? [] : [{ ...f, v }];
	});
	const best = values.length ? (row.higher ? Math.max : Math.min)(...values.map((x) => x.v)) : undefined;
	const tie = best === undefined || values.every((x) => num(x.v, row.unit) === num(best, row.unit));
	return { values, best: tie ? undefined : best };
}
