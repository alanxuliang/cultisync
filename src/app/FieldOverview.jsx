import React from 'react';
import {historicalSeries} from '../lib/history.js';
import {weeklyEto,seasonalNdvi,overviewForecast} from '../lib/overview.js';
import {currentComparison,copernicusCredit} from '../lib/vegetation.js';
import {shortDate} from './TimeSeries.jsx';
const FieldMap=React.lazy(()=>import('./FieldMap.jsx'));

// Chart contract: compare calendar-season shape, never infer a normal band.
// Native app SVG, shared NDVI scale; teal solid=current, gray dashed=previous.
// Actual observation dots, gaps >7 days disconnected; full Jan–Dec calendar axis.
function SeasonChart({points,onExplore}) {
  const series=seasonalNdvi(points),all=series.flatMap(s=>s.points),lo=all.some(p=>p.value<0)?-1:0;
  const x=p=>36+p.seasonDay/365*388,y=v=>162-(v-lo)/(1-lo)*136;
  const title=React.useId();
  return <section className="panel overview-card"><p className="eyebrow">Seasonal context</p><h2>This season, beside last year</h2>
    <div className="season-legend">{series.map((s,i)=><span key={s.year}><i className={i?'previous':''}/>{s.year} · {s.points.length} observations</span>)}</div>
    {all.length?<svg viewBox="0 0 450 192" className="season-chart" role="img" aria-labelledby={title}><title id={title}>Field NDVI by calendar date, {series.map(s=>`${s.year}: ${s.points.length} observations`).join('; ')}. Shared axis {lo} to 1. Missing observations remain gaps.</title>
      {[lo,(lo+1)/2,1].map(v=><g key={v}><line x1="36" x2="424" y1={y(v)} y2={y(v)} stroke="currentColor" opacity=".12"/><text x="28" y={y(v)+4} textAnchor="end">{v.toFixed(1)}</text></g>)}
      {[...series].reverse().map(s=>{const previous=s.year===series[1].year,color=previous?'var(--chart-secondary)':'var(--chart-primary)';return <g key={s.year}><path d={s.points.map((p,i)=>`${!i||Date.parse(p.date)-Date.parse(s.points[i-1].date)>7*86400000?'M':'L'}${x(p)},${y(p.value)}`).join(' ')} fill="none" style={{stroke:color}} strokeWidth="2" strokeDasharray={previous?'5 4':undefined}/>{s.points.map(p=><circle key={p.date} cx={x(p)} cy={y(p.value)} r="2.5" style={{fill:previous?'var(--surface-card)':color,stroke:color}}><title>{p.date} · NDVI {p.value.toFixed(3)}</title></circle>)}</g>;})}
      {['Jan','Apr','Jul','Oct','Dec'].map((m,i)=><text key={m} x={36+[0,91,182,274,365][i]/365*388} y="185" textAnchor={i===4?'end':i===0?'start':'middle'}>{m}</text>)}
    </svg>:<p className="overview-empty">No seasonal observations available.</p>}
    <p className="muted">NDVI · both years through {shortDate(new Date().toISOString())}.{series[1].points.length?' Seasonal context, not a normal range.':' Last-year data not loaded.'} Vine rows and ground cover are mixed.</p>
    <button onClick={onExplore}>Explore history →</button>
  </section>;
}

