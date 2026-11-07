import { currentComparison,comparisonLabel,comparisonReason } from './vegetation.js';
import { matchingWeek,weekTotals } from './soilWater.js';

// Canonical JSON in the RFC 8785 (JCS) form for parsed JSON: keys sorted by UTF-16 code units, ECMAScript numbers, no whitespace; undefined members dropped.
export function canonicalJson(value) {
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(v=>v===undefined?'null':canonicalJson(v)).join(',')}]`;
  return `{${Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}
export async function sha256Hex(text) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export const BUNDLE_FORMAT='cultisync-field-bundle/1';
export async function fieldBundle(field,snapshot,generatedAt) {
  const stored=snapshot?Object.fromEntries(Object.entries(snapshot).filter(([k])=>k!=='cached')):snapshot;
  // The point the edge function queries CIMIS, NWS, SSURGO and NASA POWER at; it cannot be re-derived from the boundary outside PostGIS.
  const queryPoint=Number.isFinite(field.latitude)&&Number.isFinite(field.longitude)?{latitude:field.latitude,longitude:field.longitude,method:'PostGIS ST_PointOnSurface of the boundary'}:undefined;
  const content={field:{name:field.name,area_ha:field.area_ha,boundary:field.boundary,...(queryPoint&&{queryPoint})},snapshot:stored};
  return {format:BUNDLE_FORMAT,generatedAt,sha256:await sha256Hex(canonicalJson(content)),
    hashOf:'SHA-256 (hex) of the UTF-8 bytes of the RFC 8785 JSON Canonicalization Scheme (JCS) form of "content"',content};
}
export function boundarySource(boundary) {
  const s=boundary?.cultisyncSource;
  if(!s)return 'Not recorded (saved before boundary sources were recorded)';
  const base=s.provider==='DWR / Land IQ'?`DWR / Land IQ ${s.year} crop map, field ${s.id}`:{'user-drawn':'Drawn by the user','imported-geojson':'Imported GeoJSON','imported-kml':'Imported KML'}[s.provider]||s.provider;
  return `${base}${s.edited?', adjusted by user':''}`;
}
// Outline of a Polygon's outer ring for an inline SVG: north up, longitude scaled by cos(mean latitude), fitted with a margin.
export function boundaryOutline(boundary) {
  const ring=boundary?.coordinates?.[0];
  if(!Array.isArray(ring)||ring.length<4||!ring.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])))return null;
  const lons=ring.map(p=>p[0]),lats=ring.map(p=>p[1]),west=Math.min(...lons),east=Math.max(...lons),south=Math.min(...lats),north=Math.max(...lats);
  const k=Math.cos(lats.reduce((a,b)=>a+b,0)/lats.length*Math.PI/180),width=(east-west)*k,height=north-south,span=Math.max(width,height);
  if(!(span>0))return null;
  const size=200,margin=8,scale=size/span,r=v=>Math.round(v*100)/100;
  return {points:ring.map(([lon,lat])=>`${r(margin+(lon-west)*k*scale)},${r(margin+(north-lat)*scale)}`).join(' '),
    viewBox:`0 0 ${r(width*scale+2*margin)} ${r(height*scale+2*margin)}`,corners:ring.length-1,west,south,east,north};
}
// The user's own calendar date: a Pacific-evening report must not be named after tomorrow's UTC date.
const localDay=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function bundleFileName(name,date) {
  const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'field';
  return `cultisync-${slug}-${localDay(date)}.json`;
}
// Browsers use the page title as the default file name when saving a print as PDF.
export function reportTitle(name,date) { return `CultiSync evidence report - ${name} - ${localDay(date)}`; }
const VIEWS=[['ndvi','NDVI'],['rgb','true color'],['falseColor','false color']];
const viewName=key=>VIEWS.find(([k])=>k===key)?.[1]||key;
const viewList=keys=>[...VIEWS.map(([k])=>k).filter(k=>keys.includes(k)),...keys.filter(k=>!VIEWS.some(([v])=>v===k))].map(viewName).join(', ');
const signed=v=>`${v>=0?'+':''}${v.toFixed(3)}`;
export function reportRows(snapshot) {
  const s=snapshot||{},passes=s.satellite?.passes||[],latest=passes[0],eto=s.eto?.records?.[0];
  const week=weekTotals(matchingWeek(s.eto?.records,s.precipitation?.records));
  const pair=currentComparison(s),reason=comparisonReason(s);
  const rows=[
    {label:'Sentinel-2 NDVI',value:latest?`${passes.length} clear observation${passes.length===1?'':'s'} in ${s.satellite.windowDays} days; latest ${latest.date.slice(0,10)}, mean NDVI ${latest.ndvi.toFixed(3)}, ${Math.round(latest.validFraction*100)}% of parcel pixels clear`:'Unavailable',source:s.satellite?.source,retrieved:s.satellite?.fetchedAt},
    {label:'Image views',value:s.imagery?`${s.imagery.date}: ${viewList(Object.keys(s.imagery.images||{}))||'none'}${s.imagery.unavailable?.length?`; unavailable: ${viewList(s.imagery.unavailable)}`:''}; ${Math.round(s.imagery.pixelSizeM)} m pixels`:'Unavailable',source:s.imagery?.source,retrieved:s.imagery?.fetchedAt},
    {label:'Before/after comparison',value:reason?`Not compared: ${reason}`:`${pair.beforeDate} → ${pair.afterDate}: ${comparisonLabel(pair)}, mean change ${signed(pair.stats.delta)}, ${Math.round(pair.stats.coverage*100)}% of parcel jointly clear`,source:pair?.source,retrieved:pair?.fetchedAt},
    {label:'Reference ET₀, latest day',value:eto?`${eto.etoMm.toFixed(1)} mm on ${eto.date}`:'Unavailable',source:s.eto?.source,retrieved:s.eto?.fetchedAt},
    {label:'Rainfall and ET₀, latest matched week',value:week?`${week.start} to ${week.end}: rainfall ${week.rainMm.toFixed(1)} mm, ET₀ ${week.etoMm.toFixed(1)} mm`:'Unavailable',source:week?[s.precipitation?.source,s.eto?.source].join(' · '):undefined,retrieved:week?[s.precipitation?.fetchedAt,s.eto?.fetchedAt].join(' · '):undefined},
    {label:'Mapped soil',value:s.soil?`${s.soil.component}, ${s.soil.componentPercent}% of ${s.soil.mapUnit}`:'Unavailable',source:s.soil?.source,retrieved:s.soil?.fetchedAt},
    {label:'Weather forecast and alerts',value:s.weather?`Issued ${s.weather.issuedAt}; ${s.weather.alerts==null?'alert status unavailable':`${s.weather.alerts.length} active alert${s.weather.alerts.length===1?'':'s'}`}`:'Unavailable',source:s.weather?.source,retrieved:s.weather?.fetchedAt},
  ];
  return rows.map(r=>({...r,source:r.source||'—',retrieved:r.retrieved||'—'}));
}
