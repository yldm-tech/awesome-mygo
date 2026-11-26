import { BENCH_RUNS, BENCH_SUITE, type BenchCase, type BenchFramework, type BenchRun, type BenchValues, FRAMEWORKS, type Framework, MYGO_BENCH, type StringKey } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useT } from '../lib/lang';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/compare')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/compare', title: 'title_compare', desc: 'desc_compare', name: 'compare_h' }),
	component: ComparePage,
});

// Four columns from lg up, under one header row; below lg each framework is a block whose cells show their own labels. From lg up those labels stay for screen readers, which skip the header row drawn for sighted readers.
const COLS = 'grid grid-cols-[minmax(150px,0.8fr)_minmax(0,1.6fr)_minmax(0,1.6fr)_minmax(110px,0.6fr)] gap-x-8 max-lg:grid-cols-1 max-lg:gap-y-3';
const CELL_LABEL = 'font-mono text-[11px] tracking-[0.08em] text-fg-3 uppercase lg:sr-only';
const EXT = 'text-[13px] font-semibold text-fg-2 no-underline hover:text-cyan';

function Row({ fw }: { fw: Framework }) {
	const t = useT();
	return (
		<article className={`${COLS} border-b border-line px-2 py-6 max-sm:px-0`}>
			<div className='flex flex-col gap-2'>
				<h2 lang='en' className='m-0 font-display text-[26px] leading-none font-black tracking-[-0.02em]'>
					{fw.name}
				</h2>
				<span className='flex flex-wrap gap-x-4 gap-y-1'>
					<a className={EXT} href={fw.site} target='_blank' rel='noopener'>
						{t.fw_site} ↗
					</a>
					<a className={EXT} href={fw.repo} target='_blank' rel='noopener'>
						GitHub ↗
					</a>
				</span>
			</div>
			<div className='flex flex-col gap-1'>
				<span className={CELL_LABEL}>{t.fw_col_ui}</span>
				<p className='m-0 text-[15px] leading-[1.6] text-fg-2'>{t[fw.ui]}</p>
				<a className='font-mono text-[11px] text-fg-3 no-underline hover:text-cyan' href={fw.source} target='_blank' rel='noopener'>
					{t.fw_source} ↗
				</a>
			</div>
			<div className='flex flex-col gap-1'>
				<span className={CELL_LABEL}>{t.fw_col_platforms}</span>
				<ul className='m-0 flex list-none flex-wrap gap-1.5 p-0'>
					{fw.platforms.map((p) => (
						<li key={p.name} className={`rounded-full border px-2.5 py-0.5 text-[12px] ${p.status ? 'border-dashed border-line-3 text-fg-3' : 'border-line-2 text-fg-2'}`}>
							{p.label ? t[p.label] : p.name}
							{p.status && ` · ${p.status === 'preview' ? t.fw_preview : t.fw_experimental}`}
						</li>
					))}
				</ul>
			</div>
			<div className='flex flex-col gap-1'>
				<span className={CELL_LABEL}>{t.fw_col_license}</span>
				<span className='font-mono text-[13px] text-fg-2'>{fw.license}</span>
			</div>
		</article>
	);
}

// The rows of a benchmark table: what it measures, its unit, and its value for a framework, lower being better in every row.
const BENCH_ROWS: { label: StringKey; of?: BenchCase; unit: string; value: (run: BenchRun, fw: BenchFramework) => number }[] = [
	{ label: 'bench_size', unit: 'MB', value: (r, fw) => r.size[fw] / 1e6 },
	...(['counter', 'list', 'quotes'] as const).map((c) => ({ label: 'bench_startup' as const, of: c, unit: 'ms', value: (r: BenchRun, fw: BenchFramework) => r.cases[c][fw].startup })),
	...(['counter', 'list', 'quotes'] as const).map((c) => ({ label: 'bench_memory' as const, of: c, unit: 'MB', value: (r: BenchRun, fw: BenchFramework) => r.cases[c][fw].memory / 1e6 })),
	// The process's CPU and the compositor's added, as the suite says to read them. The counter is left out: it is idle, at 0 for both.
	...(['list', 'quotes'] as const).map((c) => ({ label: 'bench_cpu' as const, of: c, unit: '%', value: (r: BenchRun, fw: BenchFramework) => cpuOf(r.cases[c][fw]) })),
];
const cpuOf = (v: BenchValues) => v.cpu + (v.compositor ?? 0);
const BENCH_FWS: { key: BenchFramework; name: string }[] = [
	{ key: 'mygo', name: 'MyGo' },
	{ key: 'nsgo', name: 'NSGo' },
];
const num = (n: number, unit: string) => (unit === 'ms' ? Math.round(n).toString() : n.toFixed(1));

