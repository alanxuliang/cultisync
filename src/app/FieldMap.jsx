import React from 'react';
import * as maplibregl from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import 'maplibre-gl/dist/maplibre-gl.css';
import { NAIP_SERVICE,NAIP_TILES,naipCatalogLabel,TERRAIN_SOURCE,TERRAIN_EXAGGERATION,TERRAIN_PITCH,TERRAIN_SKY,TERRAIN_HILLSHADE,TERRAIN_HILLSHADE_AERIAL } from '../lib/basemap.js';
import { cropQueryUrl,cropCandidates,publicBoundary,CROP_SOURCE_URL } from '../lib/publicFields.js';
import { sampleFieldElevations,reliefStops,reliefColorExpression,pixelSizeMeters } from '../lib/relief.js';

maplibregl.setWorkerUrl(mapWorkerUrl);

const TERRAIN_KEY='cs-map-terrain',RELIEF_KEY='cs-map-relief';
function readPref(key){try{return localStorage.getItem(key)==='on';}catch{return false;}}
function writePref(key,on){try{localStorage.setItem(key,on?'on':'off');}catch{}}
const ringBounds=ring=>ring.reduce((b,p)=>b.extend(p),new maplibregl.LngLatBounds());
function ensureDemSource(map,id){if(!map.getSource(id))map.addSource(id,TERRAIN_SOURCE);}
// Elevation layers sit together just above the (possibly hidden) NAIP layer, tint under shading, below field overlays and labels.
function stackElevationLayers(map,baseLabelIds){
  const stack=['terrain-relief','terrain-hillshade'].filter(id=>map.getLayer(id));
  if(!stack.length)return;
  const ids=map.getStyle().layers.map(l=>l.id);
  let before=map.getLayer('naip')?ids.slice(ids.indexOf('naip')+1).find(id=>!stack.includes(id)):baseLabelIds.find(id=>map.getLayer(id))||(map.getLayer('public-fields-fill')?'public-fields-fill':'field-fill');
  for(const id of [...stack].reverse()){map.moveLayer(id,before);before=id;}
}
function paintHillshade(map,aerial){
  if(!map.getLayer('terrain-hillshade'))return;
  for(const [key,value] of Object.entries(aerial?TERRAIN_HILLSHADE_AERIAL:TERRAIN_HILLSHADE))map.setPaintProperty('terrain-hillshade',key,value);
}
function groundCenter(map){const e=map.getTerrain()?map.queryTerrainElevation(map.getCenter()):0;if(e!=null)map.setCenterElevation(e);}

