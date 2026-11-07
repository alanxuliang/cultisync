import test from 'node:test';
import assert from 'node:assert/strict';
import { keepalive } from '../worker/keepalive.js';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',RESEND_API_KEY:'re_test',ALERT_FROM:'CultiSync <alerts@cultisync.com>',ALERT_TO:'owner@example.com'};
function fakeFetch(pingResponse){
  const calls=[];
  const impl=async(url,options)=>{calls.push({url,options});
    if(url.endsWith('/rest/v1/rpc/ping')){if(pingResponse instanceof Error)throw pingResponse;return pingResponse;}
    return new Response('{}',{status:200});};
  return {impl,calls};
}
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
test('healthy ping sends no email',async()=>{
  const {impl,calls}=fakeFetch(json({database_over_80:false,accounts_near_cap:false}));
  assert.deepEqual(await keepalive(env,impl),{status:'ok',warnings:[],emailed:false});
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.headers.apikey,'sb_publishable_test');
});
test('capacity flags are emailed',async()=>{
  const {impl,calls}=fakeFetch(json({database_over_80:true,accounts_near_cap:true}));
  const result=await keepalive(env,impl);
  assert.equal(result.warnings.length,2);assert.equal(result.emailed,true);
  const mail=JSON.parse(calls[1].options.body);
  assert.equal(calls[1].url,'https://api.resend.com/emails');
  assert.deepEqual(mail.to,['owner@example.com']);
  assert.match(mail.text,/80% of the 500 MB/);assert.match(mail.text,/100-account cap/);
});
test('a failed ping is itself a warning',async()=>{
  const {impl,calls}=fakeFetch(json({message:'paused'},503));
  const result=await keepalive(env,impl);
  assert.equal(result.status,'failed');assert.deepEqual(result.warnings,['ping returned HTTP 503']);
  assert.equal(calls.length,2);
});
test('a network error is a warning, not a crash',async()=>{
  const {impl}=fakeFetch(new Error('connection reset'));
  const result=await keepalive(env,impl);
  assert.equal(result.status,'failed');assert.match(result.warnings[0],/connection reset/);
});
test('a failed warning email is reported, not thrown',async()=>{
  const calls=[];
  const impl=async(url,options)=>{calls.push(url);
    if(url.endsWith('/rest/v1/rpc/ping'))return json({database_over_80:true,accounts_near_cap:false});
    throw new Error('dns failure');};
  const result=await keepalive(env,impl);
  assert.equal(result.emailed,false);assert.match(result.mailError,/email request failed: dns failure/);
  assert.equal(calls.length,2);
});
test('a rejected warning email is reported with its status',async()=>{
  const impl=async url=>url.endsWith('/rest/v1/rpc/ping')?json({database_over_80:false,accounts_near_cap:true}):new Response('{}',{status:422});
  const result=await keepalive(env,impl);
  assert.equal(result.emailed,false);assert.equal(result.mailError,'email returned HTTP 422');
});
test('runs needing attention are failed pings and warnings that were not emailed',async()=>{
  const {needsAttention}=await import('../worker/keepalive.js');
  assert.equal(needsAttention({status:'ok',warnings:[],emailed:false}),false);
  assert.equal(needsAttention({status:'ok',warnings:['x'],emailed:true}),false);
  assert.equal(needsAttention({status:'ok',warnings:['x'],emailed:false}),true);
  assert.equal(needsAttention({status:'failed',warnings:['x'],emailed:true}),true);
});
