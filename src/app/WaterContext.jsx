import React from 'react';
import { Icon } from '../lib/Icon.jsx';
import { rootStorage,matchingWeek,weekTotals,weekLabels } from '../lib/soilWater.js';
import { shortDate } from './TimeSeries.jsx';

// Observations and mapped soil properties only: no crop coefficient, trigger or irrigation amount.
export function WaterContext({data,onExploreHistory}) {
  const [rootDepth,setRootDepth]=React.useState(1);
  const soil=data?.soil,rain=data?.precipitation;
  const storage=rootStorage(soil,rootDepth),week=weekTotals(matchingWeek(data?.eto?.records,rain?.records));
  const old=week&&Date.now()-Date.parse(week.end)>3*86400000,labels=weekLabels(week);
  return <section className="panel" id="soil-rainfall">
    <p className="eyebrow">Public data, stated limits</p><h2>Soil and rainfall context</h2>
    <p className="notice">Mapped soil properties and modeled weather only. Not a measurement of current soil moisture and not an irrigation recommendation.</p>
    <div className="source-grid">
      <article className="source-card"><Icon name="cloud-rain" size={21}/><span className="eyebrow">Modeled rainfall</span><h3>{labels.rain}</h3><p>NASA POWER{rain?.models?.length?` · ${rain.models.join(', ')}`:''}. Regional model data, not a vineyard rain gauge.</p><span className="muted">{week?`${shortDate(week.start)} – ${shortDate(week.end)}`:labels.note}{rain?` · retrieved ${shortDate(rain.fetchedAt)}`:''}</span></article>
      <article className="source-card"><Icon name="sprout" size={21}/><span className="eyebrow">Reference ET₀</span><h3>{labels.eto}</h3><p>Spatial CIMIS reference grass ET₀ for the same seven days. Atmospheric demand, not vineyard water use.</p><span className="muted">{labels.note?`${labels.note} · `:''}California DWR · 2 km grid</span></article>
      <article className="source-card"><Icon name="layers" size={21}/><span className="eyebrow">Mapped soil</span><h3>{soil?.component||'Soil pending'}</h3><p>{soil?`${soil.mapUnit}. Dominant component: ${soil.componentPercent}% of the map unit, not a measured fraction of your field.`:'Refresh field data to query USDA NRCS.'}</p><span className="muted">USDA NRCS · representative point{soil?` · retrieved ${shortDate(soil.fetchedAt)}`:''}</span></article>
    </div>
    {[data?.errors?.soil,data?.errors?.precipitation].filter(Boolean).map(message=><p className="notice error" role="status" key={message}>{message}</p>)}
    {old&&<p className="notice">The latest matched week ended {shortDate(week.end)}, more than 3 days ago. These totals do not describe this week.</p>}
    <div className="soil-storage">
      <label>Your assumed root depth · {rootDepth.toFixed(1)} m<input aria-label="Your assumed root depth" type="range" min=".3" max="2" step=".1" value={rootDepth} onChange={e=>setRootDepth(Number(e.target.value))}/><small>An assumption you set, not a measurement. Starts at 1 m and is not saved.</small></label>
      {storage?<div className="metric">Soil water storage capacity<strong>{storage.capacity.toFixed(0)} mm</strong><span className="muted">Plant-available water the mapped soil can hold in the top {storage.depthM.toFixed(2)} m{storage.restricted?', limited by a mapped restrictive layer':''}. Not how much it holds now.</span></div>
        :<p className="notice" role="status">{!soil?'Soil attributes are not loaded. Refresh field data.':'The mapped soil layers do not reach this depth, or a layer has no available-water value. Try a shallower depth; missing layers are not extrapolated.'}</p>}
    </div>
    <button onClick={()=>onExploreHistory('precipitation')}>View rainfall history in Explore →</button>
    <details className="water-method"><summary>Sources and calculation</summary>
      <p>Storage capacity adds layer thickness × available-water capacity for the dominant mapped soil component at the field's representative point, down to your assumed root depth or a mapped restrictive layer, whichever is shallower. It is not a field survey and not an estimate of current moisture.</p>
      <p>Rainfall and ET₀ totals use the latest seven consecutive days on which both sources report a value. Missing days are never treated as dry. Source day boundaries differ slightly and are paired by date.</p>
      <p><a href="https://www.nrcs.usda.gov/resources/data-and-reports/web-soil-survey" target="_blank" rel="noreferrer">USDA soil survey</a> · <a href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/" target="_blank" rel="noreferrer">NASA POWER daily data</a> · <a href="https://et.water.ca.gov/" target="_blank" rel="noreferrer">Spatial CIMIS</a></p>
    </details>
  </section>;
}
