import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { rasterBounds,imageRequest,imageScript } from '../supabase/functions/field-data/imagery.js';
const boundary={type:'Polygon',coordinates:[[[-122.351,38.419],[-122.349,38.419],[-122.349,38.421],[-122.351,38.421],[-122.351,38.419]]]};
test('imagery request preserves geometry and acquisition day, never exceeds bounded image dimensions',()=>{
 const b=rasterBounds(boundary);assert.deepEqual(b.coordinates,[[-122.351,38.421],[-122.349,38.421],[-122.349,38.419],[-122.351,38.419]]);
 assert.ok(b.width<=256&&b.height<=256&&b.pixelSizeM>=10);
 const r=imageRequest({boundary},'2026-09-15T00:00:00Z','rgb');
 assert.deepEqual(r.input.bounds.geometry,boundary);assert.equal(r.input.data[0].dataFilter.timeRange.to,'2026-09-15T23:59:59Z');
 assert.equal(r.output.responses[0].format.type,'image/png');
 assert.throws(()=>imageScript('injected'));
});
test('all image views mask cloud, nodata and undefined NDVI pixels',()=>{
 for(const view of ['rgb','falseColor','ndvi']){
  const context={colorBlend:()=>[.1,.2,.3]};vm.createContext(context);vm.runInContext(imageScript(view),context);
  for(const SCL of [0,1,2,3,8,9,10,11])assert.equal(context.evaluatePixel({B08:.6,B04:.2,SCL,dataMask:1})[3],0);
  assert.equal(context.evaluatePixel({B08:.6,B04:.2,B03:.15,B02:.1,SCL:4,dataMask:1})[3],1);
  assert.equal(context.evaluatePixel({B08:0,B04:0,SCL:4,dataMask:1})[3],0);
 }
});
