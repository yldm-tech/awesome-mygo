import { AI_TOOLS, APPS, INSTALL_CMDS, INSTALL_TABS, type InstallTab, MYGO_SITE, PLUGINS, STATE_SOLUTIONS, TEMPLATES, UI_LIBS, appBySlug, fill, langDef, pad2, pick } from '@awesome-mygo/catalog';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { type CSSProperties, type PointerEvent, useRef } from 'react';
import { AppLink, KindTag, MonoTile, PlatformTags, WinBar, appView } from '../components/bits';
import { useLang, useT } from '../lib/lang';
import { prefersReducedMotion, tilt, useCountUp } from '../lib/motion';
import { validateHomeSearch } from '../lib/page-search';
import { pageHead } from '../lib/seo';
import { DEFAULT_SORT, sortApps } from '../lib/showcase';
import { useSite } from '../lib/site';

// The marquee's apps: the first 30 in the showcase's default order, not the whole catalog. With every app twice, the strip grew past 80,000px with 400 links and icons, a layer too wide for Firefox to animate on the compositor, so it moved it on the main thread every frame.
const MARQUEE_APPS = sortApps(APPS, DEFAULT_SORT, {}).slice(0, 30);

export const Route = createFileRoute('/')({
	// ?install= keeps the install command's tab in the address, so a link reproduces the view.
	validateSearch: validateHomeSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/', title: null, desc: 'desc_home', name: 'nav_home' }),
	component: HomePage,
});

// The entrance of the hero's parts: each pops up in one of three waves. The delay is written into the animation shorthand, which would otherwise reset a separate delay.
const POP_1 = 'animate-[pop_0.7s_cubic-bezier(0.2,0.9,0.25,1.15)_0.15s_both] motion-reduce:animate-none';
const POP_2 = 'animate-[pop_0.7s_cubic-bezier(0.2,0.9,0.25,1.15)_0.35s_both] motion-reduce:animate-none';
const POP_3 = 'animate-[pop_0.7s_cubic-bezier(0.2,0.9,0.25,1.15)_0.55s_both] motion-reduce:animate-none';
// The hero windows' entrance fills only the delay before it starts (`backwards`): filled forever with `both`, its `transform: none` would cancel the .win:hover lift.
const POP_WIN_2 = 'animate-[pop_0.7s_cubic-bezier(0.2,0.9,0.25,1.15)_0.35s_backwards] motion-reduce:animate-none';
const POP_WIN_3 = 'animate-[pop_0.7s_cubic-bezier(0.2,0.9,0.25,1.15)_0.55s_backwards] motion-reduce:animate-none';

// The headline arriving as one block, so its text remains plain inline content and the browser owns every line break.
const HEADLINE_IN = 'animate-[chin_1s_cubic-bezier(0.2,0.8,0.2,1)_both] motion-reduce:animate-none';

// Placement of the four floating app windows on the 1200px wall below the hero: the near pair in the middle, the far pair at the edges. The far pair goes below 1000px, the near pair below 700px (with the whole stage). Each window floats on its own phase of the same bob.
const HERO_APPS = [
	{ slug: 'kero', left: 0, top: 110, w: 230, z: -180, ry: 14, hide: 'max-hero:hidden', bob: 'animate-[bob_7s_ease-in-out_-2s_infinite_alternate]', pop: POP_WIN_3 },
	{ slug: 'pulse', left: 300, top: 40, w: 250, z: -60, ry: 6, hide: 'max-tab:hidden', bob: 'animate-[bob_7s_ease-in-out_-4s_infinite_alternate]', pop: POP_WIN_2 },
	{ slug: 'mixmusic', left: 650, top: 40, w: 250, z: -60, ry: -6, hide: 'max-tab:hidden', bob: 'animate-[bob_7s_ease-in-out_-1s_infinite_alternate]', pop: POP_WIN_2 },
	{ slug: 'godwit', left: 970, top: 110, w: 230, z: -180, ry: -14, hide: 'max-hero:hidden', bob: 'animate-[bob_7s_ease-in-out_-5s_infinite_alternate]', pop: POP_WIN_3 },
] as const;

