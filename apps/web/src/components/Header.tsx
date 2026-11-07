import { DEFAULT_LANG, LANGS, type RootSearch, SITE_REPO, langDef } from '@awesome-mygo/catalog';
import { Link, useLocation } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useLang, useSetLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { switchTheme } from '../lib/theme';
import { GitHubMark, Logo, SearchIcon } from './bits';

// Every section, in the order of the home page's tiles: the header's row, the retro look's menu bar and both footers show them all.
export const NAV = [
	{ to: '/', key: 'nav_home' },
	{ to: '/ui', key: 'nav_ui' },
	{ to: '/state', key: 'nav_state' },
	{ to: '/templates', key: 'nav_templates' },
	{ to: '/ai', key: 'nav_ai' },
	{ to: '/plugins', key: 'nav_plugins' },
	{ to: '/showcase', key: 'nav_showcase' },
	{ to: '/learn', key: 'nav_learn' },
] as const;

export const SITE_NAV = NAV;

export function Header({ scrolled }: { scrolled: boolean }) {
	const t = useT();
	const lang = useLang();
	const setLang = useSetLang();
	const { openPalette, openSubmit } = useSite();
	const [menu, setMenu] = useState(false);
	const [langMenu, setLangMenu] = useState(false);
	const langRef = useRef<HTMLDivElement>(null);
	const pathname = useLocation({ select: (l) => l.pathname });

	// Any navigation closes the mobile menu and the language menu.
	useEffect(() => {
		setMenu(false);
		setLangMenu(false);
	}, [pathname]);

	useEffect(() => {
		if (!langMenu) return;
		const outside = (e: PointerEvent) => {
			if (!langRef.current?.contains(e.target as Node)) setLangMenu(false);
		};
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setLangMenu(false);
		};
		document.addEventListener('pointerdown', outside);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('pointerdown', outside);
			document.removeEventListener('keydown', esc);
		};
	}, [langMenu]);

	return (
		// While the burger is open on a phone the header scrolls within the screen: it is sticky, so on a landscape phone the panel's last rows (language, look, GitHub) and the language menu would otherwise sit below the screen's bottom edge for good.
		<header
			className={`sticky top-0 z-20 border-b border-line bg-bg/82 backdrop-blur-[14px] [transition:box-shadow_0.3s] data-[scrolled=true]:shadow-[0_10px_40px_rgba(0,0,0,0.45)] ${menu ? 'max-md:max-h-dvh max-md:overflow-y-auto max-md:overscroll-contain' : ''}`}
			data-scrolled={scrolled}
		>
			{/* The brand, the eight sections and the header actions share one row from the burger breakpoint up: the search button is as wide as its label, and below 1288px, before the 1600px container reaches its full width, the brand shows only its logo, the search button drops its label and the gaps tighten, so every language fits one row down to 1100px. Below md (phones) the header is one compact row of the brand, search, submit and the burger: the language, look and GitHub buttons move into the burger's panel, and the gaps, buttons and brand shrink so English still fits at 360px. */}
			<div className='mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-2.5 px-6 py-2.5 max-hdr:gap-x-3.5 max-md:gap-x-1.5 max-md:py-2 max-sm:px-4'>
				<Link to='/' aria-label={t.a_home} className='flex min-h-11 items-center gap-2.5 p-0 text-fg no-underline max-md:mr-auto max-md:min-h-10 max-md:gap-2 max-md:[&_img]:size-7'>
					<Logo />
					<span className='font-display text-[20px] font-extrabold tracking-[-0.035em] max-hdr:nav:hidden max-md:text-[clamp(16px,4.44vw,18px)]'>
						Awesome <span className='text-cyan'>MyGo</span>
					</span>
				</Link>
				{/* Below the burger breakpoint the nav is a full-width panel on its own row, shown while the burger is open. */}
				<nav
					id='sitenav'
					className={`my-0 mr-auto ml-2 flex flex-wrap gap-0.5 rounded-xl border border-line bg-well p-1 max-nav:order-5 max-nav:m-0 max-nav:w-full ${menu ? 'max-nav:flex-col max-nav:items-stretch' : 'max-nav:hidden'}`}
					data-open={menu}
					aria-label={t.a_cats}
				>
					{SITE_NAV.map((n) => (
						<Link
							key={n.to}
							to={n.to}
							className={`box-border inline-flex min-h-[38px] items-center rounded-lg border-0 bg-transparent px-2.5 py-0 text-[14px] font-medium text-fg-2 no-underline [transition:background_0.15s,color_0.15s] hover:bg-white/6 hover:text-fg data-[status=active]:bg-fg data-[status=active]:font-bold data-[status=active]:text-bg max-nav:min-h-12 max-nav:justify-start`}
							activeOptions={{ exact: true, includeSearch: false }}
							onClick={() => setMenu(false)}
						>
							{t[n.key]}
						</Link>
					))}
				</nav>
				{/* Below md the actions box dissolves (display: contents) so its buttons sit in the header row itself, and the language, look and GitHub group can take a row of its own in the burger's panel. */}
				<div className='flex items-center gap-2 max-nav:ml-auto max-md:contents'>
					<button
						type='button'
						className='btn-g flex min-h-11 items-center gap-2.5 rounded-[10px] border border-line-2 bg-well px-3.5 py-0 text-[14px] text-fg-2 hover:border-fg hover:bg-white/4 hover:text-fg max-hdr:min-w-0 max-md:size-10 max-md:min-h-10 max-md:justify-center max-md:px-0'
						onClick={openPalette}
						aria-label={t.search_label}
					>
						<SearchIcon />
						<span className='flex-auto text-left max-hdr:hidden'>{t.search_btn}</span>
					</button>
					{/* At md and up the group dissolves into the actions row; below md it is the burger panel's last row, under the nav. */}
					<div id='siteacts' className={`md:contents max-md:order-6 max-md:w-full max-md:flex-wrap max-md:items-center max-md:gap-2 ${menu ? 'max-md:flex' : 'max-md:hidden'}`}>
						{/* Below md this box dissolves (display: contents) and the menu is a full-width row of the panel under the buttons, in the flow, so it stays on screen and the header grows to hold it: placed over the page instead, it fell outside the header, which clips what passes its edge while it scrolls on a phone. */}
						<div className='relative max-md:contents' ref={langRef}>
							<button
								type='button'
								className='btn-g flex min-h-11 items-center gap-2 rounded-[10px] border border-line-2 bg-well px-3 py-0 text-[13px] font-semibold text-fg hover:border-fg hover:bg-white/4 hover:text-fg'
								onClick={() => setLangMenu((v) => !v)}
								aria-haspopup='menu'
								aria-expanded={langMenu}
								aria-label={t.lang}
							>
								<svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
									<circle cx='12' cy='12' r='9' />
									<path d='M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z' />
								</svg>
								<span>{langDef(lang).short}</span>
							</button>
							{/* Always rendered, and hidden while closed, so every page links to its other language versions for crawlers. Active means the exact URL: by default a link is active when its search is a subset of the current one, which made 简体中文 (no lang) active on every page. A plain click switches in place and saves the choice; a click with a modifier key or a middle click opens the link. */}
							<div
								role='menu'
								aria-label={t.lang}
								className='enter absolute top-[52px] right-0 z-40 min-w-[200px] rounded-[14px] border border-line-3 bg-panel p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.55)] max-md:static max-md:order-last max-md:min-w-0 max-md:basis-full'
								hidden={!langMenu}
							>
								{LANGS.map((L) => (
									<Link
										key={L.code}
										to='.'
										search={(prev: RootSearch): RootSearch => ({ ...prev, lang: L.code === DEFAULT_LANG ? undefined : L.code })}
										activeOptions={{ exact: true }}
										role='menuitemradio'
										aria-checked={L.code === lang}
										className='row box-border flex min-h-11 w-full items-center justify-between gap-4 rounded-[9px] border-0 bg-transparent px-3 py-0 text-left text-[14px] font-semibold text-fg no-underline hover:bg-cyan/7 aria-checked:bg-cyan/10 aria-checked:text-cyan'
										lang={L.code}
										hrefLang={L.code}
										onClick={(e) => {
											if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
											e.preventDefault();
											setLangMenu(false);
											// On a phone the menu sits in the burger's panel; a switch changes only ?lang=, which the pathname effect above does not see.
											setMenu(false);
											setLang(L.code);
										}}
									>
										<span>{L.native}</span>
										<span className='font-mono text-[11px] text-fg-3'>{L.code}</span>
									</Link>
								))}
							</div>
						</div>
						{/* Square, in the language button's frame: the GitHub link and the retro theme switch. Icon only: with a label the header ran onto a second row in Japanese at 1440px. The name is in aria-label and the tooltip. */}
						<button
							type='button'
							className='btn-g box-border flex size-11 flex-none items-center justify-center rounded-[10px] border border-line-2 bg-well text-fg hover:border-fg hover:bg-white/4 hover:text-fg'
							onClick={() => switchTheme('retro')}
							aria-label={`${t.a_theme}: ${t.theme_retro}`}
							title={t.theme_retro}
						>
							<svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='square'>
								<rect x='3' y='4' width='18' height='13' />
								<path d='M8 21h8M12 17v4M7 8h4' />
							</svg>
						</button>
						{/* The site's own repository; "GitHub" reads the same in every language, so it needs no translation. */}
						<a
							className='btn-g box-border flex size-11 flex-none items-center justify-center rounded-[10px] border border-line-2 bg-well text-fg hover:border-fg hover:bg-white/4 hover:text-fg'
							href={SITE_REPO}
							target='_blank'
							rel='noopener'
							aria-label='GitHub'
							title='GitHub'
						>
							<GitHubMark size={18} />
						</a>
					</div>
					<button type='button' className='btn-c min-h-11 rounded-[10px] px-4 py-0 text-[14px] whitespace-nowrap max-md:min-h-10 max-md:px-3' onClick={() => openSubmit()}>
						{t.submit_short}
					</button>
					<button
						type='button'
						className='btn-g hidden size-11 items-center justify-center rounded-[10px] border border-line-2 bg-well text-fg hover:border-fg hover:bg-white/4 hover:text-fg max-nav:flex max-md:size-10'
						onClick={() => setMenu((v) => !v)}
						aria-expanded={menu}
						aria-controls='sitenav siteacts'
						aria-label={t.menu}
					>
						<svg aria-hidden='true' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
							<path d='M4 7h16M4 12h16M4 17h16' />
						</svg>
					</button>
				</div>
			</div>
		</header>
	);
}
