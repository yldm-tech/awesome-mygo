import { type App, APPS, HAS_SCORES, type LangCode, appGroup, appSource, authorProfile, entryScore, fill, hostOf, likeKey, pick } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import { useLang, useT } from '../lib/lang';
import { scoreTotal } from '../lib/score';
import { appBadgeMarkdown } from '../lib/seo';
import { useSite } from '../lib/site';
import { AppLink, PlatformTags, type AppView, MonoTile, appView } from './bits';
import { CopyButton } from './CopyCmd';
import { LikeButton } from './Like';

// The parts of an app's own page in the original look.

// A section's heading on the app's page (about, badge, more by the author): small mono capitals.
export const secH = 'm-0 font-mono text-[12px] font-normal tracking-[0.12em] text-fg-3 uppercase';

// The README badge for the app's author: the badge as it shows, its Markdown and a copy button. The badge's alt text and the Markdown stay in English, as they go into the project's README, not this page.
export function AppBadge({ app }: { app: App }) {
	const t = useT();
	const md = appBadgeMarkdown(app.slug);
	return (
		<section className='flex flex-col gap-2.5' aria-labelledby='app-badge-h'>
			<h2 id='app-badge-h' className={secH}>
				{t.badge_h}
			</h2>
			<p className='m-0 text-[14px] leading-[1.55] text-fg-2'>{t.badge_p}</p>
			<img className='block h-7 w-auto self-start' src='/badge.svg' alt='Listed on Awesome MyGo' width={200} height={28} loading='lazy' decoding='async' />
			<div className='flex items-center gap-2 rounded-lg border border-line-2 bg-well-2 py-1 pr-1 pl-3'>
				{/* The Markdown is one long line; it scrolls inside its box rather than widening the column. */}
				<code lang='en' className='min-w-0 flex-auto overflow-x-auto font-mono text-[12px] whitespace-nowrap text-fg-2 [scrollbar-width:none]'>
					{md}
				</code>
				<CopyButton text={md} copyKey='badge' label={t.a_copy_badge} />
			</div>
		</section>
	);
}

// The day the app joined the showcase, in the page's language. Formatted in UTC so the server's render and the visitor's browser agree on the day.
function addedOn(added: string, lang: LangCode): string {
	return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(added));
}

// Keep URLs breakable when a narrow column needs it, but let the browser use normal punctuation opportunities first.
const urlDd = 'font-mono text-[13px] wrap-break-word';

export function AppFacts({ view, kindLabel }: { view: AppView; kindLabel: string }) {
	const t = useT();
	const lang = useLang();
	const { app } = view;
	const src = appSource(app);
	const profile = authorProfile(app.author);
	const group = appGroup(app);
	const score = entryScore(likeKey.app(app));
	return (
		<dl className='m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 rounded-[14px] border border-line-2 bg-panel px-5 py-[18px] text-[14px] max-sm:px-4 [&_a]:border-b [&_a]:border-line-3 [&_a]:text-fg [&_a]:no-underline [&_a:hover]:border-current [&_a:hover]:text-cyan [&>dd]:m-0 [&>dt]:text-fg-3'>
			<dt>{t.f_author}</dt>
			<dd>
				{profile ? (
					<a href={profile} target='_blank' rel='noopener'>
						{app.author}
					</a>
				) : (
					app.author
				)}
			</dd>
			<dt>{t.f_ui}</dt>
			<dd>{kindLabel}</dd>
			<dt>{t.f_platform}</dt>
			<dd><PlatformTags app={app} /></dd>
			<dt>{t.f_cat}</dt>
			<dd>
				<Link to='/showcase' search={{ cat: group }}>
					{t[`grp_${group}`]}
				</Link>
			</dd>
			<dt>{t.f_site}</dt>
			<dd className={urlDd}>
				<a href={app.url} target='_blank' rel='noopener'>
					{view.host}
				</a>
			</dd>
			{src && (
				<>
					<dt>{t.f_src}</dt>
					<dd className={urlDd}>
						<a href={src} target='_blank' rel='noopener'>
							{hostOf(src)}
						</a>
					</dd>
				</>
			)}
			{app.added && (
				<>
					<dt>{t.f_added}</dt>
					<dd>
						<time dateTime={app.added}>{addedOn(app.added, lang)}</time>
					</dd>
				</>
			)}
			{/* Once the workflow has recorded scores, an app it has not measured yet says so; before that the row is left out. The total links to its breakdown further down the page. */}
			{HAS_SCORES && (
				<>
					<dt>{t.score}</dt>
					<dd>{score ? <a href='#score'>{`${scoreTotal(score)}/100`}</a> : t.score_pending}</dd>
				</>
			)}
		</dl>
	);
}

