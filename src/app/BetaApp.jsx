import React from 'react';
import { Link } from 'react-router-dom';
import { supabase, POLICY_VERSION } from '../lib/supabase.js';
import { AuthGate } from './AuthGate.jsx';
import { LiveWater, dateTime } from './LiveWater.jsx';
import { FieldOverview } from './FieldOverview.jsx';
import { HISTORY_FIELD_IDS,historyMonths } from '../lib/history.js';
import { boundaryIssue } from '../lib/publicFields.js';
import { importBoundaryText } from '../lib/boundaryImport.js';
import { boundarySource } from '../lib/evidence.js';
import { FieldReport } from './FieldReport.jsx';
import logoMarkUrl from '../assets/logo-mark.svg';
import './beta.css';
const FieldMap = React.lazy(() => import('./FieldMap.jsx'));
const FieldExplorer = React.lazy(() => import('./FieldExplorer.jsx'));

function Consent({session,onAccepted}) {
  const [terms,setTerms]=React.useState(false),[location,setLocation]=React.useState(false),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  async function accept(e) { e.preventDefault(); setBusy(true); const {error}=await supabase.from('profiles').insert({id:session.user.id,terms_version:POLICY_VERSION,location_service_consent:true}); setBusy(false); if(error)setError(error.message?.includes('at capacity')?'CultiSync has reached its account limit for now, so new accounts cannot be set up. Contact support@cultisync.com.':'Could not save your consent. Please retry.'); else onAccepted(); }
  return <section className="panel"><h1>Before you map your vineyard</h1><p>This free Beta supports California wine-grape fields. Data can be delayed, incomplete or inaccurate.</p><form onSubmit={accept}>
    <label className="check"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/><span>I am at least 18 and accept the <Link to="/terms" target="_blank">Beta terms</Link> and have read the <Link to="/privacy" target="_blank">Privacy notice</Link>.</span></label>
    <label className="check"><input type="checkbox" checked={location} onChange={e=>setLocation(e.target.checked)}/><span>I authorize storage and processing of the precise field boundaries I provide, solely to deliver this service. I have permission to use these boundaries. I can delete fields and their caches at any time.</span></label>
    <button className="primary" disabled={!terms||!location||busy}>Accept and continue</button>{error&&<p role="alert">{error}</p>}
  </form></section>;
}
function AddField({onSaved,initialBoundary}) {
  const [editing,setEditing]=React.useState(false);
  const [name,setName]=React.useState(''),[boundary,setBoundary]=React.useState(null),[geojson,setGeojson]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  function importText(text) { try { setBoundary(importBoundaryText(text));setError(''); } catch(e) { setError(e.message); } }
  async function importFile(e) { const file=e.target.files?.[0]; if(!file)return; if(file.size>200000){setError('Boundary files must be smaller than 200 KB. KMZ files are not supported; export KML instead.');return;} const text=await file.text(); e.target.value=''; importText(text); }
  function chooseBoundary(g){setBoundary(g&&!g.cultisyncSource?{...g,cultisyncSource:{provider:'user-drawn'}}:g);setError('');if(g?.cultisyncSource?.provider==='DWR / Land IQ'&&!name.trim())setName(`DWR ${g.cultisyncSource.year} vineyard ${g.cultisyncSource.id} — evaluation`);}
  async function save(e) {e.preventDefault();if(editing)return;const issue=boundaryIssue(boundary);if(issue){setError(issue);return;}setBusy(true);setError(''); const {data,error}=await supabase.from('fields').insert({name:name.trim(),boundary}).select().single();setBusy(false);if(error)setError(error.message);else {setName('');setBoundary(null);onSaved(data);} }
  return <section className="panel"><h2>Add a vineyard field</h2><p className="muted">Up to 3 fields · 0.1–100 hectares each · Wine grapes only</p><form onSubmit={save}>
    <label>Field name<input value={name} maxLength={80} required onChange={e=>setName(e.target.value)}/></label>
    <React.Suspense fallback={<p>Loading map…</p>}><FieldMap boundary={boundary} onBoundary={chooseBoundary} initialBoundary={initialBoundary} onEditingChange={setEditing}/></React.Suspense>
    <details><summary>Import a KML or GeoJSON boundary instead</summary>
      <label>KML or GeoJSON file<input type="file" disabled={editing} accept=".kml,.geojson,.json,application/vnd.google-earth.kml+xml,application/geo+json,application/json" onChange={importFile}/></label>
      <label>Or paste KML or GeoJSON<textarea rows={5} value={geojson} onChange={e=>setGeojson(e.target.value)}/></label>
      <button type="button" disabled={editing} onClick={()=>importText(geojson)}>Use this boundary</button></details>
    {boundary&&<p role="status">Boundary ready. Exact area will be calculated when you save.</p>}
    <button className="primary" style={{marginTop:20}} disabled={!boundary||!name.trim()||busy||editing}>{busy?'Saving…':'Save field'}</button>{error&&<p className="notice error" role="alert">{error}</p>}
  </form></section>;
}
function Workspace({session}) {
  const [profile,setProfile]=React.useState(undefined),[fields,setFields]=React.useState([]),[selected,setSelected]=React.useState(''),[tab,setTab]=React.useState('today'),[snapshot,setSnapshot]=React.useState(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[feedback,setFeedback]=React.useState(''),[sent,setSent]=React.useState(false),[confirmDelete,setConfirmDelete]=React.useState(false);
  const [reportOpen,setReportOpen]=React.useState(false);
  const field=fields.find(f=>f.id===selected);
  const dataRequest=React.useRef(0);
  const [exploreVariable,setExploreVariable]=React.useState('ndvi');
  function openHistory(variable){setExploreVariable(variable);setTab('explore');}
  const [history,setHistory]=React.useState([]),[historyProgress,setHistoryProgress]=React.useState('');
  React.useEffect(()=>{let active=true;setHistory([]);setHistoryProgress('');if(selected)supabase.from('field_history_months').select('month,payload').eq('field_id',selected).order('month').then(({data,error})=>{if(active){if(error)setError('Could not load saved history. Please reload.');else setHistory(data||[]);}});return()=>{active=false;};},[selected]);
  async function loadHistory(){
    if(!HISTORY_FIELD_IDS.includes(selected)||busy)return;
    const id=selected;setBusy(true);setError('');
    const months=historyMonths();let partial=0;
    try {
      for(let i=0;i<months.length;i++){
        setHistoryProgress(`Loading history ${i+1}/${months.length} · ${months[i]}`);
        const {data,error}=await supabase.functions.invoke('field-data',{body:{fieldId:id,historyMonth:months[i]}});
        if(error||data?.error)throw Error('History loading stopped. Saved months are retained; resume to continue.');
        if(data.payload.status!=='complete')partial++;
        setHistory(rows=>[...rows.filter(r=>r.month!==data.month),data].sort((a,b)=>a.month.localeCompare(b.month)));
      }
      setHistoryProgress(partial?`History retrieved · ${partial} months have unavailable sources. Failed sources retry after 24 hours.`:'Two-year history loaded. Cloudy observations and missing source days remain gaps.');
    } catch(e){setError(e.message);setHistoryProgress('Backfill paused; saved months remain available.');}
    finally{setBusy(false);}
  }
  async function load() {
    setError('');
    const [p,f]=await Promise.all([supabase.from('profiles').select('*').maybeSingle(),supabase.from('fields').select('*').order('created_at')]);
    if(p.error||f.error){setError('Could not load your account. Check your connection and retry.');return;}
    setProfile(p.data);setFields(f.data);setSelected(id=>f.data.some(v=>v.id===id)?id:f.data[0]?.id||'');
  }
  React.useEffect(()=>{load();},[]);
  React.useEffect(()=>{const request=++dataRequest.current;setSnapshot(null);setConfirmDelete(false);setReportOpen(false);if(!selected)return;supabase.from('field_snapshots').select('payload').eq('field_id',selected).maybeSingle().then(({data,error})=>{if(request===dataRequest.current){if(error)setError('Could not load the saved data.');else setSnapshot(data?.payload||null);}});return()=>{dataRequest.current++;};},[selected]);
  async function refresh(){setBusy(true);setError('');const id=selected,request=++dataRequest.current;try{const {data,error}=await supabase.functions.invoke('field-data',{body:{fieldId:id}});if(error){const detail=await error.context?.json?.().catch(()=>null);throw Error(detail?.error||'Refresh failed. Please retry later.');}if(data.error)throw Error(data.error);if(request===dataRequest.current)setSnapshot(data);}catch(e){if(request===dataRequest.current)setError(e.message);}finally{setBusy(false);}}
  async function remove(){setBusy(true);const {error}=await supabase.from('fields').delete().eq('id',selected);setBusy(false);if(error)setError('Could not delete field. Please retry.');else{setConfirmDelete(false);await load();}}
  async function sendFeedback(e){e.preventDefault();setBusy(true);setSent(false);const {error}=await supabase.from('feedback').insert({message:feedback.trim()});setBusy(false);if(error)setError('Could not save feedback. Please retry.');else{setSent(true);setFeedback('');}}
  async function exportData(){setBusy(true);setError('');const tables=['profiles','fields','field_snapshots','field_history_months','feedback'];const results=await Promise.all(tables.map(t=>supabase.from(t).select('*')));setBusy(false);if(results.some(r=>r.error)){setError('Export failed. Please retry.');return;}const blob=new Blob([JSON.stringify(Object.fromEntries(tables.map((t,i)=>[t,results[i].data])),null,2)],{type:'application/json'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='cultisync-data.json';a.click();URL.revokeObjectURL(href);}
  if(reportOpen&&field)return <main className="beta-shell"><FieldReport field={field} snapshot={snapshot} onClose={()=>setReportOpen(false)}/></main>;
  return <main className="beta-shell"><header className="row spread app-header"><Link to="/" className="app-brand"><img src={logoMarkUrl} width="32" height="32" alt=""/><span className="app-wordmark">Culti<span>Sync</span></span></Link><button onClick={async()=>{const {error}=await supabase.auth.signOut();if(error)setError('Sign-out failed. Please retry.');}}>Sign out</button></header>
    {error&&<div className="notice error" role="alert">{error} <button onClick={load}>Reload account</button></div>}
    {profile===undefined?<p role="status">Loading your account…</p>:!profile?<Consent session={session} onAccepted={load}/>:<>
      <p className="eyebrow">California wine-grape beta</p><h1>Your vineyard, in view.</h1><p className="muted">Satellite observations and weather context. Refresh on demand; no irrigation prescriptions.</p>
      <div className="tabs" role="tablist" aria-label="Workspace">{['today','explore','fields','water','feedback'].map(t=><button role="tab" aria-selected={tab===t} key={t} onClick={()=>{if(t==='explore')setExploreVariable('ndvi');setTab(t);}}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>
      {fields.length>0&&tab!=='feedback'&&<div className="row spread"><label style={{flex:1,maxWidth:440}}>Selected field<select value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}>{fields.map(f=><option key={f.id} value={f.id}>{f.name} · {f.area_ha.toFixed(2)} ha</option>)}</select></label><button disabled={busy||!field} onClick={refresh}>{busy?'Refreshing…':'Refresh field data'}</button></div>}
      {snapshot&&tab!=='feedback'&&<p className="muted">Last checked {dateTime(snapshot.checkedAt)} · weather refresh limited to once per hour; satellite once per day.</p>}
      {!fields.length&&tab!=='fields'&&tab!=='feedback'&&<section className="panel"><h2>Start with your first field</h2><p>No sample readings are mixed into your account. Add a boundary to retrieve available observations.</p><button className="primary" onClick={()=>setTab('fields')}>Map my first field</button></section>}
      {tab==='today'&&field&&<FieldOverview key={field.id} field={field} data={snapshot} history={history} onExplore={()=>openHistory('ndvi')} onWater={()=>setTab('water')}/>}
      {tab==='explore'&&field&&<React.Suspense fallback={<p>Loading spatial explorer…</p>}><FieldExplorer key={field.id} field={field} data={snapshot} history={history} initialVariable={exploreVariable} onLoadHistory={HISTORY_FIELD_IDS.includes(selected)?loadHistory:null} historyBusy={busy} historyProgress={historyProgress}/></React.Suspense>}
      {tab==='water'&&field&&<LiveWater data={snapshot} field={field} onExploreHistory={openHistory}/>}
      {tab==='fields'&&<>{field&&<section className="panel"><h2>{field.name}</h2><React.Suspense fallback={<p>Loading map…</p>}><FieldMap key={field.id} boundary={field.boundary}/></React.Suspense><p>{field.area_ha.toFixed(2)} ha · {field.boundary.cultisyncSource?.provider==='DWR / Land IQ'?'Public vineyard · grape type unverified':'Wine grapes'}</p><p className="muted">Boundary: {boundarySource(field.boundary)}. Saved separately; observations use this boundary.</p><p><button disabled={!snapshot||busy} onClick={()=>setReportOpen(true)}>Evidence report</button>{!snapshot&&<span className="muted"> Refresh field data first; a report needs at least one snapshot.</span>}</p>{confirmDelete?<div className="notice"><p>Delete this field and its cached observations? This cannot be undone.</p><div className="row"><button disabled={busy} onClick={remove}>Delete permanently</button><button onClick={()=>setConfirmDelete(false)}>Cancel</button></div></div>:<button onClick={()=>setConfirmDelete(true)}>Delete field</button>}</section>}{fields.length<3?<AddField initialBoundary={field?.boundary} onSaved={async f=>{await load();setSelected(f.id);setTab('today');}}/>:<p className="notice">You have reached the free Beta limit of 3 fields.</p>}</>}
      {tab==='feedback'&&<section className="panel"><h2>Help shape CultiSync</h2><p>Tell us what worked or what was missing. Avoid putting passwords or other sensitive information here.</p><form onSubmit={sendFeedback}><label>Your feedback<textarea required minLength={5} maxLength={2000} rows={5} value={feedback} onChange={e=>setFeedback(e.target.value)}/></label><button className="primary" disabled={busy||feedback.trim().length<5}>Submit feedback</button></form>{sent&&<p role="status">Thank you. Your feedback has been saved.</p>}<p>For account support: <a href="mailto:support@cultisync.com">support@cultisync.com</a></p><button disabled={busy} onClick={exportData}>Export my data</button><p className="muted">Delete fields in Fields. For account deletion, contact support from your account email. We will verify ownership before deleting it.</p></section>}
    </>}
    <footer className="row" style={{marginTop:40}}><Link to="/terms">Beta terms</Link><Link to="/privacy">Privacy</Link><Link to="/cookies">Storage notice</Link><a href="mailto:support@cultisync.com">Support</a></footer>
  </main>;
}
export default function BetaApp(){return <AuthGate>{session=><Workspace key={session.user.id} session={session}/>}</AuthGate>;}
