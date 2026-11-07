import test from 'node:test';
import assert from 'node:assert/strict';
import {historyMonths,historyRange,HISTORY_START,HISTORY_END} from '../supabase/functions/field-data/history.js';
import {historicalSeries,filterHistory} from '../src/lib/history.js';
test('two-year month windows are contiguous, bounded, and calendar-correct',()=>{
 const months=historyMonths(),ranges=months.map(historyRange);
 assert.equal(months.length,25);assert.equal(ranges[0].from,HISTORY_START);assert.equal(ranges.at(-1).to,HISTORY_END);
 for(let i=1;i<ranges.length;i++)assert.equal(ranges[i-1].to,ranges[i].from);
 assert.equal(historyRange('2025-02').end,'2025-02-28');
 for(const month of ['2024-08','2026-10','2025-13','2025-1',null,{},''])assert.equal(historyRange(month),null);
});
test('archive merges by date, current values win, null rainfall remains missing',()=>{
 const months=[{payload:{satellite:{passes:[{date:'2025-01-01T00:00:00Z',ndvi:.3}]},precipitation:{records:[{date:'2025-01-01',rainMm:null},{date:'2025-01-02',rainMm:0}]}}}];
 const s=historicalSeries({satellite:{passes:[{date:'2025-01-01T00:00:00Z',ndvi:.4}]}},months);
 assert.deepEqual(s.ndvi,[{date:'2025-01-01',value:.4}]);assert.deepEqual(s.precipitation,[{date:'2025-01-02',value:0}]);assert.deepEqual(s.eto,[]);
});
test('history filters use calendar days and exclude future observations',()=>{
 const points=['2025-01-01','2026-08-18','2026-09-17','2026-09-19'].map(date=>({date,value:1}));
 assert.deepEqual(filterHistory(points,'30','2026-09-17T23:00:00Z').map(p=>p.date),['2026-08-18','2026-09-17']);
 assert.equal(filterHistory(points,'all','2026-09-17T00:00:00Z').length,3);
});
