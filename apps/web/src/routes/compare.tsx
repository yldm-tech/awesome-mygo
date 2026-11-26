import { BENCH_RUNS, BENCH_SUITE, type BenchFramework, type BenchRun, FRAMEWORKS, type Framework, MYGO_BENCH, fill } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { BENCH_FWS, BENCH_ROWS, fwsOf, num, rowValues } from '../lib/bench';
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

// The four series in fixed order, from the reference palette's dark categorical slots, checked on the panel surface (#12161b) with the dataviz validator in the page's order (MyGo, Fyne, NSGo, Wails): lightness band, chroma, colour-blind and normal-vision separation of neighbours and 3:1 contrast all pass. Yellow, the palette's fourth slot, is left out: beside NSGo's orange it fails both separations, so Wails takes violet. Only the bars wear them; every value and label stays in the text colours.
const SERIES: Record<BenchFramework, string> = { mygo: '#338ced', fyne: '#00a888', nsgo: '#e76624', wails: '#9887ef' };

// The table's rows grouped into one chart per measure, each on its own axis, as the units differ.
const BENCH_CHARTS = (['bench_size', 'bench_startup', 'bench_memory', 'bench_cpu', 'bench_fps'] as const).map((label) => ({ label, rows: BENCH_ROWS.filter((r) => r.label === label) }));

function Swatch({ fw }: { fw: BenchFramework }) {
	return <span aria-hidden='true' className='inline-block size-2.5 flex-none rounded-[3px]' style={{ background: SERIES[fw] }} />;
}

