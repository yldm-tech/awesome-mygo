import { APPS, type App, hostOf, pad2 } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';

// macOS-style title bar: three traffic lights followed by a label (a host, a file name…). The bar itself is the winbar class (styles/primitives.css), as each page sizes it with its own class (card-bar, panel-bar) or utilities; the large bar has larger lights.
export function WinBar({ label, size = 'md', className = '', children }: { label?: ReactNode; size?: 'sm' | 'md' | 'lg'; className?: string; children?: ReactNode }) {
	const light = `${size === 'lg' ? 'size-[11px]' : 'size-2.5'} flex-none rounded-full`;
	return (
		<span className={`winbar ${className}`}>
			<span className={`${light} bg-[#ff5f57]`} />
			<span className={`${light} bg-[#febc2e]`} />
			<span className={`${light} bg-[#28c840]`} />
			{label !== undefined && <span className='ml-2 min-w-0 flex-auto truncate font-mono text-[11px] text-fg-3'>{label}</span>}
			{children}
		</span>
	);
}

export interface AppView {
	app: App;
	index: number;
	num: string;
	host: string;
	initial: string;
	// Tile colour cycles through three styles by listing position.
	tone: 0 | 1 | 2;
}

export function appView(app: App): AppView {
	const index = APPS.indexOf(app);
	return { app, index, num: pad2(index + 1), host: hostOf(app.url), initial: app.name.charAt(0).toUpperCase(), tone: (index % 3) as 0 | 1 | 2 };
}

// The app's official icon; the letter tile stays as the fallback for an app without one.
export function MonoTile({ view, size }: { view: AppView; size: 44 | 52 | 56 | 96 }) {
	if (view.app.icon) return <img className={`mono-tile app-icon mono-${size}`} src={view.app.icon} alt='' width={size} height={size} loading='lazy' decoding='async' />;
	return (
		<span className={`mono-tile mono-${size} tone-${view.tone}`} aria-hidden='true'>
			{view.initial}
		</span>
	);
}

// A link to the app's own page, so crawlers and new tabs reach it. In the retro look, with `quick` (the default), a plain left click opens the app's quick-view window instead; a click with a modifier key, a middle click, or a click before the page hydrates follows the link. The original look always follows it.
export function AppLink({ slug, className, quick = true, tabIndex, hidden, dialog, children }: { slug: string; className: string; quick?: boolean; tabIndex?: number; hidden?: boolean; dialog?: boolean; children: ReactNode }) {
	const { openApp, quickView } = useSite();
	const intercept = quick && quickView;
	return (
		<Link
			to='/apps/$slug'
			params={{ slug }}
			className={className}
			tabIndex={tabIndex}
			aria-hidden={hidden || undefined}
			aria-haspopup={dialog && quickView ? 'dialog' : undefined}
			onClick={
				intercept
					? (e) => {
							if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
							e.preventDefault();
							openApp(slug);
						}
					: undefined
			}
		>
			{children}
		</Link>
	);
}

export function KindTag({ app, label }: { app: App; label: string }) {
	return (
		<span className={`kind-tag ${app.kind === 'web' ? 'kind-web' : 'kind-native'}`}>
			{label}
		</span>
	);
}

export function PlatformTags({ app }: { app: App }) {
	const t = useT();
	return <span className='flex flex-wrap items-center gap-1' aria-label={t.f_platform}>{app.platforms.map((p) => <span key={p} className='platform-tag' title={t[`platform_${p}`]}>{p === 'win' ? 'Win' : p === 'linux' ? 'Linux' : 'macOS'}</span>)}</span>;
}

// The 32 px icon on standard screens; high-density screens fall back to the 192 px icon, as there is no 64 px one. fetchPriority='low' keeps React from preloading the image ahead of the stylesheets on every page: the mark is small and never the LCP element.
export function Logo() {
	return <img className='block size-8' src='/icon-32.png' srcSet='/icon-32.png 1x, /icon-64.webp 2x' width={32} height={32} alt='' fetchPriority='low' decoding='async' />;
}

const EAR_STROKE = { stroke: '#B8C1C9', strokeWidth: 1.2 };

