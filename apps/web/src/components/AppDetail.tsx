import { type App, APPS, DISTRIBUTION_AS_OF, DIST_CHECK_FORMATS, DIST_OSES, DOCS, type DistFormat, type DistOs, type DistPlatform, type DistRecord, type DistUpdater, HAS_SCORES, type LangCode, type MacSign, type StringKey, type Translations, type WinSign, appDistribution, appGroup, appSource, authorProfile, entryScore, fill, hostOf, likeKey, pick } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';
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

// A day of the catalog (the day the app joined the showcase, the day the distribution data was last updated or a signature checked), in the page's language. Formatted in UTC so the server's render and the visitor's browser agree on the day.
export function dayIn(day: string, lang: LangCode): string {
	return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(day));
}

// Keep URLs breakable when a narrow column needs it, but let the browser use normal punctuation opportunities first.
const urlDd = 'font-mono text-[13px] wrap-break-word';

// A URL as text, allowed to break after each slash, so that github.com/villatothesea/DumpingGround breaks between its parts before it breaks inside a word.
function UrlText({ text }: { text: string }) {
	const parts = text.split('/');
	return parts.map((part, i) => (
		<Fragment key={i}>
			{part}
			{i < parts.length - 1 && (
				<>
					/<wbr />
				</>
			)}
		</Fragment>
	));
}

