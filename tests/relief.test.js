import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {terrariumElevation,lngLatToPixel,pixelToLngLat,tilesForBounds,pointInRing,pixelSizeMeters,reliefStops,reliefColorExpression,sampleFieldElevations,RELIEF_LOW,RELIEF_HIGH,RELIEF_MIN_SPAN} from '../src/lib/relief.js';

const square=(w,s,e,n)=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});
const encode=elevation=>{const v=elevation+32768,r=Math.floor(v/256),g=Math.floor(v-r*256),b=Math.round((v-r*256-g)*256);return [r,g,b];};
// Synthetic 512 px terrarium tile whose elevation rises 1 m per 100 global pixels eastward.
const fakeTile=(z,x)=>{const size=512,data=new Uint8ClampedArray(size*size*4);for(let py=0;py<size;py++)for(let px=0;px<size;px++){const [r,g,b]=encode(((x*size+px)%100000)/100),i=(py*size+px)*4;data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;}return {width:size,height:size,data};};

test('terrarium pixels decode to metres',()=>{
 assert.equal(terrariumElevation(128,0,0),0);
 assert.equal(terrariumElevation(128,25,128),25.5);
 assert.equal(terrariumElevation(127,255,128),-0.5);
 for(const e of [-12.25,0,48.5,4207.75])assert.equal(terrariumElevation(...encode(e)),e);
});

test('pixel and lng/lat conversions round-trip at field scale',()=>{
 for(const [lon,lat] of [[-122.3285,38.401],[-116.58,32.09]]){
  const [gx,gy]=lngLatToPixel(lon,lat,16,512),[lon2,lat2]=pixelToLngLat(gx,gy,16,512);
  assert.ok(Math.abs(lon-lon2)<1e-9&&Math.abs(lat-lat2)<1e-9);
 }
 assert.deepEqual(tilesForBounds([-122.3300,38.4000,-122.3270,38.4020],16,512),[{x:10498,y:25185},{x:10499,y:25185},{x:10498,y:25186},{x:10499,y:25186}]);
});

test('pixel size tells the legend how fine the elevation actually is',()=>{
 assert.ok(Math.abs(pixelSizeMeters(38.4,16,512)-0.94)<0.01,'lidar zoom at Napa is ~1 m');
 assert.ok(Math.abs(pixelSizeMeters(32.09,13,512)-8.1)<0.1,'coarse fallback zoom is ~8 m');
});

test('point-in-polygon keeps samples inside the field ring',()=>{
 const ring=square(0,0,10,10).coordinates[0];
 assert.equal(pointInRing([5,5],ring),true);
 assert.equal(pointInRing([11,5],ring),false);
 assert.equal(pointInRing([5,-0.1],ring),false);
});

test('relief stops use the 5th–95th percentile of the field, never a sub-metre span',()=>{
 const values=Array.from({length:101},(_,i)=>20+i*0.1); // 20.0 .. 30.0 m
 const s=reliefStops(values);
 assert.equal(s.count,101);
 assert.ok(Math.abs(s.low-20.5)<1e-9&&Math.abs(s.mid-25)<1e-9&&Math.abs(s.high-29.5)<1e-9);
 assert.equal(s.flat,false);
 const flat=reliefStops(Array(50).fill(12.3));
 assert.equal(flat.flat,true,'the legend must say when the tint was stretched over a nearly flat field');
 assert.ok(flat.high-flat.low>=RELIEF_MIN_SPAN-1e-9,'a near-flat field must not stretch survey noise into full colour');
 assert.ok(flat.low<flat.mid&&flat.mid<flat.high);
 assert.equal(reliefStops([]),null);
});

test('relief colour expression is strictly ascending: blue low ground, clear middle, loam high ground',()=>{
 const expr=reliefColorExpression({low:23.8,mid:25.7,high:28.2});
 assert.deepEqual(expr.slice(0,3),['interpolate',['linear'],['elevation']]);
 const stops=expr.slice(3).filter((_,i)=>i%2===0),colors=expr.slice(3).filter((_,i)=>i%2===1);
 assert.deepEqual(stops,[23.8,25.7,28.2]);
 assert.deepEqual(colors,[RELIEF_LOW,'rgba(0,0,0,0)',RELIEF_HIGH]);
});

test('relief colours are the design-system water and loam tokens, translucent over imagery',()=>{
 const css=readFileSync(new URL('../src/styles/tokens/colors.css',import.meta.url),'utf8');
 const token=name=>css.match(new RegExp(`--${name}:\\s*#([0-9A-Fa-f]{6})`))[1].match(/../g).map(h=>parseInt(h,16)).join(',');
 const rgba=c=>/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(c);
 assert.equal(rgba(RELIEF_LOW).slice(1,4).join(','),token('blue-600'),'low ground is Horizon Blue — water and cold air collect there');
 assert.equal(rgba(RELIEF_HIGH).slice(1,4).join(','),token('stone-100'),'high ground is a Loam neutral — no health or alert meaning');
 for(const c of [RELIEF_LOW,RELIEF_HIGH])assert.ok(Number(rgba(c)[4])<=0.6);
});

test('field sampling reads the finest available zoom inside the polygon',async()=>{
 const field=square(-122.3300,38.4000,-122.3270,38.4020);
 const asked=[];
 const r=await sampleFieldElevations(field,{loadTile:async(z,x,y)=>{asked.push(z);return fakeTile(z,x);}});
 assert.equal(r.zoom,16);
 assert.ok(r.values.length>20000,'a ~5 ha field at ~1 m should yield tens of thousands of samples');
 const [w]=lngLatToPixel(-122.3300,38.4,16,512),[e]=lngLatToPixel(-122.3270,38.4,16,512);
 const min=Math.min(...r.values),max=Math.max(...r.values);
 assert.ok(Math.abs(min-(w%100000)/100)<0.02&&Math.abs(max-(e%100000)/100)<0.02,'samples span exactly the field, not the whole tile');
 assert.ok(asked.every(z=>z===16));
});

test('field sampling falls back to coarser zooms where lidar tiles 404',async()=>{
 const field=square(-116.5830,32.0880,-116.5790,32.0905);
 const r=await sampleFieldElevations(field,{loadTile:async(z,x)=>z>13?null:fakeTile(z,x)});
 assert.equal(r.zoom,13);
 assert.ok(r.values.length>0);
 assert.equal(await sampleFieldElevations(field,{loadTile:async()=>null}),null);
});

test('field sampling caps tile downloads and sample counts for large fields',async()=>{
 const big=square(-122.40,38.35,-122.30,38.45); // ~8.7 km x 11 km
 let loads=0;
 const r=await sampleFieldElevations(big,{loadTile:async(z,x)=>{loads++;return fakeTile(z,x);}});
 assert.ok(r.zoom<16);
 assert.ok(loads<=16,`loaded ${loads} tiles`);
 assert.ok(r.values.length<=250000);
});
