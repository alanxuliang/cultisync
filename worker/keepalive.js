// One database read keeps the Supabase free project active. Capacity warnings,
// and any failure of the read itself, are emailed to the operator.
export async function keepalive(env,fetchImpl=fetch) {
  let status='ok',flags=null,detail='';
  try {
    const response=await fetchImpl(`${env.SUPABASE_URL}/rest/v1/rpc/ping`,{method:'POST',
      headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:'{}'});
    if(!response.ok){status='failed';detail=`ping returned HTTP ${response.status}`;}
    else flags=await response.json();
  } catch(error){status='failed';detail=`ping request failed: ${error.message}`;}
  const warnings=status==='failed'?[detail]:[
    ...(flags?.database_over_80?['Database is above 80% of the 500 MB free-tier limit.']:[]),
    ...(flags?.accounts_near_cap?['Accounts are at 90 or more of the 100-account cap.']:[]),
  ];
  if(!warnings.length)return {status,warnings,emailed:false};
  // A warning that cannot be delivered is reported in the result, never thrown away.
  let emailed=false,mailError='';
  try {
    const mail=await fetchImpl('https://api.resend.com/emails',{method:'POST',
      headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:env.ALERT_FROM,to:[env.ALERT_TO],subject:'CultiSync warning',
        text:`${warnings.join('\n')}\n\nSee docs/OPERATIONS.md, section 7.`})});
    emailed=mail.ok;
    if(!mail.ok)mailError=`email returned HTTP ${mail.status}`;
  } catch(error){mailError=`email request failed: ${error.message}`;}
  return mailError?{status,warnings,emailed,mailError}:{status,warnings,emailed};
}
// A failed ping, or a warning nobody received, should show as a failed run in Cloudflare's Cron Events.
export function needsAttention(result) {
  return result.status==='failed'||(result.warnings.length>0&&!result.emailed);
}