export function AppFacts({ view, kindLabel }: { view: AppView; kindLabel: string }) {
	const t = useT();
	const lang = useLang();
	const { app } = view;
	const src = appSource(app);
	const profile = authorProfile(app.author);
	const group = appGroup(app);
	const score = entryScore(likeKey.app(app));
	// The value column may shrink below its longest word (minmax(0,1fr)), so a homepage URL without a hyphen, such as github.com/villatothesea/DumpingGround, wraps instead of squeezing the labels into one character a line; labels never wrap.
	return (
		<dl className='m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 rounded-[14px] border border-line-2 bg-panel px-5 py-[18px] text-[14px] max-sm:px-4 [&_a]:border-b [&_a]:border-line-3 [&_a]:text-fg [&_a]:no-underline [&_a:hover]:border-current [&_a:hover]:text-cyan [&>dd]:m-0 [&>dt]:whitespace-nowrap [&>dt]:text-fg-3'>
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
					<UrlText text={view.host} />
				</a>
			</dd>
			{src && (
				<>
					<dt>{t.f_src}</dt>
					<dd className={urlDd}>
						<a href={src} target='_blank' rel='noopener'>
							<UrlText text={hostOf(src)} />
						</a>
					</dd>
				</>
			)}
			{app.added && (
				<>
					<dt>{t.f_added}</dt>
					<dd>
						<time dateTime={app.added}>{dayIn(app.added, lang)}</time>
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

// ---- distribution ----

// How an app's latest release is shipped (data/distribution.json, through appDistribution), read the same way by both looks: the retro look's page imports these and draws the parts with its own classes.

// How a signing state reads at a glance: good opens without a warning; warn opens only after the system warns or the user overrides it, as an unsigned installer package does; bad will not open (an unsigned app bundle on Apple silicon) or no longer matches its signature; neutral is not known or not checked yet. The words say the same, so the colour is never the only cue.
export type DistTone = 'good' | 'warn' | 'bad' | 'neutral';

// Each state's tone and words, by system.
const SIGN_STATES: { mac: Record<MacSign, readonly [DistTone, StringKey]>; win: Record<WinSign, readonly [DistTone, StringKey]> } = {
	mac: {
		notarized: ['good', 'dist_mac_notarized'],
		'developer-id': ['warn', 'dist_mac_devid'],
		untrusted: ['warn', 'dist_untrusted'],
		invalid: ['bad', 'dist_invalid'],
		adhoc: ['warn', 'dist_mac_adhoc'],
		unsigned: ['bad', 'dist_unsigned'],
		unknown: ['neutral', 'dist_unknown'],
	},
	win: {
		trusted: ['good', 'dist_win_trusted'],
		untrusted: ['warn', 'dist_untrusted'],
		unsigned: ['warn', 'dist_unsigned'],
		invalid: ['bad', 'dist_invalid'],
		unknown: ['neutral', 'dist_unknown'],
	},
};

export interface DistSign {
	tone: DistTone;
	label: string;
	// Lines under the state: who signed it, and the check's note (why it could not be checked, why the signature fails, or which executable of an archive was checked), which is the workflow's, in English.
	detail: { text: string; en: boolean }[];
	// Everything the check recorded, for the state's tooltip: the checked file, the signer as the certificate names it, the note and the day of the check.
	title?: string;
	stapled: boolean;
}

// The certificate's kind before a macOS signer's name, which the state already says.
const DEV_ID_PREFIX = 'Developer ID Application: ';

// What the system's own checks said of the file that stands for a system, that it has not been checked yet, or that the release offers the system nothing the checks open (only a bare binary or an install script). An unsigned installer package opens after the user overrides Gatekeeper, so it reads as a warning where an unsigned app bundle reads as bad.
export function distSign(os: 'mac' | 'win', part: DistPlatform, t: Translations, lang: LangCode): DistSign {
	const { check } = part;
	if (!check) {
		const checkable: readonly string[] = DIST_CHECK_FORMATS[os];
		return { tone: 'neutral', label: part.formats.some((f) => checkable.includes(f)) ? t.dist_pending : t.dist_nocheck, detail: [], stapled: false };
	}
	// The reader holds each status to its system's states, so the lookup always finds one.
	const [state, key] = (SIGN_STATES[os] as Record<string, readonly [DistTone, StringKey]>)[check.status];
	const tone = os === 'mac' && check.status === 'unsigned' && check.pkg ? 'warn' : state;
	// The Developer ID prefix is the certificate's kind, which the notarized and Developer ID states already say; any other state keeps it, as the kind is then what matters.
	const signer = check.signer?.startsWith(DEV_ID_PREFIX) && (check.status === 'notarized' || check.status === 'developer-id') ? check.signer.slice(DEV_ID_PREFIX.length) : check.signer;
	const detail = [...(signer ? [{ text: fill(t.dist_signer, { x: signer }), en: false }] : []), ...(check.note ? [{ text: check.note, en: true }] : [])];
	const title = [fill(t.dist_file, { x: check.file }), check.signer && fill(t.dist_signer, { x: check.signer }), check.note, fill(t.dist_checked, { x: dayIn(check.checked, lang) })].filter(Boolean).join('\n');
	return { tone, label: t[key], detail, title, stapled: check.stapled === true };
}

const UPDATER_KEYS: Record<DistUpdater, StringKey> = { mygo: 'dist_up_mygo', sparkle: 'dist_up_sparkle', tauri: 'dist_up_tauri', electron: 'dist_up_electron' };

// How the app updates itself on a system, or that the release shows no updater, which is not proof that it has none.
export function distUpdater(part: DistPlatform, t: Translations): string {
	if (!part.updates) return t.dist_up_none;
	const name = part.updates === 'mygo' && part.deltas ? t.dist_up_mygo_delta : t[UPDATER_KEYS[part.updates]];
	return fill(t.dist_updates, { x: name });
}

// The formats a chip names in the page's language; the others by their extension or their own name. An executable whose name does not say it installs is only .exe: it may be a portable build or an installer named otherwise, which its name cannot tell.
const FORMAT_KEYS: Partial<Record<DistFormat, StringKey>> = { setup: 'dist_fmt_setup', binary: 'dist_fmt_binary' };
const FORMAT_NAMES: Partial<Record<DistFormat, string>> = { dmg: '.dmg', pkg: '.pkg', zip: '.zip', 'tar.gz': '.tar.gz', msi: '.msi', msix: '.msix', exe: '.exe', deb: '.deb', rpm: '.rpm', flatpak: 'Flatpak', snap: 'Snap', arch: 'Arch', apk: 'Alpine' };

export function distFormat(format: DistFormat, t: Translations): string {
	const key = FORMAT_KEYS[format];
	return key ? t[key] : FORMAT_NAMES[format] ?? format;
}

// The systems the record has a part for, in DIST_OSES order.
export function distParts(rec: DistRecord): { os: DistOs; part: DistPlatform }[] {
	return DIST_OSES.flatMap((os) => {
		const part: DistPlatform | undefined = rec[os];
		return part ? [{ os, part }] : [];
	});
}

// The release's page on GitHub. A tag can hold slashes, which stay path separators there.
export function distReleaseUrl(rec: DistRecord): string {
	return `https://github.com/${rec.repo}/releases/tag/${rec.tag.split('/').map(encodeURIComponent).join('/')}`;
}

// MyGo's guides to building, signing and shipping an app and to its updater, linked under the section.
export const DIST_GUIDES: readonly { url: string; key: StringKey }[] = (
	[
		['distribution', 'dist_doc_dist'],
		['updates', 'dist_doc_updates'],
	] as const
).flatMap(([slug, key]) => {
	const doc = DOCS.find((d) => d.slug === slug);
	return doc ? [{ url: doc.url, key }] : [];
});

const TONE_DOT: Record<DistTone, string> = { good: 'bg-green', warn: 'bg-amber', bad: 'bg-err', neutral: 'bg-fg-3' };

// How the app's latest release is shipped, in a card beside its facts: for each system the release offers something for, the formats as chips, the state of its signature with a coloured marker (the day of the check in its tooltip), and how it updates itself; then the release, the day the distribution data was last updated and MyGo's guides. Nothing for an app without a record.
export function AppDistribution({ app }: { app: App }) {
	const t = useT();
	const lang = useLang();
	const rec = appDistribution(app);
	if (!rec) return null;
	return (
		<section aria-labelledby='app-dist-h' className='flex flex-col gap-3.5 rounded-[14px] border border-line-2 bg-panel px-5 py-[18px] max-sm:px-4 [&_a]:border-b [&_a]:border-line-3 [&_a]:text-fg [&_a]:no-underline [&_a:hover]:border-current [&_a:hover]:text-cyan'>
			<h2 id='app-dist-h' className={secH}>
				{t.dist_h}
			</h2>
			<dl className='m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3.5 text-[14px] [&>dd]:m-0 [&>dt]:text-fg-3'>
				{distParts(rec).map(({ os, part }) => {
					const sign = os === 'linux' ? undefined : distSign(os, part, t, lang);
					return (
						<Fragment key={os}>
							<dt>{t[`platform_${os}`]}</dt>
							<dd className='flex min-w-0 flex-col gap-1.5'>
								<span className='flex flex-wrap gap-1'>
									{part.formats.map((f) => (
										<span key={f} className='platform-tag'>
											{distFormat(f, t)}
										</span>
									))}
								</span>
								{sign && (
									<span className='flex flex-wrap items-center gap-x-2 gap-y-0.5' title={sign.title}>
										<span aria-hidden='true' className={`size-2 flex-none rounded-full ${TONE_DOT[sign.tone]}`} />
										<span>{sign.label}</span>
										{sign.stapled && <span className='text-[12px] text-fg-3'>· {t.dist_stapled}</span>}
									</span>
								)}
								{sign?.detail.map((d) => (
									<span key={d.text} lang={d.en ? 'en' : undefined} className='text-[12px] text-fg-3 wrap-break-word'>
										{d.text}
									</span>
								))}
								<span className='text-[13px] text-fg-2'>{distUpdater(part, t)}</span>
							</dd>
						</Fragment>
					);
				})}
			</dl>
			<p className='m-0 text-[12px] leading-[1.55] text-fg-3'>{t.dist_about}</p>
			<p className='m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[12px] text-fg-3'>
				<a href={distReleaseUrl(rec)} target='_blank' rel='noopener'>
					{fill(t.dist_release, { x: rec.tag })}
				</a>
				{rec.prerelease && <span className='platform-tag'>{t.dist_prerelease}</span>}
				{DISTRIBUTION_AS_OF && <time dateTime={DISTRIBUTION_AS_OF}>{fill(t.dist_updated, { x: dayIn(DISTRIBUTION_AS_OF, lang) })}</time>}
			</p>
			{DIST_GUIDES.length > 0 && (
				<p className='m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]'>
					<span className='text-fg-3'>{t.dist_guides}</span>
					{DIST_GUIDES.map((g) => (
						<a key={g.key} href={g.url} target='_blank' rel='noopener'>
							{t[g.key]} <span aria-hidden='true'>↗</span>
						</a>
					))}
				</p>
			)}
		</section>
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