const FEATURED = ['mixmusic', 'kero', 'liubai', 'godwit'] as const;

// The two sections under the hero (categories, featured) share their box, head row and heading; each adds its own vertical padding.
const SEC = 'mx-auto flex max-w-[1600px] flex-col gap-7 px-6 max-sm:px-4';
const SEC_HEAD = 'flex flex-wrap items-end justify-between gap-4';
const SEC_H2 = 'm-0 text-[44px] font-black tracking-[-0.03em] max-sm:text-[34px]';
// The hero's two 52px buttons; on phones they grow to fill their row (see the row's comment).
const BTN_52 = 'box-border inline-flex min-h-13 items-center gap-[0.28em] rounded-[12px] px-7 py-0 text-[16px] max-sm:flex-auto max-sm:justify-center';

function mustApp(slug: string) {
	const app = appBySlug(slug);
	if (!app) throw new Error(`Unknown app slug: ${slug}`);
	return app;
}

function HomePage() {
	const t = useT();
	const lang = useLang();
	const nApps = APPS.length;
	const marqN = MARQUEE_APPS.length;
	return (
		<div className='enter'>
			<Hero />
			{/* fetchPriority='low' keeps React from preloading the icons ahead of the stylesheets. They are not lazy: the strip clips them with overflow:hidden and slides them in with a transform, so a lazy icon could start loading only as it enters and show as a blank square at the edge. */}
			{/* On phones the strip fades out over the gutter at both edges instead of being cut at the screen's edge. */}
			<section aria-label={t.a_marquee} className='overflow-hidden border-b border-line bg-bg/50 px-0 py-[22px] max-sm:py-4 max-sm:[mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%_-_16px),transparent)]'>
				{/* The strip's duration follows its length (--marq-n), keeping its speed whatever the number of apps on it: 1.2 s an app, the pace the strip had at 40 apps in 48 s. A fixed duration made it run faster with every app listed, until at 175 it moved too fast to read. */}
				<div className='flex w-max gap-14 animate-[marq_calc(var(--marq-n,40)*1.2s)_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none max-sm:gap-10' style={{ '--marq-n': marqN } as CSSProperties}>
					{[...MARQUEE_APPS, ...MARQUEE_APPS].map((a, i) => (
						<AppLink key={`${a.slug}-${i}`} slug={a.slug} className='inline-flex items-center gap-3.5 whitespace-nowrap border-0 bg-transparent p-0 font-display text-[26px] font-bold tracking-[-0.02em] text-fg-3 no-underline max-sm:min-h-10 max-sm:gap-2.5 max-sm:text-[20px]' tabIndex={i >= marqN ? -1 : undefined} hidden={i >= marqN}>
							{a.icon ? (
								<img className='app-icon size-9 flex-none max-sm:size-7' src={a.icon} alt='' width={36} height={36} fetchPriority='low' decoding='async' />
							) : (
								<span aria-hidden='true' className={`flex size-9 flex-none items-center justify-center rounded-[22.5%] text-[18px] font-extrabold max-sm:size-7 max-sm:text-[14px] tone-${APPS.indexOf(a) % 3}`}>
									{a.name.charAt(0).toUpperCase()}
								</span>
							)}
							{a.name}
						</AppLink>
					))}
				</div>
			</section>
			<Categories />
			<section aria-labelledby='fresh' className={`${SEC} pt-14 pb-24 max-sm:pb-16`}>
				<div className={`rv ${SEC_HEAD}`}>
					<div className='flex flex-col gap-2.5'>
						<span className='kicker' lang='en'>02 / FEATURED</span>
						<h2 id='fresh' className={SEC_H2}>
							{t.feat_h}
						</h2>
					</div>
					<Link to='/showcase' className='btn-g btn-44 btn-outline'>
						{fill(t.feat_all, { n: nApps })} <span className='arrow'>→</span>
					</Link>
				</div>
				<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,270px),1fr))] gap-4'>
					{FEATURED.map((slug, k) => {
						const v = appView(mustApp(slug));
						return (
							<div key={slug} className={`rv d${k} flex`}>
								{/* A link to the app's page that keeps the look it had as a button instead of the link colour and underline. */}
								<AppLink slug={slug} className='win card text-fg no-underline' dialog>
									<WinBar label={v.host} size='sm' className='card-bar' />
									<div className='flex flex-auto flex-col gap-3.5 p-[22px] max-sm:p-[18px]'>
										<MonoTile view={v} size={52} />
										<h3 className='m-0 text-[19px] font-black tracking-[-0.01em]'>{v.app.name}</h3>
										<span className='text-[14px] leading-[1.65] text-fg-2'>{pick(v.app.desc, lang)}</span>
									</div>
								</AppLink>
							</div>
						);
					})}
				</div>
			</section>
		</div>
	);
}

