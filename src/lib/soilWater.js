const DAY=86400000;
// Integrate the dominant mapped component, without filling unreported horizons.
export function rootStorage(soil,rootDepthM) {
  if(!soil?.horizons?.length||!Number.isFinite(rootDepthM)||rootDepthM<=0)return null;
  const depthCm=Math.min(rootDepthM*100,Number.isFinite(soil.restrictionCm)?soil.restrictionCm:Infinity);
  if(depthCm<=0)return null;
  let cursor=0,capacity=0;
  for(const h of [...soil.horizons].sort((a,b)=>a.topCm-b.topCm)) {
    if(!Number.isFinite(h.topCm)||!Number.isFinite(h.bottomCm)||h.bottomCm<=h.topCm)continue;
    if(h.topCm>=depthCm)break;
    if(h.topCm!==cursor||!Number.isFinite(h.awc)||h.awc<0||h.awc>1)return null;
    const bottom=Math.min(depthCm,h.bottomCm);
    capacity+=(bottom-h.topCm)*10*h.awc;cursor=bottom;
    if(cursor===depthCm)break;
  }
  return cursor===depthCm&&capacity>0?{capacity,depthM:depthCm/100,restricted:depthCm<rootDepthM*100}:null;
}
// Use the latest common, consecutive week; do not bridge missing rainfall or ET0.
export function matchingWeek(eto=[],rain=[]) {
  const rainfall=new Map(rain.map(r=>[r.date,r.rainMm]));
  const rows=eto.filter(r=>Number.isFinite(r.etoMm)&&r.etoMm>=0&&Number.isFinite(rainfall.get(r.date))&&rainfall.get(r.date)>=0)
    .map(r=>({date:r.date,etoMm:r.etoMm,rainMm:rainfall.get(r.date)})).sort((a,b)=>a.date.localeCompare(b.date));
  const week=[];
  for(let i=rows.length-1;i>=0&&week.length<7;i--){
    if(week.length&&Date.parse(week[0].date)-Date.parse(rows[i].date)!==DAY)break;
    week.unshift(rows[i]);
  }
  return week.length===7?week:[];
}
// Totals for one matched week; anything other than seven days has no total.
export function weekTotals(days=[]) {
  if(days.length!==7)return null;
  return {start:days[0].date,end:days.at(-1).date,etoMm:days.reduce((s,r)=>s+r.etoMm,0),rainMm:days.reduce((s,r)=>s+r.rainMm,0)};
}
// Card headings for the matched week. Without one, neither source is "pending": the pair is incomplete.
export function weekLabels(week) {
  if(!week)return {rain:'No matched week',eto:'No matched week',note:'Needs seven days with both rainfall and ET₀.'};
  return {rain:`${week.rainMm.toFixed(1)} mm / week`,eto:`${week.etoMm.toFixed(1)} mm / week`,note:null};
}
