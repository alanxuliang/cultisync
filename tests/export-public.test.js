import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPublicPath,stripInternalSection,targetIssue,staleFiles,PUBLIC_REMOTE,pathsOverlap,parentDirs,sourceIssue,modeIssue,indexEntries } from '../scripts/lib/exportPublic.mjs';
test('internal documents and tool settings are excluded',()=>{
  for(const p of ['docs/superpowers/specs/x.md','docs/superpowers/plans/y.md','docs/COMPETITIVE_LANDSCAPE.md','docs/IMPLEMENTATION_PLAN.md','docs/EXECUTION_RUNBOOK.md','docs/FALLBACK_SOLUTIONS.md','docs/legal/PRIVACY_POLICY.md','.claude/launch.json','.superpowers/sdd/plan/progress.md'])assert.equal(isPublicPath(p),false,p);
  for(const p of ['README.md','LICENSE','docs/README.md','docs/ROADMAP.md','docs/OPERATIONS.md','docs/adr/0001-defer-observability-to-post-beta.md','src/App.jsx','src/website/LegalPage.jsx','.forgejo/workflows/deploy.yml','supabase/migrations/20261021180519_account_cap.sql'])assert.equal(isPublicPath(p),true,p);
});
test('the Internal section is stripped whether or not another section follows',()=>{
  const middle='# Docs\n\n## Published\n\n- a\n\n## Internal (not published)\n\n- secret\n\n## Later\n\n- b\n';
  assert.equal(stripInternalSection(middle),'# Docs\n\n## Published\n\n- a\n\n## Later\n\n- b\n');
  const last='# Docs\n\n## Published\n\n- a\n\n## Internal (not published)\n\nThese stay private.\n\n- secret\n';
  assert.equal(stripInternalSection(last),'# Docs\n\n## Published\n\n- a\n');
  assert.equal(stripInternalSection('# Docs\n'),'# Docs\n');
});
test('only an empty directory or a clean checkout of the public copy may be written',()=>{
  const checkout={entries:['.git','src','package.json'],overlapsSource:false,hasGit:true,clean:true,originUrl:PUBLIC_REMOTE,hasInternalDocs:false};
  assert.equal(PUBLIC_REMOTE,'https://github.com/alanxuliang/cultisync.git');
  assert.equal(targetIssue({entries:[],overlapsSource:false,hasGit:false,clean:true,originUrl:null,hasInternalDocs:false}),null);
  assert.equal(targetIssue(checkout),null);
  assert.match(targetIssue({...checkout,entries:['notes.txt'],hasGit:false,originUrl:null}),/not empty and not a git checkout/);
  assert.match(targetIssue({...checkout,clean:false}),/uncommitted changes/);
});
test('the private source and other private checkouts are refused even when clean',()=>{
  const checkout={entries:['.git','src','package.json','docs'],overlapsSource:false,hasGit:true,clean:true,originUrl:PUBLIC_REMOTE,hasInternalDocs:false};
  assert.match(targetIssue({...checkout,overlapsSource:true,originUrl:'ssh://git@git.example.invalid/alanxuliang/cultisync.git',hasInternalDocs:true}),/overlaps the private source repository/);
  assert.match(targetIssue({entries:[],overlapsSource:true,hasGit:false,clean:true,originUrl:null,hasInternalDocs:false}),/overlaps the private source repository/);
  assert.match(targetIssue({...checkout,originUrl:'ssh://git@git.example.invalid/alanxuliang/cultisync.git',hasInternalDocs:true}),/docs\/superpowers/);
  assert.match(targetIssue({...checkout,hasInternalDocs:true}),/docs\/superpowers/);
  assert.match(targetIssue({...checkout,originUrl:'https://github.com/alanxuliang/cultisync-private-archive.git'}),/not a checkout of https:\/\/github\.com\/alanxuliang\/cultisync\.git/);
  assert.match(targetIssue({...checkout,originUrl:null}),/not a checkout of/);
});
test('files removed from the private repository are removed from the public copy',()=>{
  assert.deepEqual(staleFiles(['README.md','src/old.js','docs/ROADMAP.md'],['README.md','docs/ROADMAP.md','src/new.js']),['src/old.js']);
  assert.deepEqual(staleFiles([],['README.md']),[]);
});
test('a target overlaps the source when it is the same directory or one contains the other',()=>{
  assert.equal(pathsOverlap('e:/ai/cultisync','e:/ai/cultisync'),true);
  assert.equal(pathsOverlap('e:/ai/cultisync/out/public','e:/ai/cultisync'),true);
  assert.equal(pathsOverlap('e:/ai','e:/ai/cultisync'),true);
  assert.equal(pathsOverlap('e:/ai/cultisync-public','e:/ai/cultisync'),false,'a shared name prefix is not containment');
  assert.equal(pathsOverlap('e:/tmp/export','e:/ai/cultisync'),false);
});
test('directories emptied by removed files are listed deepest first',()=>{
  assert.deepEqual(parentDirs('src/foo/bar.js'),['src/foo','src']);
  assert.deepEqual(parentDirs('README.md'),[]);
});
test('an export is refused while tracked source files have uncommitted changes',()=>{
  assert.equal(sourceIssue({dirty:false}),null);
  assert.match(sourceIssue({dirty:true}),/uncommitted changes to tracked files/);
});
test('the Internal section is stripped from a README with CRLF line endings',()=>{
  const crlf='# Docs\r\n\r\n## Published\r\n\r\n- a\r\n\r\n## Internal (not published)\r\n\r\n- secret\r\n';
  assert.equal(stripInternalSection(crlf),'# Docs\n\n## Published\n\n- a\n');
});
test('git index entries are read with their modes',()=>{
  assert.deepEqual(indexEntries('100644 0123abc 0\tREADME.md\u0000120000 4567def 0\tdocs/a b.md\u0000'),
    [{mode:'100644',path:'README.md'},{mode:'120000',path:'docs/a b.md'}]);
  assert.deepEqual(indexEntries(''),[]);
});
test('only regular non-executable files pass: links, submodules and executables are refused',()=>{
  assert.equal(modeIssue([{mode:'100644',path:'README.md'}],'Source'),null);
  assert.match(modeIssue([{mode:'120000',path:'docs/plan-link.md'}],'Source'),/^Source has a tracked symbolic link, submodule or executable file: docs\/plan-link\.md;/);
  assert.match(modeIssue([{mode:'160000',path:'vendor/lib'}],'Source'),/vendor\/lib/);
  assert.match(modeIssue([{mode:'100755',path:'scripts/run.sh'}],'Target'),/^Target has .*: scripts\/run\.sh;/);
});
// A throwaway source repository with copies of the export scripts, one internal plan and a docs README.
function sourceRepo(root){
  const src=join(root,'source'),repo=join(dirname(fileURLToPath(import.meta.url)),'..');
  for(const f of ['scripts/export_public.mjs','scripts/lib/exportPublic.mjs']){mkdirSync(dirname(join(src,f)),{recursive:true});copyFileSync(join(repo,f),join(src,f));}
  mkdirSync(join(src,'docs','superpowers','plans'),{recursive:true});
  writeFileSync(join(src,'docs','superpowers','plans','p.md'),'private plan\n');
  writeFileSync(join(src,'docs','README.md'),'# Docs\n\n## Published\n\n- a\n\n## Internal (not published)\n\n- p\n');
  const git=(args,input)=>execFileSync('git',['-c','user.name=t','-c','user.email=t@example.invalid',...args],{cwd:src,encoding:'utf8',input});
  git(['init','-q','-b','main']);git(['add','-A']);git(['commit','-q','-m','init']);
  return {src,git};
}
const exportCli=(src,target,cwd)=>execFileSync(process.execPath,[join(src,'scripts','export_public.mjs'),target],{cwd,encoding:'utf8',stdio:'pipe'});
test('a tracked symbolic link is refused before anything is copied',()=>{
  const root=mkdtempSync(join(tmpdir(),'cs-export-'));
  try{
    const {src,git}=sourceRepo(root),out=join(root,'out');
    const blob=git(['hash-object','-w','--stdin'],'superpowers/plans/p.md').trim();
    git(['update-index','--add','--cacheinfo',`120000,${blob},docs/plan-link.md`]);
    git(['commit','-q','-m','link']);git(['checkout','--','docs/plan-link.md']);
    assert.throws(()=>exportCli(src,out,src),/Source has a tracked symbolic link, submodule or executable file: docs\/plan-link\.md/);
    assert.equal(existsSync(out),false);
  }finally{rmSync(root,{recursive:true,force:true});}
});
// A git checkout whose origin is the public remote, with the given files committed.
function publicCheckout(root,files){
  const pub=join(root,'pub');mkdirSync(pub);
  const pgit=(args,input)=>execFileSync('git',['-c','user.name=t','-c','user.email=t@example.invalid',...args],{cwd:pub,encoding:'utf8',input});
  pgit(['init','-q','-b','main']);pgit(['remote','add','origin',PUBLIC_REMOTE]);
  for(const [file,text] of Object.entries(files)){mkdirSync(dirname(join(pub,file)),{recursive:true});writeFileSync(join(pub,file),text);}
  if(Object.keys(files).length){pgit(['add','-A']);pgit(['commit','-q','-m','public']);}
  return {pub,pgit};
}
test('a refresh replaces changed files, removes stale ones, turns a directory into a file and commits nothing',()=>{
  const root=mkdtempSync(join(tmpdir(),'cs-export-'));
  try{
    const {src,git}=sourceRepo(root);
    writeFileSync(join(src,'kept.txt'),'new\n');writeFileSync(join(src,'notes'),'notes is a file now\n');
    git(['add','-A']);git(['commit','-q','-m','more']);
    const {pub,pgit}=publicCheckout(root,{'kept.txt':'old\n','stale.txt':'gone\n','notes/a.md':'was a directory\n'});
    exportCli(src,pub,src);
    assert.equal(readFileSync(join(pub,'kept.txt'),'utf8'),'new\n');
    assert.equal(existsSync(join(pub,'stale.txt')),false);
    assert.equal(readFileSync(join(pub,'notes'),'utf8'),'notes is a file now\n');
    assert.equal(readFileSync(join(pub,'docs','README.md'),'utf8'),'# Docs\n\n## Published\n\n- a\n');
    assert.equal(existsSync(join(pub,'docs','superpowers')),false);
    assert.equal(pgit(['rev-list','--count','HEAD']).trim(),'1','the export never commits');
    assert.notEqual(pgit(['status','--porcelain']).trim(),'');
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('a refresh refuses an ignored link where it would write, and writes nothing through it',()=>{
  const root=mkdtempSync(join(tmpdir(),'cs-export-'));
  try{
    const {src}=sourceRepo(root),outside=join(root,'outside');mkdirSync(outside);
    const {pub}=publicCheckout(root,{});
    writeFileSync(join(pub,'.git','info','exclude'),'docs\n');
    symlinkSync(outside,join(pub,'docs'),'junction');
    assert.throws(()=>exportCli(src,pub,src),/Target has a link where the export would write: docs/);
    assert.equal(existsSync(join(outside,'README.md')),false);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('a refresh refuses a public checkout that holds a symbolic link and writes nothing through it',()=>{
  const root=mkdtempSync(join(tmpdir(),'cs-export-'));
  try{
    const {src}=sourceRepo(root),outside=join(root,'outside.txt');
    writeFileSync(outside,'outside\n');
    const {pgit}=publicCheckout(root,{}),pub=join(root,'pub');
    const blob=pgit(['hash-object','-w','--stdin'],'../../outside.txt').trim();
    pgit(['update-index','--add','--cacheinfo',`120000,${blob},docs/README.md`]);
    pgit(['commit','-q','-m','link']);pgit(['checkout','--','docs/README.md']);
    assert.throws(()=>exportCli(src,pub,src),/Target has a tracked symbolic link, submodule or executable file: docs\/README\.md/);
    assert.equal(readFileSync(outside,'utf8'),'outside\n');
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('a target that does not exist yet beneath a link into the source is refused',()=>{
  const root=mkdtempSync(join(tmpdir(),'cs-export-'));
  try{
    const {src}=sourceRepo(root),alias=join(root,'alias');
    symlinkSync(join(src,'docs'),alias,'junction');
    assert.throws(()=>exportCli(src,join(alias,'public-export'),root),/overlaps the private source repository/);
    assert.equal(existsSync(join(src,'docs','public-export')),false);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('the export is anchored to its own repository even when run from a subdirectory',()=>{
  const root=mkdtempSync(join(tmpdir(),'cs-export-'));
  try{
    const {src}=sourceRepo(root),out=join(root,'out');
    exportCli(src,out,join(src,'docs'));
    assert.equal(existsSync(join(out,'superpowers')),false,'internal plans must not be exported from a subdirectory run');
    assert.equal(existsSync(join(out,'docs','superpowers')),false);
    assert.equal(readFileSync(join(out,'docs','README.md'),'utf8'),'# Docs\n\n## Published\n\n- a\n');
    assert.equal(existsSync(join(out,'scripts','export_public.mjs')),true);
  }finally{rmSync(root,{recursive:true,force:true});}
});
