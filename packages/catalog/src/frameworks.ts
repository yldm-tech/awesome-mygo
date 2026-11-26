import { MYGO_REPO, MYGO_SITE } from './catalog';
import type { StringKey } from './strings';

// The Go UI frameworks the comparison page (/compare) sets side by side, as each one's own README and docs describe it in 2026-11: how it draws its interface, where it runs and under which license. MyGo, the site's subject, comes first and the others follow in alphabetical order. Stars, which change daily, are left to the projects' pages; the published benchmarks that measure some of them side by side are at the end of this file.

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

// ---- benchmarks ----

// The runs that measure several of these frameworks on the same machine, all from NSGo's suite (benchmark/ in its repository): the same apps written for each framework, built as releases and measured. On macOS, the suite's run of seven frameworks on an M4 Pro (results/darwin.json, which nsgo.dev shows too), of which the four Go frameworks are kept here; on Windows and Linux, the suite's own runs, which measure NSGo and MyGo (beside NSH and GPUI) but not Fyne or Wails. The values are the results files as of the commits named, copied as they are: startup in ms, memory in bytes, CPU and the compositor's CPU (less its CPU at rest) in percent of a core over the measured seconds, frames per second, binary size in bytes. On macOS the suite counts the XPC services a program starts with it, where a system webview (Wails) does its work. The suite's README says to read the process's and the compositor's CPU added, as native views leave drawing to the compositor where GPU renderers draw in their own process, and to read CPU with frames, as Fyne and the system webview change 60 frames a second where the others follow the display. MyGo's own suite measures it against GPUI and egui, not against these frameworks.
export const BENCH_MAC_SHA = '3dabeeb135321aae4a5808bef1422ca0112227cb';
export const BENCH_NSGO_SHA = '3398b0fb5ed6d61e5d4f307f3198799403b4c8a4';
const BENCH_MAC_BASE = `https://github.com/nsgo-dev/nsgo/blob/${BENCH_MAC_SHA}`;
const BENCH_NSGO_BASE = `https://github.com/nsgo-dev/nsgo/blob/${BENCH_NSGO_SHA}`;
export const BENCH_SUITE = `https://github.com/nsgo-dev/nsgo/tree/${BENCH_MAC_SHA}/benchmark`;
export const MYGO_BENCH = `${MYGO_SITE}/benchmarks`;

