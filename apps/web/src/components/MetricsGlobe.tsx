import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { number } from '../lib/metrics';

interface RegionView { country: string; views: number }
interface CountryPoint { lat: number; lon: number }
type Coordinate = [lon: number, lat: number];

const COUNTRY_POINTS: Record<string, CountryPoint> = {
	US: { lat: 38, lon: -100 }, JP: { lat: 36, lon: 138 }, CN: { lat: 35, lon: 104 }, FR: { lat: 46, lon: 2 }, AU: { lat: -25, lon: 134 },
	HK: { lat: 22, lon: 114 }, DE: { lat: 51, lon: 10 }, SG: { lat: 1, lon: 104 }, GB: { lat: 55, lon: -3 }, NO: { lat: 62, lon: 10 },
	CA: { lat: 56, lon: -106 }, FI: { lat: 64, lon: 26 }, PL: { lat: 52, lon: 19 }, IN: { lat: 22, lon: 79 }, NL: { lat: 52, lon: 5 },
	TW: { lat: 24, lon: 121 }, ID: { lat: -2, lon: 118 }, KR: { lat: 36, lon: 128 }, BR: { lat: -10, lon: -52 }, CH: { lat: 47, lon: 8 },
	AT: { lat: 47, lon: 14 }, IT: { lat: 42, lon: 12 }, VN: { lat: 16, lon: 108 }, NZ: { lat: -41, lon: 174 }, SE: { lat: 62, lon: 15 },
	ES: { lat: 40, lon: -4 }, RU: { lat: 61, lon: 105 }, MX: { lat: 23, lon: -102 },
};

// Deliberately low-detail silhouettes keep the globe light while giving the grid a geographic anchor.
const CONTINENTS: Coordinate[][] = [
	[[-168, 72], [-140, 70], [-126, 57], [-105, 50], [-88, 25], [-65, 45], [-78, 60], [-105, 72]],
	[[-82, 12], [-68, 5], [-60, -12], [-52, -30], [-62, -53], [-76, -20]],
	[[-12, 72], [20, 70], [48, 60], [88, 58], [125, 52], [160, 60], [170, 36], [130, 18], [100, 5], [68, 25], [38, 12], [18, 35], [-8, 35]],
	[[-18, 35], [12, 34], [35, 12], [28, -28], [8, -35], [-10, -4]],
	[[112, -12], [153, -14], [150, -39], [122, -44], [112, -28]],
];

const WIDTH = 860;
const HEIGHT = 380;
const CX = 420;
const CY = 184;
const RADIUS = 150;
const HUB = { x: CX, y: CY };

function normalizeLongitude(lon: number): number { return ((lon + 540) % 360) - 180; }

function project(point: CountryPoint | Coordinate, rotation: number): { x: number; y: number } {
	const lon = Array.isArray(point) ? point[0] : point.lon;
	const lat = Array.isArray(point) ? point[1] : point.lat;
	return { x: CX + (normalizeLongitude(lon + rotation) / 180) * RADIUS * 1.06, y: CY - (lat / 90) * RADIUS * 0.78 };
}

function polygonPath(polygon: Coordinate[], rotation: number): string {
	return `${polygon.map((point, index) => { const p = project(point, rotation); return `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`; }).join(' ')} Z`;
}

function arcPath(point: { x: number; y: number }, index: number): string {
	const midX = (point.x + HUB.x) / 2;
	return `M ${point.x} ${point.y} Q ${midX} ${Math.min(point.y, HUB.y) - 42 - (index % 4) * 16} ${HUB.x} ${HUB.y}`;
}

function regionName(country: string, locale: string): string {
	try { return new Intl.DisplayNames([locale], { type: 'region' }).of(country) ?? country; } catch { return country; }
}

function percent(value: number, total: number, locale: string): string {
	return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(total ? value / total : 0);
}

