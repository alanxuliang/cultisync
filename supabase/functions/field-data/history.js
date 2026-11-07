// Explicitly authorized evaluation backfills; not a public-beta bulk API.
export const HISTORY_TEST_FIELD_ID='301b6f22-44cb-4ab8-bd85-9df18d681f3b';
export const HISTORY_FIELD_IDS=[HISTORY_TEST_FIELD_ID,'9fc961da-710d-4e0c-96e8-a13503fc43e8'];
export const HISTORY_START='2024-09-18';
export const HISTORY_END='2026-09-18'; // exclusive UTC date
export function historyMonths() {
  const months=[];
  for(let d=new Date(HISTORY_START.slice(0,7)+'-01T00:00:00Z');d<new Date(HISTORY_END);d.setUTCMonth(d.getUTCMonth()+1))months.push(d.toISOString().slice(0,7));
  return months;
}
export function historyRange(month) {
  if(!historyMonths().includes(month))return null;
  const next=new Date(month+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
  const from=month+'-01'>HISTORY_START?month+'-01':HISTORY_START;
  const to=next.toISOString().slice(0,10)<HISTORY_END?next.toISOString().slice(0,10):HISTORY_END;
  return {from,to,end:new Date(Date.parse(to)-86400000).toISOString().slice(0,10)};
}