export function FieldOverview({field,data,history,onExplore,onWater}) {
  const series=historicalSeries(data,history),week=weeklyEto(series.eto),weather=data?.weather,days=overviewForecast(weather);
  const pair=currentComparison(data),hasChange=pair?.status==='ready'&&pair?.stats?.comparable&&pair?.difference;
  const url=hasChange?pair.difference:data?.imagery?.images?.ndvi,coordinates=hasChange?pair.coordinates:data?.imagery?.coordinates;
  const image=React.useMemo(()=>url&&coordinates?{url,coordinates}:null,[url,coordinates]);
  const forecastStale=weather&&(!Number.isFinite(Date.parse(weather.issuedAt))||Date.now()-Date.parse(weather.issuedAt)>12*3600000);
  const alerts=(weather?.alerts||[]).filter(a=>!a.expires||Date.parse(a.expires)>Date.now());
  const satelliteDate=hasChange?pair.afterDate:data?.imagery?.date;
  const satelliteOld=satelliteDate&&Date.now()-Date.parse(satelliteDate)>10*86400000;
  return <div className="field-overview">
    <section className="panel overview-hero"><div><p className="eyebrow">Reference water demand</p><h2>7-day reference ET₀</h2><div className={`overview-number ${week.total===null?'unavailable':''}`}>{week.total===null?'Unavailable':week.total.toFixed(1)}{week.total!==null&&<span>mm</span>}</div>
      <p className="overview-comparison">{week.delta!==null?`${Math.abs(week.delta).toFixed(1)} mm ${week.delta>=0?'more':'less'} than the previous seven days`:week.reason||'Previous week incomplete; no comparison.'}</p>
      {week.start&&<p className="muted">{shortDate(week.start)}–{shortDate(week.end)} · Spatial CIMIS · 2 km model</p>}
      <p className="muted">Reference grass demand, not vineyard water use or an irrigation amount.</p><button onClick={onWater}>View water context →</button>
    </div><div className="overview-weather"><h3>Next three days</h3>{forecastStale&&<p className="notice">Forecast is more than 12 hours old or has no issue time.</p>}
      {days.length?<div className="weather-mini">{days.map(d=>{const temperatures=d.periods.map(p=>p.temperature),rain=d.periods.map(p=>p.rainProbability),valid=temperatures.every(Number.isFinite),low=Math.min(...temperatures),high=Math.max(...temperatures);return <div key={d.date}><b>{shortDate(d.date)}</b><strong>{valid?`${low===high?high:`${low}–${high}`}°${d.periods[0].temperatureUnit}`:'Unavailable'}</strong><span>{d.periods[0].shortForecast}</span><small>Rain {rain.every(Number.isFinite)?`up to ${Math.max(...rain)}%`:'unknown'}</small></div>;})}</div>:<p className="muted">No current forecast loaded.</p>}
      {alerts.length?<button className="overview-alert" onClick={onWater}>{alerts[0].event||'NWS weather alert'}{alerts.length>1?` · +${alerts.length-1} more`:''} →</button>:<p className="muted">{!weather||weather.alerts==null?'NWS alert status unavailable.':forecastStale?'Check NWS for current alerts.':'No unexpired NWS alerts in the last check.'}</p>}
      <p className="muted">NWS remaining forecast periods · highest period rain chance, not rainfall amount.</p>
    </div></section>
    <div className="overview-grid"><section className="panel overview-card"><p className="eyebrow">Field view</p><h2>{hasChange?'Where vegetation changed':'Latest vegetation view'}</h2>
      {image?<React.Suspense fallback={<p className="overview-empty">Loading map…</p>}><FieldMap compact boundary={field.boundary} image={image}/></React.Suspense>:<div className="overview-empty">No satellite image available yet.</div>}
      {hasChange&&<div className="overview-map-key"><span>Decrease</span><i className="difference-gradient"/><span>Increase</span></div>}
      {!hasChange&&image&&<div className="overview-map-key"><span>−1 NDVI</span><i className="ndvi-gradient"/><span>+1 NDVI</span></div>}
      <p className="muted">{hasChange?`${shortDate(pair.beforeDate)} → ${shortDate(pair.afterDate)} · ${Math.round(pair.stats.coverage*100)}% comparable area · ${copernicusCredit(pair.afterDate)}`:satelliteDate?`${shortDate(satelliteDate)} · Sentinel-2 · ${copernicusCredit(satelliteDate)}`: 'Refresh field data to check availability.'}{satelliteOld?' · Older than 10 days.':''}</p>
      <p className="muted">{hasChange?'NDVI change scale −0.30 to +0.30. ':''}Colors are not a water-stress diagnosis.</p><button onClick={onExplore}>Explore imagery →</button>
    </section><SeasonChart points={series.ndvi} onExplore={onExplore}/></div>
  </div>;
}
