import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { cimisRecords, satellitePasses, forecastPeriods, evalscript, DAY } from './parsers.js';
import { authorizeField } from './authorization.js';
import { imageRequest, rasterBounds } from './imagery.js';
import { soilQuery, soilProfile, precipitationRecords } from './environment.js';
// Browser build avoids Node worker/vm imports unsupported by the edge runtime.
import { fromArrayBuffer } from 'https://esm.sh/geotiff@3.0.5?target=es2022&bundle';
import { comparisonRequest, pairedStatistics, parcelPixelMask } from './comparison.js';
import { HISTORY_FIELD_IDS, historyRange } from './history.js';

const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
async function fetchJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url,{...options,signal:AbortSignal.timeout(20000)});
  // Never echo upstream URLs/responses or authentication credentials.
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  try { return await response.json(); }
  catch { throw new Error('Provider response was not JSON'); }
}
let satelliteToken: {value:string,expires:number} | null = null;
async function token() {
  if (satelliteToken && satelliteToken.expires > Date.now()+60000) return satelliteToken.value;
  const clientId = Deno.env.get('SENTINELHUB_CLIENT_ID');
  const clientSecret = Deno.env.get('SENTINELHUB_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Satellite credentials missing');
  const data = await fetchJson('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret}),
  });
  if (!data.access_token) throw new Error('Satellite authentication unavailable');
  satelliteToken = {value:data.access_token,expires:Date.now()+Number(data.expires_in)*1000};
  return satelliteToken.value;
}
async function weather(field: any) {
  const headers = {'User-Agent':'CultiSync (support@cultisync.com)','Accept':'application/geo+json'};
  const point = await fetchJson(`https://api.weather.gov/points/${field.latitude.toFixed(4)},${field.longitude.toFixed(4)}`,{headers});
  const forecastUrl = point.properties?.forecast;
  if (!forecastUrl || new URL(forecastUrl).origin !== 'https://api.weather.gov') throw new Error('No NWS forecast for this field');
  const result = await fetchJson(`${forecastUrl}?units=si`,{headers});
  const periods = forecastPeriods(result);
  if (!periods.length) throw new Error('No current forecast');
  let alerts = null;
  try {
    const active = await fetchJson(`https://api.weather.gov/alerts/active?point=${field.latitude.toFixed(4)},${field.longitude.toFixed(4)}`,{headers});
    alerts = (active.features || []).map((f: any) => ({id:f.id,headline:f.properties.headline,event:f.properties.event,severity:f.properties.severity,expires:f.properties.expires,instruction:f.properties.instruction}));
  } catch { /* Forecast can still be useful when the independent alerts endpoint fails. */ }
  return {source:'NOAA / NWS',issuedAt:result.properties.updateTime,geometry:result.geometry?.type==='Polygon'?result.geometry:null,periods,alerts,fetchedAt:new Date().toISOString()};
}
async function eto(field: any, range?: any) {
  const key = Deno.env.get('CIMIS_APP_KEY');
  if (!key) throw new Error('CIMIS key missing');
  const end = range?.end || new Date(Date.now()-DAY).toISOString().slice(0,10);
  const start = range?.from || new Date(Date.now()-30*DAY).toISOString().slice(0,10);
  const params = new URLSearchParams({coordinates:`lat=${field.latitude},lng=${field.longitude}`,startDate:start,endDate:end,dataItems:'day-asce-eto',unitOfMeasure:'M'});
  const records = cimisRecords(await fetchJson(`https://et.water.ca.gov/SpatialWeb/GetDataBySpatialCoordinates?${params}`,{headers:{Accept:'application/json','Ocp-Apim-Subscription-Key':key}}));
  if (!records.length) throw new Error('No recent CIMIS data');
  return {source:'California DWR / Spatial CIMIS',resolution:'2 km',records,fetchedAt:new Date().toISOString()};
}
async function satellite(field: any, range?: any) {
  const accessToken = await token();
  const to = (range?.to || new Date().toISOString().slice(0,10))+'T00:00:00Z';
  const from = (range?.from || new Date(Date.now()-30*DAY).toISOString().slice(0,10))+'T00:00:00Z';
  const result = await fetchJson('https://sh.dataspace.copernicus.eu/api/v1/statistics',{
    method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},
    body:JSON.stringify({input:{bounds:{geometry:field.boundary},data:[{type:'sentinel-2-l2a'}]},
      aggregation:{timeRange:{from,to},aggregationInterval:{of:'P1D'},resx:0.0002,resy:0.0002,evalscript},calculations:{}}),
  });
  if (result.status !== 'OK') throw new Error('Satellite processing incomplete');
  return {source:'Copernicus Sentinel-2 / CDSE',windowDays:(Date.parse(to)-Date.parse(from))/DAY,passes:satellitePasses(result),fetchedAt:new Date().toISOString()};
}