export type BenchFramework = 'nsgo' | 'mygo' | 'fyne' | 'wails';
export type BenchCase = 'counter' | 'list' | 'quotes';
export interface BenchValues {
	startup: number;
	memory: number;
	cpu: number;
	compositor?: number;
	fps?: number;
}
export interface BenchRun {
	os: string;
	date: string;
	cpu: string;
	// The frameworks the run measures, in the order the page shows them.
	frameworks: readonly BenchFramework[];
	versions: Partial<Record<BenchFramework, string>>;
	results: string;
	size: Partial<Record<BenchFramework, number>>;
	cases: Record<BenchCase, Partial<Record<BenchFramework, BenchValues>>>;
}
export const BENCH_RUNS: readonly BenchRun[] = [
	{
		os: 'macOS',
		date: '2026-11-26',
		cpu: 'Apple M4 Pro',
		frameworks: ['mygo', 'fyne', 'nsgo', 'wails'],
		versions: {
			mygo: 'v0.8.3',
			fyne: 'v2.8.2',
			nsgo: 'b0af50f',
			wails: 'v3.1.0',
		},
		results: `${BENCH_MAC_BASE}/benchmark/results/darwin.json`,
		size: {
			mygo: 10236386,
			fyne: 22892482,
			nsgo: 12338322,
			wails: 9021298,
		},
		cases: {
			counter: {
				mygo: {
					startup: 827,
					memory: 34161888,
					cpu: 0,
				},
				fyne: {
					startup: 1707.8,
					memory: 113067760,
					cpu: 0.9,
				},
				nsgo: {
					startup: 1060.3,
					memory: 31311024,
					cpu: 0.4,
				},
				wails: {
					startup: 1719.7,
					memory: 72634112,
					cpu: 0.3,
				},
			},
			list: {
				mygo: {
					startup: 446,
					memory: 178177272,
					cpu: 14.4,
					compositor: 10.6,
					fps: 120,
				},
				fyne: {
					startup: 747.4,
					memory: 293963552,
					cpu: 17.7,
					compositor: 3.5,
					fps: 60,
				},
				nsgo: {
					startup: 831.9,
					memory: 48202976,
					cpu: 16.2,
					compositor: 10.2,
					fps: 120,
				},
				wails: {
					startup: 602.2,
					memory: 274452248,
					cpu: 12.1,
					compositor: 7.8,
					fps: 60,
				},
			},
			quotes: {
				mygo: {
					startup: 489.2,
					memory: 196969744,
					cpu: 18.5,
					compositor: 6.6,
					fps: 120,
				},
				fyne: {
					startup: 1983.9,
					memory: 919767248,
					cpu: 26.7,
					compositor: 3.4,
					fps: 60,
				},
				nsgo: {
					startup: 952.7,
					memory: 53871888,
					cpu: 30.5,
					compositor: 6.3,
					fps: 119.4,
				},
				wails: {
					startup: 2873.5,
					memory: 242978656,
					cpu: 23.5,
					compositor: 5.3,
					fps: 60,
				},
			},
		},
	},
	{
		os: 'Windows',
		date: '2026-11-10',
		cpu: 'Intel(R) Core(TM) Ultra 9 285K',
		frameworks: ['mygo', 'nsgo'],
		versions: {
			mygo: 'v0.8.3',
			nsgo: '03896f1',
		},
		results: `${BENCH_NSGO_BASE}/benchmark/results/windows.json`,
		size: {
			mygo: 11047424,
			nsgo: 8365056,
		},
		cases: {
			counter: {
				mygo: {
					startup: 165.4,
					memory: 62693376,
					cpu: 0,
				},
				nsgo: {
					startup: 160.7,
					memory: 59203584,
					cpu: 0,
				},
			},
			list: {
				mygo: {
					startup: 28.7,
					memory: 77238272,
					cpu: 30.5,
					compositor: 104.2,
					fps: 259.1,
				},
				nsgo: {
					startup: 21.3,
					memory: 71467008,
					cpu: 27.7,
					compositor: 127.2,
					fps: 260,
				},
			},
			quotes: {
				mygo: {
					startup: 30,
					memory: 87756800,
					cpu: 39.7,
					compositor: 87.5,
					fps: 258.6,
				},
				nsgo: {
					startup: 156.3,
					memory: 76222464,
					cpu: 47,
					compositor: 128.6,
					fps: 259.9,
				},
			},
		},
	},
	{
		os: 'Linux',
		date: '2026-11-10',
		cpu: 'AMD Ryzen 9 6900HX with Radeon Graphics',
		frameworks: ['mygo', 'nsgo'],
		versions: {
			mygo: 'v0.8.3',
			nsgo: '03896f1',
		},
		results: `${BENCH_NSGO_BASE}/benchmark/results/linux.json`,
		size: {
			mygo: 10480416,
			nsgo: 7895488,
		},
		cases: {
			counter: {
				mygo: {
					startup: 98.1,
					memory: 70514688,
					cpu: 0,
				},
				nsgo: {
					startup: 81.2,
					memory: 47592448,
					cpu: 0,
				},
			},
			list: {
				mygo: {
					startup: 85.8,
					memory: 85861376,
					cpu: 8.1,
					compositor: 3.1,
					fps: 60,
				},
				nsgo: {
					startup: 82.4,
					memory: 56001536,
					cpu: 9.6,
					compositor: 3.8,
					fps: 61.2,
				},
			},
			quotes: {
				mygo: {
					startup: 86.6,
					memory: 93316096,
					cpu: 12.3,
					compositor: 3.3,
					fps: 60,
				},
				nsgo: {
					startup: 87.8,
					memory: 61109248,
					cpu: 20.3,
					compositor: 3.7,
					fps: 60,
				},
			},
		},
	},
];
