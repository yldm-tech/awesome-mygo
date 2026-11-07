import { type InstallTab, UI_KEYS, type UiLibKey } from '@awesome-mygo/catalog';
import { UI_SORTS, type UiSort } from './ui';

// What each page shows beyond its path lives in its query string, so a link reproduces the view: the filter, the order, the open tab. A default is left out (the plain path shows it), and an unknown value is dropped, as the showcase's ?cat= and ?ui= already were. Every key is always returned, undefined when absent, for the same reason as validateRootSearch: TanStack merges the validated object over the raw search.

// TanStack parses a query value that looks like a number into one (?author=4202217), so text values are read back as strings.
export function text(v: unknown): string | undefined {
	if (typeof v === 'number') return String(v);
	return typeof v === 'string' && v.trim() ? v : undefined;
}

export function oneOf<T extends string>(v: unknown, values: readonly T[]): T | undefined {
	const s = text(v);
	return values.find((x) => x === s);
}

// The plugins page: the kind of window a plugin serves, and the order besides the docs' own.
export interface PluginsSearch {
	source?: 'official' | 'community';
	surface?: 'web' | 'native';
	sort?: 'docs' | 'likes' | 'score';
}

export function validatePluginsSearch(search: Record<string, unknown>): PluginsSearch {
	return {
		source: oneOf(search.source, ['official', 'community'] as const),
		surface: oneOf(search.surface, ['web', 'native'] as const),
		sort: oneOf(search.sort, ['docs', 'likes', 'score'] as const),
	};
}

// The UI components page: the kind of library shown, the kind of window it serves, as on the plugins page, and the order (lib/ui.ts).
export interface UiSearch {
	tag?: UiLibKey;
	surface?: 'web' | 'native';
	sort?: UiSort;
}

export function validateUiSearch(search: Record<string, unknown>): UiSearch {
	return { tag: oneOf(search.tag, UI_KEYS), surface: oneOf(search.surface, ['web', 'native'] as const), sort: oneOf(search.sort, UI_SORTS) };
}

// The state page: the open example of MyGo's own primitives, besides the first (bound services).
export type StateBlock = 'bind' | 'chan' | 'evt';

export interface StateSearch {
	block?: Exclude<StateBlock, 'bind'>;
}

export function validateStateSearch(search: Record<string, unknown>): StateSearch {
	return { block: oneOf(search.block, ['chan', 'evt'] as const) };
}

// The home page: the install command's tab, besides the first (bunx).
export interface HomeSearch {
	install?: Exclude<InstallTab, 'bun'>;
}

export function validateHomeSearch(search: Record<string, unknown>): HomeSearch {
	return { install: oneOf(search.install, ['go', 'native'] as const) };
}