async function soil(field: any) {
  const result=await fetchJson('https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({query:soilQuery(field.latitude,field.longitude),format:'JSON+COLUMNNAME'}),
  });
  const profile=soilProfile(result);
  if(!profile)throw Error('Soil unavailable');
  return {...profile,source:'USDA NRCS / SSURGO',fetchedAt:new Date().toISOString()};
}
async function precipitation(field: any, range?: any) {
  const compact=(date:Date)=>date.toISOString().slice(0,10).replaceAll('-','');
  const params=new URLSearchParams({parameters:'PRECTOTCORR',community:'AG',longitude:String(field.longitude),latitude:String(field.latitude),
    start:range?range.from.replaceAll('-',''):compact(new Date(Date.now()-30*DAY)),end:range?range.end.replaceAll('-',''):compact(new Date(Date.now()-DAY)),format:'JSON','time-standard':'LST'});
  const result=await fetchJson(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`);
  const records=precipitationRecords(result);
  if(!records.some(r=>r.rainMm!==null))throw Error('Rain unavailable');
  return {source:'NASA POWER',models:result.header?.sources||[],timeStandard:result.header?.time_standard||'LST',records,fetchedAt:new Date().toISOString()};
}

async function imagery(field: any, date: string) {
  const accessToken=await token();
  const images: Record<string,string>={};
  const unavailable: string[]=[];
  await Promise.all(['ndvi','rgb','falseColor'].map(async view=>{
    try {
      const response=await fetch('https://sh.dataspace.copernicus.eu/api/v1/process',{
        method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',Accept:'image/png'},
        body:JSON.stringify(imageRequest(field,date,view)),signal:AbortSignal.timeout(20000),
      });
      if(!response.ok || !response.headers.get('content-type')?.includes('image/png')) throw Error();
      const bytes=new Uint8Array(await response.arrayBuffer());
      if(bytes.length>1048576 || bytes[0]!==137 || bytes[1]!==80 || bytes[2]!==78 || bytes[3]!==71) throw Error();
      let binary='';
      for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      images[view]='data:image/png;base64,'+btoa(binary);
    } catch { unavailable.push(view); }
  }));
  return {date:date.slice(0,10),...rasterBounds(field.boundary),images,unavailable,source:'Copernicus Sentinel-2 L2A / CDSE',fetchedAt:new Date().toISOString()};
}

async function compareObservations(field: any,beforeDate: string,afterDate: string,beforeImagery: any) {
  const accessToken=await token();
  const request=(kind:string)=>fetch('https://sh.dataspace.copernicus.eu/api/v1/process',{
    method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',Accept:kind==='values'?'image/tiff':'image/png'},
    body:JSON.stringify(comparisonRequest(field,beforeDate,afterDate,kind)),signal:AbortSignal.timeout(20000),
  });
  const bounds=rasterBounds(field.boundary);
  const response=await request('values');
  if(!response.ok||!response.headers.get('content-type')?.includes('tiff'))throw Error('Comparison unavailable');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength>2*1024*1024)throw Error('Raster too large');
  const tiff=await fromArrayBuffer(buffer),raster=await tiff.getImage();
  if(raster.getWidth()!==bounds.width||raster.getHeight()!==bounds.height||raster.getSamplesPerPixel()!==5)throw Error('Unexpected raster dimensions');
  const bands=await raster.readRasters();
  const stats=pairedStatistics(bands,parcelPixelMask(field.boundary,bounds));
  let difference=null;
  if(stats.comparable){
    try {
      const png=await request('difference');
      if(!png.ok||!png.headers.get('content-type')?.includes('image/png'))throw Error();
      const bytes=new Uint8Array(await png.arrayBuffer());
      if(bytes.length>1048576||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)throw Error();
      let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      difference='data:image/png;base64,'+btoa(binary);
    } catch { /* Numeric comparison remains available when the independent image request fails. */ }
  }
  return {beforeDate,afterDate,...bounds,stats,difference,beforeImagery,footprintMethod:'polygon-pixel-centers',
    status:stats.comparable?'ready':'insufficient',fetchedAt:new Date().toISOString(),source:'Copernicus Sentinel-2 L2A / CDSE'};
}

async function backfillMonth(admin: any,field: any,month: string) {
  const range=historyRange(month);
  if(!HISTORY_FIELD_IDS.includes(field.id))return json({error:'Historical backfill is limited to authorized evaluation fields.'},403);
  if(!range)return json({error:'Month is outside the authorized two-year window.'},400);
  const table=admin.from('field_history_months');
  const {data:cached,error}=await table.select('*').eq('field_id',field.id).eq('month',month).maybeSingle();
  if(error)throw Error('History cache unavailable');
  if(cached&&(cached.payload.status==='complete'||Date.now()-Date.parse(cached.fetched_at)<DAY))return json({month,payload:cached.payload});
  const fetched_at=new Date().toISOString();
  // Claim this month before upstream work. The PK / timestamp condition prevents duplicate backfills.
  const pending={...(cached?.payload||{}),status:'loading',...range};
  const claim=cached?await table.update({fetched_at,payload:pending}).eq('field_id',field.id).eq('month',month).eq('fetched_at',cached.fetched_at).select('month'):
    await table.insert({field_id:field.id,month,fetched_at,payload:pending}).select('month');
  if(claim.error||!claim.data?.length)return json({error:'This month is already being loaded. Reload the saved history.'},409);
  const names=['satellite','eto','precipitation'];
  const jobs=[satellite,eto,precipitation];
  const results=await Promise.allSettled(jobs.map((job,i)=>cached?.payload?.[names[i]]?Promise.resolve(cached.payload[names[i]]):job(field,range)));
  const payload:any={...range,status:'complete',errors:{}};
  results.forEach((result,i)=>{
    if(result.status==='fulfilled')payload[names[i]]=result.value;
    else {payload.status='partial';payload[names[i]]=null;payload.errors[names[i]]='This source could not be loaded for this month. Missing values are not zero.';}
  });
  const {error:saveError}=await table.update({payload}).eq('field_id',field.id).eq('month',month);
  if(saveError)throw Error('History save failed');
  return json({month,payload});
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  if (req.method !== 'POST') return json({error:'Method not allowed'},405);
  try {
    const authorization = req.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({error:'Sign in required'},401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    // Validate token against Auth; never trust client-supplied owner IDs or JWT payloads.
    const body = await req.json();
    const access = await authorizeField(admin,authorization,body.fieldId);
    if (access.error) return json({error:access.error},access.status);
    const field = access.field;
    if(body.historyMonth!==undefined)return await backfillMonth(admin,field,body.historyMonth);
    const {data:cached,error:cacheError} = await admin.from('field_snapshots').select('*').eq('field_id',field.id).maybeSingle();
    if (cacheError) throw new Error('Cache unavailable');
    const {data:claimed,error:claimError} = await admin.rpc('claim_field_refresh',{target:field.id});
    if (claimError) throw new Error('Refresh unavailable');
    if (!claimed) return cached ? json({...cached.payload,cached:true}) : json({error:'A refresh is running or was recently attempted. Try again in one hour.'},429);
    const previous = cached?.payload || {};
    const satelliteFresh = previous.satellite?.windowDays===30 && previous.satellite?.fetchedAt && Date.now()-Date.parse(previous.satellite.fetchedAt) < DAY;
    const soilFresh=previous.soil?.fetchedAt&&Date.now()-Date.parse(previous.soil.fetchedAt)<30*DAY;
    const rainFresh=previous.precipitation?.fetchedAt&&Date.now()-Date.parse(previous.precipitation.fetchedAt)<DAY;
    const tasks = await Promise.allSettled([weather(field),eto(field),satelliteFresh ? Promise.resolve(previous.satellite) : satellite(field),
      soilFresh?Promise.resolve(previous.soil):soil(field),rainFresh?Promise.resolve(previous.precipitation):precipitation(field)]);
    const payload: Record<string,unknown> = {checkedAt:new Date().toISOString(),errors:{}};
    ['weather','eto','satellite','soil','precipitation'].forEach((name,i) => {
      const result = tasks[i];
      if (result.status === 'fulfilled') payload[name] = result.value;
      else {
        payload[name] = previous[name] || null;
        // Only expose known safe diagnostics, never fetch errors containing URLs or keys.
        const reason = result.reason instanceof Error ? result.reason.message : '';
        const safeReason = ['No recent CIMIS data','CIMIS key missing','Provider response was not JSON'].includes(reason) || /^Provider returned HTTP \d{3}$/.test(reason) ? reason : result.reason?.name === 'TimeoutError' ? 'Provider timed out' : 'Provider connection or processing failed';
        const diagnostic = ` (${safeReason})`;
        const label={eto:'CIMIS',satellite:'Satellite',weather:'Weather',soil:'USDA soil',precipitation:'NASA precipitation'}[name];
        (payload.errors as Record<string,string>)[name] = `${label} is unavailable${diagnostic}. Any previous data below keeps its original timestamp.`;
      }
    });
    const imageDate=(payload.satellite as any)?.passes?.[0]?.date;
    if(imageDate){
      // Bounded, private snapshot storage: three <=256px PNGs; delete cascades with the field.
      // Cache partial failures too, so repeated refreshes do not consume image quota.
      const sameDay=previous.imagery?.date===imageDate.slice(0,10);
      if(sameDay && Date.now()-Date.parse(previous.imagery.fetchedAt)<DAY)payload.imagery=previous.imagery;
      else {try {payload.imagery=await imagery(field,imageDate);}catch {payload.imagery=previous.imagery||null;}}
    } else payload.imagery=previous.imagery||null;
    const beforeDate=(payload.satellite as any)?.passes?.[1]?.date?.slice(0,10),afterDate=imageDate?.slice(0,10);
    if(beforeDate&&afterDate){
      const prior=previous.comparison;
      const samePair=prior?.beforeDate===beforeDate&&prior?.afterDate===afterDate&&prior?.footprintMethod==='polygon-pixel-centers';
      // Complete comparisons are reused until the date pair changes. Partial failures retry at most daily.
      const complete=prior?.status==='insufficient'||(prior?.status==='ready'&&prior?.difference&&prior?.beforeImagery?.unavailable?.length===0);
      if(samePair&&(complete||Date.now()-Date.parse(prior.fetchedAt)<DAY))payload.comparison=prior;
      else {
        try {
          const candidate=previous.imagery?.date===beforeDate?previous.imagery:prior?.beforeImagery?.date===beforeDate?prior.beforeImagery:null;
          const beforeImagery=candidate?.unavailable?.length===0?candidate:await imagery(field,beforeDate);
          payload.comparison=await compareObservations(field,beforeDate,afterDate,beforeImagery);
        } catch {
          payload.comparison={beforeDate,afterDate,status:'unavailable',footprintMethod:'polygon-pixel-centers',fetchedAt:new Date().toISOString()};
        }
      }
    } else payload.comparison=null;
    const {error:saveError} = await admin.from('field_snapshots').upsert({field_id:field.id,payload,fetched_at:new Date().toISOString()});
    if (saveError) return json({error:'Could not save refreshed data. Please try later.'},503);
    return json(payload);
  } catch { return json({error:'Data refresh unavailable. Please try later.'},503); }
});
