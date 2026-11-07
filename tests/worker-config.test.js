import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
test('keepalive cron uses day names, three times a week',()=>{
  // Cloudflare numbers weekdays 1 = Sunday, so numeric days are easy to misread; names are unambiguous.
  assert.deepEqual(config.triggers.crons,['17 16 * * MON,WED,FRI']);
});
test('the Worker serves assets first and keeps run logs',()=>{
  assert.equal(config.main,'worker/index.js');
  assert.equal(config.assets.binding,'ASSETS');
  assert.equal(config.assets.not_found_handling,'single-page-application');
  assert.deepEqual(config.observability,{enabled:true});
});
test('the account and its workers.dev subdomain stay out of the configuration and off the internet',()=>{
  assert.equal(config.account_id,undefined,'the account comes from CLOUDFLARE_ACCOUNT_ID');
  assert.equal(config.workers_dev,false);
  assert.equal(config.preview_urls,false,'version preview URLs would also live on the account subdomain');
});