export function AppActions({ app }: { app: App }) {
	const t = useT();
	const { copy, copied } = useSite();
	return (
		// On a phone the open button takes its own row, and copy link fills the row under it beside the like button, so both rows are full width.
		<div className='mt-2 flex flex-wrap items-center gap-2.5'>
			<a className='btn-c inline-flex min-h-[50px] flex-initial items-center justify-center rounded-xl px-7 text-[15px] max-sm:flex-[1_1_100%]' href={app.url} target='_blank' rel='noopener'>
				{fill(t.open_x, { x: app.name })}
			</a>
			<button type='button' className='btn-g min-h-[50px] rounded-xl border border-line-3 bg-transparent px-[18px] py-0 text-[14px] font-semibold text-fg hover:border-fg hover:bg-white/4 max-sm:flex-1' onClick={() => copy(app.url, 'det')}>
				{copied === 'det' ? t.copied : t.copy_link}
			</button>
			<LikeButton item={likeKey.app(app)} name={app.name} className='like-btn min-h-[46px] rounded-[10px] px-4 text-[14px] max-sm:min-h-[50px]' size={18} />
		</div>
	);
}

// Other apps by the same author, under a heading: a grid of links to their pages, across the page below its body.
export function MoreBy({ app }: { app: App }) {
	const t = useT();
	const lang = useLang();
	const others = APPS.filter((o) => o.author === app.author && o !== app).slice(0, 6);
	if (others.length === 0) return null;
	const label = fill(t.more_by, { x: app.author });
	return (
		<section className='flex flex-col gap-3.5'>
			<h2 className={secH}>{label}</h2>
			<div className='grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3'>
				{others.map((o) => (
					// A link to the app's page that keeps the look it had as a button instead of the link colour and underline.
					<AppLink key={o.slug} slug={o.slug} quick={false} className='flex items-center gap-3.5 rounded-xl border border-line-2 bg-panel px-4 py-3 text-left text-fg no-underline [transition:border-color_0.15s] hover:border-cyan'>
						{o.icon ? (
							<img className='app-icon size-8 flex-[0_0_32px]' src={o.icon} alt='' width={32} height={32} loading='lazy' decoding='async' />
						) : (
							<span aria-hidden='true' className='flex size-8 flex-[0_0_32px] items-center justify-center rounded-[9px] bg-line text-[14px] font-extrabold text-cyan'>
								{o.name.charAt(0).toUpperCase()}
							</span>
						)}
						<span className='flex min-w-0 flex-auto flex-col gap-0.5'>
							<span className='text-[14px] font-bold'>{o.name}</span>
							<span className='truncate text-[12px] text-fg-3'>{pick(o.desc, lang)}</span>
						</span>
						<span aria-hidden='true' className='text-fg-3'>
							→
						</span>
					</AppLink>
				))}
			</div>
		</section>
	);
}

// The previous and next app in catalog order, wrapping around.
export function neighbours(view: AppView): [App, App] {
	const n = APPS.length;
	return [APPS[(view.index - 1 + n) % n], APPS[(view.index + 1) % n]];
}

// The previous and next app as two cards: which way each goes, then the app's tile and name.
export function AppPager({ view }: { view: AppView }) {
	const t = useT();
	const [prev, next] = neighbours(view);
	const card = (app: App, dir: 'prev' | 'next') => (
		<AppLink
			slug={app.slug}
			quick={false}
			className={`group flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-line-2 bg-panel px-[22px] py-[18px] text-fg no-underline [transition:border-color_0.15s,transform_0.15s] hover:border-cyan hover:motion-safe:[transform:translateY(-2px)] ${dir === 'next' ? 'items-end text-right' : ''}`}
		>
			<span className='font-mono text-[12px] tracking-[0.08em] text-fg-3 group-hover:text-cyan'>{dir === 'prev' ? `← ${t.pg_prev}` : `${t.pg_next} →`}</span>
			<span className={`flex max-w-full min-w-0 items-center gap-3.5 ${dir === 'next' ? 'flex-row-reverse' : ''}`}>
				<MonoTile view={appView(app)} size={44} />
				<span className='min-w-0 truncate font-display text-[22px] font-extrabold tracking-[-0.02em] max-sm:text-[18px]'>{app.name}</span>
			</span>
		</AppLink>
	);
	return (
		<nav aria-label={t.a_pager} className='grid grid-cols-2 gap-4 max-sm:grid-cols-1'>
			{card(prev, 'prev')}
			{card(next, 'next')}
		</nav>
	);
}
