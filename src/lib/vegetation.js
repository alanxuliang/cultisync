export function currentComparison(data) {
  const [after,before]=data?.satellite?.passes||[],pair=data?.comparison;
  return pair&&before&&after&&pair.beforeDate===before.date.slice(0,10)&&pair.afterDate===after.date.slice(0,10)?pair:null;
}
export function comparisonLabel(pair) {
  if(pair?.status!=='ready'||!pair.stats?.comparable||!Number.isFinite(pair.stats.delta))return 'Not comparable yet';
  if(Math.abs(pair.stats.delta)<.0005)return 'Less than 0.001 change';
  return pair.stats.delta>0?'Mean NDVI higher':'Mean NDVI lower';
}
export function comparisonReason(data) {
  const pair=currentComparison(data);
  if((data?.satellite?.passes?.length||0)<2)return 'Two qualified observation dates are needed.';
  if(pair?.status==='insufficient')return 'Too little jointly clear area: comparison needs ≥60% of the parcel pixels and at least 15 paired pixels.';
  if(!pair||pair.status==='unavailable')return 'The paired-pixel comparison is not loaded. Refresh field data; failed comparisons retry at most once a day.';
  return null;
}
// Copernicus licence attribution for any view that shows modified Sentinel-2 pixels.
export function copernicusCredit(date) {
  const year=/^\d{4}-/.test(date||'')?date.slice(0,4):'';
  return `Contains modified Copernicus Sentinel data${year?` ${year}`:''}`;
}
