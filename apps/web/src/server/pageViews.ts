// Page views are stored as daily path counters. Keeping the table aggregated
// makes the dashboard cheap and avoids retaining a visitor trail.

export interface D1PageViews {
	prepare(query: string): { bind(...values: unknown[]): D1PageViewStmt } & D1PageViewStmt;
}

interface D1PageViewStmt {
	all<T>(): Promise<{ results: T[] }>;
	run(): Promise<unknown>;
}

export interface DailyViews {
	day: string;
	views: number;
}

export interface PathViews {
	path: string;
	views: number;
}

export interface RegionViews {
	country: string;
	views: number;
}

export interface PageViewMetrics {
	days: number;
	start: string;
	end: string;
	total: number;
	pageCount: number;
	since: string | null;
	daily: DailyViews[];
	topPaths: PathViews[];
	regions: RegionViews[];
	regionTotal: number;
}

function utcDay(date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

function dayBefore(days: number): string {
	const date = new Date();
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() - days);
	return utcDay(date);
}

export function cleanPagePath(value: unknown): string | undefined {
	if (typeof value !== 'string' || value.length === 0 || value.length > 240 || !value.startsWith('/') || value.includes('?') || value.includes('#') || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
	return value === '/' ? value : value.replace(/\/+$/, '') || '/';
}

export function cleanCountry(value: unknown): string {
	if (typeof value !== 'string') return 'XX';
	const country = value.trim().toUpperCase();
	return /^[A-Z]{2}$/.test(country) ? country : 'XX';
}

export async function recordPageView(db: D1PageViews, path: string, country = 'XX', day = utcDay()): Promise<void> {
	await db
		.prepare('INSERT INTO page_views (day, path, views) VALUES (?, ?, 1) ON CONFLICT(day, path) DO UPDATE SET views = views + 1')
		.bind(day, path)
		.run();
	await db
		.prepare('INSERT INTO page_view_regions (day, country, views) VALUES (?, ?, 1) ON CONFLICT(day, country) DO UPDATE SET views = views + 1')
		.bind(day, country)
		.run();
}

// The finished days of a range: totals per day, per path and per country. They never change once the UTC day is over.
interface HistoryAggregate {
	daily: Record<string, number>;
	paths: Record<string, number>;
	regions: Record<string, number>;
}

// One scan of each table over the finished days. Aggregating the page rows here instead of in four GROUP BY queries reads every row once rather than four times.
async function readHistory(db: D1PageViews, start: string, end: string): Promise<HistoryAggregate> {
	const [pages, regions] = await Promise.all([
		db.prepare('SELECT day, path, views FROM page_views WHERE day BETWEEN ? AND ?').bind(start, end).all<{ day: string; path: string; views: number }>(),
		db.prepare('SELECT country, SUM(views) AS views FROM page_view_regions WHERE day BETWEEN ? AND ? GROUP BY country').bind(start, end).all<RegionViews>(),
	]);
	const history: HistoryAggregate = { daily: {}, paths: {}, regions: {} };
	for (const row of pages.results) {
		const views = Number(row.views) || 0;
		history.daily[row.day] = (history.daily[row.day] ?? 0) + views;
		history.paths[row.path] = (history.paths[row.path] ?? 0) + views;
	}
	for (const row of regions.results) history.regions[row.country] = Number(row.views) || 0;
	return history;
}

// D1's free tier allows 5M rows read a day for the whole account. Rescanning every row of a 90-day range on each 30 s dashboard refresh used that up within hours and took every D1 query on the account down with it, so the finished days are read once per range and edge location and kept in the cache until the UTC day turns; the key carries the range, so the next day starts a fresh entry.
async function cachedHistory(db: D1PageViews, start: string, end: string, request?: Request): Promise<HistoryAggregate> {
	const cache = (globalThis as typeof globalThis & { caches?: { default?: Cache } }).caches?.default;
	if (!cache || !request) return readHistory(db, start, end);
	const url = new URL(request.url);
	url.pathname = '/__cache/page-view-history';
	url.search = new URLSearchParams({ start, end }).toString();
	const key = new Request(url, { method: 'GET' });
	const hit = await cache.match(key);
	if (hit) return (await hit.json()) as HistoryAggregate;
	const history = await readHistory(db, start, end);
	await cache.put(key, Response.json(history, { headers: { 'cache-control': 'public, max-age=86400' } }));
	return history;
}

function add(totals: Record<string, number>, rows: { key: string; views: number }[]): Map<string, number> {
	const merged = new Map(Object.entries(totals));
	for (const row of rows) merged.set(row.key, (merged.get(row.key) ?? 0) + (Number(row.views) || 0));
	return merged;
}

// Most views first, ties by key, as the dashboard has always listed them.
function ranked(totals: Map<string, number>): [string, number][] {
	return [...totals].sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0));
}

export async function pageViewMetrics(db: D1PageViews, requestedDays: number, request?: Request): Promise<PageViewMetrics> {
	const days = requestedDays === 7 || requestedDays === 90 ? requestedDays : 30;
	const end = utcDay();
	const start = dayBefore(days - 1);
	const yesterday = dayBefore(1);
	const [history, todayPaths, todayRegions, sinceResult] = await Promise.all([
		cachedHistory(db, start, yesterday, request),
		db.prepare('SELECT path, views FROM page_views WHERE day = ?').bind(end).all<PathViews>(),
		db.prepare('SELECT country, views FROM page_view_regions WHERE day = ?').bind(end).all<RegionViews>(),
		// The first day anything was recorded, so the dashboard can tell "no traffic" apart from "not tracked yet".
		db.prepare('SELECT MIN(day) AS day FROM page_views').all<{ day: string | null }>(),
	]);
	const paths = add(history.paths, todayPaths.results.map((row) => ({ key: row.path, views: row.views })));
	const regions = add(history.regions, todayRegions.results.map((row) => ({ key: row.country, views: row.views })));
	const byDay = new Map(Object.entries(history.daily));
	byDay.set(end, todayPaths.results.reduce((sum, row) => sum + (Number(row.views) || 0), 0));
	const daily: DailyViews[] = [];
	for (let i = 0; i < days; i++) {
		const date = new Date(`${start}T00:00:00Z`);
		date.setUTCDate(date.getUTCDate() + i);
		const day = utcDay(date);
		daily.push({ day, views: byDay.get(day) ?? 0 });
	};
	return {
		days,
		start,
		end,
		total: daily.reduce((sum, row) => sum + row.views, 0),
		pageCount: paths.size,
		since: sinceResult.results[0]?.day ?? null,
		daily,
		topPaths: ranked(paths).slice(0, 12).map(([path, views]) => ({ path, views })),
		// Region shares are measured against every region, not just the listed ones, so a long tail cut by the limit does not inflate the leaders.
		regions: ranked(regions).slice(0, 260).map(([country, views]) => ({ country, views })),
		regionTotal: [...regions.values()].reduce((sum, views) => sum + views, 0),
	};
}