// Docky, the bunny mascot. `variant` picks the pose used in each place of the design.
export function Docky({ variant, className }: { variant: 'peek' | 'laptop' | 'sleepy' | 'toast'; className?: string }) {
	if (variant === 'toast') {
		return (
			<svg aria-hidden='true' width='26' height='26' viewBox='20 6 160 160'>
				<g transform='rotate(-24 60 50)'>
					<ellipse cx='60' cy='50' rx='20' ry='28' fill='#DDE3E8' />
					<ellipse cx='60' cy='52' rx='11' ry='18' fill='#FFC9D2' />
				</g>
				<g transform='rotate(16 140 48)'>
					<ellipse cx='140' cy='48' rx='20' ry='28' fill='#DDE3E8' />
					<ellipse cx='140' cy='50' rx='11' ry='18' fill='#FFC9D2' />
				</g>
				<ellipse cx='100' cy='94' rx='50' ry='44' fill='#DDE3E8' />
				<path d='M78 90 q6 -7 12 0 M110 90 q6 -7 12 0' fill='none' stroke='#0B0D10' strokeWidth='5' strokeLinecap='round' />
				<ellipse cx='100' cy='104' rx='6' ry='4.4' fill='#FF8FA3' />
			</svg>
		);
	}
	if (variant === 'sleepy') {
		return (
			<svg aria-hidden='true' width='130' height='91' viewBox='0 0 200 140'>
				<g transform='rotate(-24 62 22)'>
					<ellipse cx='62' cy='22' rx='17' ry='23' fill='#DDE3E8' />
					<ellipse cx='62' cy='24' rx='9' ry='15' fill='#FFC9D2' />
				</g>
				<g transform='rotate(16 138 20)'>
					<ellipse cx='138' cy='20' rx='17' ry='23' fill='#DDE3E8' />
					<ellipse cx='138' cy='22' rx='9' ry='15' fill='#FFC9D2' />
				</g>
				<ellipse cx='100' cy='64' rx='44' ry='38' fill='#DDE3E8' />
				<path d='M79 58 q5 -5 10 0 M111 58 q5 -5 10 0' fill='none' stroke='#0B0D10' strokeWidth='3' strokeLinecap='round' />
				<ellipse cx='100' cy='70' rx='4.6' ry='3.3' fill='#FF8FA3' />
				<rect x='8' y='80' width='184' height='58' rx='14' fill='#171C22' stroke='#313A45' strokeWidth='1.4' />
				<circle cx='24' cy='94' r='3.4' fill='#FF5F57' />
				<circle cx='35' cy='94' r='3.4' fill='#FEBC2E' />
				<circle cx='46' cy='94' r='3.4' fill='#28C840' />
				<ellipse cx='78' cy='81' rx='10' ry='6.5' fill='#DDE3E8' />
				<ellipse cx='122' cy='81' rx='10' ry='6.5' fill='#DDE3E8' />
			</svg>
		);
	}
	const laptop = variant === 'laptop';
	return (
		<svg
			className={className}
			width={laptop ? 200 : 120}
			height={laptop ? 140 : 70}
			viewBox={laptop ? '0 0 200 140' : '20 -6 160 94'}
			role='img'
			aria-label='Docky'
		>
			<g transform='rotate(-24 62 22)'>
				<ellipse cx='62' cy='22' rx='17' ry='23' fill='#DDE3E8' {...EAR_STROKE} />
				<ellipse cx='62' cy='24' rx='9' ry='15' fill='#FFC9D2' />
			</g>
			<g transform='rotate(16 138 20)'>
				<ellipse cx='138' cy='20' rx='17' ry='23' fill='#DDE3E8' {...EAR_STROKE} />
				<ellipse cx='138' cy='22' rx='9' ry='15' fill='#FFC9D2' />
			</g>
			<ellipse cx='100' cy='64' rx='44' ry='38' fill='#DDE3E8' {...EAR_STROKE} />
			<ellipse cx='84' cy='58' rx='4.8' ry='6.2' fill='#0B0D10' />
			<ellipse cx='116' cy='58' rx='4.8' ry='6.2' fill='#0B0D10' />
			<circle cx='85.6' cy='55.8' r='1.7' fill='#FFFFFF' />
			<circle cx='117.6' cy='55.8' r='1.7' fill='#FFFFFF' />
			{!laptop && <circle cx='72' cy='72' r='6' fill='#FFB547' opacity='0.38' />}
			{!laptop && <circle cx='128' cy='72' r='6' fill='#FFB547' opacity='0.38' />}
			<ellipse cx='100' cy='70' rx='4.6' ry='3.3' fill='#FF8FA3' />
			<path d='M64 68 L46 64 M136 68 L154 64' stroke='#A3AFBA' strokeWidth='1.4' strokeLinecap='round' />
			{laptop && (
				<>
					<rect x='8' y='80' width='184' height='58' rx='14' fill='#171C22' stroke='#313A45' strokeWidth='1.4' />
					<circle cx='24' cy='94' r='3.4' fill='#FF5F57' />
					<circle cx='35' cy='94' r='3.4' fill='#FEBC2E' />
					<circle cx='46' cy='94' r='3.4' fill='#28C840' />
					<path d='M8 106 H192' stroke='#252C35' strokeWidth='1.2' />
					<rect x='24' y='116' width='68' height='7' rx='3.5' fill='#252C35' />
					<rect x='24' y='126' width='44' height='6' rx='3' fill='#1C2229' />
				</>
			)}
			<ellipse cx='78' cy='81' rx='10' ry='6.5' fill='#DDE3E8' {...EAR_STROKE} />
			<ellipse cx='122' cy='81' rx='10' ry='6.5' fill='#DDE3E8' {...EAR_STROKE} />
		</svg>
	);
}

export function SearchIcon({ size = 16, stroke = 'currentColor' }: { size?: number; stroke?: string }) {
	return (
		<svg aria-hidden='true' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={stroke} strokeWidth='2' strokeLinecap='round'>
			<circle cx='11' cy='11' r='7' />
			<path d='M20 20l-3.5-3.5' />
		</svg>
	);
}

// The GitHub mark, in the current text colour.
export function GitHubMark({ size = 16 }: { size?: number }) {
	return (
		<svg aria-hidden='true' width={size} height={size} viewBox='0 0 16 16' fill='currentColor'>
			<path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z' />
		</svg>
	);
}

export function CloseIcon({ size = 16 }: { size?: number }) {
	return (
		<svg aria-hidden='true' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
			<path d='M6 6l12 12M18 6L6 18' />
		</svg>
	);
}
