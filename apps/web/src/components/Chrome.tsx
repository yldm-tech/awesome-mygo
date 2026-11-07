import { MYGO_REPO, SPONSOR_URL } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { Docky, GitHubMark } from './bits';
import { SITE_NAV } from './Header';

export function Footer() {
	const t = useT();
	return (
		<footer className='relative z-1 overflow-hidden border-t border-line bg-bg/60'>
			{/* The page's gutter: 24px from sm up, 16px on phones. */}
			<div className='mx-auto flex max-w-[1240px] flex-col gap-7 px-6 pt-12 pb-8 max-sm:px-4'>
				{/* Clipped by the footer at its widest; on phones it is sized to the screen, so the whole name shows. */}
				<span aria-hidden='true' className='font-display text-[clamp(56px,14vw,200px)] leading-[0.8] font-extrabold tracking-[-0.06em] whitespace-nowrap text-bar max-sm:text-[13vw]'>
					Awesome MyGo
				</span>
				<nav aria-label={t.a_site_nav} className='flex flex-wrap gap-x-6 gap-y-2.5 text-[14px] font-semibold max-md:gap-y-0'>
					{SITE_NAV.map((n) => (
						<Link key={n.to} to={n.to} className='text-fg-2 no-underline hover:text-cyan max-md:inline-flex max-md:min-h-10 max-md:items-center'>
							{t[n.key]}
						</Link>
					))}
				<Link to='/metrics' className='text-fg-2 no-underline hover:text-cyan max-md:inline-flex max-md:min-h-10 max-md:items-center'>
					{t.metrics_title}
				</Link>
				</nav>
				<div className='flex flex-wrap justify-between gap-3 text-[13px] text-fg-3'>
					<span>{t.footer_l}</span>
					<span className='flex flex-wrap gap-5'>
						<a href={MYGO_REPO} target='_blank' rel='noopener' className='inline-flex items-center gap-1.5 max-md:min-h-10'>
							<GitHubMark size={14} />
							GitHub
						</a>
						<a href={SPONSOR_URL} target='_blank' rel='noopener' className='max-md:inline-flex max-md:min-h-10 max-md:items-center'>
							{t.sponsor}
						</a>
					</span>
				</div>
			</div>
		</footer>
	);
}

export function BackToTop({ show }: { show: boolean }) {
	const t = useT();
	if (!show) return null;
	return (
		// btn-g's hover is restated as utilities, which the utilities drawing the button would otherwise override. Kept clear of the notch and the home indicator.
		<button
			type='button'
			className='btn-g fade fixed right-[calc(20px+env(safe-area-inset-right))] bottom-[calc(20px+env(safe-area-inset-bottom))] z-30 flex size-12 items-center justify-center rounded-[14px] border border-line-3 bg-panel/90 text-fg backdrop-blur-[8px] hover:border-fg hover:bg-white/4'
			onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
			aria-label={t.to_top}
		>
			<svg aria-hidden='true' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
				<path d='M12 19V5M5 12l7-7 7 7' />
			</svg>
		</button>
	);
}

export function Toast() {
	const { copied } = useSite();
	const t = useT();
	if (!copied) return null;
	return (
		// `translate` (the -translate-x-1/2 utility) rather than `transform`, so the entrance animation, which animates transform, cannot undo the centring. Kept above the home indicator.
		<div role='status' className='enter fixed bottom-[calc(28px+env(safe-area-inset-bottom))] left-1/2 z-60 flex -translate-x-1/2 items-center gap-2.5 rounded-xl bg-cyan px-5 py-3 text-[14px] font-bold whitespace-nowrap text-bg shadow-[0_16px_40px_rgba(63,211,245,0.25)]'>
			<Docky variant='toast' />
			{t.toast}
		</div>
	);
}
