import { useMemo } from 'react';
import { number } from '../lib/metrics';

interface RegionView {
	country: string;
	views: number;
}

interface CountryPoint {
	lat: number;
	lon: number;
	name: string;
}

const COUNTRY_POINTS: Record<string, CountryPoint> = {
	US: { lat: 38, lon: -100, name: '美国' },
	JP: { lat: 36, lon: 138, name: '日本' },
	CN: { lat: 35, lon: 104, name: '中国' },
	FR: { lat: 46, lon: 2, name: '法国' },
	AU: { lat: -25, lon: 134, name: '澳大利亚' },
	HK: { lat: 22, lon: 114, name: '中国香港' },
	DE: { lat: 51, lon: 10, name: '德国' },
	SG: { lat: 1, lon: 104, name: '新加坡' },
	GB: { lat: 55, lon: -3, name: '英国' },
	NO: { lat: 62, lon: 10, name: '挪威' },
	CA: { lat: 56, lon: -106, name: '加拿大' },
	FI: { lat: 64, lon: 26, name: '芬兰' },
	PL: { lat: 52, lon: 19, name: '波兰' },
	IN: { lat: 22, lon: 79, name: '印度' },
	NL: { lat: 52, lon: 5, name: '荷兰' },
	TW: { lat: 24, lon: 121, name: '中国台湾' },
	ID: { lat: -2, lon: 118, name: '印度尼西亚' },
	KR: { lat: 36, lon: 128, name: '韩国' },
	BR: { lat: -10, lon: -52, name: '巴西' },
	CH: { lat: 47, lon: 8, name: '瑞士' },
	AT: { lat: 47, lon: 14, name: '奥地利' },
	IT: { lat: 42, lon: 12, name: '意大利' },
	VN: { lat: 16, lon: 108, name: '越南' },
	NZ: { lat: -41, lon: 174, name: '新西兰' },
	SE: { lat: 62, lon: 15, name: '瑞典' },
	ES: { lat: 40, lon: -4, name: '西班牙' },
	RU: { lat: 61, lon: 105, name: '俄罗斯' },
	MX: { lat: 23, lon: -102, name: '墨西哥' },
};

const WIDTH = 860;
const HEIGHT = 360;
const CX = 420;
const CY = 178;
const RADIUS = 148;
const HUB = { x: CX, y: CY };

function project(point: CountryPoint): { x: number; y: number } {
	return {
		x: CX + (point.lon / 180) * RADIUS * 1.06,
		y: CY - (point.lat / 90) * RADIUS * 0.76,
	};
}

function arcPath(point: { x: number; y: number }, index: number): string {
	const midX = (point.x + HUB.x) / 2;
	const lift = 46 + (index % 4) * 16;
	return `M ${point.x} ${point.y} Q ${midX} ${Math.min(point.y, HUB.y) - lift} ${HUB.x} ${HUB.y}`;
}

function regionName(country: string, locale: string): string {
	const point = COUNTRY_POINTS[country];
	return locale.startsWith('zh') ? point?.name ?? country : country;
}

