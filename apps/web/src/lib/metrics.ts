import { useEffect, useState } from 'react';

export type MetricsRange = 7 | 30 | 90;

export interface MetricsPayload {
	enabled: boolean;
	reason?: 'not_configured' | 'unavailable';
	days: number;
	start: string;
	end: string;
	total: number;
	pageCount: number;
	daily: { day: string; views: number }[];
	topPaths: { path: string; views: number }[];
	regions: { country: string; views: number }[];
}

interface MetricsState {
	loading: boolean;
	error: boolean;
	reason?: MetricsPayload['reason'];
	data?: MetricsPayload;
}

export function useMetrics(days: MetricsRange): MetricsState {
	const [state, setState] = useState<MetricsState>({ loading: true, error: false });
	useEffect(() => {
		let live = true;
		const load = () => {
			setState((current) => (current.data ? { ...current, error: false } : { loading: true, error: false }));
			return fetch(`/api/metrics?days=${days}`, { cache: 'no-store' })
			.then(async (response) => {
				if (!response.ok) throw new Error(`metrics: HTTP ${response.status}`);
				return (await response.json()) as MetricsPayload;
			})
			.then((data) => {
				if (live) setState({ loading: false, error: !data.enabled, reason: data.reason, data: data.enabled ? data : undefined });
			})
			.catch(() => {
				if (live) setState({ loading: false, error: true, reason: 'unavailable' });
			});
		};
		void load();
		const timer = window.setInterval(() => void load(), 30_000);
		return () => {
			live = false;
			window.clearInterval(timer);
		};
	}, [days]);
	return state;
}

export function pathLabel(path: string): string {
	if (path === '/') return 'Home';
	if (path.startsWith('/apps/')) return `App · ${path.slice('/apps/'.length)}`;
	if (path === '/showcase') return 'Showcase';
	if (path === '/plugins') return 'Plugins';
	if (path === '/ui') return 'UI';
	return path;
}

export function shortDay(day: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
}

export function number(value: number, locale: string): string {
	return new Intl.NumberFormat(locale).format(value);
}
