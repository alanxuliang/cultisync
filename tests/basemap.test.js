import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {naipCatalogLabel,NAIP_TILES,TERRAIN_TILES,TERRAIN_SOURCE,TERRAIN_PITCH,TERRAIN_EXAGGERATION,TERRAIN_HILLSHADE,TERRAIN_HILLSHADE_AERIAL} from '../src/lib/basemap.js';
test('NAIP date labels use catalog acquisition year, never service copyright date',()=>{
 const features=[{attributes:{Year:2021,resolution_value:1,resolution_units:'METER'}},{attributes:{Year:2023,resolution_value:.6,resolution_units:'METER'}}];
 assert.equal(naipCatalogLabel({features}),'Latest catalog year at field center: 2023 · 0.6 m source resolution.');
 assert.equal(naipCatalogLabel({error:{message:'unavailable'}}),'Capture year unavailable at the field center.');
 assert.doesNotMatch(naipCatalogLabel({features:[{attributes:{Year:2023,resolution_value:2,resolution_units:'FEET'}}]}),/m source resolution/);
 assert.match(NAIP_TILES,/bbox=\{bbox-epsg-3857\}/);
 assert.match(NAIP_TILES,/NaturalColor/);
});
test('3D terrain uses keyless Mapterhorn Terrarium tiles within MapLibre camera limits',()=>{
 assert.equal(TERRAIN_SOURCE.type,'raster-dem');
 assert.equal(TERRAIN_SOURCE.encoding,'terrarium');
 assert.equal(TERRAIN_SOURCE.tileSize,512,'Mapterhorn serves 512 px tiles; 256 would misplace every elevation sample');
 assert.equal(TERRAIN_SOURCE.maxzoom,16,'z16 at 512 px is ~1 m, the USGS 3DEP lidar resolution');
 assert.deepEqual(TERRAIN_SOURCE.tiles,[TERRAIN_TILES]);
 assert.match(TERRAIN_TILES,/^https:\/\/tiles\.mapterhorn\.com\/\{z\}\/\{x\}\/\{y\}\.webp$/);
 assert.match(TERRAIN_SOURCE.attribution,/href="https:\/\/mapterhorn\.com\/attribution">© Mapterhorn</,'credit links to the page that lists USGS 3DEP and the other sources');
 assert.ok(TERRAIN_PITCH>0&&TERRAIN_PITCH<=60,'MapLibre default maxPitch is 60');
 assert.ok(TERRAIN_EXAGGERATION>=1&&TERRAIN_EXAGGERATION<=2,'relief should read as real, not dramatized');
});
test('aerial relief shading is a faint overlay that leaves flat ground untouched',()=>{
 assert.deepEqual(Object.keys(TERRAIN_HILLSHADE_AERIAL).sort(),Object.keys(TERRAIN_HILLSHADE).sort(),'switching basemaps must reset every hillshade property');
 assert.equal(TERRAIN_HILLSHADE_AERIAL['hillshade-method'],'igor','igor shading fades to transparent on flat ground');
 const alpha=c=>{const m=/^rgba\(([^)]+)\)$/.exec(c);assert.ok(m,`${c} must be rgba so the imagery shows through`);return Number(m[1].split(',')[3]);};
 for(const key of ['hillshade-shadow-color','hillshade-highlight-color','hillshade-accent-color'])assert.ok(alpha(TERRAIN_HILLSHADE_AERIAL[key])<=0.5,`${key} must stay translucent over the aerial image`);
});
test('production CSP allows the terrain tile origin (the dev server does not apply _headers)',()=>{
 const csp=readFileSync(new URL('../public/_headers',import.meta.url),'utf8').match(/Content-Security-Policy: (.*)/)[1];
 const sources=name=>csp.split(';').map(s=>s.trim().split(/\s+/)).find(([d])=>d===name).slice(1);
 const origin=new URL(TERRAIN_TILES.replace(/\{[xyz]\}/g,'0')).origin;
 assert.ok(sources('connect-src').includes(origin),`connect-src must include ${origin}`);
 assert.ok(sources('img-src').includes(origin),`img-src must include ${origin}`);
 assert.doesNotMatch(csp,/elevation-tiles-prod/,'retired terrain host should leave the CSP');
});