function Hero() {
	const t = useT();
	const lang = useLang();
	const { copy, copied } = useSite();
	const { install } = Route.useSearch();
	const navigate = useNavigate({ from: '/' });
	const tab: InstallTab = install ?? 'bun';
	const setTab = (k: InstallTab) => void navigate({ search: (prev) => ({ ...prev, install: k === 'bun' ? undefined : k }), replace: true, resetScroll: false });
	const heroRef = useRef<HTMLElement>(null);
	const e = useCountUp();
	const words = langDef(lang).words;

	const onMove = (ev: PointerEvent<HTMLElement>) => {
		const el = heroRef.current;
		if (!el || prefersReducedMotion()) return;
		const r = el.getBoundingClientRect();
		el.style.setProperty('--px', (((ev.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
		el.style.setProperty('--py', (((ev.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
	};
	const onLeave = () => {
		heroRef.current?.style.setProperty('--px', '0');
		heroRef.current?.style.setProperty('--py', '0');
	};

	const stats = [
		{ n: String(Math.round(APPS.length * e)), label: t.st_apps },
		{ n: String(Math.round(PLUGINS.length * e)), label: t.st_plugins },
		{ n: String(Math.round(UI_LIBS.length * e)), label: t.st_libs },
		{ n: 'MIT', label: t.st_mit },
	];

	return (
		<section ref={heroRef} onPointerMove={onMove} onPointerLeave={onLeave} className='relative overflow-hidden border-b border-line max-tab:pb-14'>
			{/* Copy on the left, the code window on the right; one column below 1000px. */}
			<div className='relative z-2 mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] items-center gap-x-16 gap-y-12 px-6 pt-28 pb-0 max-hero:grid-cols-1 max-hero:pt-18 max-sm:px-4 max-sm:pt-12'>
				<div className='flex min-w-0 flex-col items-start gap-7'>
				<Link to='/showcase' className={`group box-border inline-flex min-h-9 items-center gap-2.5 rounded-full border border-line-3 bg-panel/75 py-0 pr-3.5 pl-1.5 text-[13px] text-fg-2 no-underline backdrop-blur-[8px] transition-[border-color,color] duration-200 ease-[ease] hover:border-cyan hover:text-fg max-md:min-h-10 ${POP_1}`}>
					<span className='inline-flex items-center gap-1.5 rounded-full bg-cyan/14 px-2.5 py-[3px] font-mono text-[11px] font-bold text-cyan' lang='en'>
						<span className='pulse size-1.5 rounded-full bg-cyan' />
						LIVE
					</span>
					{fill(t.live_badge, { n: APPS.length })}
					<span className='arrow text-fg group-hover:[transform:translateX(4px)]'>→</span>
				</Link>

				{/* The phrases differ only in colour; they remain plain inline text so the available width decides every wrap. */}
				<h1 className={`m-0 text-[length:clamp(38px,4.7vw,68px)] leading-[1.16] font-extrabold data-[words=true]:text-[length:clamp(36px,4.4vw,62px)] data-[words=true]:tracking-[-0.03em] max-sm:text-[length:min(38px,9vw)] max-sm:data-[words=true]:text-[36px] ${HEADLINE_IN}`} data-words={words}>
					{t.h1_1}
					{words && ' '}
					<span className='text-cyan [text-shadow:0_0_40px_rgba(63,211,245,0.25)]'>{t.h1_2}</span>
				</h1>

				<p className={`m-0 text-[17px] leading-[1.75] text-fg-2 ${POP_2}`}>
					{t.hero_p}
					{words && ' '}
					{t.hero_p2}
				</p>

				{/* Below 640px the tabs and the copy button share the first line and the command takes the whole second line, where it scrolls inside its box. */}
				<div className={`box-border inline-flex max-w-full items-center gap-1 rounded-[14px] border border-line-3 bg-panel/85 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-[10px] max-sm:flex max-sm:w-full max-sm:flex-wrap ${POP_2}`}>
					<div role='tablist' aria-label={t.a_install} className='flex flex-none gap-0.5'>
						{INSTALL_TABS.map((it) => (
							<button key={it.key} type='button' role='tab' aria-selected={tab === it.key} onClick={() => setTab(it.key)} className='min-h-9 rounded-[9px] border-0 bg-transparent px-3 py-0 font-mono text-[12px] text-fg-3 aria-selected:bg-line-2 aria-selected:text-fg max-md:min-h-10'>
								{it.label}
							</button>
						))}
					</div>
					<code className='min-w-0 flex-auto overflow-x-auto px-3.5 py-0 text-left font-mono text-[14px] whitespace-nowrap text-fg max-sm:order-last max-sm:basis-full max-sm:px-3 max-sm:py-2.5 max-sm:text-[13px]'>
						<span className='text-cyan'>❯ </span>
						{INSTALL_CMDS[tab]}
					</code>
					<button type='button' className='btn-g min-h-9 min-w-[72px] flex-none rounded-[9px] border border-line-3 bg-transparent px-3 py-0 text-[13px] text-fg hover:border-fg hover:bg-white/4 max-md:min-h-10 max-sm:ml-auto' onClick={() => copy(INSTALL_CMDS[tab], 'cmd')} aria-label={t.a_copy_install}>
						{copied === 'cmd' ? t.copied : t.copy}
					</button>
				</div>

				{/* On phones the two buttons fill the row between them, or each its own row when they do not fit side by side. */}
				<div className={`flex flex-wrap gap-3 max-sm:self-stretch ${POP_3}`}>
					<Link to='/showcase' className={`btn-c ${BTN_52}`}>
						{t.explore} <span className='arrow'>→</span>
					</Link>
					<a className={`btn-g ${BTN_52} border border-line-3 bg-bg/50 font-semibold text-fg hover:border-fg hover:bg-white/4`} href={MYGO_SITE} target='_blank' rel='noopener'>
						{t.site}
					</a>
				</div>

				<div className={`flex flex-wrap gap-x-7 gap-y-2 text-[14px] text-fg-3 ${POP_3}`}>
					{stats.map((st) => (
						<span key={st.label}>
							<span className='font-display text-[18px] font-extrabold text-fg tabular-nums'>{st.n}</span> {st.label}
						</span>
					))}
				</div>
				</div>

				<div className='min-w-0 max-hero:max-w-[560px]'>
					<div className='relative animate-[bob_7s_ease-in-out_infinite_alternate] motion-reduce:animate-none'>
						<div className={`overflow-hidden rounded-2xl border border-cyan bg-panel shadow-[0_0_0_1px_rgba(63,211,245,0.3),0_50px_100px_rgba(0,0,0,0.65),0_0_80px_rgba(63,211,245,0.18)] ${POP_2}`}>
							<WinBar size='lg' className='h-9 gap-2 px-3 py-0'>
								<span className='mr-10 flex-auto text-center font-mono text-[12px] text-fg-3'>my-app — main.go</span>
							</WinBar>
							<HeroCode />
						</div>
					</div>
				</div>
			</div>

			{/* With the code window in the hero, the wall has no window left to show below 700px. */}
			<div className='relative z-1 mt-16 h-[420px] perspective-[1800px] max-tab:hidden'>
				{/* The 560x160 ellipse softened as if blurred by 90px, drawn as a gradient for the same reason as the backdrop's blobs: the box is 180px larger on every side, and the centre is 62% of the colour, as the blur, wider than the ellipse is tall, never reached the whole of it. */}
				<div aria-hidden='true' className='pointer-events-none absolute top-[120px] left-1/2 -mt-[180px] -ml-[460px] h-[520px] w-[920px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-cyan)_62%,transparent)_0%,color-mix(in_srgb,var(--color-cyan)_55%,transparent)_30%,transparent_100%)] opacity-22' />
				{/* The 3D wall's own box sits in front of the windows pushed back with translateZ, and the bottom fade covers the far ones, so neither may take the pointer; only the windows do. */}
				<div className='pointer-events-none absolute top-0 left-1/2 -ml-[600px] h-[560px] w-[1200px] origin-[50%_0%] transform-3d [transform:rotateX(calc(24deg_-_var(--py,0)_*_5deg))_rotateY(calc(var(--px,0)_*_7deg))] [transition:transform_0.4s_cubic-bezier(0.2,0.7,0.2,1)]'>
					{HERO_APPS.map((h) => {
						const v = appView(mustApp(h.slug));
						const style = { left: h.left, top: h.top, width: h.w, transform: `translateZ(${h.z}px) rotateY(${h.ry}deg)` } satisfies CSSProperties;
						return (
							<div key={h.slug} className={`pointer-events-auto absolute transform-3d ${h.hide}`} style={style}>
								<div className={`${h.bob} motion-reduce:animate-none`}>
									<AppLink slug={h.slug} className={`win box-border flex w-full flex-col overflow-hidden rounded-2xl border border-line-3 bg-panel p-0 text-left text-fg no-underline shadow-[0_40px_80px_rgba(0,0,0,0.6)] hover:border-cyan hover:shadow-[0_0_0_1px_var(--color-cyan),0_28px_70px_rgba(63,211,245,0.16)] ${h.pop}`} dialog>
										<WinBar label={v.host} size='sm' className='card-bar' />
										<span className='box-border flex w-full flex-col gap-3 p-[22px]'>
											<MonoTile view={v} size={52} />
											<span className='m-0 text-[19px] font-black tracking-normal'>{v.app.name}</span>
											<span className='text-[13px] leading-[1.6] text-fg-2'>{pick(v.app.desc, lang)}</span>
											<span className='flex flex-wrap items-center gap-2'><KindTag app={v.app} label={v.app.kind === 'native' ? t.surf_native : t.web_fe} /><PlatformTags app={v.app} /></span>
										</span>
									</AppLink>
								</div>
							</div>
						);
					})}
				</div>
				<div aria-hidden='true' className='pointer-events-none absolute right-0 bottom-0 left-0 z-3 h-60 bg-[linear-gradient(to_bottom,rgba(11,13,16,0),var(--color-bg)_85%)]' />
			</div>
		</section>
	);
}

function HeroCode() {
	const ln = (n: number) => <span className='text-fg-3'>{n}</span>;
	return (
		<div className='code'>
			{ln(1)}  mygo.<span className='text-cyan'>Bind</span>(Greeter{'{}'}){'\n'}
			{ln(2)}  mygo.App.<span className='text-cyan'>WhenReady</span>(<span className='text-amber'>func</span>() {'{'}
			{'\n'}
			{ln(3)}    mygo.<span className='text-cyan'>NewWindow</span>(mygo.WindowOptions{'{'}
			{'\n'}
			{ln(4)}      Title: <span className='text-green'>"Hello"</span>, URL: <span className='text-green'>"/"</span>,{'\n'}
			{ln(5)}    {'})'}
			{'\n'}
			{ln(6)}  {'})'}
			{'\n'}
			{ln(7)}  <span className='text-amber'>if</span> err := mygo.App.<span className='text-cyan'>Run</span>(); err != <span className='text-amber'>nil</span> {'{'}
			{'\n'}
			{ln(8)}    log.Fatal(err){'\n'}
			{ln(9)}  {'}'}
			<span className='animate-[blink_1s_steps(1)_infinite] text-cyan motion-reduce:animate-none'>▋</span>
		</div>
	);
}

function Categories() {
	const t = useT();
	const nState = STATE_SOLUTIONS.length;
	const nTpl = TEMPLATES.length;
	const nAi = AI_TOOLS.length;
	const cats = [
		{ to: '/showcase', span: 'col-span-7', name: t.cat_show_name, path: '~/showcase', n: APPS.length, numTone: 'text-cyan', badge: t.cat_show_badge, amber: false, pulse: false, desc: t.cat_show_desc },
		{ to: '/plugins', span: 'col-span-5', name: t.nav_plugins, path: '~/plugins', n: PLUGINS.length, numTone: 'text-fg', badge: t.cat_plug_badge, amber: false, pulse: false, desc: fill(t.cat_plug_desc, { n: PLUGINS.length }) },
		{ to: '/ui', span: 'col-span-5', name: t.cat_ui_name, path: '~/ui', n: UI_LIBS.length, numTone: 'text-fg', badge: fill(t.cat_ui_badge, { n: UI_LIBS.length }), amber: false, pulse: false, desc: t.cat_ui_desc },
		{ to: '/state', span: 'col-span-7', name: t.cat_state_name, path: '~/state', n: nState, numTone: nState ? 'text-fg' : 'text-line-3', badge: nState ? fill(t.cat_state_count, { n: nState }) : t.cat_state_badge, amber: true, pulse: nState === 0, desc: t.cat_state_desc },
		// The newer categories share a row, amber while they wait for their first entries, as state did.
		{ to: '/templates', span: 'col-span-6', name: t.cat_tpl_name, path: '~/templates', n: nTpl, numTone: nTpl ? 'text-fg' : 'text-line-3', badge: nTpl ? fill(t.cat_tpl_count, { n: nTpl }) : t.cat_tpl_badge, amber: true, pulse: nTpl === 0, desc: t.cat_tpl_desc },
		{ to: '/ai', span: 'col-span-6', name: t.cat_ai_name, path: '~/ai', n: nAi, numTone: nAi ? 'text-fg' : 'text-line-3', badge: nAi ? fill(t.cat_ai_count, { n: nAi }) : t.cat_ai_badge, amber: true, pulse: nAi === 0, desc: t.cat_ai_desc },
	] as const;
	return (
		<section aria-labelledby='cats' className={`${SEC} pt-22 pb-10 max-sm:pt-16`}>
			<div className={`rv ${SEC_HEAD}`}>
				<div className='flex flex-col gap-2.5'>
					<span className='kicker' lang='en'>01 / CATEGORIES</span>
					<h2 id='cats' className={SEC_H2}>
						{t.cats_h}
					</h2>
				</div>
				<p className='m-0 text-[15px] text-fg-3'>{t.cats_src}</p>
			</div>
			<div className='grid grid-cols-12 gap-4'>
				{cats.map((c, k) => (
					<div key={c.to} className={`rv ${c.span} max-nav:col-span-12 d${k} flex`}>
						<Link to={c.to} className='tile relative box-border flex min-h-[260px] flex-auto flex-col justify-between gap-5 overflow-hidden rounded-[20px] border border-line-2 bg-panel p-7 text-left hover:border-cyan max-sm:min-h-[200px] max-sm:p-5' {...tilt}>
							<span className='glare' aria-hidden='true' />
							<span className='flex w-full items-center justify-between'>
								<span className='font-mono text-[12px] text-fg-3'>{c.path}</span>
								<span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[12px] font-bold ${c.amber ? 'border-amber text-amber' : 'border-cyan text-cyan'}`}>
									<span className={`size-1.5 rounded-full bg-current ${c.pulse ? 'pulse' : ''}`} />
									{c.badge}
								</span>
							</span>
							<span className={`font-display text-[120px] leading-[0.85] font-extrabold tracking-[-0.06em] max-sm:text-[88px] ${c.numTone}`}>{pad2(c.n)}</span>
							<span className='flex w-full items-end justify-between gap-4'>
								<span className='flex min-w-0 flex-1 flex-col gap-1.5'>
									<span className='text-[26px] font-black tracking-[-0.02em] max-sm:text-[22px]'>{c.name}</span>
									<span className='text-[14px] leading-[1.6] text-fg-2'>{c.desc}</span>
								</span>
								<span className='arrow flex size-11 flex-[0_0_44px] items-center justify-center rounded-full border border-line-3 text-[18px] text-cyan' aria-hidden='true'>
									→
								</span>
							</span>
						</Link>
					</div>
				))}
			</div>
		</section>
	);
}
