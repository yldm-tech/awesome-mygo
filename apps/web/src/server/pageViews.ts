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

export interface PageViewMetrics {
	days: number;
	start: string;
	end: string;
	total: number;
	pageCount: number;
	daily: DailyViews[];
	topPaths: PathViews[];
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

export async function recordPageView(db: D1PageViews, path: string, day = utcDay()): Promise<void> {
	await db
		.prepare('INSERT INTO page_views (day, path, views) VALUES (?, ?, 1) ON CONFLICT(day, path) DO UPDATE SET views = views + 1')
		.bind(day, path)
		.run();
}

export async function pageViewMetrics(db: D1PageViews, requestedDays: number): Promise<PageViewMetrics> {
	const days = requestedDays === 7 || requestedDays === 90 ? requestedDays : 30;
	const end = utcDay();
	const start = dayBefore(days - 1);
	const [dailyResult, pathResult, totalResult, pageCountResult] = await Promise.all([
		db.prepare('SELECT day, SUM(views) AS views FROM page_views WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day').bind(start, end).all<DailyViews>(),
		db.prepare('SELECT path, SUM(views) AS views FROM page_views WHERE day BETWEEN ? AND ? GROUP BY path ORDER BY views DESC, path LIMIT 12').bind(start, end).all<PathViews>(),
		db.prepare('SELECT COALESCE(SUM(views), 0) AS views FROM page_views WHERE day BETWEEN ? AND ?').bind(start, end).all<{ views: number }>(),
		db.prepare('SELECT COUNT(DISTINCT path) AS n FROM page_views WHERE day BETWEEN ? AND ?').bind(start, end).all<{ n: number }>(),
	]);
	const byDay = new Map(dailyResult.results.map((row) => [row.day, Number(row.views) || 0]));
	const daily: DailyViews[] = [];
	for (let i = 0; i < days; i++) {
		const date = new Date(`${start}T00:00:00Z`);
		date.setUTCDate(date.getUTCDate() + i);
		const day = utcDay(date);
		daily.push({ day, views: byDay.get(day) ?? 0 });
	}
	return {
		days,
		start,
		end,
		total: Number(totalResult.results[0]?.views) || 0,
		pageCount: Number(pageCountResult.results[0]?.n) || 0,
		daily,
		topPaths: pathResult.results.map((row) => ({ path: row.path, views: Number(row.views) || 0 })),
	};
}
