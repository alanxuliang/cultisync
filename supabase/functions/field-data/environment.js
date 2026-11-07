// Public source adapters. Missing observations are retained as missing, never dry days.
const number = value => value == null || String(value).trim()==='' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
export function soilQuery(latitude,longitude) {
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Invalid point');
  return `SELECT TOP 100 m.mukey,m.muname,c.cokey,c.compname,c.comppct_r,h.hzdept_r,h.hzdepb_r,h.awc_r,
    (SELECT MIN(resdept_r) FROM corestrictions r WHERE r.cokey=c.cokey) AS restriction_cm
    FROM mapunit m JOIN component c ON c.mukey=m.mukey LEFT JOIN chorizon h ON h.cokey=c.cokey
    WHERE m.mukey IN (SELECT mukey FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(${longitude.toFixed(5)} ${latitude.toFixed(5)})'))
    ORDER BY c.comppct_r DESC,c.cokey,h.hzdept_r`;
}
export function soilProfile(response) {
  const [columns,...values]=response?.Table||[];
  if(!Array.isArray(columns))return null;
  const rows=values.map(r=>Object.fromEntries(columns.map((c,i)=>[c,r[i]])));
  const dominant=rows.filter(r=>number(r.comppct_r)>0).sort((a,b)=>number(b.comppct_r)-number(a.comppct_r)||String(a.cokey).localeCompare(String(b.cokey)))[0];
  if(!dominant)return null;
  const horizons=rows.filter(r=>r.cokey===dominant.cokey).map(r=>({topCm:number(r.hzdept_r),bottomCm:number(r.hzdepb_r),awc:number(r.awc_r)}));
  return {mapUnit:dominant.muname,mapUnitId:dominant.mukey,component:dominant.compname,componentPercent:number(dominant.comppct_r),restrictionCm:number(dominant.restriction_cm),horizons};
}
export function precipitationRecords(response) {
  if(response?.parameters?.PRECTOTCORR?.units!=='mm/day')return [];
  return Object.entries(response?.properties?.parameter?.PRECTOTCORR||{}).filter(([date])=>/^\d{8}$/.test(date)).map(([date,value])=>{
    const n=number(value);
    return {date:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,rainMm:n!==null&&n>=0&&n!==response?.header?.fill_value?n:null};
  }).sort((a,b)=>a.date.localeCompare(b.date));
}
