import type { BenchCase, BenchFramework, BenchRun, BenchValues, StringKey } from '@awesome-mygo/catalog';

// What the comparison page's benchmark tables and charts show, shared by the original look (routes/compare.tsx) and the retro one (retro/pages/Compare.tsx).

// The rows of a benchmark table: what it measures, its unit, and its value for a framework, lower being better in every row.
export const BENCH_ROWS: { label: StringKey; of?: BenchCase; unit: string; value: (run: BenchRun, fw: BenchFramework) => number }[] = [
	{ label: 'bench_size', unit: 'MB', value: (r, fw) => r.size[fw] / 1e6 },
	...(['counter', 'list', 'quotes'] as const).map((c) => ({ label: 'bench_startup' as const, of: c, unit: 'ms', value: (r: BenchRun, fw: BenchFramework) => r.cases[c][fw].startup })),
	...(['counter', 'list', 'quotes'] as const).map((c) => ({ label: 'bench_memory' as const, of: c, unit: 'MB', value: (r: BenchRun, fw: BenchFramework) => r.cases[c][fw].memory / 1e6 })),
	// The process's CPU and the compositor's added, as the suite says to read them. The counter is left out: it is idle, at 0 for both.
	...(['list', 'quotes'] as const).map((c) => ({ label: 'bench_cpu' as const, of: c, unit: '%', value: (r: BenchRun, fw: BenchFramework) => cpuOf(r.cases[c][fw]) })),
];
export const cpuOf = (v: BenchValues) => v.cpu + (v.compositor ?? 0);
export const BENCH_FWS: { key: BenchFramework; name: string }[] = [
	{ key: 'mygo', name: 'MyGo' },
	{ key: 'nsgo', name: 'NSGo' },
];
export const num = (n: number, unit: string) => (unit === 'ms' ? Math.round(n).toString() : n.toFixed(1));
