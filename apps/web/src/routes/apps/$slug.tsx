import { appBySlug, appGroup, likeKey, pick } from '@awesome-mygo/catalog';
import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { AppActions, AppBadge, AppFacts, AppPager, MoreBy, secH } from '../../components/AppDetail';
import { KindTag, MonoTile, PlatformTags, WinBar, appView } from '../../components/bits';
import { ScoreBreakdown } from '../../components/Score';
import { useLang, useT } from '../../lib/lang';
import { appHead } from '../../lib/seo';

// An app's own page: what the showcase cards and search open in the original look, and what search engines index. The retro look keeps a quick-view window over the listing pages.
export const Route = createFileRoute('/apps/$slug')({
	loader: ({ params }) => {
		if (!appBySlug(params.slug)) throw notFound();
	},
	head: ({ params, match }) => {
		const app = appBySlug(params.slug);
		return app ? appHead(app, match.search.lang) : {};
	},
	component: AppPage,
});

const crumbLink = 'text-fg-2 no-underline hover:text-cyan';
// The slash between two crumbs.
const crumbSep = "before:mr-2 before:content-['/']";

function AppPage() {
	const t = useT();
	const lang = useLang();
	const { slug } = Route.useParams();
	// The loader has already answered an unknown slug with the 404 page.
	const app = appBySlug(slug);
	if (!app) throw notFound();

	const v = appView(app);
	const kindLabel = app.kind === 'native' ? t.surf_native : t.web_fe;
	const group = appGroup(app);

	// The hero: the icon with its glow beside what the app is, then the actions. The body: the screenshot and the description, with the facts, the score and the badge beside them (under them below split), then the author's other apps and the previous and next apps.
	return (
		<article className='page enter gap-11 max-sm:gap-8'>
			<nav aria-label={t.a_crumbs}>
				<ol className='m-0 flex list-none flex-wrap gap-2 p-0 font-mono text-[13px] text-fg-3'>
					<li>
						<Link to='/' className={crumbLink}>
							{t.nav_home}
						</Link>
					</li>
					<li className={crumbSep}>
						<Link to='/showcase' className={crumbLink}>
							{t.cat_show_name}
						</Link>
					</li>
					<li aria-current='page' className={crumbSep}>
						{app.name}
					</li>
				</ol>
			</nav>
			<header className='grid grid-cols-[96px_minmax(0,1fr)] items-start gap-8 max-sm:grid-cols-[minmax(0,1fr)] max-sm:gap-5'>
				<div className='relative size-24 max-sm:size-18 max-sm:[&_.mono-96]:size-18 max-sm:[&_.mono-96]:rounded-[20px] max-sm:[&_.mono-96]:text-[32px] [&_.mono-tile]:relative'>
					{/* A blurred copy of the icon lights the space behind it. */}
					{/* The glow is the page's largest paint on a phone, and the icon below loads from the same URL, so it is fetched ahead of the fonts. */}
					{app.icon && <img className='pointer-events-none absolute inset-0 h-full w-full scale-120 rounded-[26px] opacity-50 blur-[30px] saturate-140' src={app.icon} alt='' aria-hidden='true' width={96} height={96} decoding='async' fetchPriority='high' />}
					<MonoTile view={v} size={96} />
				</div>
				<div className='flex min-w-0 flex-col gap-3.5'>
					<p className='m-0 flex flex-wrap items-center gap-x-3.5 gap-y-2 font-mono text-[12px] text-fg-3 [&_.kind-tag]:self-center'>
						<KindTag app={app} label={kindLabel} />
						<PlatformTags app={app} />
						<Link to='/showcase' search={{ cat: group }} className='tracking-[0.04em] text-cyan no-underline hover:text-cyan-2 hover:underline'>
							{t[`grp_${group}`]}
						</Link>
						<span>
							<span lang='en'>by</span> {app.author}
						</span>
					</p>
					<h1 className='m-0 font-display text-[length:clamp(40px,5.4vw,72px)] leading-[1.02] font-black tracking-[-0.04em] wrap-break-word'>{app.name}</h1>
					<p className='m-0 text-[19px] leading-[1.6] text-fg-2 max-sm:text-[17px]'>{pick(app.desc, lang)}</p>
					<AppActions app={app} />
				</div>
			</header>
			<div className='grid grid-cols-[minmax(0,1fr)_340px] items-start gap-10 max-split:grid-cols-[minmax(0,1fr)]'>
				<div className='flex min-w-0 flex-col gap-9'>
					{app.image && (
						<figure className='m-0 overflow-hidden rounded-[14px] border border-line-2 bg-panel shadow-[0_30px_80px_rgba(0,0,0,0.35)]'>
							<WinBar label={v.host} size='md' className='card-bar' />
							<img className='block h-auto w-full' src={app.image} alt={`${app.name} ${t.app_shot}`} width={1200} height={750} fetchPriority='high' decoding='async' />
						</figure>
					)}
					<section className='flex flex-col gap-3' aria-labelledby='app-about-h'>
						<h2 id='app-about-h' className={secH}>
							{t.app_about}
						</h2>
						<p className='m-0 text-[17px] leading-[1.8] text-fg-2'>{pick(app.about, lang)}</p>
					</section>
				</div>
				<aside className='sticky top-24 flex flex-col gap-7 max-split:static'>
					<AppFacts view={v} kindLabel={kindLabel} />
					<ScoreBreakdown item={likeKey.app(app)} id='score' className='rounded-[14px] border border-line-2 bg-panel px-5 py-[18px] max-sm:px-4' />
					<AppBadge app={app} />
				</aside>
			</div>
			<MoreBy app={app} />
			<AppPager view={v} />
		</article>
	);
}
