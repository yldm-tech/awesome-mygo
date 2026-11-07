import { APPS, APP_PLATFORMS, type AppKind, type AppPlatform, HAS_SCORES, likeKey, pad2, pick } from '@awesome-mygo/catalog';
import { DEFAULT_SORT, groupChips, shownSort, sortApps, validateShowcaseSearch } from '../lib/showcase';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppLink, KindTag, MonoTile, PlatformTags, WinBar, appView } from '../components/bits';
import { showBy, showDesc, showGrid, showId, showIdText, showName } from '../components/EntryCard';
import { FilterBar, FilterChip, FilterChips, FilterSelect, FilterSelects } from '../components/FilterBar';
import { LikeButton } from '../components/Like';
import { ScoreBar } from '../components/Score';
import { useLang, useT } from '../lib/lang';
import { useLikes } from '../lib/likes';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/showcase')({
	// ?cat= and ?ui= keep the filters in the address, so a filtered list can be shared; an unknown value is dropped by the canonical-URL redirect.
	validateSearch: validateShowcaseSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/showcase', title: 'title_showcase', desc: 'desc_showcase', name: 'cat_show_name' }),
	component: ShowcasePage,
});

function ShowcasePage() {
	const t = useT();
	const lang = useLang();
	const { cat: group, ui: kind, platform, sort: sortParam } = Route.useSearch();
	const navigate = useNavigate({ from: '/showcase' });
	const setFilter = (next: { cat?: typeof group; ui?: AppKind; platform?: AppPlatform; sort?: typeof sortParam }) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
	const { status: likes, counts } = useLikes();
	const sort = shownSort(sortParam, likes);

	const ofPlatform = APPS.filter((a) => !platform || a.platforms.includes(platform));
	const nNative = ofPlatform.filter((a) => a.kind === 'native').length;
	// The groups count the apps of the chosen interface, so a chip never leads to an empty list.
	const ofKind = ofPlatform.filter((a) => !kind || a.kind === kind);
	const chips = groupChips(ofKind, group);
	const list = sortApps(
		ofKind.filter((a) => !group || chips.some((c) => c.key === group && c.apps.includes(a))),
		sort,
		counts,
	);

	return (
		<section className='page enter gap-8 max-sm:gap-5'>
			<div className='flex flex-wrap items-end justify-between gap-6'>
				<div className='flex flex-col gap-3.5'>
					<span className='kicker'>~/SHOWCASE</span>
					<h1 className='page-h1'>{t.cat_show_name}</h1>
				</div>
				<span className='font-display text-[120px] leading-[0.8] font-extrabold tracking-[-0.06em] text-cyan tabular-nums max-sm:text-[72px]'>{pad2(list.length)}</span>
			</div>
			<FilterBar>
				<FilterChips label={t.a_cats}>
					<FilterChip onClick={() => setFilter({ cat: undefined })} pressed={!group} count={ofKind.length} title={t.all}>
						{t.all}
					</FilterChip>
					{chips.map((c) => (
						<FilterChip key={c.key} onClick={() => setFilter({ cat: c.key })} pressed={group === c.key} count={c.apps.length} title={t[`grp_${c.key}`]}>
							{t[`grp_short_${c.key}`]}
						</FilterChip>
					))}
				</FilterChips>
				<FilterSelects grouped>
					<FilterSelect id='ui' label={t.f_ui} value={kind ?? 'all'} onChange={(v) => setFilter({ ui: v === 'all' ? undefined : (v as AppKind) })}>
						<option value='all'>{`${t.all} · ${APPS.length}`}</option>
						<option value='native'>{`${t.surf_native} · ${nNative}`}</option>
						<option value='web'>{`${t.web_fe} · ${APPS.length - nNative}`}</option>
					</FilterSelect>
					<FilterSelect id='platform' label={t.f_platform} value={platform ?? 'all'} onChange={(v) => setFilter({ platform: v === 'all' ? undefined : (v as AppPlatform) })}>
						<option value='all'>{`${t.all} · ${ofKind.length}`}</option>
						{APP_PLATFORMS.map((p) => <option key={p} value={p}>{`${t[`platform_${p}`]} · ${ofKind.filter((a) => a.platforms.includes(p)).length}`}</option>)}
					</FilterSelect>
					<FilterSelect id='sort' label={t.sort} value={sort} onChange={(v) => setFilter({ sort: v === DEFAULT_SORT ? undefined : (v as typeof sortParam) })}>
						<option value='natural'>{t.sort_natural}</option>
						<option value='newest'>{t.sort_new}</option>
						{likes !== 'off' && <option value='likes'>{t.sort_likes}</option>}
						{HAS_SCORES && <option value='score'>{t.sort_score}</option>}
					</FilterSelect>
				</FilterSelects>
			</FilterBar>
			<div className={showGrid}>
				{list.map((a, k) => {
					const v = appView(a);
					// On a showcase card the like button sits over the card's top right, beside its link rather than inside it, and rises with the card on hover; below sm the card's body is 14px in from its edges instead of 18px, and the button moves in with it, still level with the tile; hovering either lifts the card (as .win:hover does for the card alone). The card is a link to the app's page that keeps the look it had as a button instead of the link colour and underline.
					return (
						<div key={a.slug} className={`rv d${k % 6} group relative flex`}>
							<AppLink slug={a.slug} className='win card rounded-[14px] text-fg no-underline group-hover:[transform:translateY(-6px)] group-hover:border-cyan group-hover:shadow-[0_0_0_1px_var(--color-cyan),0_28px_70px_rgba(63,211,245,0.16)] motion-reduce:group-hover:[transform:none]' dialog>
								<WinBar label={v.host} size='md' className='card-bar h-[30px]'>
									<span className='font-mono text-[11px] text-fg-3'>{v.num}</span>
								</WinBar>
								<div className='box-border flex w-full flex-auto flex-col gap-3 p-[18px] max-sm:gap-2.5 max-sm:p-3.5'>
									<div className={`${showId} pr-[72px]`}>
										<MonoTile view={v} size={44} />
										<div className={showIdText}>
											<h2 className={showName}>{a.name}</h2>
											{/* Below sm the kind tag goes under the author when the two do not fit on one line: beside the like button's reserve, a tag kept beside a Japanese author left it no room past "by…". A short author keeps the tag on its line, so the card is a line shorter. */}
											<span className='flex min-w-0 items-center gap-2 max-sm:flex-wrap max-sm:gap-y-1 [&_.kind-tag]:flex-none [&_.kind-tag]:self-auto'>
												<span className={showBy} title={a.author}>
													<span lang='en'>by</span> {a.author}
												</span>
												<KindTag app={a} label={a.kind === 'native' ? t.surf_native : t.web_fe} />
												<PlatformTags app={a} />
											</span>
										</div>
									</div>
									{/* Below sm the description stops at two lines, so a phone shows more cards per screen; the whole text is on the app's page, which the card opens. */}
									<span className={`${showDesc} max-sm:line-clamp-2`}>{pick(a.desc, lang)}</span>
								</div>
								<ScoreBar item={likeKey.app(a)} name={a.name} />
							</AppLink>
							<LikeButton item={likeKey.app(a)} name={a.name} className='like-btn absolute top-[46px] right-4 max-sm:right-3 group-hover:[transform:translateY(-6px)] motion-reduce:group-hover:[transform:none]' />
						</div>
					);
				})}
			</div>
			{list.length === 0 && (
				<div className='flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-dashed border-line-3 p-7 text-[15px] text-fg-2'>
					<p className='m-0'>{t.f_none}</p>
					<button type='button' className='btn-g btn-44 btn-outline' onClick={() => setFilter({ cat: undefined, ui: undefined, platform: undefined })}>
						{t.f_clear}
					</button>
				</div>
			)}
		</section>
	);
}
