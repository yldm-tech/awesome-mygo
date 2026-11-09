import type { ReactNode } from 'react';
import { WinBar } from './bits';
import { LikeButton } from './Like';
import { ScoreButton } from './Score';

// The parts of an entry's card in the original look, drawn the same on the showcase, the UI libraries, the state solutions and the plugins.

// The grid of cards on the showcase, UI library and state pages.
export const showGrid = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4';

// A card's head: the tile (when the card has one), then the name and the line under it.
// Keep the icon aligned with the name when the metadata wraps on narrow cards.
// Centering against a multi-line metadata block makes the icon float halfway down the card head.
export const showId = 'flex items-start gap-3';
export const showIdText = 'flex min-w-0 flex-col gap-[3px]';
export const showName = 'm-0 truncate text-[17px] font-black tracking-[-0.01em]';
// The name in a card's head, beside its score and like buttons: up to two lines, using normal word and hyphen opportunities before breaking an unusually long token as a last resort.
export const cardName = 'm-0 line-clamp-2 text-[17px] leading-[1.25] font-black tracking-[-0.01em] wrap-break-word';
export const showBy = 'truncate text-[13px] text-fg-3';
export const showDesc = 'flex-auto text-[14px] leading-[1.6] text-fg-2';

// A UI library's, a state solution's or a plugin's card: a window whose title bar names the entry and may end in a link (`bar`), the project's screenshot under the bar when it has one (`shot`), and the body, 14px in from the card's edges below sm instead of 18px.
export function EntryCard({ label, bar, shot, children }: { label: string; bar?: ReactNode; shot?: ReactNode; children: ReactNode }) {
	return (
		<article className='win card'>
			<WinBar label={label} size='md' className='card-bar'>
				{bar}
			</WinBar>
			{shot}
			<div className='flex flex-auto flex-col gap-3 p-[18px] max-sm:gap-2.5 max-sm:p-3.5'>{children}</div>
		</article>
	);
}

// The link at the end of a card's title bar (the docs, the repository). It keeps the links' lighter cyan on hover.
export function BarLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a className='flex-none text-[12px] font-semibold text-cyan no-underline hover:text-cyan-2 hover:underline' href={href} target='_blank' rel='noopener'>
			{children}
		</a>
	);
}

// The project's screenshot between a card's title bar and its body, linking where the card's name does; `className` gives its aspect ratio. Hidden from assistive technology and the tab order, as the name's link is the same link.
export function CardShot({ href, className, children }: { href: string; className: string; children: ReactNode }) {
	return (
		<a className={`flex items-center justify-center overflow-hidden border-b border-line-2 bg-well-2 ${className}`} href={href} target='_blank' rel='noopener' tabIndex={-1} aria-hidden='true'>
			{children}
		</a>
	);
}

// The screenshot inside CardShot, filling the box from its top.
export const cardShotImg = 'block size-full object-cover object-top';

// A card's head with the entry's name as a link (`as` is its heading level), the line under the name (`children`), and the score and like buttons. The buttons sit at the top of the head, level with the name, rather than centred on a head of two or three lines, where they would line up with nothing; with neither a score nor likes to show the box is not drawn, so the card lays out as before.
export function CardHead({ as: H, name, href, item, tile, children }: { as: 'h2' | 'h3'; name: string; href: string; item: string; tile?: ReactNode; children?: ReactNode }) {
	return (
		<div className={showId}>
			{tile}
			<div className={showIdText}>
				<H className={cardName}>
					<a className='text-inherit no-underline hover:text-cyan' href={href} target='_blank' rel='noopener'>
						{name}
					</a>
				</H>
				{children}
			</div>
			<span className='like-end flex flex-none items-center gap-2 self-start empty:hidden'>
				<ScoreButton item={item} name={name} />
				<LikeButton item={item} name={name} className='like-btn' />
			</span>
		</div>
	);
}

// An entry's tags, in English as the catalog writes them.
export function TagList({ tags }: { tags: readonly string[] }) {
	return (
		<span className='flex flex-wrap items-center gap-1.5'>
			{tags.map((tg) => (
				<span key={tg} className='rounded-md bg-line px-[9px] py-[3px] font-mono text-[12px] text-fg-2' lang='en'>
					{tg}
				</span>
			))}
		</span>
	);
}
