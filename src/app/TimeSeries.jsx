import React from 'react';
import { historicalSeries,filterHistory,HISTORY_START,HISTORY_END,historyMonths } from '../lib/history.js';

export const shortDate = value => new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});
const dated = value => new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});
export function TimeSeries({title,points=[],unit='',color='var(--chart-primary)',domain,threshold,thresholdLabel='Threshold',forecast=false,maxGapDays=2,note}) {
  const [active,setActive]=React.useState(null);
  const id=React.useId();
  const rows=points.filter(p=>Number.isFinite(p.value)&&Number.isFinite(Date.parse(p.date))).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  const current=rows.find(r=>r.date===active)||rows.at(-1);
  if(!rows.length)return <section className="trend-card"><h3>{title}</h3><p className="muted">No values available. Missing data is not zero.</p></section>;
  const values=rows.map(p=>p.value),min=Math.min(...values),max=Math.max(...values);
  const lo=domain?.[0]??Math.min(0,min),hi=domain?.[1]??Math.max(max*1.15,threshold?threshold*1.1:0,1);
  const t0=Date.parse(rows[0].date),t1=Date.parse(rows.at(-1).date);
  const longWindow=t1-t0>120*86400000;
  const x=p=>52+(t1===t0?0.5:(Date.parse(p.date)-t0)/(t1-t0))*612;
  const y=v=>174-(v-lo)/(hi-lo)*138;
  const line=rows.map((p,i)=>`${i===0||Date.parse(p.date)-Date.parse(rows[i-1].date)>maxGapDays*86400000?'M':'L'}${x(p)},${y(p.value)}`).join(' ');
  return <section className="trend-card">
    <div className="row spread"><h3>{title}</h3><span className={`data-badge ${forecast?'forecast-badge':''}`}>{forecast?'Forecast':'Time series'}</span></div>
    <div className="trend-readout" aria-live="polite"><strong>{current.value.toFixed(2)} <small>{unit}</small></strong><span>{current.label||dated(current.date)}</span></div>
    <svg className="trend-svg" viewBox="0 0 700 214" role="img" aria-labelledby={id}>
      <title id={id}>{title}: {rows.length} points. Minimum {min.toFixed(2)}, maximum {max.toFixed(2)} {unit}. {rows[0].label||rows[0].date} to {rows.at(-1).label||rows.at(-1).date}.</title>
      {[0,0.5,1].map(n=>{const v=lo+(hi-lo)*n;return <g key={n}><line x1="52" x2="664" y1={y(v)} y2={y(v)} stroke="currentColor" opacity=".12"/><text x="43" y={y(v)+4} textAnchor="end">{v.toFixed(hi-lo<=2?1:0)}</text></g>;})}
      {threshold!=null&&<g><line x1="52" x2="664" y1={y(threshold)} y2={y(threshold)} style={{stroke:'var(--chart-threshold)'}} strokeDasharray="6 4"/><text x="660" y={y(threshold)-7} textAnchor="end" style={{fill:'var(--warning-text)'}}>{thresholdLabel} · {threshold} {unit}</text></g>}
      <path d={line} fill="none" style={{stroke:color}} strokeWidth="2.5" strokeDasharray={forecast?'6 4':undefined}/>
      {longWindow&&[.25,.5,.75].map(n=>{const date=new Date(t0+(t1-t0)*n).toISOString();return <g key={n}><line x1={52+612*n} x2={52+612*n} y1="36" y2="174" stroke="currentColor" opacity=".08"/><text className="interior-date" x={52+612*n} y="201" textAnchor="middle">{new Date(date).toLocaleDateString(undefined,{month:'short',year:'2-digit',timeZone:'UTC'})}</text></g>;})}
      {rows.map(p=><circle key={p.date} cx={x(p)} cy={y(p.value)} r={p.date===current.date?6:rows.length>100?2:4} style={{fill:color,stroke:'var(--surface-card)'}} strokeWidth={rows.length>100?.5:2} tabIndex="0" role="button" aria-label={`${p.label||p.date}: ${p.value.toFixed(2)} ${unit}`} onMouseEnter={()=>setActive(p.date)} onFocus={()=>setActive(p.date)} onClick={()=>setActive(p.date)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setActive(p.date);}}><title>{p.label||p.date}: {p.value.toFixed(2)} {unit}</title></circle>)}
      <text x="52" y="201">{rows[0].axisLabel||(longWindow?dated(rows[0].date):shortDate(rows[0].date))}</text><text x="664" y="201" textAnchor="end">{rows.at(-1).axisLabel||(longWindow?dated(rows.at(-1).date):shortDate(rows.at(-1).date))}</text>
    </svg>
    <div className="row spread muted"><span>{rows.length} available points</span><span>Range {min.toFixed(2)}–{max.toFixed(2)} {unit}</span></div>
    {note&&<p className="muted">{note}</p>}
    <details><summary>View values</summary><div className="table-scroll"><table><thead><tr><th>Date / period</th><th>{title} ({unit||'index'})</th></tr></thead><tbody>{rows.map(p=><tr key={p.date}><td>{p.label||p.date}</td><td>{p.value.toFixed(2)}</td></tr>)}</tbody></table></div></details>
  </section>;
}

