import { BENCH_RUNS, BENCH_SUITE, type BenchRun, FRAMEWORKS, MYGO_BENCH, fill } from '@awesome-mygo/catalog';
import { BENCH_ROWS, fwsOf, num, rowValues } from '../../lib/bench';
import { useT } from '../../lib/lang';
import { DesktopIcons } from '../DesktopIcons';
import { StatusBar, Win, lnk, well } from '../ui';

// The comparison page: the frameworks as a list window, one block a framework (four columns on the desktop), and the benchmarks in a window of their own with a table a machine, the lower value of each row in bold, as the original look's table view shows them.
export function Compare() {
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 pb-[26px] desk:gap-7 desk:pt-[26px] desk:pr-10 desk:pl-[136px]'>
			<DesktopIcons className='hidden desk:absolute desk:top-[26px] desk:left-[18px] desk:grid desk:grid-cols-1 desk:gap-4' />
			<Frameworks />
			<Benchmarks />
		</div>
	);
}

const COLS = 'grid gap-x-6 gap-y-2 desk:grid-cols-[minmax(130px,0.7fr)_minmax(0,1.6fr)_minmax(0,1.6fr)_minmax(100px,0.5fr)]';

function Frameworks() {
	const t = useT();
	return (
		<Win level={1} title={t.compare_h} closeTo='/'>
			<div className={well}>
				<p className='m-0 border-b border-line px-4 py-3 text-muted desk:px-6'>{t.compare_p}</p>
				{FRAMEWORKS.map((fw) => (
					<article key={fw.key} className={`${COLS} border-b border-line px-4 py-4 last:border-b-0 desk:px-6`}>
						<div className='flex flex-col gap-1'>
							<h2 lang='en' className='m-0 text-lg font-semibold'>
								{fw.name}
							</h2>
							<span className='flex flex-wrap gap-x-3'>
								<a className={lnk} href={fw.site} target='_blank' rel='noopener'>
									{t.fw_site}
								</a>
								<a className={lnk} href={fw.repo} target='_blank' rel='noopener'>
									GitHub
								</a>
							</span>
						</div>
						<div className='flex flex-col gap-1'>
							<span className='text-xs text-faint desk:sr-only'>{t.fw_col_ui}</span>
							<p className='m-0'>{t[fw.ui]}</p>
							<a className={`${lnk} text-xs text-faint`} href={fw.source} target='_blank' rel='noopener'>
								{t.fw_source}
							</a>
						</div>
						<div className='flex flex-col gap-1'>
							<span className='text-xs text-faint desk:sr-only'>{t.fw_col_platforms}</span>
							<span className='flex flex-wrap gap-1'>
								{fw.platforms.map((p) => (
									<span key={p.name} className='platform-tag'>
										{p.label ? t[p.label] : p.name}
										{p.status && ` · ${p.status === 'preview' ? t.fw_preview : t.fw_experimental}`}
									</span>
								))}
							</span>
						</div>
						<div className='flex flex-col gap-1'>
							<span className='text-xs text-faint desk:sr-only'>{t.fw_col_license}</span>
							<span className='font-mono'>{fw.license}</span>
						</div>
					</article>
				))}
			</div>
			<StatusBar>
				<span>{fill(t.r_items, { n: FRAMEWORKS.length })}</span>
				<span>{t.fw_note}</span>
			</StatusBar>
		</Win>
	);
}

function RunTable({ run }: { run: BenchRun }) {
	const t = useT();
	return (
		<div className={`${well} flex min-w-0 flex-col gap-2 p-3`}>
			<div>
				<h3 className='m-0 text-base font-semibold'>{run.os}</h3>
				<span className='flex flex-wrap gap-x-1.5 font-mono text-xs text-faint'>
					{[run.cpu, run.date, ...fwsOf(run).map((f) => `${f.name} ${run.versions[f.key]}`)].map((item, i) => (
						<span key={item} className='whitespace-nowrap'>
							{i > 0 && '· '}
							{item}
						</span>
					))}
				</span>
			</div>
			<table className='w-full border-collapse tabular-nums'>
				<thead>
					<tr className='border-b border-line text-left text-xs text-faint'>
						<th scope='col' className='py-1 pr-2 font-normal' />
						{fwsOf(run).map((f) => (
							<th key={f.key} scope='col' lang='en' className='py-1 pl-2 text-right font-normal'>
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
								<th scope='row' className='py-1.5 pr-2 text-left font-normal'>
									{t[row.label]}
									{row.of && <span className='block text-xs text-faint'>{t[`bench_case_${row.of}`]}</span>}
								</th>
								{fwsOf(run).map((f) => {
									const x = values.find((y) => y.key === f.key);
									return (
										<td key={f.key} className={`py-1.5 pl-2 text-right whitespace-nowrap ${x && x.v === best ? 'font-bold' : 'text-muted'}`}>
											{x ? num(x.v, row.unit) : '–'} <span className='text-xs text-faint'>{row.unit}</span>
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
			<a className={`${lnk} text-xs text-faint`} href={run.results} target='_blank' rel='noopener'>
				{t.bench_raw}
			</a>
		</div>
	);
}

function Benchmarks() {
	const t = useT();
	const [before, after] = t.bench_note.split('{x}');
	return (
		<Win title={t.bench_h}>
			<div className='flex flex-col gap-3'>
				<p className='m-0'>{t.bench_p}</p>
				<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-3'>
					{BENCH_RUNS.map((run) => (
						<RunTable key={run.os} run={run} />
					))}
				</div>
				<p className='m-0 text-xs text-muted'>
					{before}
					<a className={lnk} href={MYGO_BENCH} target='_blank' rel='noopener'>
						{t.bench_mygo}
					</a>
					{after}
				</p>
			</div>
			<StatusBar>
				<a className={lnk} href={BENCH_SUITE} target='_blank' rel='noopener'>
					{t.bench_suite}
				</a>
			</StatusBar>
		</Win>
	);
}
