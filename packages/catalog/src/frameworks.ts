import { MYGO_REPO, MYGO_SITE } from './catalog';
import type { StringKey } from './strings';

// The Go UI frameworks the comparison page (/compare) sets side by side, as each one's own README and docs describe it in 2026-11: how it draws its interface, where it runs and under which license. MyGo, the site's subject, comes first and the others follow in alphabetical order. Stars, benchmarks and other figures that change or that each project measures its own way are left to the projects' pages, which every row links to.

// A platform a framework runs on, and how far along it is there when the project calls it less than ready.
export interface FrameworkPlatform {
	name: string;
	// Shown instead of name where the platform's name is a common noun, in the site's languages.
	label?: StringKey;
	status?: 'preview' | 'experimental';
}

export interface Framework {
	key: 'mygo' | 'fyne' | 'nsgo' | 'wails';
	name: string;
	site: string;
	repo: string;
	license: string;
	// How the interface is drawn, in the site's languages.
	ui: StringKey;
	platforms: readonly FrameworkPlatform[];
	// Where the facts come from, linked under the row.
	source: string;
}

const DESKTOP = [{ name: 'macOS' }, { name: 'Windows' }, { name: 'Linux' }] as const;

export const FRAMEWORKS: readonly Framework[] = [
	{
		key: 'mygo',
		name: 'MyGo',
		site: MYGO_SITE,
		repo: MYGO_REPO,
		license: 'MIT',
		ui: 'fw_ui_mygo',
		platforms: [...DESKTOP, { name: 'iOS' }, { name: 'Android' }],
		source: `${MYGO_REPO}#readme`,
	},
	{
		key: 'fyne',
		name: 'Fyne',
		site: 'https://fyne.io',
		repo: 'https://github.com/fyne-io/fyne',
		license: 'BSD-3-Clause',
		ui: 'fw_ui_fyne',
		platforms: [...DESKTOP, { name: 'BSD' }, { name: 'iOS' }, { name: 'Android' }, { name: 'Web' }],
		source: 'https://docs.fyne.io/started/',
	},
	{
		key: 'nsgo',
		name: 'NSGo',
		site: 'https://nsgo.dev',
		repo: 'https://github.com/nsgo-dev/nsgo',
		license: 'Apache-2.0',
		ui: 'fw_ui_nsgo',
		platforms: [...DESKTOP, { name: 'iOS' }, { name: 'tvOS' }, { name: 'watchOS' }, { name: 'Android' }, { name: 'Web' }, { name: 'HarmonyOS', status: 'preview' }, { name: 'mini programs', label: 'fw_mini', status: 'experimental' }],
		source: 'https://github.com/nsgo-dev/nsgo#platforms',
	},
	{
		key: 'wails',
		name: 'Wails',
		site: 'https://wails.io',
		repo: 'https://github.com/wailsapp/wails',
		license: 'MIT',
		ui: 'fw_ui_wails',
		platforms: [...DESKTOP, { name: 'iOS' }, { name: 'Android' }],
		source: 'https://github.com/wailsapp/wails/blob/master/docs/mpress/content/guides/mobile/index.md',
	},
];

// The sister catalog for NSGo apps and packages, run by the same maintainers, which the footer names.
export const AWESOME_NSGO = 'https://awesomensgo.dev';
