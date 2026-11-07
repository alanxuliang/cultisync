import React from 'react';
import { WaterContext } from './WaterContext.jsx';
export const dateTime = value => value ? new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : 'Unavailable';
export function LiveWater({data,field,onExploreHistory}) {
  const weather = data?.weather;
  const eto = data?.eto;
  const latest = eto?.records?.[0];
  const oldWeather = weather && Date.now()-Date.parse(weather.issuedAt) > 12*3600000;
  const oldEto = latest && Date.now()-Date.parse(latest.date) > 3*86400000;
  return <><section className="panel"><p className="eyebrow">Water observations and forecasts</p><h2>Water context</h2>
    <p className="notice">For information only, not professional agronomic advice. Reference ET₀ describes atmospheric demand over reference grass; it is not vineyard water use or an irrigation dose. No soil sensor is connected. CultiSync does not schedule or control irrigation. Check local conditions with your agronomist.</p>
    {data?.errors?.eto && <p role="status" className="notice error">{data.errors.eto}</p>}
    <div className="metrics"><div className="metric">Latest reference ET₀<strong>{latest ? `${latest.etoMm.toFixed(1)} mm` : 'Unavailable'}</strong><span className="muted">{latest ? `${latest.date} · daily modeled estimate` : 'Refresh field data to check availability.'}</span></div>
      </div>
    {latest && <p className="muted">{eto.source} · {eto.resolution} grid · quality flag: {latest.quality} · retrieved {dateTime(eto.fetchedAt)}{oldEto ? ' · DELAYED DATA — older than 3 days' : ''}</p>}
    <button onClick={()=>onExploreHistory('eto')}>View ET₀ history in Explore →</button>
  </section><WaterContext key={field.id} data={data} onExploreHistory={onExploreHistory}/><section className="panel">
    <h2 style={{marginTop:28}}>Weather forecast</h2>
    {data?.errors?.weather && <p role="status" className="notice error">{data.errors.weather}</p>}
    {weather ? <><p className="muted">{weather.source} · issued {dateTime(weather.issuedAt)} · approximately 2.5 km grid{oldWeather ? ' · STALE FORECAST — older than 12 hours' : ''}</p>
      {weather.alerts===null||weather.alerts===undefined?<p className="notice">Weather alert status is unavailable. Check your local NWS forecast office for current warnings.</p>:weather.alerts.length===0?<p className="muted">No active NWS alerts were returned when checked at {dateTime(weather.fetchedAt)}. This is not a guarantee of safe conditions.</p>:weather.alerts.map(a=><div className="notice error" key={a.id}><b>{a.headline||a.event}</b><p>{a.instruction||'Check NWS for the full official alert and instructions.'}</p><span className="muted">{a.severity} · expires {dateTime(a.expires)}</span></div>)}
      <div className="forecast">{weather.periods.filter(p=>Date.parse(p.endTime)>Date.now()).slice(0,6).map(p => <div className="metric" key={p.startTime}><b>{p.name}</b><p>{p.temperature}°{p.temperatureUnit} · {p.shortForecast}</p><span className="muted">Rain chance {p.rainProbability == null ? 'unavailable' : `${p.rainProbability}%`}<br/>{dateTime(p.startTime)}</span></div>)}</div>
      <p className="muted">Rain probability is not rainfall amount. Forecasts may change.</p></> : <p>No forecast available yet. Missing data is never shown as zero rainfall.</p>}
  </section></>;
}
