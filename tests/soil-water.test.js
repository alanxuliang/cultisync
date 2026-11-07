import test from 'node:test';
import assert from 'node:assert/strict';
import { soilQuery,soilProfile,precipitationRecords } from '../supabase/functions/field-data/environment.js';
import { rootStorage,matchingWeek,weekTotals } from '../src/lib/soilWater.js';
const soil={horizons:[{topCm:0,bottomCm:61,awc:.15},{topCm:61,bottomCm:152,awc:.1}],restrictionCm:null};
const days=Array.from({length:7},(_,i)=>({date:`2026-09-${String(i+8).padStart(2,'0')}`,etoMm:4,rainMm:0}));
test('USDA soil integration uses layer thickness, restriction, and rejects missing coverage',()=>{
  assert.equal(rootStorage(soil,1).capacity,130.5);
  assert.equal(rootStorage({...soil,restrictionCm:50},1).capacity,75);
  assert.equal(rootStorage({...soil,restrictionCm:50},1).restricted,true);
  assert.equal(rootStorage(soil,2),null);
  assert.equal(rootStorage({horizons:[{topCm:10,bottomCm:100,awc:.1}]},1),null);
  assert.equal(rootStorage({horizons:[{topCm:0,bottomCm:100,awc:null}]},1),null);
  assert.equal(rootStorage({horizons:[{topCm:0,bottomCm:60,awc:.1},{topCm:50,bottomCm:100,awc:.1}]},1),null);
});
test('soil adapter retains dominant component and never silently fills missing water capacity',()=>{
  const result=soilProfile({Table:[['cokey','comppct_r','hzdept_r','hzdepb_r','awc_r','restriction_cm'],['a','85','0','100','',null],['b','3','0','100','.2',null]]});
  assert.equal(result.componentPercent,85);assert.equal(result.horizons[0].awc,null);assert.equal(rootStorage(result,1),null);
  assert.throws(()=>soilQuery('38.4; anything',-122));
  assert.ok(soilQuery(38.42,-122.35).includes('POINT(-122.35000 38.42000)'));
});
test('NASA nulls, fill values and units cannot turn into zero rain',()=>{
  const response={parameters:{PRECTOTCORR:{units:'mm/day'}},header:{fill_value:-999},properties:{parameter:{PRECTOTCORR:{20260901:0,20260902:-999,20260903:null,20260904:'',20260905:2.5}}}};
  assert.deepEqual(precipitationRecords(response).map(r=>r.rainMm),[0,null,null,null,2.5]);
  assert.deepEqual(precipitationRecords({...response,parameters:{PRECTOTCORR:{units:'in/day'}}}),[]);
});
test('matching week ends on last shared date and refuses internal gaps',()=>{
  const eto=[...days,{date:'2026-09-15',etoMm:4}];
  assert.equal(matchingWeek(eto,days).at(-1).date,'2026-09-14');
  assert.deepEqual(matchingWeek(eto,days.map((r,i)=>i===3?{...r,rainMm:null}:r)),[]);
  assert.deepEqual(matchingWeek(eto,[]),[]);
});
test('week totals sum one matched week and refuse anything shorter',()=>{
  const week=days.map((r,i)=>({...r,rainMm:i===2?3.5:0}));
  assert.deepEqual(weekTotals(week),{start:'2026-09-08',end:'2026-09-14',etoMm:28,rainMm:3.5});
  assert.equal(weekTotals(week.slice(1)),null);
  assert.equal(weekTotals([]),null);
  assert.equal(weekTotals(),null);
});
test('missing rainfall yields no totals rather than a dry week',()=>{
  const eto=days.map(r=>({date:r.date,etoMm:r.etoMm}));
  assert.equal(weekTotals(matchingWeek(eto,undefined)),null);
  assert.equal(weekTotals(matchingWeek(eto,days.map(r=>({...r,rainMm:null})))),null);
});
test('without a matched week both cards say so instead of calling one source pending',async()=>{
  const {weekLabels}=await import('../src/lib/soilWater.js');
  assert.deepEqual(weekLabels(null),{rain:'No matched week',eto:'No matched week',note:'Needs seven days with both rainfall and ET₀.'});
  assert.deepEqual(weekLabels({start:'2026-09-08',end:'2026-09-14',etoMm:28,rainMm:3.5}),{rain:'3.5 mm / week',eto:'28.0 mm / week',note:null});
});
