import React from 'react';
import { FieldTrends } from './TimeSeries.jsx';
import { currentComparison,comparisonReason,copernicusCredit } from '../lib/vegetation.js';
const FieldMap=React.lazy(()=>import('./FieldMap.jsx'));
const views={ndvi:'NDVI',rgb:'Sentinel RGB',falseColor:'False color',eto:'Reference ET₀',temperature:'Temperature',rain:'Rain probability'};

export default function FieldExplorer({field,data,history,onLoadHistory,historyBusy,historyProgress,initialVariable}) {
  const [view,setView]=React.useState('ndvi'),[opacity,setOpacity]=React.useState(.85),[periodIndex,setPeriodIndex]=React.useState(0);
  const [scene,setScene]=React.useState('latest');
  const pair=currentComparison(data),difference=scene==='difference'&&view==='ndvi';
  const imagery=scene==='before'?pair?.beforeImagery:data?.imagery,weather=data?.weather;
  const periods=(weather?.periods||[]).filter(p=>Date.parse(p.endTime)>Date.now());
  const period=periods[Math.min(periodIndex,Math.max(0,periods.length-1))];
  const eto=data?.eto?.records?.[0];
  const isImage=['ndvi','rgb','falseColor'].includes(view);
  const isWeather=['temperature','rain'].includes(view);
  const url=isImage?(difference?pair?.difference:imagery?.images?.[view]):null;
  const coordinates=difference?pair?.coordinates:imagery?.coordinates;
  const image=React.useMemo(()=>url?{url,coordinates}:null,[url,coordinates]);
  const value=view==='eto'?eto?.etoMm:view==='temperature'?period?.temperature:period?.rainProbability;
  const valueLabel=Number.isFinite(value)?`${value.toFixed(view==='eto'?1:0)} ${view==='eto'?'mm/day':view==='rain'?'%':`°${period?.temperatureUnit||'C'}`}`:'Unavailable';
  const contextGeometry=React.useMemo(()=>!isImage&&Number.isFinite(value)?(isWeather&&weather?.geometry?weather.geometry:{type:'Point',coordinates:[field.longitude,field.latitude]}):null,[isImage,isWeather,weather?.geometry,field.longitude,field.latitude,value]);
  return <>
    <section className="panel explorer"><div className="row spread"><div><p className="eyebrow">Spatial explorer</p><h2>See where the differences are</h2></div><span className="data-badge">{field.area_ha.toFixed(2)} ha · {field.name}</span></div>
      <div className="layer-switch" aria-label="Map layer">{Object.entries(views).map(([key,label])=><button key={key} aria-pressed={view===key} onClick={()=>{setView(key);if(scene==='difference'&&key!=='ndvi')setScene('latest');}}>{label}</button>)}</div>
      {isImage&&<div className="date-comparison"><div className="layer-switch" aria-label="Observation date"><button aria-pressed={scene==='before'} onClick={()=>setScene('before')} disabled={!pair?.beforeImagery}>Earlier · {pair?.beforeDate||'unavailable'}</button><button aria-pressed={scene==='latest'} onClick={()=>setScene('latest')}>Latest · {data?.imagery?.date||'unavailable'}</button>{view==='ndvi'&&<button aria-pressed={difference} disabled={!pair?.difference} onClick={()=>setScene('difference')}>NDVI change</button>}</div>
        {pair?.stats?<p className="muted">Both dates clear: <b>{Math.round(pair.stats.coverage*100)}%</b> of parcel pixels · {pair.stats.pairedPixels} paired pixels. {pair.stats.comparable?'Only this shared area contributes to the change.':comparisonReason(data)}</p>:<p className="muted">{comparisonReason(data)}</p>}
        {pair?.status==='ready'&&!pair.difference&&<p className="notice">Paired statistics are available; the change image could not be retrieved.</p>}
      </div>}
      <div className="row spread map-context"><div><b>{difference?'NDVI change · later minus earlier':views[view]}{!isImage?` · ${valueLabel}`:''}</b><p className="muted">{isImage?`${difference?`${pair?.beforeDate} → ${pair?.afterDate}`:imagery?.date||'No image acquired yet'} · Sentinel-2 L2A · 10 m native bands · ${copernicusCredit(difference?pair?.afterDate:imagery?.date)}`:view==='eto'?`${eto?.date||'No date'} · Spatial CIMIS · 2 km source model`:period?`${period.name} · ${new Date(period.startTime).toLocaleString()} · NWS forecast`:'No current forecast'}</p></div>
      {isImage&&<label className="opacity-control">Layer opacity · {Math.round(opacity*100)}%<input aria-label="Layer opacity" type="range" min="0" max="1" step=".05" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label>}</div>
      {isWeather&&periods.length>0&&<label>Forecast period<select value={Math.min(periodIndex,periods.length-1)} onChange={e=>setPeriodIndex(Number(e.target.value))}>{periods.map((p,i)=><option key={p.startTime} value={i}>{p.name} · {new Date(p.startTime).toLocaleDateString()}</option>)}</select></label>}
      <React.Suspense fallback={<p>Loading map…</p>}><FieldMap key={`${field.id}-${isImage?'satellite':view}`} boundary={field.boundary} image={image} opacity={opacity} contextGeometry={contextGeometry} contextValue={valueLabel} contextColor={view==='eto'?'#b46b30':view==='rain'?'#397ea6':'#b55d43'}/></React.Suspense>
      {isImage&&!url&&<p className="notice">{imagery?.unavailable?.includes(view)?'This image view could not be retrieved. Other available views are still usable. Image requests are cached for one day.':'No raster loaded for this view. Refresh field data to request imagery for the latest qualified acquisition day.'} The basemap alone is not satellite data.</p>}
      {view==='ndvi'&&<div className="map-legend"><div className={difference?'difference-gradient':'ndvi-gradient'}/><div className="row spread"><span>{difference?'≤ −0.30 · decrease':'−1 · low NDVI'}</span><span>0</span><span>{difference?'≥ +0.30 · increase':'+1 · high NDVI'}</span></div><p>Colors show vegetation-index variation, not a diagnosis of water stress.</p>{difference&&pair?.stats?.comparable&&<p>Among paired pixels: {Math.round(pair.stats.lowerFraction*100)}% decreased by more than 0.05 · {Math.round(pair.stats.similarFraction*100)}% within ±0.05 · {Math.round(pair.stats.higherFraction*100)}% increased by more than 0.05. These are descriptive bins, not validated stress thresholds.</p>}</div>}
      {view==='rgb'&&<p className="muted">True-color composite: red B04, green B03, blue B02. Fixed reflectance stretch ×2.5; colors are enhanced for viewing.</p>}
      {view==='falseColor'&&<p className="muted">Near-infrared composite: B08 → red, B04 → green, B03 → blue. Vegetation often appears red; red does not mean an irrigation alarm.</p>}
      {isImage&&<p className="muted">Transparent areas: cloud/shadow mask, missing pixels or outside the boundary. Change requires clear pixels on both dates. Nearest-neighbor display preserves pixel boundaries; zooming does not add detail. Vine rows, inter-row vegetation and soil can share a pixel. {imagery?`Rendered at approximately ${imagery.pixelSizeM.toFixed(0)} m/pixel.`:''} Compare RGB and false color for context, then check changing areas in the field.</p>}
      {!isImage&&<p className="notice">{isWeather&&weather?.geometry?'Shaded area is the forecast geometry supplied by NWS. It has one period value, not within-field weather detail.':'The marker is the field query point. The current API response does not contain a georeferenced raster; no spatial variation is invented.'} {view==='eto'?'ET₀ is reference grass demand, not vineyard water use.':view==='rain'?'Rain probability is not rain depth.':''}</p>}
    </section>
    <FieldTrends key={field.id} data={data} fieldName={field.name} history={history} initialVariable={initialVariable} onLoadHistory={onLoadHistory} historyBusy={historyBusy} historyProgress={historyProgress}/>
  </>;
}
