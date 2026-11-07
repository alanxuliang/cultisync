import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { cimisRecords, satellitePasses, forecastPeriods, evalscript } from '../supabase/functions/field-data/parsers.js';

test('CIMIS missing or imperial values never become zero mm',()=>{
  const record=(Value,Unit='(mm)')=>({Date:'2026-09-16',DayAsceEto:{Value,Unit}});
  assert.deepEqual(cimisRecords({Data:{Providers:[{Records:[record(null),record(''),record('bad'),record('1','(in)'),record('0'),record('4.2')]}]}}).map(r=>r.etoMm),[0,4.2]);
});
test('NDVI uses parcel footprint rather than rectangular bbox',()=>{
  const band = stats => ({bands:{B0:{stats}}});
  const pass={interval:{from:'2026-09-16'},outputs:{ndvi:band({sampleCount:100,noDataCount:64,mean:.5}),footprint:band({sampleCount:100,noDataCount:40})}};
  assert.equal(satellitePasses({data:[pass]})[0].validFraction,.6);
  pass.outputs.ndvi.bands.B0.stats.noDataCount=65;
  assert.equal(satellitePasses({data:[pass]}).length,0);
  pass.outputs.ndvi.bands.B0.stats={sampleCount:100,noDataCount:90,mean:.5};
  pass.outputs.footprint.bands.B0.stats.noDataCount=90;
  assert.equal(satellitePasses({data:[pass]}).length,0);
});
test('evalscript excludes clouds, shadows and undefined NDVI but preserves footprint',()=>{
  const ctx={};vm.createContext(ctx);vm.runInContext(evalscript,ctx);
  for(const SCL of [0,1,2,3,8,9,10,11]) assert.equal(ctx.evaluatePixel({B08:.6,B04:.2,dataMask:1,SCL}).dataMask[0],0);
  assert.equal(ctx.evaluatePixel({B08:.6,B04:.2,dataMask:1,SCL:4}).ndvi[0],.49999999999999994);
  assert.equal(ctx.evaluatePixel({B08:0,B04:0,dataMask:1,SCL:4}).dataMask[0],0);
  assert.equal(ctx.evaluatePixel({B08:.6,B04:.2,dataMask:1,SCL:9}).dataMask[1],1);
});
test('forecast drops expired periods and preserves unknown rain probability',()=>{
  const periods=[{endTime:'2026-01-01',startTime:'2025-12-31'},{endTime:'2027-01-01',startTime:'2026-12-31',probabilityOfPrecipitation:{value:null}}];
  const parsed=forecastPeriods({properties:{periods}},Date.parse('2026-09-17'));
  assert.equal(parsed.length,1);assert.equal(parsed[0].rainProbability,null);
});