export function FieldTrends({data,fieldName,history=[],onLoadHistory,historyBusy,historyProgress,initialVariable='ndvi'}) {
  const satellite=data?.satellite,eto=data?.eto,weather=data?.weather;
  const [variable,setVariable]=React.useState(initialVariable);
  const section=React.useRef(null);
  React.useEffect(()=>{if(initialVariable!=='ndvi'){section.current?.focus({preventScroll:true});section.current?.scrollIntoView({block:'start'});}},[initialVariable]);
  const [range,setRange]=React.useState('all');
  const series=historicalSeries(data,history);
  const choices={ndvi:{title:'Mean field NDVI',unit:'index',domain:[-1,1],maxGapDays:7,points:(satellite?.passes||[]).map(p=>({date:p.date,value:p.ndvi})),note:'Qualified satellite observations only. Clouds create gaps; no values are interpolated. Vine rows and inter-row vegetation are mixed at this scale.'},
    eto:{title:'Reference ET₀',unit:'mm/day',points:(eto?.records||[]).map(p=>({date:p.date,value:p.etoMm})),note:'Daily modeled reference grass ET₀ at the field query point. This is not actual vineyard evapotranspiration.'},
    temperature:{title:'Forecast temperature',unit:weather?.periods?.[0]?.temperatureUnit==='F'?'°F':'°C',forecast:true,points:(weather?.periods||[]).filter(p=>Date.parse(p.endTime)>Date.now()).map(p=>({date:p.startTime,value:p.temperature,label:`${p.name} · ${new Date(p.startTime).toLocaleString()}`})),note:'Day/night forecast periods, not observed temperature history. High/low periods naturally alternate.'},
    rain:{title:'Forecast rain probability',unit:'%',domain:[0,100],forecast:true,points:(weather?.periods||[]).filter(p=>Date.parse(p.endTime)>Date.now()).map(p=>({date:p.startTime,value:p.rainProbability,label:`${p.name} · ${new Date(p.startTime).toLocaleString()}`})),note:'Probability per forecast period, not rainfall amount. Unknown values remain missing.'}};
  choices.ndvi.points=series.ndvi;choices.eto.points=series.eto;choices.eto.maxGapDays=1.1;
  choices.precipitation={title:'Historical rainfall',unit:'mm/day',color:'var(--chart-rain)',maxGapDays:1.1,points:series.precipitation,note:'NASA POWER modeled precipitation at the representative point, not a rain gauge measurement within the field. Missing days remain gaps.'};
  const choice=choices[variable],points=choice.forecast?choice.points:filterHistory(choice.points,range);
  const source={ndvi:'satellite',eto:'eto',precipitation:'precipitation'}[variable];
  const loaded=history.filter(m=>m.payload?.[source]).length;
  const failures=history.filter(m=>m.payload?.errors?.[source]).map(m=>m.month);
  return <section className="panel" ref={section} tabIndex="-1"><p className="eyebrow">Field history and outlook</p><h2>Change over time</h2><p>{fieldName} · {history.length?'Two-year historical context and the latest forecast':'Available recent history and the latest forecast'}</p>
    {onLoadHistory&&<div className="history-loading"><div className="row spread"><span>Test archive · {HISTORY_START} – {new Date(Date.parse(HISTORY_END)-86400000).toISOString().slice(0,10)}</span><button disabled={historyBusy} onClick={onLoadHistory}>{historyBusy?'Loading…':history.length?'Resume / check history':'Load two-year history'}</button></div>{historyProgress&&<p role="status">{historyProgress}</p>}<p className="muted">Historical statistics only; map imagery remains the latest two qualified dates. Source gaps are preserved.</p></div>}
    <div className="layer-switch" aria-label="Time series variable">{['ndvi','eto','precipitation','temperature','rain'].map(key=><button key={key} aria-pressed={variable===key} onClick={()=>setVariable(key)}>{choices[key].title}</button>)}</div>
    {!choice.forecast&&<><div className="layer-switch" aria-label="History range">{Object.entries({'all':'Two years','365':'One year','90':'90 days','30':'30 days'}).map(([key,label])=><button key={key} aria-pressed={range===key} onClick={()=>setRange(key)}>{label}</button>)}</div><p className="muted">{history.length?`${loaded}/${historyMonths().length} archive months retrieved for this source. `:''}{points.length} valid observations in selected range.{failures.length?` Unavailable months: ${failures.join(', ')}.`:''}</p></>}
    <TimeSeries key={`${variable}-${range}`} {...choice} points={points}/>
    <p className="muted">Highs and lows are descriptive, not statistical anomalies. Two years can reveal seasonal patterns but do not establish a reliable long-term baseline. RGB and false-color layers are image views; their pixel colors are not scalar field-history measurements.</p>
  </section>;
}