export function MetricsGlobe({ regions, locale, label }: { regions: RegionView[]; locale: string; label: string }) {
	const knownRegions = useMemo(() => regions.filter((region) => COUNTRY_POINTS[region.country] && region.views > 0), [regions]);
	const activeRegions = knownRegions.slice(0, 18);
	const peak = Math.max(1, ...activeRegions.map((region) => region.views));
	const total = knownRegions.reduce((sum, region) => sum + region.views, 0);
	const latitudes = [-60, -30, 0, 30, 60];
	const longitudes = [-120, -90, -60, -30, 0, 30, 60, 90, 120];

	return (
		<div className='relative overflow-hidden rounded-[14px] border border-cyan/15 bg-[#07141b]'>
			<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(63,211,245,0.12),transparent_46%)]' />
			<div className='pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full border border-green/25 bg-green/8 px-3 py-1.5 font-mono text-[10px] tracking-[0.08em] text-green'>
				<span className='size-1.5 rounded-full bg-green shadow-[0_0_12px_rgba(155,227,138,0.9)] motion-safe:animate-[metrics-globe-pulse_1.6s_ease-in-out_infinite]' aria-hidden='true' />
				LIVE FLOW
			</div>
			<div className='pointer-events-none absolute top-4 right-4 z-10 text-right font-mono text-[11px] text-fg-3'>
				<div className='text-cyan'>{number(total, locale)}</div>
				<div>EDGE EVENTS · {knownRegions.length} REGIONS</div>
			</div>
			<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role='img' aria-label={label} className='block h-auto min-h-[270px] w-full'>
				<defs>
					<radialGradient id='metrics-globe-fill' cx='42%' cy='36%'>
						<stop offset='0%' stopColor='#123846' />
						<stop offset='72%' stopColor='#091b24' />
						<stop offset='100%' stopColor='#061017' />
					</radialGradient>
					<clipPath id='metrics-globe-clip'><circle cx={CX} cy={CY} r={RADIUS} /></clipPath>
				</defs>
				<circle cx={CX} cy={CY} r={RADIUS + 7} fill='none' stroke='#3fd3f5' strokeOpacity='0.08' strokeWidth='1' />
				<circle cx={CX} cy={CY} r={RADIUS} fill='url(#metrics-globe-fill)' stroke='#3fd3f5' strokeOpacity='0.36' strokeWidth='1.5' />
				<g clipPath='url(#metrics-globe-clip)' fill='none' stroke='#3fd3f5' strokeOpacity='0.14' strokeWidth='1'>
					{latitudes.map((latitude) => <ellipse key={`lat-${latitude}`} cx={CX} cy={CY - (latitude / 90) * RADIUS * 0.76} rx={RADIUS * Math.sqrt(Math.max(0.05, 1 - (latitude / 90) ** 2))} ry={RADIUS * 0.2} />)}
					{longitudes.map((longitude) => <ellipse key={`lon-${longitude}`} cx={CX} cy={CY} rx={Math.max(2, Math.abs(Math.sin((longitude * Math.PI) / 180)) * RADIUS)} ry={RADIUS} />)}
				</g>
				<g fill='none' stroke='#3fd3f5' strokeOpacity='0.2' strokeWidth='1'>
					<ellipse cx={CX} cy={CY} rx={RADIUS} ry={RADIUS * 0.22} />
					<ellipse cx={CX} cy={CY} rx={RADIUS * 0.58} ry={RADIUS} />
				</g>
				<g fill='none' stroke='#3fd3f5' strokeWidth='1.4' strokeDasharray='3 15' strokeLinecap='round' opacity={activeRegions.length ? 0.7 : 0.25}>
					{activeRegions.map((region, index) => {
						const point = project(COUNTRY_POINTS[region.country]!);
						return <path key={`${region.country}-arc`} d={arcPath(point, index)} className='motion-safe:animate-[metrics-flow_2.8s_linear_infinite]' style={{ animationDelay: `${index * -0.22}s`, opacity: 0.35 + (region.views / peak) * 0.65 }} />;
					})}
				</g>
				<g>
					<circle cx={HUB.x} cy={HUB.y} r='12' fill='#3fd3f5' fillOpacity='0.12' className='motion-safe:animate-[metrics-globe-pulse_2s_ease-in-out_infinite]' />
					<circle cx={HUB.x} cy={HUB.y} r='4.5' fill='#3fd3f5' stroke='#d8f8ff' strokeWidth='1' />
					<text x={HUB.x} y={HUB.y + 28} textAnchor='middle' fill='#8da8b2' fontSize='9' fontFamily='ui-monospace, SFMono-Regular, Menlo, monospace' letterSpacing='1.5'>MYGO EDGE</text>
					{activeRegions.map((region, index) => {
						const point = project(COUNTRY_POINTS[region.country]!);
						const strong = region.views / peak;
						return <g key={region.country}>
							<circle cx={point.x} cy={point.y} r={3 + strong * 4} fill='#3fd3f5' fillOpacity='0.12' className='motion-safe:animate-[metrics-globe-pulse_2.2s_ease-in-out_infinite]' style={{ animationDelay: `${index * -0.16}s` }} />
							<circle cx={point.x} cy={point.y} r={2 + strong * 2} fill='#3fd3f5' stroke='#b9f3ff' strokeWidth='0.8' />
							{index < 8 && <text x={point.x + 8} y={point.y - 7} fill='#b9d7df' fontSize='10' fontFamily='ui-monospace, SFMono-Regular, Menlo, monospace'>{region.country}</text>}
						</g>;
					})}
				</g>
			</svg>
			<div className='relative grid grid-cols-4 gap-2 border-t border-white/8 bg-black/15 px-4 py-3 max-sm:grid-cols-2'>
				{activeRegions.slice(0, 4).map((region) => <div key={region.country} className='flex items-center justify-between gap-2 font-mono text-[11px]'><span className='truncate text-fg-3'>{regionName(region.country, locale)}</span><span className='text-cyan'>{number(region.views, locale)}</span></div>)}
			</div>
		</div>
	);
}
