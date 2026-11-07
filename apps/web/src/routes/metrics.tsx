import { DEFAULT_LANG, t } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useLang, useT } from '../lib/lang';
import { MetricsRange, number, pathLabel, shortDay, useMetrics } from '../lib/metrics';
import { SITE_NAME } from '../lib/seo';

export const Route = createFileRoute('/metrics')({
	head: ({ match }) => {
		const copy = t(match.search.lang ?? DEFAULT_LANG);
		return { meta: [{ title: `${copy.metrics_title} · ${SITE_NAME}` }, { name: 'description', content: copy.metrics_p }, { name: 'robots', content: 'noindex,nofollow' }] };
	},
	component: MetricsPage,
});

const RANGES: MetricsRange[] = [7, 30, 90];

function MetricCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
	return (
		<div className={`rounded-[18px] border p-5 ${accent ? 'border-cyan/40 bg-[linear-gradient(135deg,rgba(63,211,245,0.15),rgba(63,211,245,0.03))]' : 'border-line-2 bg-panel'}`}>
			<p className='m-0 text-[13px] font-semibold tracking-[0.04em] text-fg-3'>{label}</p>
			<p className='m-0 mt-3 font-display text-[34px] leading-none font-black tracking-[-0.04em] text-fg'>{value}</p>
		</div>
	);
}

function ViewChart({ days, locale }: { days: { day: string; views: number }[]; locale: string }) {
	const width = 860;
	const height = 280;
	const left = 24;
	const right = 16;
	const top = 20;
	const bottom = 34;
	const max = Math.max(1, ...days.map((d) => d.views));
	const plotWidth = width - left - right;
	const plotHeight = height - top - bottom;
	const point = (value: number, i: number) => ({ x: left + (days.length <= 1 ? plotWidth / 2 : (i / (days.length - 1)) * plotWidth), y: top + plotHeight - (value / max) * plotHeight });
	const points = days.map((d, i) => point(d.views, i));
	const line = points.map((p) => `${p.x},${p.y}`).join(' ');
	const area = points.length > 0 ? `${left},${top + plotHeight} ${line} ${left + plotWidth},${top + plotHeight}` : '';
	const labels = days.filter((_, i) => i === 0 || i === days.length - 1 || i === Math.floor(days.length / 2));
	return (
		<div className='relative min-h-[280px] overflow-hidden rounded-[14px] border border-line-2 bg-bg/45 p-3'>
			<svg viewBox={`0 0 ${width} ${height}`} role='img' aria-label='Page views over time' className='block h-auto w-full'>
				<defs>
					<linearGradient id='metrics-area' x1='0' y1='0' x2='0' y2='1'>
						<stop offset='0%' stopColor='#3fd3f5' stopOpacity='0.32' />
						<stop offset='100%' stopColor='#3fd3f5' stopOpacity='0' />
					</linearGradient>
				</defs>
				{[0, 0.5, 1].map((fraction) => {
					const y = top + plotHeight * fraction;
					return <line key={fraction} x1={left} x2={left + plotWidth} y1={y} y2={y} stroke='currentColor' strokeOpacity='0.12' strokeDasharray='3 7' />;
				})}
				{area && <polygon points={area} fill='url(#metrics-area)' />}
				{line && <polyline points={line} fill='none' stroke='#3fd3f5' strokeWidth='4' strokeLinecap='round' strokeLinejoin='round' />}
				{points.map((p, i) => <circle key={days[i]?.day} cx={p.x} cy={p.y} r={days.length > 45 ? 2.5 : 4} fill='#0b0d10' stroke='#3fd3f5' strokeWidth='2' />)}
			</svg>
			<div className='pointer-events-none absolute inset-x-4 bottom-2 flex justify-between font-mono text-[11px] text-fg-3'>
				{labels.map((d) => <span key={d.day}>{shortDay(d.day, locale)}</span>)}
			</div>
		</div>
	);
}