function BenchTable({ run }: { run: BenchRun }) {
	const t = useT();
	return (
		<div className='flex min-w-0 flex-col gap-3 rounded-[16px] border border-line-2 bg-panel p-5 max-sm:p-4'>
			<div className='flex flex-col gap-1'>
				<h3 className='m-0 text-[20px] font-black'>{run.os}</h3>
				<span className='font-mono text-[11px] text-fg-3'>
					{run.cpu} · {run.date} · MyGo {run.versions.mygo} · NSGo {run.versions.nsgo}
				</span>
			</div>
			<table className='w-full border-collapse text-[13px] tabular-nums'>
				<thead>
					<tr className='border-b border-line text-left font-mono text-[11px] tracking-[0.06em] text-fg-3 uppercase'>
						<th scope='col' className='py-2 pr-2 font-normal' />
						{BENCH_FWS.map((f) => (
							<th key={f.key} scope='col' lang='en' className='py-2 pl-2 text-right font-normal'>
								{f.name}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{BENCH_ROWS.map((row) => {
						const values = BENCH_FWS.map((f) => row.value(run, f.key));
						const best = Math.min(...values);
						const tie = values.every((v) => num(v, row.unit) === num(best, row.unit));
						return (
							<tr key={`${row.label}-${row.of ?? ''}`} className='border-b border-line last:border-b-0'>
								<th scope='row' className='py-2 pr-2 text-left font-normal text-fg-2'>
									{t[row.label]}
									{row.of && <span className='block text-[11px] text-fg-3'>{t[`bench_case_${row.of}`]}</span>}
								</th>
								{values.map((v, i) => (
									<td key={BENCH_FWS[i].key} className={`py-2 pl-2 text-right whitespace-nowrap ${!tie && v === best ? 'font-bold text-fg' : 'text-fg-2'}`}>
										{num(v, row.unit)} <span className='text-[11px] text-fg-3'>{row.unit}</span>
									</td>
								))}
							</tr>
						);
					})}
				</tbody>
			</table>
			<a className='font-mono text-[11px] text-fg-3 no-underline hover:text-cyan' href={run.results} target='_blank' rel='noopener'>
				{t.bench_raw} ↗
			</a>
		</div>
	);
}

function Benchmarks() {
	const t = useT();
	const [before, after] = t.bench_note.split('{x}');
	return (
		<section aria-labelledby='bench' className='flex flex-col gap-5'>
			<div className='flex flex-col gap-2.5'>
				<h2 id='bench' className='m-0 text-[26px] font-black'>
					{t.bench_h}
				</h2>
				<p className='m-0 max-w-[820px] text-[15px] leading-[1.7] text-fg-2'>{t.bench_p}</p>
			</div>
			<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4'>
				{BENCH_RUNS.map((run) => (
					<BenchTable key={run.os} run={run} />
				))}
			</div>
			<p className='m-0 max-w-[820px] text-[13px] leading-[1.7] text-fg-3'>
				{before}
				<a href={MYGO_BENCH} target='_blank' rel='noopener'>
					{t.bench_mygo}
				</a>
				{after}
			</p>
			<a className='self-start text-[14px] font-semibold text-cyan no-underline hover:underline' href={BENCH_SUITE} target='_blank' rel='noopener'>
				{t.bench_suite} ↗
			</a>
		</section>
	);
}

function ComparePage() {
	const t = useT();
	return (
		<section className='page enter gap-10 max-sm:gap-6'>
			<div className='flex flex-col gap-3.5'>
				<span className='kicker'>~/COMPARE</span>
				<h1 className='page-h1'>{t.compare_h}</h1>
				<p className='m-0 max-w-[720px] text-[16px] leading-[1.7] text-fg-2'>{t.compare_p}</p>
			</div>
			<div className='border-t border-line-2'>
				<div className={`${COLS} border-b border-line px-2 py-3 font-mono text-[11px] tracking-[0.08em] text-fg-3 uppercase max-lg:hidden`} aria-hidden='true'>
					<span />
					<span>{t.fw_col_ui}</span>
					<span>{t.fw_col_platforms}</span>
					<span>{t.fw_col_license}</span>
				</div>
				{FRAMEWORKS.map((fw) => (
					<Row key={fw.key} fw={fw} />
				))}
			</div>
			<p className='m-0 text-[13px] text-fg-3'>{t.fw_note}</p>
			<Benchmarks />
		</section>
	);
}
