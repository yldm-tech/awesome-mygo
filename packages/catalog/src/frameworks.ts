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

// The only published runs that measure several of these frameworks on the same machines: NSGo's suite (benchmark/ in its repository), the same apps written for NSGo and MyGo, among others, built as releases and measured on macOS, Windows and Linux. The values below are its results files as of the commit SHA, copied as they are: startup in ms, memory in bytes, CPU and the compositor's CPU (less its CPU at rest) in percent of a core over the measured seconds, binary size in bytes. The suite's README says to read the process's and the compositor's CPU added, as native views leave drawing to the compositor where GPU renderers draw in their own process. MyGo's own suite measures it against GPUI and egui, not against these frameworks, and no published suite measures Fyne or Wails beside them.
export const BENCH_SHA = '3398b0fb5ed6d61e5d4f307f3198799403b4c8a4';
export const BENCH_SUITE = `https://github.com/nsgo-dev/nsgo/tree/${BENCH_SHA}/benchmark`;
export const MYGO_BENCH = `${MYGO_SITE}/benchmarks`;

export type BenchFramework = 'mygo' | 'nsgo';
export type BenchCase = 'counter' | 'list' | 'quotes';
export interface BenchValues {
	startup: number;
	memory: number;
	cpu: number;
	compositor?: number;
}
export interface BenchRun {
	os: string;
	date: string;
	cpu: string;
	versions: Record<BenchFramework, string>;
	results: string;
	size: Record<BenchFramework, number>;
	cases: Record<BenchCase, Record<BenchFramework, BenchValues>>;
}
export const BENCH_RUNS: readonly BenchRun[] = [
	{
		os: 'macOS',
		date: '2026-11-10',
		cpu: 'Apple M1 Max',
		versions: {
			mygo: 'v0.8.3',
			nsgo: '03896f1'
		},
		results: `https://github.com/nsgo-dev/nsgo/blob/${BENCH_SHA}/benchmark/results/darwin.json`,
		size: {
			mygo: 10236386,
			nsgo: 7910738
		},
		cases: {
			counter: {
				mygo: {
					startup: 397.4,
					memory: 31917256,
					cpu: 0
				},
				nsgo: {
					startup: 285.1,
					memory: 24937696,
					cpu: 0
				}
			},
			list: {
				mygo: {
					startup: 206.9,
					memory: 67863800,
					cpu: 33.2,
					compositor: 26.8
				},
				nsgo: {
					startup: 317.1,
					memory: 41977104,
					cpu: 26.6,
					compositor: 25.7
				}
			},
			quotes: {
				mygo: {
					startup: 200.5,
					memory: 84591888,
					cpu: 42.5,
					compositor: 24.1
				},
				nsgo: {
					startup: 359.1,
					memory: 47940880,
					cpu: 50.7,
					compositor: 25.1
				}
			}
		}
	},
	{
		os: 'Windows',
		date: '2026-11-10',
		cpu: 'Intel(R) Core(TM) Ultra 9 285K',
		versions: {
			mygo: 'v0.8.3',
			nsgo: '03896f1'
		},
		results: `https://github.com/nsgo-dev/nsgo/blob/${BENCH_SHA}/benchmark/results/windows.json`,
		size: {
			mygo: 11047424,
			nsgo: 8365056
		},
		cases: {
			counter: {
				mygo: {
					startup: 165.4,
					memory: 62693376,
					cpu: 0
				},
				nsgo: {
					startup: 160.7,
					memory: 59203584,
					cpu: 0
				}
			},
			list: {
				mygo: {
					startup: 28.7,
					memory: 77238272,
					cpu: 30.5,
					compositor: 104.2
				},
				nsgo: {
					startup: 21.3,
					memory: 71467008,
					cpu: 27.7,
					compositor: 127.2
				}
			},
			quotes: {
				mygo: {
					startup: 30,
					memory: 87756800,
					cpu: 39.7,
					compositor: 87.5
				},
				nsgo: {
					startup: 156.3,
					memory: 76222464,
					cpu: 47,
					compositor: 128.6
				}
			}
		}
	},
	{
		os: 'Linux',
		date: '2026-11-10',
		cpu: 'AMD Ryzen 9 6900HX with Radeon Graphics',
		versions: {
			mygo: 'v0.8.3',
			nsgo: '03896f1'
		},
		results: `https://github.com/nsgo-dev/nsgo/blob/${BENCH_SHA}/benchmark/results/linux.json`,
		size: {
			mygo: 10480416,
			nsgo: 7895488
		},
		cases: {
			counter: {
				mygo: {
					startup: 98.1,
					memory: 70514688,
					cpu: 0
				},
				nsgo: {
					startup: 81.2,
					memory: 47592448,
					cpu: 0
				}
			},
			list: {
				mygo: {
					startup: 85.8,
					memory: 85861376,
					cpu: 8.1,
					compositor: 3.1
				},
				nsgo: {
					startup: 82.4,
					memory: 56001536,
					cpu: 9.6,
					compositor: 3.8
				}
			},
			quotes: {
				mygo: {
					startup: 86.6,
					memory: 93316096,
					cpu: 12.3,
					compositor: 3.3
				},
				nsgo: {
					startup: 87.8,
					memory: 61109248,
					cpu: 20.3,
					compositor: 3.7
				}
			}
		}
	},
];
