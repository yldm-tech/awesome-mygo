import { FRAMEWORKS, type Framework } from '@awesome-mygo/catalog';
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
		</section>
	);
}
