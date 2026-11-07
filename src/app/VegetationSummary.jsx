import React from 'react';
import { currentComparison,comparisonLabel,comparisonReason } from '../lib/vegetation.js';
import { shortDate } from './TimeSeries.jsx';
export function VegetationSummary({data,onExplore}) {
  const passes=data?.satellite?.passes||[],latest=passes[0],pair=currentComparison(data),stats=pair?.stats;
  const comparable=pair?.status==='ready'&&stats?.comparable;
  const points=[...passes].reverse(),values=points.map(p=>p.ndvi);
  const lo=values.length?Math.max(-1,Math.min(...values)-.02):0,hi=values.length?Math.min(1,Math.max(...values)+.02):1;
  const start=Date.parse(points[0]?.date),end=Date.parse(points.at(-1)?.date);
  const x=p=>8+(end===start?0.5:(Date.parse(p.date)-start)/(end-start))*284;
  const y=p=>64-(p.ndvi-lo)/(hi-lo)*56;
  const line=points.map((p,i)=>`${i===0||Date.parse(p.date)-Date.parse(points[i-1].date)>7*86400000?'M':'L'}${x(p)},${y(p)}`).join(' ');
  return <div className="vegetation-summary"><div className="row spread"><h3>Vegetation observations</h3><span className="data-badge">Satellite, not a diagnosis</span></div>
    <div className="metrics"><div className="metric">Latest field NDVI<strong>{latest?.ndvi.toFixed(2)??'Unavailable'}</strong><span className="muted">{latest?`${latest.date.slice(0,10)} · ${Math.round(latest.validFraction*100)}% valid coverage`:'No qualified observation loaded.'}</span>
      {points.length>0&&<><svg viewBox="0 0 300 74" className="vegetation-spark" role="img" aria-label={`Recent NDVI trend, ${points.length} observations. Displayed axis ${lo.toFixed(2)} to ${hi.toFixed(2)}.`}><path d={line} fill="none" style={{stroke:'var(--chart-primary)'}} strokeWidth="2"/>{points.map(p=><circle key={p.date} cx={x(p)} cy={y(p)} r="3" style={{fill:'var(--chart-primary)'}}><title>{p.date.slice(0,10)} · NDVI {p.ndvi.toFixed(3)}</title></circle>)}</svg><span className="muted">{shortDate(points[0].date)} – {shortDate(points.at(-1).date)} · axis {lo.toFixed(2)}–{hi.toFixed(2)}</span></>}
    </div><div className="metric">Change on the same clear pixels<strong className="vegetation-change-title">{comparisonLabel(pair)}</strong>
      {comparable?<><span className="vegetation-delta">{stats.delta>=0?'+':''}{stats.delta.toFixed(4)} <small>NDVI units</small></span><p className="muted">{pair.beforeDate} → {pair.afterDate}<br/>Paired-area mean {stats.beforeMean.toFixed(4)} → {stats.afterMean.toFixed(4)}</p></>:<p className="muted">{comparisonReason(data)}</p>}
      {stats&&<div className="coverage-meter"><div className="row spread"><span>Comparable area</span><b>{Math.round(stats.coverage*100)}%</b></div><progress max="1" value={stats.coverage} aria-label="Jointly valid parcel coverage"/><span className="muted">{stats.pairedPixels} paired pixels · earlier {Math.round(stats.beforeCoverage*100)}% / later {Math.round(stats.afterCoverage*100)}% valid</span></div>}
    </div></div>
    <p className="muted">The trend uses each date’s available pixels on the statistics grid; the change uses only pixels clear on both dates on the image grid. Coverage and grid sampling can make their means differ. These are descriptive changes, not statistical anomalies or a water-stress diagnosis. Vine canopy, inter-row vegetation and soil are mixed.</p>
    <button className="primary" onClick={onExplore}>Compare image dates →</button>
  </div>;
}
