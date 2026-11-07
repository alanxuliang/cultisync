import React from 'react';
import { fieldBundle,boundarySource,boundaryOutline,reportRows,bundleFileName,reportTitle } from '../lib/evidence.js';
import { currentComparison } from '../lib/vegetation.js';

export function FieldReport({field,snapshot,onClose}) {
  const [generatedAt]=React.useState(()=>new Date().toISOString());
  const [bundle,setBundle]=React.useState(null);
  React.useEffect(()=>{let active=true;fieldBundle(field,snapshot,generatedAt).then(b=>{if(active)setBundle(b);});return()=>{active=false;};},[field,snapshot,generatedAt]);
  React.useEffect(()=>{const previous=document.title;document.title=reportTitle(field.name,new Date(generatedAt));return()=>{document.title=previous;};},[field.name,generatedAt]);
  const fileName=bundleFileName(field.name,new Date(generatedAt));
  function download(){const href=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=href;a.download=fileName;a.click();URL.revokeObjectURL(href);}
  const imagery=snapshot?.imagery,pair=currentComparison(snapshot),outline=boundaryOutline(field.boundary);
  const centre=Number.isFinite(field.latitude)&&Number.isFinite(field.longitude)?` · weather and soil query point ${field.latitude.toFixed(5)}, ${field.longitude.toFixed(5)}`:'';
  const images=[['NDVI',imagery?.images?.ndvi,imagery?.date],['True color',imagery?.images?.rgb,imagery?.date],['False color',imagery?.images?.falseColor,imagery?.date],
    ['NDVI change',pair?.status==='ready'?pair.difference:null,pair?`${pair.beforeDate} → ${pair.afterDate}`:null]].filter(([,src])=>src);
  return <section className="panel field-report" aria-labelledby="report-title">
    <div className="row spread no-print"><button onClick={onClose}>← Back to field</button><div className="row"><button disabled={!bundle} onClick={download}>Download data bundle</button><button className="primary" disabled={!bundle} onClick={()=>window.print()}>Print or save as PDF</button></div></div>
    <p className="eyebrow">Field evidence report</p><h2 id="report-title">{field.name}</h2>
    <dl className="report-facts">
      <div><dt>Area</dt><dd>{field.area_ha.toFixed(2)} ha</dd></div>
      <div><dt>Boundary</dt><dd>{boundarySource(field.boundary)}. Supplied boundary, not a survey.</dd></div>
      {outline&&<div><dt>Boundary outline</dt><dd><svg className="report-outline" viewBox={outline.viewBox} role="img" aria-label={`Outline of the supplied boundary, ${outline.corners} corners`}><polygon points={outline.points}/></svg>
        <span className="muted">{outline.corners} corners · bounds W {outline.west.toFixed(5)}, S {outline.south.toFixed(5)}, E {outline.east.toFixed(5)}, N {outline.north.toFixed(5)}{centre}</span></dd></div>}
      <div><dt>Data last checked</dt><dd>{snapshot?.checkedAt||'Never'}</dd></div>
      <div><dt>Report generated (review date)</dt><dd>{generatedAt}</dd></div>
      <div><dt>SHA-256 of the bundle content</dt><dd className="report-hash">{bundle?.sha256||'Computing…'}</dd></div>
      <div><dt>Highest-quality copy</dt><dd>Download the data bundle {fileName} and keep it with this report</dd></div>
    </dl>
    <table className="report-table"><thead><tr><th scope="col">Observation</th><th scope="col">Value</th><th scope="col">Source</th><th scope="col">Retrieved</th></tr></thead>
      <tbody>{reportRows(snapshot).map(r=><tr key={r.label}><th scope="row">{r.label}</th><td>{r.value}</td><td data-label="Source">{r.source}</td><td data-label="Retrieved">{r.retrieved}</td></tr>)}</tbody></table>
    {Object.entries(snapshot?.errors||{}).map(([key,message])=><p className="notice error" key={key}>{message}</p>)}
    {images.length>0&&<div className="report-images">{images.map(([title,src,date])=><figure key={title}><img src={src} alt={`${title} view, ${date}`}/><figcaption>{title} · {date} · Copernicus Sentinel-2 L2A</figcaption></figure>)}</div>}
    <p className="muted">{imagery?`Contains modified Copernicus Sentinel data ${imagery.date.slice(0,4)}. `:''}Images are renderings of at most 256 pixels per side, clipped to the supplied boundary; pixels under cloud or outside the boundary are transparent. Missing observations are reported as unavailable, never as zero.</p>
    <p className="muted">To verify: compute SHA-256 over the UTF-8 bytes of the RFC 8785 (JCS) canonical JSON of the bundle's "content" member and compare it with the value above. Plain JSON serializers with sorted keys are not enough: JCS fixes how numbers and non-ASCII text are written.</p>
  </section>;
}