function MetricsPage() {
	const t = useT();
	const lang = useLang();
	const locale = lang === 'zh-CN' ? 'zh-CN' : lang === 'zh-TW' ? 'zh-TW' : lang;
	const [range, setRange] = useState<MetricsRange>(30);
	const { loading, error, reason, data } = useMetrics(range);
	const peak = useMemo(() => (data?.daily.length ? data.daily.reduce((best, row) => (row.views > best.views ? row : best), data.daily[0]) : undefined), [data]);
	const today = data?.daily.at(-1)?.views ?? 0;
	const maxPath = Math.max(1, ...(data?.topPaths.map((row) => row.views) ?? []));
	return (
		<section className='page enter gap-7 max-sm:gap-5'>
			<header className='flex flex-wrap items-end justify-between gap-5'>
				<div className='flex flex-col gap-3.5'>
					<span className='kicker' lang='en'>~/METRICS · {t.metrics_live.toUpperCase()}</span>
					<h1 className='page-h1'>{t.metrics_h}</h1>
					<p className='page-p max-w-[680px]'>{t.metrics_p}</p>
				</div>
				<div className='flex items-center gap-2 rounded-full border border-green/35 bg-green/8 px-3.5 py-2 font-mono text-[12px] text-green'>
					<span className='size-2 rounded-full bg-green shadow-[0_0_14px_rgba(155,227,138,0.9)]' aria-hidden='true' />
					{t.metrics_live}
				</div>
			</header>
			<div className='flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-well/70 p-2.5'>
				<span className='px-2 text-[13px] font-semibold text-fg-3'>{t.metrics_range}</span>
				<div role='tablist' aria-label={t.metrics_range} className='flex gap-1'>
					{RANGES.map((days) => <button key={days} type='button' role='tab' aria-selected={range === days} onClick={() => setRange(days)} className='min-h-9 rounded-[9px] border-0 bg-transparent px-3.5 text-[13px] font-semibold text-fg-2 transition-colors hover:bg-white/6 hover:text-fg aria-selected:bg-cyan aria-selected:text-bg'>{t[`metrics_${days}d` as 'metrics_7d' | 'metrics_30d' | 'metrics_90d']}</button>)}
				</div>
			</div>
			{loading ? <div className='rounded-[18px] border border-line-2 bg-panel p-10 text-center text-fg-3'>{t.metrics_loading}</div> : error || !data ? <div className='rounded-[18px] border border-dashed border-line-3 bg-panel p-10 text-center text-fg-2'>{reason === 'not_configured' ? t.metrics_not_configured : t.metrics_unavailable}</div> : (
				<>
					<div className='grid grid-cols-4 gap-3 max-md:grid-cols-2'>
						<MetricCard label={t.metrics_views} value={number(data.total, locale)} accent />
						<MetricCard label={t.metrics_today} value={number(today, locale)} />
						<MetricCard label={t.metrics_peak} value={peak ? `${number(peak.views, locale)} · ${shortDay(peak.day, locale)}` : '—'} />
						<MetricCard label={t.metrics_pages} value={number(data.pageCount, locale)} />
					</div>
					<div className='grid grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)] gap-4 max-lg:grid-cols-1'>
						<section className='rounded-[18px] border border-line-2 bg-panel p-5 max-sm:p-4' aria-labelledby='metrics-distribution'>
							<div className='mb-4 flex items-start justify-between gap-4'><div><h2 id='metrics-distribution' className='m-0 text-[20px] font-black'>{t.metrics_distribution}</h2><p className='m-0 mt-1 font-mono text-[11px] text-fg-3'>{t.metrics_updated}</p></div><span className='font-mono text-[12px] text-cyan'>{data.start} → {data.end}</span></div>
							<ViewChart days={data.daily} locale={locale} />
						</section>
						<section className='rounded-[18px] border border-line-2 bg-panel p-5 max-sm:p-4' aria-labelledby='metrics-top-pages'>
							<div className='mb-5'><h2 id='metrics-top-pages' className='m-0 text-[20px] font-black'>{t.metrics_top_pages}</h2><p className='m-0 mt-1 font-mono text-[11px] text-fg-3'>{t.metrics_updated}</p></div>
							<div className='flex flex-col gap-4'>
								{data.topPaths.length === 0 ? <p className='m-0 text-[14px] text-fg-3'>{t.metrics_no_data}</p> : data.topPaths.map((row, i) => <div key={row.path} className='flex flex-col gap-1.5'><div className='flex items-center justify-between gap-3 font-mono text-[12px]'><span className='min-w-0 truncate text-fg-2'>{pathLabel(row.path)}</span><span className='text-fg-3'>{number(row.views, locale)}</span></div><div className='h-2 overflow-hidden rounded-full bg-line-2'><div className={`h-full rounded-full ${i === 0 ? 'bg-cyan' : 'bg-cyan/45'}`} style={{ width: `${(row.views / maxPath) * 100}%` }} /></div></div>)}
							</div>
						</section>
					</div>
				</>
			)}
		</section>
	);
}