// One measure on one machine: a row a case, a bar a framework the run measures, from a shared zero to the largest value. The value sits past the bar's end; hovering or focusing the row lists every value and names the best.
function BenchChart({ run, chart }: { run: BenchRun; chart: (typeof BENCH_CHARTS)[number] }) {
	const t = useT();
	const { unit, higher } = chart.rows[0];
	const max = Math.max(...chart.rows.flatMap((row) => rowValues(row, run).values.map((x) => x.v)));
	return (
		<div className='flex flex-col gap-2'>
			<h4 className='m-0 flex items-baseline justify-between text-[13px] font-bold text-fg'>
				<span>
					{t[chart.label]}
					<span className='ml-2 text-[11px] font-normal text-fg-3'>{higher ? t.bench_higher : t.bench_lower_better}</span>
				</span>
				<span className='font-mono text-[11px] font-normal text-fg-3'>{unit}</span>
			</h4>
			<div className='flex flex-col gap-2.5'>
				{chart.rows.map((row) => {
					const { values, best } = rowValues(row, run);
					const leader = values.find((x) => x.v === best);
					const caseName = row.of ? t[`bench_case_${row.of}`] : undefined;
					const summary = [caseName, ...values.map((x) => `${x.name} ${num(x.v, unit)} ${unit}`), leader ? fill(t.bench_best, { x: leader.name }) : undefined].filter(Boolean).join(' · ');
					return (
						<div key={row.of ?? 'all'} tabIndex={0} aria-label={summary} className='group relative flex flex-col gap-[3px] rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-cyan'>
							{caseName && <span className='text-[11px] text-fg-3'>{caseName}</span>}
							{values.map((x) => (
								<div key={x.key} className='flex h-3 items-center gap-1.5'>
									<span className='h-full rounded-r-[4px] transition-[filter] duration-150 group-hover:brightness-125 group-focus-visible:brightness-125' style={{ width: `${(x.v / max) * 78}%`, background: SERIES[x.key], minWidth: x.v > 0 ? 2 : 0 }} />
									<span className={`font-mono text-[11px] leading-none tabular-nums ${x.v === best ? 'font-bold text-fg' : 'text-fg-2'}`}>{num(x.v, unit)}</span>
									{x.v === best && <span className='rounded-full bg-cyan/15 px-1.5 text-[10px] leading-3 font-bold text-cyan'>{t.bench_best_tag}</span>}
								</div>
							))}
							<div role='presentation' className='pointer-events-none absolute right-0 bottom-[calc(100%+6px)] z-10 hidden min-w-[180px] flex-col gap-1 rounded-[10px] border border-line-3 bg-bar px-3 py-2.5 text-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.5)] group-hover:flex group-focus-visible:flex'>
								{caseName && <span className='text-[11px] text-fg-3'>{caseName}</span>}
								{values.map((x) => (
									<span key={x.key} className='flex items-center gap-2'>
										<span aria-hidden='true' className='h-[2px] w-3 flex-none rounded-full' style={{ background: SERIES[x.key] }} />
										<span className='font-bold text-fg tabular-nums'>
											{num(x.v, unit)} {unit}
										</span>
										<span lang='en' className='text-fg-3'>
											{x.name}
										</span>
									</span>
								))}
								{leader && <span className='text-[11px] text-fg-2'>{fill(t.bench_best, { x: leader.name })}</span>}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function BenchTable({ run }: { run: BenchRun }) {
	const t = useT();
	const fws = fwsOf(run);
	return (
		<div className='overflow-x-auto'>
			<table className='w-full border-collapse text-[13px] tabular-nums'>
				<thead>
					<tr className='border-b border-line text-left font-mono text-[11px] tracking-[0.06em] text-fg-3 uppercase'>
						<th scope='col' className='py-2 pr-2 font-normal' />
						{fws.map((f) => (
							<th key={f.key} scope='col' lang='en' className='py-2 pl-2 text-right font-normal'>
								{f.name}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{BENCH_ROWS.map((row) => {
						const { values, best } = rowValues(row, run);
						return (
							<tr key={`${row.label}-${row.of ?? ''}`} className='border-b border-line last:border-b-0'>
								<th scope='row' className='py-2 pr-2 text-left font-normal text-fg-2'>
									{t[row.label]}
									{row.of && <span className='block text-[11px] text-fg-3'>{t[`bench_case_${row.of}`]}</span>}
								</th>
								{fws.map((f) => {
									const x = values.find((y) => y.key === f.key);
									return (
										<td key={f.key} className={`py-2 pl-2 text-right whitespace-nowrap ${x && x.v === best ? 'font-bold text-fg' : 'text-fg-2'}`}>
											{x ? num(x.v, row.unit) : '–'} <span className='text-[11px] text-fg-3'>{row.unit}</span>
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function BenchCard({ run, view }: { run: BenchRun; view: 'chart' | 'table' }) {
	const t = useT();
	return (
		<div className='flex min-w-0 flex-col gap-4 rounded-[16px] border border-line-2 bg-panel p-5 max-sm:p-4'>
			<div className='flex flex-col gap-1'>
				<h3 className='m-0 text-[20px] font-black'>{run.os}</h3>
				{/* Each item keeps to one line, so a long CPU name wraps the line between items rather than inside one. */}
				<span className='flex flex-wrap gap-x-1.5 font-mono text-[11px] text-fg-3'>
					{[run.cpu, run.date, ...fwsOf(run).map((f) => `${f.name} ${run.versions[f.key]}`)].map((item, i) => (
						<span key={item} className='whitespace-nowrap'>
							{i > 0 && '· '}
							{item}
						</span>
					))}
				</span>
			</div>
			{view === 'chart' ? (
				<div className='flex flex-col gap-5'>
					{BENCH_CHARTS.map((c) => (
						<BenchChart key={c.label} run={run} chart={c} />
					))}
				</div>
			) : (
				<BenchTable run={run} />
			)}
			<a className='mt-auto font-mono text-[11px] text-fg-3 no-underline hover:text-cyan' href={run.results} target='_blank' rel='noopener'>
				{t.bench_raw} ↗
			</a>
		</div>
	);
}

function Benchmarks() {
	const t = useT();
	const [view, setView] = useState<'chart' | 'table'>('chart');
	const [before, after] = t.bench_note.split('{x}');
	return (
		<section aria-labelledby='bench' className='flex flex-col gap-5'>
			<div className='flex flex-col gap-2.5'>
				<h2 id='bench' className='m-0 text-[26px] font-black'>
					{t.bench_h}
				</h2>
				<p className='m-0 text-[15px] leading-[1.7] text-fg-2'>{t.bench_p}</p>
			</div>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<ul className='m-0 flex list-none gap-5 p-0 text-[13px] text-fg-2' aria-label={t.bench_legend}>
					{BENCH_FWS.map((f) => (
						<li key={f.key} lang='en' className='flex items-center gap-2'>
							<Swatch fw={f.key} />
							{f.name}
						</li>
					))}
				</ul>
				<div role='group' aria-label={t.bench_view} className='flex rounded-[10px] border border-line-2 p-0.5'>
					{(['chart', 'table'] as const).map((v) => (
						<button key={v} type='button' aria-pressed={view === v} onClick={() => setView(v)} className='min-h-8 rounded-[8px] border-0 bg-transparent px-3 text-[13px] font-semibold text-fg-2 transition-[background,color] duration-150 ease-[ease] hover:text-fg aria-pressed:bg-cyan aria-pressed:text-bg max-md:min-h-10'>
							{v === 'chart' ? t.bench_view_chart : t.bench_view_table}
						</button>
					))}
				</div>
			</div>
			<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4'>
				{BENCH_RUNS.map((run) => (
					<BenchCard key={run.os} run={run} view={view} />
				))}
			</div>
			<p className='m-0 text-[13px] leading-[1.7] text-fg-3'>
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
				<p className='m-0 text-[16px] leading-[1.7] text-fg-2'>{t.compare_p}</p>
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
