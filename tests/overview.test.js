import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyEto,seasonalNdvi,overviewForecast} from '../src/lib/overview.js';
const now=Date.parse('2026-09-18T06:00:00Z');
const eto=Array.from({length:14},(_,i)=>({date:`2026-09-${String(i+3).padStart(2,'0')}`,value:i<7?3:4}));
test('weekly headline sums consecutive valid days and compares an adjacent complete week',()=>{
 const w=weeklyEto(eto,now);assert.equal(w.total,28);assert.equal(w.previous,21);assert.equal(w.delta,7);assert.equal(w.start,'2026-09-10');assert.equal(w.end,'2026-09-16');
 assert.equal(weeklyEto(eto.filter(p=>p.date!=='2026-09-12'),now).total,null);
 assert.equal(weeklyEto(eto.slice(1),now).total,28);assert.equal(weeklyEto(eto.slice(1),now).delta,null);
 assert.equal(weeklyEto(eto,now+4*86400000).total,null);
 assert.equal(weeklyEto([...eto,{date:'2026-09-18',value:99}],now).total,28);
 assert.equal(weeklyEto([],now).total,null);
});
test('season overlay aligns calendar dates despite leap years and excludes future-season points',()=>{
 const s=seasonalNdvi([{date:'2024-03-01',value:.4},{date:'2023-03-01',value:.3},{date:'2024-09-25',value:.9},{date:'2023-10-01',value:.7}],Date.parse('2024-09-18'));
 assert.equal(s[0].points.length,1);assert.equal(s[1].points.length,1);assert.equal(s[0].points[0].seasonDay,s[1].points[0].seasonDay);
});
test('weather summary groups actual local forecast periods, drops expired ones, preserves unknown rain',()=>{
 const p=(day,rainProbability)=>({startTime:`2026-09-${day}T06:00:00-07:00`,endTime:`2026-09-${day}T18:00:00-07:00`,rainProbability});
 const days=overviewForecast({periods:[p('17',0),p('18',null),p('19',0),p('20',30),p('21',40)]},now);
 assert.deepEqual(days.map(d=>d.date),['2026-09-18','2026-09-19','2026-09-20']);assert.equal(days[0].periods[0].rainProbability,null);assert.equal(days[1].periods[0].rainProbability,0);
});
