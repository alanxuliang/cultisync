import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { dirname,join,normalize } from 'node:path';

// Published docs must not cite repository files that no longer exist.
const DOCS=['README.md','docs/README.md','docs/ROADMAP.md','docs/OPERATIONS.md','docs/DESIGN_SYSTEM.md'];
const ROOTS=/^(src|public|scripts|supabase|tests|docs)\//;
test('every repository path cited in the published docs exists',()=>{
  const missing=[];
  for(const doc of DOCS){
    const text=readFileSync(doc,'utf8');
    const cited=[...text.matchAll(/`([^`\s]+)`/g)].map(m=>m[1]);
    const linked=[...text.matchAll(/\]\((\.{0,2}\/?[^)\s#]+)\)/g)].map(m=>normalize(join(dirname(doc),m[1])).replaceAll('\\','/'));
    for(const path of [...cited,...linked]){
      if(!ROOTS.test(path)||/[*<>{}]/.test(path))continue;
      if(!existsSync(path))missing.push(`${doc}: ${path}`);
    }
  }
  assert.deepEqual(missing,[]);
});