export function MetricsGlobe({ regions, locale, label, liveLabel, edgeLabel, centerLabel, hintLabel }: { regions: RegionView[]; locale: string; label: string; liveLabel: string; edgeLabel: (count: number) => string; centerLabel: string; hintLabel: string }) {
	const knownRegions = useMemo(() => regions.filter((region) => COUNTRY_POINTS[region.country] && region.views > 0), [regions]);
	const activeRegions = knownRegions.slice(0, 18);
	const total = knownRegions.reduce((sum, region) => sum + region.views, 0);
	const peak = Math.max(1, ...activeRegions.map((region) => region.views));
	const [rotation, setRotation] = useState(0);
	const [hovered, setHovered] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(activeRegions[0]?.country ?? null);
	const drag = useRef<{ x: number; rotation: number } | null>(null);
	const selectedRegion = activeRegions.find((region) => region.country === (hovered ?? selected)) ?? activeRegions[0];
	const latitudes = [-60, -30, 0, 30, 60];
	const longitudes = [-120, -90, -60, -30, 0, 30, 60, 90, 120];

	useEffect(() => {
		if (selected && activeRegions.some((region) => region.country === selected)) return;
		setSelected(activeRegions[0]?.country ?? null);
	}, [activeRegions, selected]);

	const onPointerDown = (event: PointerEvent<SVGSVGElement>) => { drag.current = { x: event.clientX, rotation }; event.currentTarget.setPointerCapture(event.pointerId); };
	const onPointerMove = (event: PointerEvent<SVGSVGElement>) => { if (drag.current) setRotation(drag.current.rotation + (event.clientX - drag.current.x) * 0.45); };
	const onPointerUp = (event: PointerEvent<SVGSVGElement>) => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); };

	return (
		<div className='relative overflow-hidden rounded-[14px] border border-cyan/20 bg-[#061219]'>
			<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_36%_40%,rgba(63,211,245,0.16),transparent_38%),linear-gradient(120deg,rgba(10,36,48,0.9),rgba(4,13,19,0.98))]' />
			<div className='relative grid min-h-[430px] grid-cols-[minmax(0,1.45fr)_minmax(230px,0.55fr)] max-lg:grid-cols-1'>
				<div className='relative min-h-[430px] border-r border-white/8 max-lg:border-r-0 max-lg:border-b'>
					<div className='pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full border border-green/30 bg-green/10 px-3 py-1.5 font-mono text-[10px] tracking-[0.08em] text-green'><span className='size-1.5 rounded-full bg-green shadow-[0_0_12px_rgba(155,227,138,0.9)] motion-safe:animate-[metrics-globe-pulse_1.6s_ease-in-out_infinite]' aria-hidden='true' />{liveLabel}</div>
					<div className='pointer-events-none absolute top-4 right-4 z-10 text-right font-mono text-[11px] text-fg-3'><div className='text-[18px] text-cyan'>{number(total, locale)}</div><div>{edgeLabel(knownRegions.length)}</div></div>
					<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role='img' aria-label={label} className='block h-full min-h-[430px] w-full cursor-grab touch-none active:cursor-grabbing' onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={() => { if (!drag.current) setHovered(null); }}>
						<defs><radialGradient id='metrics-globe-fill' cx='38%' cy='32%'><stop offset='0%' stopColor='#164656' /><stop offset='64%' stopColor='#0a2631' /><stop offset='100%' stopColor='#061017' /></radialGradient><clipPath id='metrics-globe-clip'><circle cx={CX} cy={CY} r={RADIUS} /></clipPath></defs>
						<circle cx={CX} cy={CY} r={RADIUS + 10} fill='none' stroke='#3fd3f5' strokeOpacity='0.1' strokeWidth='1' />
						<circle cx={CX} cy={CY} r={RADIUS} fill='url(#metrics-globe-fill)' stroke='#69e5ff' strokeOpacity='0.55' strokeWidth='1.5' />
						<g clipPath='url(#metrics-globe-clip)'>
							<g fill='none' stroke='#6fe4ff' strokeOpacity='0.16' strokeWidth='1'>{latitudes.map((latitude) => <ellipse key={`lat-${latitude}`} cx={CX} cy={CY - (latitude / 90) * RADIUS * 0.78} rx={RADIUS * Math.sqrt(Math.max(0.05, 1 - (latitude / 90) ** 2))} ry={RADIUS * 0.2} />)}{longitudes.map((longitude) => <ellipse key={`lon-${longitude}`} cx={CX + Math.sin(((longitude + rotation) * Math.PI) / 180) * 4} cy={CY} rx={Math.max(2, Math.abs(Math.sin(((longitude + rotation) * Math.PI) / 180)) * RADIUS)} ry={RADIUS} />)}</g>
							<g fill='#6fe4ff' fillOpacity='0.11' stroke='#6fe4ff' strokeOpacity='0.22' strokeWidth='0.8'>{CONTINENTS.map((continent, index) => <path key={`continent-${index}`} d={polygonPath(continent, rotation)} />)}</g>
						</g>
						<g fill='none' stroke='#5edfff' strokeWidth='1.4' strokeDasharray='3 15' strokeLinecap='round' opacity={activeRegions.length ? 0.78 : 0.25}>{activeRegions.map((region, index) => { const point = project(COUNTRY_POINTS[region.country]!, rotation); const focused = selectedRegion?.country === region.country; return <path key={`${region.country}-arc`} d={arcPath(point, index)} strokeWidth={focused ? 2.5 : 1.4} className='motion-safe:animate-[metrics-flow_2.8s_linear_infinite]' style={{ animationDelay: `${index * -0.22}s`, opacity: focused ? 1 : 0.28 + (region.views / peak) * 0.72 }} />; })}</g>
						<g><circle cx={HUB.x} cy={HUB.y} r='18' fill='#3fd3f5' fillOpacity='0.1' className='motion-safe:animate-[metrics-globe-pulse_2s_ease-in-out_infinite]' /><circle cx={HUB.x} cy={HUB.y} r='5' fill='#3fd3f5' stroke='#e1fbff' strokeWidth='1' /><text x={HUB.x} y={HUB.y + 31} textAnchor='middle' fill='#a4c6cf' fontSize='9' fontFamily='ui-monospace, SFMono-Regular, Menlo, monospace' letterSpacing='1.5'>{centerLabel}</text>{activeRegions.map((region, index) => { const point = project(COUNTRY_POINTS[region.country]!, rotation); const strong = region.views / peak; const focused = selectedRegion?.country === region.country; return <g key={region.country} className='cursor-pointer' onPointerEnter={() => { if (!drag.current) setHovered(region.country); }} onPointerLeave={() => setHovered(null)} onClick={() => setSelected(region.country)}><circle cx={point.x} cy={point.y} r={focused ? 15 : 8 + strong * 5} fill='#3fd3f5' fillOpacity={focused ? 0.2 : 0.1} className='motion-safe:animate-[metrics-globe-pulse_2.2s_ease-in-out_infinite]' style={{ animationDelay: `${index * -0.16}s` }} /><circle cx={point.x} cy={point.y} r={focused ? 5 : 2.5 + strong * 2} fill={focused ? '#effcff' : '#3fd3f5'} stroke='#b9f3ff' strokeWidth={focused ? 1.5 : 0.8} /><text x={point.x + 9} y={point.y - 8} fill={focused ? '#effcff' : '#b9d7df'} fontSize={focused ? '11' : '9'} fontWeight={focused ? '700' : '400'} fontFamily='ui-monospace, SFMono-Regular, Menlo, monospace'>{region.country}</text></g>; })}</g>
					</svg>
					{hovered && selectedRegion && <div className='pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cyan/35 bg-[#07131b]/95 px-4 py-3 text-center shadow-[0_12px_38px_rgba(0,0,0,0.42)] backdrop-blur-sm'><div className='font-mono text-[11px] uppercase tracking-[0.12em] text-fg-3'>{regionName(selectedRegion.country, locale)}</div><div className='mt-1 font-display text-[26px] font-black text-cyan'>{number(selectedRegion.views, locale)}</div><div className='font-mono text-[10px] text-fg-3'>{percent(selectedRegion.views, total, locale)}</div></div>}
					<div className='pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/20 px-3 py-1 font-mono text-[10px] text-fg-3'>{hintLabel}</div>
				</div>
				<aside className='relative flex flex-col gap-4 p-4'>
					{selectedRegion ? <div className='rounded-xl border border-cyan/25 bg-cyan/8 p-4'><div className='font-mono text-[11px] uppercase tracking-[0.1em] text-fg-3'>{regionName(selectedRegion.country, locale)}</div><div className='mt-2 flex items-end justify-between gap-3'><strong className='font-display text-[32px] leading-none text-fg'>{number(selectedRegion.views, locale)}</strong><span className='font-mono text-[11px] text-cyan'>{percent(selectedRegion.views, total, locale)}</span></div></div> : <div className='rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-fg-3'>—</div>}
					<div className='flex items-center justify-between border-b border-white/10 pb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-3'><span>{label}</span><span className='text-cyan'>{knownRegions.length}</span></div>
					<div className='flex flex-col gap-1.5'>{activeRegions.slice(0, 7).map((region, index) => <button key={region.country} type='button' aria-pressed={selectedRegion?.country === region.country} onClick={() => setSelected(region.country)} onMouseEnter={() => setHovered(region.country)} onMouseLeave={() => setHovered(null)} className='group flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-left text-fg-2 transition-[background,border-color] hover:border-cyan/25 hover:bg-cyan/8 aria-pressed:border-cyan/35 aria-pressed:bg-cyan/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan'><span className={`size-1.5 shrink-0 rounded-full ${index === 0 ? 'bg-cyan shadow-[0_0_10px_rgba(63,211,245,0.9)]' : 'bg-cyan/55'}`} /><span className='min-w-0 flex-1 truncate text-[12px]'>{regionName(region.country, locale)}</span><span className='font-mono text-[11px] text-fg-3'>{number(region.views, locale)}</span></button>)}</div>
				</aside>
			</div>
		</div>
	);
}