export default function FieldMap({ boundary, onBoundary, onEditingChange, initialBoundary, image, contextGeometry, contextValue, opacity=0.85, contextColor='#347f9b', compact=false }) {
  const container = React.useRef(null);
  const mapRef = React.useRef(null);
  const drawRef = React.useRef(null);
  const callback = React.useRef(onBoundary);
  callback.current = onBoundary;
  const boundaryRef = React.useRef(boundary);
  boundaryRef.current = boundary;
  const basemapRef = React.useRef('simple');
  const [ready,setReady] = React.useState(false);
  const [error,setError] = React.useState('');
  const [drawing,setDrawing] = React.useState(false);
  const [basemap,setBasemap]=React.useState('simple'),[labels,setLabels]=React.useState(true),[catalog,setCatalog]=React.useState('');
  const [terrain,setTerrainPref]=React.useState(()=>readPref(TERRAIN_KEY));
  const [relief,setReliefPref]=React.useState(()=>readPref(RELIEF_KEY)),[reliefStats,setReliefStats]=React.useState(null);
  basemapRef.current=basemap;
  const baseLabels=React.useRef([]),baseSky=React.useRef(undefined);
  const [candidates,setCandidates]=React.useState([]),[candidate,setCandidate]=React.useState(null),[searching,setSearching]=React.useState(false),[searchMessage,setSearchMessage]=React.useState(''),[editing,setEditing]=React.useState(false);
  const candidateRef=React.useRef([]),searchController=React.useRef(null),editId=React.useRef(null),editSource=React.useRef(null);
  const editOriginal=React.useRef('');
  candidateRef.current=candidates;
  // Terra Draw picks coordinates on a flat top-down map; 3D pauses while drawing or adjusting corners.
  const show3d=!compact&&terrain&&!drawing&&!editing;
  const pitchRef=React.useRef(0);
  pitchRef.current=show3d?TERRAIN_PITCH:0;
  function frame(bounds,{padding=50,maxZoom=18,duration=500}={}){
    const map=mapRef.current;if(!map)return;
    const terrainOn=!!map.getTerrain();
    // Camera animations keep the starting center elevation; settle onto the terrain under the new center.
    if(terrainOn)map.once('moveend',()=>{if(mapRef.current===map)groundCenter(map);});
    map.fitBounds(bounds,{padding,maxZoom,pitch:terrainOn?pitchRef.current:0,duration});
  }
  function toggleTerrain(){const next=!terrain;setTerrainPref(next);writePref(TERRAIN_KEY,next);}
  // The tint compares heights inside the field, so it needs a boundary; it yields to analysis imagery's own color ramp.
  const showRelief=!compact&&relief&&!!boundary&&!image?.url;
  function toggleRelief(){const next=!relief;setReliefPref(next);writePref(RELIEF_KEY,next);}
  function fitField(){if(boundary)frame(ringBounds(boundary.coordinates[0]));}
  React.useEffect(() => {
    setReady(false);
    let map;
    try {
      map = new maplibregl.Map({container:container.current,style:'https://tiles.openfreemap.org/styles/positron',center:[-122.35,38.42],zoom:11});
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
      map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');
      map.addControl(new maplibregl.FullscreenControl(),'top-right');
      map.on('error',event => setError(event.sourceId==='naip'?'Aerial imagery could not fully load. Switch to Simple map or try again later.':event.sourceId?.startsWith('terrain-')?'Terrain elevation could not fully load. Turn 3D terrain off or try again later.':'The map could not fully load. Check your connection; GeoJSON import remains available.'));
      map.once('style.load',() => {
        baseLabels.current=map.getStyle().layers.filter(l=>l.type==='symbol').map(l=>l.id);
        baseSky.current=map.getSky();
        map.addSource('field',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
        map.addLayer({id:'field-fill',type:'fill',source:'field',paint:{'fill-color':'#446c52','fill-opacity':0.25}});
        map.addLayer({id:'field-halo',type:'line',source:'field',paint:{'line-color':'#fff','line-width':7,'line-opacity':.9}});
        map.addLayer({id:'field-line',type:'line',source:'field',paint:{'line-color':'#285c62','line-width':3}});
        if (callback.current) {
          map.addSource('public-fields',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
          map.addLayer({id:'public-fields-fill',type:'fill',source:'public-fields',paint:{'fill-color':'#8b69b5','fill-opacity':0.18}},'field-fill');
          map.addLayer({id:'public-fields-line',type:'line',source:'public-fields',paint:{'line-color':'#75519e','line-width':2}},'field-fill');
          map.on('click','public-fields-fill',event=>{if(editId.current||drawRef.current?.getMode()==='polygon')return;const id=String(event.features?.[0]?.id);setCandidate(candidateRef.current.find(f=>f.id===id)||null);});
          const draw = new TerraDraw({adapter:new TerraDrawMapLibreGLAdapter({map}),modes:[new TerraDrawPolygonMode(),new TerraDrawSelectMode({flags:{polygon:{feature:{coordinates:{draggable:true,midpoints:true,deletable:true}}}}})]});
          draw.start();
          draw.on('finish',id => { if(editId.current)return;callback.current?.(draw.getSnapshotFeature(id).geometry); draw.setMode('static'); setDrawing(false); });
          drawRef.current = draw;
          if(initialBoundary)map.fitBounds(ringBounds(initialBoundary.coordinates[0]),{padding:80,maxZoom:16,duration:0});
        }
        setReady(true);
      });
    } catch { setError('This browser cannot display the map. Import a KML or GeoJSON boundary below.'); }
    return () => { searchController.current?.abort();drawRef.current?.stop(); drawRef.current=null; map?.remove(); mapRef.current=null; };
  }, []);
  React.useEffect(() => {
    const map=mapRef.current;
    if (!ready || !map?.getSource('field')) return;
    map.getSource('field').setData({type:'FeatureCollection',features:boundary ? [{type:'Feature',properties:{},geometry:boundary}] : []});
    if (boundary) frame(ringBounds(boundary.coordinates[0]));
  },[boundary,ready]);
  React.useEffect(()=>{const map=mapRef.current;if(!ready||!map?.getSource('public-fields'))return;map.getSource('public-fields').setData({type:'FeatureCollection',features:candidates});map.setPaintProperty('public-fields-fill','fill-opacity',['case',['==',['id'],candidate?.id||''],0.55,0.18]);},[candidates,candidate,ready]);
  React.useEffect(()=>{
    const map=mapRef.current;if(!ready||!map?.getSource('field'))return;
    if(basemap==='aerial'&&!map.getSource('naip')){
      map.addSource('naip',{type:'raster',tiles:[NAIP_TILES],tileSize:256,minzoom:7,maxzoom:19,attribution:'USGS / USDA NAIP · historical aerial imagery'});
      map.addLayer({id:'naip',type:'raster',source:'naip',paint:{'raster-fade-duration':0}},map.getLayer('public-fields-fill')?'public-fields-fill':'field-fill');
      baseLabels.current.forEach(id=>{if(map.getLayer(id))map.moveLayer(id,'field-fill');});
    }
    if(map.getLayer('naip')){
      map.setLayoutProperty('naip','visibility',basemap==='aerial'?'visible':'none');
      map.setPaintProperty('naip','raster-saturation',image?.url?-.65:0);
      map.setPaintProperty('naip','raster-brightness-min',image?.url?0.1:0);
    }
    baseLabels.current.forEach(id=>{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',labels?'visible':'none');});
    stackElevationLayers(map,baseLabels.current);paintHillshade(map,basemap==='aerial');
  },[ready,basemap,labels,image?.url]);
  React.useEffect(()=>{
    const map=mapRef.current;if(!ready||!map?.getSource('field'))return;
    const duration=drawing||editing?0:800;
    const refit=()=>{const current=boundaryRef.current;if(current)frame(ringBounds(current.coordinates[0]),{duration});else map.easeTo({pitch:map.getTerrain()?pitchRef.current:0,bearing:0,duration});};
    if(!show3d){
      if(!map.getTerrain())return;
      map.setTerrain(null);map.setCenterElevation(0);map.setSky(baseSky.current);
      if(map.getLayer('terrain-hillshade'))map.setLayoutProperty('terrain-hillshade','visibility','none');
      refit();return;
    }
    if(!map.getLayer('terrain-hillshade')){
      // Separate DEM sources for the terrain mesh and the drawn layers, as MapLibre recommends, so each keeps its own tile cache.
      ensureDemSource(map,'terrain-dem');ensureDemSource(map,'terrain-shade');
      map.addLayer({id:'terrain-hillshade',type:'hillshade',source:'terrain-shade',paint:TERRAIN_HILLSHADE});
      stackElevationLayers(map,baseLabels.current);paintHillshade(map,basemapRef.current==='aerial');
    }
    map.setLayoutProperty('terrain-hillshade','visibility','visible');
    map.setTerrain({source:'terrain-dem',exaggeration:TERRAIN_EXAGGERATION});map.setSky(TERRAIN_SKY);
    // Tilt once a rendered frame has the elevation tiles bound; querying right after setTerrain reads sea level.
    // Loading a tile always triggers a repaint, so 'render' sees the loaded state; 'idle' is the backstop.
    let live=true;
    const stop=()=>{live=false;map.off('render',tilt);map.off('idle',tilt);};
    const tilt=()=>{if(!live||!map.getTerrain()||!map.isSourceLoaded('terrain-dem'))return;stop();groundCenter(map);refit();};
    map.on('render',tilt);map.once('idle',tilt);map.triggerRepaint();
    return stop;
  },[ready,show3d]);
  React.useEffect(()=>{
    if(!showRelief){setReliefStats(null);return;}
    const controller=new AbortController();
    setReliefStats({loading:true});
    sampleFieldElevations(boundary,{signal:controller.signal})
      .then(r=>{if(controller.signal.aborted)return;const stops=r&&reliefStops(r.values);setReliefStats(stops?{...stops,zoom:r.zoom}:{error:'No elevation survey covers this field.'});})
      .catch(()=>{if(!controller.signal.aborted)setReliefStats({error:'Field elevation could not load. Turn the tint off or try again later.'});});
    return()=>controller.abort();
  },[showRelief,boundary]);
  React.useEffect(()=>{
    const map=mapRef.current;if(!ready||!map?.getSource('field'))return;
    if(!reliefStats?.count){if(map.getLayer('terrain-relief'))map.setLayoutProperty('terrain-relief','visibility','none');return;}
    if(map.getLayer('terrain-relief'))map.setPaintProperty('terrain-relief','color-relief-color',reliefColorExpression(reliefStats));
    else{ensureDemSource(map,'terrain-shade');map.addLayer({id:'terrain-relief',type:'color-relief',source:'terrain-shade',paint:{'color-relief-color':reliefColorExpression(reliefStats)}});stackElevationLayers(map,baseLabels.current);}
    map.setLayoutProperty('terrain-relief','visibility','visible');
  },[ready,reliefStats]);
  React.useEffect(()=>{
    if(basemap!=='aerial'||!boundary)return;
    const controller=new AbortController(),ring=boundary.coordinates[0];
    const longitude=(Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[0])))/2;
    const latitude=(Math.min(...ring.map(p=>p[1]))+Math.max(...ring.map(p=>p[1])))/2;
    const params=new URLSearchParams({f:'json',geometry:`${longitude},${latitude}`,geometryType:'esriGeometryPoint',inSR:'4326',where:'Category=1',outFields:'Year,resolution_value,resolution_units',returnGeometry:'false',orderByFields:'Year DESC',resultRecordCount:'50'});
    setCatalog('Checking the field-center imagery catalog…');
    fetch(`${NAIP_SERVICE}/query?${params}`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(r=>{if(!controller.signal.aborted)setCatalog(naipCatalogLabel(r));}).catch(()=>{if(!controller.signal.aborted)setCatalog('Capture year unavailable at the field center.');});
    return()=>controller.abort();
  },[basemap,boundary]);
  React.useEffect(()=>{
    const map=mapRef.current;
    if(!ready||!map?.getSource('field'))return;
    if(map.getLayer('observation-raster'))map.removeLayer('observation-raster');
    if(map.getSource('observation-raster'))map.removeSource('observation-raster');
    let decoded;
    if(image?.url&&image?.coordinates){
      map.addSource('observation-raster',{type:'image',coordinates:image.coordinates});
      map.addLayer({id:'observation-raster',type:'raster',source:'observation-raster',paint:{'raster-opacity':opacity,'raster-resampling':'nearest','raster-fade-duration':0}},'field-halo');
      // Decode as an image (img-src data:), not a fetch requiring a broader connect-src CSP.
      decoded=new Image();
      decoded.onload=()=>{if(mapRef.current===map)map.getSource('observation-raster')?.updateImage({image:decoded});};
      decoded.onerror=()=>setError('The satellite image could not be decoded. Try another layer.');
      decoded.src=image.url;
    }
    map.setPaintProperty('field-fill','fill-opacity',image?.url?0:0.08);
    return ()=>{if(decoded){decoded.onload=null;decoded.onerror=null;}if(mapRef.current!==map)return;if(map.getLayer('observation-raster'))map.removeLayer('observation-raster');if(map.getSource('observation-raster'))map.removeSource('observation-raster');};
  },[image?.url,image?.coordinates,ready]);
  React.useEffect(()=>{if(ready&&mapRef.current?.getLayer('observation-raster'))mapRef.current.setPaintProperty('observation-raster','raster-opacity',opacity);},[opacity,ready,image?.url]);
  React.useEffect(()=>{
    const map=mapRef.current;if(!ready||!map?.getSource('field'))return;
    for(const layer of ['context-label','context-point','context-fill','context-line'])if(map.getLayer(layer))map.removeLayer(layer);
    if(map.getSource('context'))map.removeSource('context');
    if(!contextGeometry)return;
    map.addSource('context',{type:'geojson',data:{type:'Feature',geometry:contextGeometry,properties:{label:contextValue||''}}});
    if(contextGeometry.type==='Point')map.addLayer({id:'context-point',type:'circle',source:'context',paint:{'circle-color':contextColor,'circle-radius':12,'circle-stroke-width':3,'circle-stroke-color':'white'}},'field-line');
    else {
      map.addLayer({id:'context-fill',type:'fill',source:'context',paint:{'fill-color':contextColor,'fill-opacity':0.2}},'field-fill');
      map.addLayer({id:'context-line',type:'line',source:'context',paint:{'line-color':contextColor,'line-width':2,'line-dasharray':[3,2]}},'field-line');
      frame(ringBounds([...contextGeometry.coordinates[0],...(boundary?boundary.coordinates[0]:[])]),{maxZoom:16});
    }
    map.addLayer({id:'context-label',type:'symbol',source:'context',layout:{'text-field':['get','label'],'text-size':15,'text-offset':[0,1.7],'text-allow-overlap':true},paint:{'text-color':'#172b2e','text-halo-color':'white','text-halo-width':2}});
  },[contextGeometry,contextValue,contextColor,ready]);
  function stopEdit(){editId.current=null;setEditing(false);onEditingChange?.(false);drawRef.current?.setMode('static');drawRef.current?.clear();}
  function begin() { stopEdit();setCandidate(null);setCandidates([]);callback.current(null); drawRef.current.setMode('polygon'); setDrawing(true); }
  function edit(){
    const draw=drawRef.current;draw.clear();const id=draw.getFeatureId();
    const coordinates=boundary.coordinates.map(r=>r.map(p=>p.map(v=>Number(v.toFixed(9)))));
    const result=draw.addFeatures([{type:'Feature',id,properties:{mode:'polygon'},geometry:{type:boundary.type,coordinates}}]);
    if(result.some(r=>!r.valid)){setError('This boundary cannot be edited. Draw a replacement instead.');return;}
    setError('');editOriginal.current=JSON.stringify(coordinates);editSource.current=boundary.cultisyncSource;editId.current=id;draw.setMode('select');draw.selectFeature(id);setEditing(true);onEditingChange?.(true);setCandidates([]);setCandidate(null);
  }
  function finishEdit(){const feature=drawRef.current.getSnapshotFeature(editId.current);if(feature&&JSON.stringify(feature.geometry.coordinates)!==editOriginal.current){callback.current({...feature.geometry,...(editSource.current?{cultisyncSource:{...editSource.current,edited:true}}:{})});}stopEdit();}
  async function searchFields(){
    const map=mapRef.current;if(map.getZoom()<14){setSearchMessage('Zoom closer to your vineyard, then search this map area (zoom 14 or closer).');return;}
    const b=map.getBounds();searchController.current?.abort();const controller=new AbortController();searchController.current=controller;setSearching(true);setSearchMessage('');setCandidate(null);setCandidates([]);
    try{const response=await fetch(cropQueryUrl([b.getWest(),b.getSouth(),b.getEast(),b.getNorth()]),{signal:controller.signal});if(!response.ok)throw Error('Public boundaries are unavailable. Retry or draw a boundary.');const data=await response.json();const results=cropCandidates(data);if(controller.signal.aborted)return;setCandidates(results);setSearchMessage(results.length?`${results.length} vineyard candidates · DWR / Land IQ, 2023 final.${results.length>=100||data.exceededTransferLimit?' Results limited; zoom in and search again.':''} Click a purple boundary or choose below.`:'No mapped vineyards found in this view. Pan and search again, or draw your boundary.');}catch(e){if(!controller.signal.aborted)setSearchMessage(e.message);}finally{if(!controller.signal.aborted)setSearching(false);}
  }
  function useCandidate(){stopEdit();setDrawing(false);callback.current(publicBoundary(candidate));setCandidates([]);setCandidate(null);setSearchMessage('Public boundary loaded. Review it against the aerial basemap before saving.');}
  return <div>
    {!compact&&<div className="row spread basemap-controls"><div className="layer-switch" aria-label="Basemap"><button type="button" disabled={!ready} aria-pressed={basemap==='simple'} onClick={()=>{setBasemap('simple');setError('');}}>Simple map</button><button type="button" disabled={!ready} aria-pressed={basemap==='aerial'} onClick={()=>{setBasemap('aerial');setError('');}}>Aerial · NAIP</button><button type="button" disabled={!ready} aria-pressed={labels} onClick={()=>setLabels(!labels)}>Labels {labels?'on':'off'}</button><button type="button" disabled={!ready||drawing||editing} aria-pressed={terrain} onClick={toggleTerrain}>3D terrain {terrain?'on':'off'}</button>{!image?.url&&<button type="button" disabled={!ready||!boundary} aria-pressed={relief} onClick={toggleRelief}>Low &amp; high ground {relief?'on':'off'}</button>}</div><button type="button" disabled={!ready||!boundary} onClick={fitField}>Return to field</button></div>}
    {onBoundary && <><div className="row"><button type="button" disabled={!ready||searching||drawing||editing} onClick={searchFields}>{searching?'Searching…':'Find public vineyard boundaries'}</button><button type="button" disabled={!ready||editing||searching} onClick={begin}>{drawing ? 'Restart drawing' : 'Draw field boundary'}</button>{drawing&&<button type="button" onClick={()=>{stopEdit();setDrawing(false);}}>Cancel drawing</button>}{boundary&&!drawing&&(editing?<button type="button" onClick={finishEdit}>Finish adjusting</button>:<button type="button" disabled={!ready||searching} onClick={edit}>Adjust corners</button>)}</div><p className="muted">{editing?`Drag a corner or midpoint, then finish adjusting.${terrain?' 3D terrain is paused while you adjust.':''}`:drawing?`Click corners, then the first point to finish.${terrain?' 3D terrain is paused while you draw.':''}`:'Find public boundaries sends this map area to California DWR’s ArcGIS service. Suggested 2023 vineyard boundaries need your review; wine-grape type and ownership are not verified.'}</p></>}
    <div ref={container} className="map" aria-label="Field boundary map" />
    {onBoundary&&<><p className="muted" role="status">{searchMessage}</p>{candidates.length>0&&<label>Suggested vineyard<select value={candidate?.id||''} onChange={e=>setCandidate(candidates.find(f=>f.id===e.target.value)||null)}><option value="">Select on the map or choose a field</option>{candidates.map(f=><option key={f.id} value={f.id}>{f.properties.COUNTY} · {f.properties.UniqueID} · {f.properties.areaHa.toFixed(2)} ha{f.issue?' · needs manual drawing':''}</option>)}</select></label>}{candidate&&<div className="notice"><strong>Suggested vineyard · {candidate.properties.areaHa.toFixed(2)} ha</strong><p><a href={CROP_SOURCE_URL} target="_blank" rel="noreferrer">DWR / Land IQ · 2023 final</a> · Field {candidate.properties.UniqueID} · {candidate.properties.COUNTY}. Historical crop mapping, not a surveyed property boundary. Verify current crop and exclude roads or buildings.</p>{candidate.issue?<p>{candidate.issue}</p>:<button type="button" onClick={useCandidate}>Use suggested boundary</button>}</div>}{boundary?.cultisyncSource?.provider==='DWR / Land IQ'&&<p className="muted">Boundary source: {boundary.cultisyncSource.provider} · {boundary.cultisyncSource.year} · field {boundary.cultisyncSource.id}{boundary.cultisyncSource.edited?' · adjusted by user':''}. Grape type unverified.</p>}</>}
    {basemap==='aerial'&&<p className="muted">USGS / USDA NAIP · historical aerial basemap, not current field conditions. {boundary?catalog:'Capture dates vary by location.'} Catalog dates can vary across the view.{image?.url?' Basemap is softened beneath the analysis layer; its resolution and date do not change the analysis data.':''}</p>}
    {showRelief&&reliefStats&&<div className="map-legend relief-legend">{reliefStats.loading?<p className="muted">Measuring ground height across this field…</p>:reliefStats.error?<p className="muted" role="status">{reliefStats.error}</p>:<>
      <div className="relief-gradient"/>
      <div className="row spread"><span>Lower · {reliefStats.low.toFixed(1)} m</span><span>{reliefStats.mid.toFixed(1)} m</span><span>Higher · {reliefStats.high.toFixed(1)} m</span></div>
      <p className="muted">Colors compare ground height inside this field only{reliefStats.flat?'. It is nearly flat (under 1 m across most of the field), so the tint is stretched across 1 m':`; most of the field spans ${(reliefStats.high-reliefStats.low).toFixed(1)} m`}. Lower ground can collect cold air and runoff; this shows terrain, not a frost or drainage forecast. Elevation detail here is about {Math.max(1,Math.round(pixelSizeMeters(boundary.coordinates[0][0][1],reliefStats.zoom,512)))} m, and surveys can be several years old.</p>
    </>}</div>}
    {show3d&&<p className="muted">3D terrain · relief exaggerated {TERRAIN_EXAGGERATION}×. Elevation detail is about 1 m where lidar surveys exist and coarser elsewhere, and surveys can be several years old, so read it for slope and aspect, not exact heights. Right-drag or two-finger drag to tilt and rotate; the compass resets the view.</p>}
    {error && <p role="status" className="muted">{error}</p>}
  </div>;
}
