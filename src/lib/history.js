export { HISTORY_TEST_FIELD_ID, HISTORY_FIELD_IDS, HISTORY_START, HISTORY_END, historyMonths } from '../../supabase/functions/field-data/history.js';

export function historicalSeries(data,months=[]) {
  const keys={ndvi:['satellite','passes','ndvi'],eto:['eto','records','etoMm'],precipitation:['precipitation','records','rainMm']};
  return Object.fromEntries(Object.entries(keys).map(([name,[source,collection,value]])=>{
    const points=new Map();
    // Current observations win if they overlap an archived month.
    for(const payload of [...months.map(m=>m.payload),data])for(const row of payload?.[source]?.[collection]||[]){
      const date=row.date?.slice(0,10);
      if(date&&Number.isFinite(row[value]))points.set(date,{date,value:row[value]});
    }
    return [name,[...points.values()].sort((a,b)=>a.date.localeCompare(b.date))];
  }));
}
export function filterHistory(points,days,end=Date.now()) {
  const to=new Date(end);to.setUTCHours(0,0,0,0);
  const from=days==='all'?-Infinity:to.getTime()-Number(days)*86400000;
  return points.filter(p=>Date.parse(p.date)>=from&&Date.parse(p.date)<=to.getTime());
}
