import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import logoMarkUrl from '../assets/logo-mark.svg';
import lensNdviUrl from '../assets/imagery/lens-ndvi.webp';
import imagery from '../assets/imagery/imagery.json';

export function AuthGate({ children }) {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [sentTo, setSentTo] = React.useState('');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  React.useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data.session); setLoading(false);
      if (error) setMessage('Your session could not be restored. Please sign in again.');
    });
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      if (active) { setSession(value); setLoading(false); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  async function signIn(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: {
        shouldCreateUser: import.meta.env.VITE_PUBLIC_BETA_READY === 'true',
      } });
      if (error) throw error;
      setSentTo(email.trim()); setCode('');
      setMessage('Check your inbox for an 8-digit code. It expires in 1 hour. You can request another code after 60 seconds.');
    } catch { setMessage('We could not send a code. Check your email and try again in a minute. During preview, only invited accounts can sign in. Contact support@cultisync.com if this continues.'); }
    finally { setBusy(false); }
  }
  async function verify(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.verifyOtp({email:sentTo,token:code.trim(),type:'email'});
      if (error) throw error;
    } catch { setMessage('That code is invalid or expired. Check the latest email or request a new code.'); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="beta-shell" role="status">Checking your session…</main>;
  if (session) return children(session);
  const day = new Date(imagery.sentinel.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return <div className="auth-layout"><main className="beta-shell auth-shell">
    <Link to="/" className="app-brand"><img src={logoMarkUrl} width="32" height="32" alt="" /><span className="app-wordmark">Culti<span>Sync</span></span></Link><p className="eyebrow">California vineyard beta</p>
    <h1>Your fields, in focus.</h1><p>Sign in with a one-time email code. No password to remember.</p>
    {import.meta.env.VITE_PUBLIC_BETA_READY !== 'true' && <p className="notice">Private preview. Public registration opens after launch checks are complete.</p>}
    {!sentTo ? <form onSubmit={signIn}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <button className="primary" disabled={busy || !supabase}>{busy ? 'Sending…' : 'Email me a code'}</button></form> : <>
      <p>Enter the code sent to {sentTo}.</p>
      <form onSubmit={verify}><label>Email code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
        <button className="primary" disabled={busy || code.length!==8}>{busy?'Checking…':'Verify and sign in'}</button></form>
      <div className="row"><button disabled={busy} onClick={signIn}>Send a new code</button><button disabled={busy} onClick={()=>{setSentTo('');setCode('');setMessage('');}}>Use a different email</button></div>
    </>}
    {!supabase && <p role="alert">Sign-in is not configured on this deployment.</p>}
    {message && <p role="status">{message}</p>}
    <p><Link to="/terms">Beta terms</Link> · <Link to="/privacy">Privacy</Link> · <a href="mailto:support@cultisync.com">Support</a></p>
  </main>
    <figure className="auth-visual">
      <img src={lensNdviUrl} width="720" height="720" alt={`NDVI of a ${imagery.block.areaHa.toFixed(0)} ha public vineyard block in ${imagery.place}`} />
      <figcaption>NDVI of a {imagery.block.areaHa.toFixed(0)} ha public vineyard block, {imagery.place}. Sentinel-2, {day}, 10 m. {imagery.sentinel.attribution}.</figcaption>
    </figure>
  </div>;
}
