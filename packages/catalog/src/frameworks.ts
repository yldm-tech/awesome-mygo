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

// The runs that measure several of these frameworks on the same machine, all from NSGo's suite (benchmark/ in its repository): the same apps written for each framework, built as releases and measured. On macOS, this site's run of NSGo, MyGo, Fyne and Wails, published in the suite at results/go/darwin.json; on Windows and Linux, the suite's own runs, which measure NSGo and MyGo (beside NSH and GPUI) but not Fyne or Wails. The values are the results files as of the commits named, copied as they are: startup in ms, memory in bytes, CPU and the compositor's CPU (less its CPU at rest) in percent of a core over the measured seconds, frames per second, binary size in bytes. On macOS the suite counts the XPC services a program starts with it, where a system webview (Wails) does its work. The suite's README says to read the process's and the compositor's CPU added, as native views leave drawing to the compositor where GPU renderers draw in their own process, and to read CPU with frames, as Fyne and the system webview change 60 frames a second where the others follow the display. MyGo's own suite measures it against GPUI and egui, not against these frameworks.
export const BENCH_GO_SHA = '11629f6e3a3344bb98527d4139e4459436faaced';
export const BENCH_NSGO_SHA = '3398b0fb5ed6d61e5d4f307f3198799403b4c8a4';
const BENCH_GO_BASE = `https://github.com/nsgo-dev/nsgo/blob/${BENCH_GO_SHA}`;
const BENCH_NSGO_BASE = `https://github.com/nsgo-dev/nsgo/blob/${BENCH_NSGO_SHA}`;
export const BENCH_SUITE = `https://github.com/nsgo-dev/nsgo/tree/${BENCH_GO_SHA}/benchmark`;
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
		frameworks: ['nsgo', 'mygo', 'fyne', 'wails'],
		versions: {
			nsgo: 'ff5e5ea',
			mygo: 'v0.8.3',
			fyne: 'v2.8.2',
			wails: 'v3.1.0',
		},
		results: `${BENCH_GO_BASE}/benchmark/results/go/darwin.json`,
		size: {
			nsgo: 12338322,
			mygo: 10236386,
			fyne: 22892482,
			wails: 9021298,
		},
		cases: {
			counter: {
				nsgo: {
					startup: 610.1,
					memory: 31638704,
					cpu: 0,
				},
				mygo: {
					startup: 636.2,
					memory: 33555656,
					cpu: 0,
				},
				fyne: {
					startup: 1639.9,
					memory: 105842368,
					cpu: 0.9,
				},
				wails: {
					startup: 1971.1,
					memory: 74665656,
					cpu: 0.1,
				},
			},
			list: {
				nsgo: {
					startup: 487.7,
					memory: 47891656,
					cpu: 15.4,
					compositor: 6.2,
					fps: 120,
				},
				mygo: {
					startup: 644.8,
					memory: 180258040,
					cpu: 14.4,
					compositor: 6,
					fps: 120,
				},
				fyne: {
					startup: 878.1,
					memory: 291014432,
					cpu: 18.1,
					compositor: 0.8,
					fps: 60,
				},
				wails: {
					startup: 1177.8,
					memory: 270274544,
					cpu: 12.5,
					compositor: 4.4,
					fps: 60,
				},
			},
			quotes: {
				nsgo: {
					startup: 493.4,
					memory: 53298400,
					cpu: 30.2,
					compositor: 9,
					fps: 120,
				},
				mygo: {
					startup: 390,
					memory: 192693520,
					cpu: 17.2,
					compositor: 6.2,
					fps: 120,
				},
				fyne: {
					startup: 1067.4,
					memory: 923437312,
					cpu: 26.5,
					compositor: 0,
					fps: 60,
				},
				wails: {
					startup: 826.8,
					memory: 231067272,
					cpu: 20.4,
					compositor: 4.9,
					fps: 60,
				},
			},
		},
	},
	{
		os: 'Windows',
		date: '2026-11-10',
		cpu: 'Intel(R) Core(TM) Ultra 9 285K',
		frameworks: ['nsgo', 'mygo'],
		versions: {
			nsgo: '03896f1',
			mygo: 'v0.8.3',
		},
		results: `${BENCH_NSGO_BASE}/benchmark/results/windows.json`,
		size: {
			nsgo: 8365056,
			mygo: 11047424,
		},
		cases: {
			counter: {
				nsgo: {
					startup: 160.7,
					memory: 59203584,
					cpu: 0,
				},
				mygo: {
					startup: 165.4,
					memory: 62693376,
					cpu: 0,
				},
			},
			list: {
				nsgo: {
					startup: 21.3,
					memory: 71467008,
					cpu: 27.7,
					compositor: 127.2,
					fps: 260,
				},
				mygo: {
					startup: 28.7,
					memory: 77238272,
					cpu: 30.5,
					compositor: 104.2,
					fps: 259.1,
				},
			},
			quotes: {
				nsgo: {
					startup: 156.3,
					memory: 76222464,
					cpu: 47,
					compositor: 128.6,
					fps: 259.9,
				},
				mygo: {
					startup: 30,
					memory: 87756800,
					cpu: 39.7,
					compositor: 87.5,
					fps: 258.6,
				},
			},
		},
	},
	{
		os: 'Linux',
		date: '2026-11-10',
		cpu: 'AMD Ryzen 9 6900HX with Radeon Graphics',
		frameworks: ['nsgo', 'mygo'],
		versions: {
			nsgo: '03896f1',
			mygo: 'v0.8.3',
		},
		results: `${BENCH_NSGO_BASE}/benchmark/results/linux.json`,
		size: {
			nsgo: 7895488,
			mygo: 10480416,
		},
		cases: {
			counter: {
				nsgo: {
					startup: 81.2,
					memory: 47592448,
					cpu: 0,
				},
				mygo: {
					startup: 98.1,
					memory: 70514688,
					cpu: 0,
				},
			},
			list: {
				nsgo: {
					startup: 82.4,
					memory: 56001536,
					cpu: 9.6,
					compositor: 3.8,
					fps: 61.2,
				},
				mygo: {
					startup: 85.8,
					memory: 85861376,
					cpu: 8.1,
					compositor: 3.1,
					fps: 60,
				},
			},
			quotes: {
				nsgo: {
					startup: 87.8,
					memory: 61109248,
					cpu: 20.3,
					compositor: 3.7,
					fps: 60,
				},
				mygo: {
					startup: 86.6,
					memory: 93316096,
					cpu: 12.3,
					compositor: 3.3,
					fps: 60,
				},
			},
		},
	},
];
