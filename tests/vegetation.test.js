import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {pairedStatistics,comparisonScript,comparisonRequest,parcelPixelMask} from '../supabase/functions/field-data/comparison.js';
import {currentComparison,comparisonLabel} from '../src/lib/vegetation.js';
test('nonrectangular coverage uses pixel centers inside the parcel, including cloudy parcel pixels',()=>{
 const boundary={type:'Polygon',coordinates:[[[0,0],[4,0],[0,4],[0,0]]]};
 const mask=parcelPixelMask(boundary,{bbox:[0,0,4,4],width:8,height:8});
 assert.equal(mask.reduce((sum,n)=>sum+n,0),28);
 const bands=[Array(64).fill(.3),Array(64).fill(.4),Array.from(mask),Array.from(mask),Array(64).fill(1)];
 assert.equal(pairedStatistics(bands).comparable,false);
 assert.equal(pairedStatistics(bands,mask).coverage,1);
 const inside=Array.from(mask.keys()).filter(i=>mask[i]);
 for(const i of inside.slice(0,7))bands[2][i]=0;
 assert.equal(pairedStatistics(bands,mask).coverage,.75);
 assert.equal(pairedStatistics(bands,mask).parcelPixels,28);
 assert.throws(()=>pairedStatistics(bands,new Uint8Array(1)));
});
test('paired means exclude clouds on either date and pixels outside geometry',()=>{
 const bands=[Array(30).fill(.3),Array(30).fill(.4),Array(30).fill(1),Array(30).fill(1),Array(30).fill(1)];
 for(let i=20;i<30;i++)bands[4][i]=0;
 for(let i=0;i<5;i++){bands[2][i]=0;bands[1][i]=.9;}
 const s=pairedStatistics(bands);assert.equal(s.parcelPixels,20);assert.equal(s.pairedPixels,15);assert.equal(s.coverage,.75);assert.ok(Math.abs(s.delta-.1)<1e-6);assert.equal(s.higherFraction,1);
 bands[3][5]=0;assert.equal(pairedStatistics(bands).delta,null);
});
test('insufficient joint coverage and nonfinite data never publish change',()=>{
 const bands=[Array(30).fill(0),Array(30).fill(.02),Array(30).fill(1),Array(30).fill(1),Array(30).fill(1)];
 assert.equal(pairedStatistics(bands).similarFraction,1);
 for(let i=0;i<13;i++)bands[0][i]=NaN;
 assert.equal(pairedStatistics(bands).comparable,false);
 assert.throws(()=>pairedStatistics(bands.slice(0,4)));
});
test('fusion script masks each date independently and preserves real zero NDVI',()=>{
 const ctx=vm.createContext({});vm.runInContext(comparisonScript('values'),ctx);
 const clear={dataMask:1,SCL:4,B04:.2,B08:.2};
 assert.deepEqual(Array.from(ctx.evaluatePixel({before:[clear],after:[{...clear,SCL:9}]})),[0,0,1,0,1]);
 assert.deepEqual(Array.from(ctx.evaluatePixel({before:[],after:[]})),[0,0,0,0,1]);
});
test('date comparison requests identical grids and rejects stale pairs',()=>{
 const field={boundary:{type:'Polygon',coordinates:[[[-122,38],[-121.999,38],[-121.999,38.001],[-122,38]]]}};
 const a=comparisonRequest(field,'2026-09-10','2026-09-15','values'),b=comparisonRequest(field,'2026-09-10','2026-09-15','difference');
 assert.deepEqual(a.input,b.input);assert.equal(a.output.width,b.output.width);assert.equal(a.input.data[0].id,'before');assert.equal(a.input.data[1].dataFilter.timeRange.from,'2026-09-15T00:00:00Z');
 const comparison={beforeDate:'2026-09-10',afterDate:'2026-09-15',status:'ready',stats:{comparable:true,delta:-.02}};
 const data={satellite:{passes:[{date:'2026-09-15'},{date:'2026-09-10'}]},comparison};
 assert.equal(currentComparison(data),comparison);assert.equal(comparisonLabel(comparison),'Mean NDVI lower');
 data.satellite.passes[0].date='2026-09-17';assert.equal(currentComparison(data),null);
});
test('Copernicus credit names the acquisition year and falls back without a date',async()=>{
 const {copernicusCredit}=await import('../src/lib/vegetation.js');
 assert.equal(copernicusCredit('2026-09-15T00:00:00Z'),'Contains modified Copernicus Sentinel data 2026');
 assert.equal(copernicusCredit('2025-12-31'),'Contains modified Copernicus Sentinel data 2025');
 assert.equal(copernicusCredit(undefined),'Contains modified Copernicus Sentinel data');
 assert.equal(copernicusCredit('not a date'),'Contains modified Copernicus Sentinel data');
});
