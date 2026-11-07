export const DAY = 86400000;
export function cimisRecords(response) {
  return (response?.Data?.Providers || []).flatMap(p => p.Records || []).map(r => {
    const raw = r.DayAsceEto?.Value;
    const value = raw == null || String(raw).trim() === '' ? null : Number(raw);
    return { date:r.Date, etoMm:Number.isFinite(value) && value >= 0 && r.DayAsceEto?.Unit === '(mm)' ? value : null, quality:r.DayAsceEto?.Qc?.trim() || 'unflagged' };
  }).filter(r => r.etoMm !== null).sort((a,b) => b.date.localeCompare(a.date));
}
export function satellitePasses(response) {
  return (response?.data || []).map(r => {
    const ndvi = r.outputs?.ndvi?.bands?.B0?.stats;
    const footprint = r.outputs?.footprint?.bands?.B0?.stats;
    const parcelPixels = footprint ? footprint.sampleCount - footprint.noDataCount : 0;
    const validPixels = ndvi ? ndvi.sampleCount - ndvi.noDataCount : 0;
    const fraction = parcelPixels > 0 ? validPixels / parcelPixels : 0;
    return { date:r.interval?.from, ndvi:ndvi?.mean, validFraction:fraction, validPixels,
      clear: validPixels >= 15 && fraction >= 0.60 && fraction <= 1 && Number.isFinite(ndvi?.mean) && ndvi.mean >= -1 && ndvi.mean <= 1 };
  }).filter(r => r.date && r.clear).sort((a,b) => b.date.localeCompare(a.date));
}
export function forecastPeriods(response, now = Date.now()) {
  return (response?.properties?.periods || []).filter(p => Date.parse(p.endTime) > now).slice(0,14).map(p => ({
    name:p.name, startTime:p.startTime, endTime:p.endTime, temperature:p.temperature,
    temperatureUnit:p.temperatureUnit, rainProbability:p.probabilityOfPrecipitation?.value ?? null,
    shortForecast:p.shortForecast, windSpeed:p.windSpeed,
  }));
}
export const evalscript = `//VERSION=3
function setup() {
  return {input:[{bands:['B04','B08','SCL','dataMask']}],output:[
    {id:'ndvi',bands:1,sampleType:'FLOAT32'},
    {id:'footprint',bands:1,sampleType:'UINT8'},
    {id:'dataMask',bands:['ndvi','footprint']}
  ]};
}
function evaluatePixel(s) {
  const denominator = s.B08 + s.B04;
  const keep = s.dataMask && [4,5,6,7].includes(s.SCL) && denominator > 0 ? 1 : 0;
  return {ndvi:[keep ? (s.B08-s.B04)/denominator : 0],footprint:[1],dataMask:[keep,s.dataMask]};
}`;
