import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeField } from '../supabase/functions/field-data/authorization.js';
const fieldId='20000000-0000-4000-8000-000000000001';
test('missing or invalid tokens cannot look up fields',async()=>{
  let queries=0;
  const admin={auth:{getUser:async()=>({data:{user:null},error:new Error('invalid')})},from:()=>{queries++;throw Error('must not query');}};
  assert.equal((await authorizeField(admin,'',fieldId)).status,401);
  assert.equal((await authorizeField(admin,'Bearer forged',fieldId)).status,401);
  assert.equal(queries,0);
});
test('lookup always binds field to authenticated user, never request owner',async()=>{
  const filters={};
  const query={select(){return this;},eq(k,v){filters[k]=v;return this;},async maybeSingle(){return {data:null,error:null};}};
  const admin={auth:{getUser:async()=>({data:{user:{id:'authenticated-owner'}},error:null})},from:()=>query};
  assert.equal((await authorizeField(admin,'Bearer verified',fieldId)).status,404);
  assert.deepEqual(filters,{id:fieldId,owner_id:'authenticated-owner'});
});
test('malformed field IDs are rejected before database access',async()=>{
  const admin={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from:()=>{throw Error('must not query');}};
  assert.equal((await authorizeField(admin,'Bearer verified','../../other')).status,400);
});
