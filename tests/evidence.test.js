import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson,sha256Hex,fieldBundle,boundarySource,boundaryOutline,reportRows,bundleFileName,reportTitle,BUNDLE_FORMAT } from '../src/lib/evidence.js';
test('canonical JSON sorts keys at every level and drops undefined members',()=>{
  assert.equal(canonicalJson({b:1,a:{d:[3,{z:1,y:2}],c:null},u:undefined}),'{"a":{"c":null,"d":[3,{"y":2,"z":1}]},"b":1}');
  assert.equal(canonicalJson([undefined,'x']),'[null,"x"]');
});
test('canonical JSON follows the RFC 8785 number and string form',()=>{
  assert.equal(canonicalJson({b:0.00004321,a:'Bloque Ñ',c:1e21,d:-0}),'{"a":"Bloque Ñ","b":0.00004321,"c":1e+21,"d":0}');
});
test('sha256 matches the standard test vector',async()=>{
  assert.equal(await sha256Hex('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('bundle hash can be recomputed from its content',async()=>{
  const field={id:'x',name:'Block 7',area_ha:3.88,latitude:38.421,longitude:-122.349,boundary:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]},owner_id:'secret'};
  const bundle=await fieldBundle(field,{checkedAt:'2026-12-01T00:00:00Z'},'2026-12-02T00:00:00Z');
  assert.equal(bundle.format,BUNDLE_FORMAT);
  assert.deepEqual(Object.keys(bundle.content.field).sort(),['area_ha','boundary','name','queryPoint']);
  assert.deepEqual(bundle.content.field.queryPoint,{latitude:38.421,longitude:-122.349,method:'PostGIS ST_PointOnSurface of the boundary'});
  const noPoint=await fieldBundle({...field,latitude:undefined,longitude:null},null,'t');
  assert.deepEqual(Object.keys(noPoint.content.field).sort(),['area_ha','boundary','name']);
  assert.equal(bundle.sha256,await sha256Hex(canonicalJson(bundle.content)));
  assert.equal(bundle.hashOf,'SHA-256 (hex) of the UTF-8 bytes of the RFC 8785 JSON Canonicalization Scheme (JCS) form of "content"');
});
test('a downloaded bundle re-hashes to its recorded digest after a JSON round trip',async()=>{
  const field={name:'Bloque Ñ',area_ha:1.5,boundary:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}};
  const bundle=await fieldBundle(field,{checkedAt:'t',comparison:{stats:{lowerFraction:0.00004321}},note:undefined},'2026-12-02T00:00:00Z');
  const parsed=JSON.parse(JSON.stringify(bundle,null,2));
  assert.equal(parsed.content.field.name,'Bloque Ñ');
  assert.equal(await sha256Hex(canonicalJson(parsed.content)),bundle.sha256);
});
test('the bundle leaves out the transient cached flag before hashing',async()=>{
  const field={name:'B',area_ha:1,boundary:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}};
  const base={checkedAt:'t',eto:{records:[]}};
  const withFlag=await fieldBundle(field,{...base,cached:true},'g'),without=await fieldBundle(field,base,'g');
  assert.equal(withFlag.sha256,without.sha256);
  assert.equal('cached' in withFlag.content.snapshot,false);
  assert.equal((await fieldBundle(field,null,'g')).content.snapshot,null);
});
test('boundary source names every origin, including old fields without a marker',()=>{
  assert.equal(boundarySource({type:'Polygon'}),'Not recorded (saved before boundary sources were recorded)');
  assert.equal(boundarySource({cultisyncSource:{provider:'user-drawn'}}),'Drawn by the user');
  assert.equal(boundarySource({cultisyncSource:{provider:'imported-kml'}}),'Imported KML');
  assert.equal(boundarySource({cultisyncSource:{provider:'imported-geojson'}}),'Imported GeoJSON');
  assert.equal(boundarySource({cultisyncSource:{provider:'DWR / Land IQ',year:2023,id:'2802295',edited:true}}),'DWR / Land IQ 2023 crop map, field 2802295, adjusted by user');
  assert.equal(boundarySource({cultisyncSource:{provider:'imported-kml',edited:true}}),'Imported KML, adjusted by user');
  assert.equal(boundarySource({cultisyncSource:{provider:'user-drawn',edited:true}}),'Drawn by the user, adjusted by user');
  assert.equal(boundarySource({cultisyncSource:{provider:'imported-geojson',edited:false}}),'Imported GeoJSON');
});
test('boundary outline projects a ring north-up with longitude scaled by latitude',()=>{
  const ring=[[-121,38],[-120.99,38],[-120.99,38.01],[-121,38.01],[-121,38]];
  const o=boundaryOutline({type:'Polygon',coordinates:[ring]});
  assert.equal(o.corners,4);
  assert.deepEqual([o.west,o.south,o.east,o.north],[-121,38,-120.99,38.01]);
  const [x0,y0,w,h]=o.viewBox.split(' ').map(Number);
  assert.equal(x0,0);assert.equal(y0,0);
  const pts=o.points.split(' ').map(p=>p.split(',').map(Number));
  assert.equal(pts.length,5);
  for(const [x,y] of pts){assert.ok(x>0&&x<w&&y>0&&y<h,`${x},${y} inside ${o.viewBox}`);}
  assert.ok(w<h,'0.01 degrees of longitude is narrower than 0.01 degrees of latitude');
  assert.ok(Math.abs(w/h-Math.cos(38.005*Math.PI/180))<.15);
  assert.ok(pts[3][1]<pts[0][1],'north is up: the northern corners have smaller y');
  assert.equal(boundaryOutline(null),null);
  assert.equal(boundaryOutline({type:'Polygon',coordinates:[[[0,0],[0,0],[0,0],[0,0]]]}),null);
});
test('an empty snapshot reports every row as unavailable',()=>{
  const rows=reportRows(null);
  assert.equal(rows.length,7);
  for(const r of rows){assert.equal(r.source,'—');assert.equal(r.retrieved,'—');}
  assert.ok(rows.filter(r=>r.label!=='Before/after comparison').every(r=>r.value==='Unavailable'));
});
test('report rows carry values, sources and the refusal reason',()=>{
  const snapshot={
    satellite:{source:'Copernicus Sentinel-2 / CDSE',windowDays:30,fetchedAt:'2026-09-16T00:00:00Z',passes:[{date:'2026-09-15T00:00:00Z',ndvi:.4123,validFraction:.92,validPixels:300,clear:true}]},
    eto:{source:'California DWR / Spatial CIMIS',fetchedAt:'2026-09-16T01:00:00Z',records:[{date:'2026-09-15',etoMm:4.21,quality:'unflagged'}]},
    soil:{component:'Bale',componentPercent:85,mapUnit:'Bale clay loam',source:'USDA NRCS / SSURGO',fetchedAt:'2026-09-01T00:00:00Z'},
  };
  const rows=Object.fromEntries(reportRows(snapshot).map(r=>[r.label,r]));
  assert.equal(rows['Sentinel-2 NDVI'].value,'1 clear observation in 30 days; latest 2026-09-15, mean NDVI 0.412, 92% of parcel pixels clear');
  assert.equal(rows['Sentinel-2 NDVI'].source,'Copernicus Sentinel-2 / CDSE');
  assert.equal(rows['Before/after comparison'].value,'Not compared: Two qualified observation dates are needed.');
  assert.equal(rows['Reference ET₀, latest day'].value,'4.2 mm on 2026-09-15');
  assert.equal(rows['Rainfall and ET₀, latest matched week'].value,'Unavailable');
  assert.equal(rows['Mapped soil'].value,'Bale, 85% of Bale clay loam');
});
test('a ready comparison reports dates, direction, change and coverage',()=>{
  const snapshot={satellite:{source:'S2',windowDays:30,fetchedAt:'t',passes:[{date:'2026-09-15T00:00:00Z',ndvi:.42,validFraction:1},{date:'2026-09-10T00:00:00Z',ndvi:.41,validFraction:1}]},
    comparison:{beforeDate:'2026-09-10',afterDate:'2026-09-15',status:'ready',stats:{comparable:true,delta:.0132,coverage:1},difference:'data:image/png;base64,x',source:'Copernicus Sentinel-2 L2A / CDSE',fetchedAt:'2026-09-16T00:00:00Z'}};
  const row=reportRows(snapshot).find(r=>r.label==='Before/after comparison');
  assert.equal(row.value,'2026-09-10 → 2026-09-15: Mean NDVI higher, mean change +0.013, 100% of parcel jointly clear');
});
test('the matched week reports value, both sources and both retrieval times',()=>{
  const dates=Array.from({length:7},(_,i)=>`2026-09-${String(9+i).padStart(2,'0')}`);
  const snapshot={eto:{source:'DWR ET',fetchedAt:'2026-09-16T01:00:00Z',records:dates.map(date=>({date,etoMm:4}))},
    precipitation:{source:'PRISM rain',fetchedAt:'2026-09-16T02:00:00Z',records:dates.map(date=>({date,rainMm:1}))}};
  const row=reportRows(snapshot).find(r=>r.label==='Rainfall and ET₀, latest matched week');
  assert.equal(row.value,'2026-09-09 to 2026-09-15: rainfall 7.0 mm, ET₀ 28.0 mm');
  assert.equal(row.source,'PRISM rain · DWR ET');
  assert.equal(row.retrieved,'2026-09-16T02:00:00Z · 2026-09-16T01:00:00Z');
});
test('image views are named for people, in a fixed order, with unavailable views listed',()=>{
  const imagery={date:'2026-10-15',images:{rgb:'a',ndvi:'b',falseColor:'c'},unavailable:[],pixelSizeM:10,source:'S2',fetchedAt:'t'};
  const row=s=>reportRows(s).find(r=>r.label==='Image views').value;
  assert.equal(row({imagery}),'2026-10-15: NDVI, true color, false color; 10 m pixels');
  assert.equal(row({imagery:{...imagery,images:{rgb:'a',ndvi:'b'},unavailable:['falseColor']}}),'2026-10-15: NDVI, true color; unavailable: false color; 10 m pixels');
});
test('bundle file name and report title use the local calendar date',()=>{
  const evening=new Date(2026,9,25,19,49);
  assert.equal(bundleFileName('Acceptance test — synthetic boundary',evening),'cultisync-acceptance-test-synthetic-boundary-2026-10-25.json');
  assert.equal(bundleFileName('Ñ',evening),'cultisync-field-2026-10-25.json');
  assert.equal(reportTitle('Block 7',evening),'CultiSync evidence report - Block 7 - 2026-10-25');
});
