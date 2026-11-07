// Usage: node scripts/export_public.mjs <target-dir>
// Copies tracked public files into an empty directory (first release) or over a clean checkout of the
// public copy (refresh), removing files that are no longer public. It never commits or pushes.
import { execFileSync } from 'node:child_process';
import { copyFileSync,existsSync,lstatSync,mkdirSync,readdirSync,readFileSync,realpathSync,rmdirSync,rmSync,writeFileSync } from 'node:fs';
import { basename,dirname,join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPublicPath,stripInternalSection,targetIssue,staleFiles,pathsOverlap,parentDirs,sourceIssue,modeIssue,indexEntries } from './lib/exportPublic.mjs';

if(!process.argv[2])throw Error('Usage: node scripts/export_public.mjs <target-dir>');
// Resolve the target against the caller's directory, then work from the root of the repository that holds
// this script: git ls-files lists paths relative to the working directory, and the internal-path rules
// only match paths relative to the root.
const target=resolve(process.argv[2]);
const sourceRoot=execFileSync('git',['-C',dirname(fileURLToPath(import.meta.url)),'rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
process.chdir(sourceRoot);
const dirtySource=sourceIssue({dirty:execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim()!==''});
if(dirtySource)throw Error(dirtySource);
const entries=existsSync(target)?readdirSync(target):[];
const hasGit=entries.includes('.git');
const git=args=>execFileSync('git',['-C',target,...args],{encoding:'utf8'});
// Normalized absolute paths, forward slashes, case-folded on Windows. A path that does not exist yet is the
// real path of its deepest existing ancestor plus the missing tail, so a link in a parent is followed.
const norm=p=>{const s=p.replace(/\\/g,'/').replace(/\/+$/,'');return process.platform==='win32'?s.toLowerCase():s;};
const absolute=p=>{
  let head=resolve(p);const tail=[];
  while(!existsSync(head)&&dirname(head)!==head){tail.unshift(basename(head));head=dirname(head);}
  return norm(join(realpathSync.native(head),...tail));
};
const overlapsSource=pathsOverlap(absolute(target),absolute(sourceRoot));
const clean=!hasGit||git(['status','--porcelain']).trim()==='';
let originUrl=null;
if(hasGit){try{originUrl=git(['remote','get-url','origin']).trim();}catch{originUrl=null;}}
const hasInternalDocs=existsSync(join(target,'docs','superpowers'));
const issue=targetIssue({entries,overlapsSource,hasGit,clean,originUrl,hasInternalDocs});
if(issue)throw Error(issue);

// Both indexes are checked by mode before anything is deleted or written: the source for what is published,
// the public checkout for links that a write could follow out of it.
const stage=indexEntries(execFileSync('git',['ls-files','-s','-z'],{encoding:'utf8'}));
const files=stage.map(entry=>entry.path);
const included=files.filter(isPublicPath);
const targetStage=hasGit?indexEntries(git(['ls-files','-s','-z'])):[];
for(const odd of [modeIssue(stage.filter(entry=>isPublicPath(entry.path)),'Source'),modeIssue(targetStage,'Target')])if(odd)throw Error(odd);
const stale=staleFiles(targetStage.map(entry=>entry.path),included);
// Every path the export deletes or writes, and each directory above it, must be a real file or directory in the
// target: an ignored or untracked link there would carry the write outside the checkout.
const isLink=p=>{try{return lstatSync(p).isSymbolicLink();}catch{return false;}};
const touched=new Set([...included,...stale].flatMap(file=>[file,...parentDirs(file)]));
const linked=[...touched].filter(p=>isLink(join(target,p))).sort();
if(linked.length)throw Error(`Target has a link where the export would write: ${linked.join(', ')}; remove it first.`);
for(const file of stale){
  rmSync(join(target,file));
  // Remove directories the file leaves empty, so a directory that became a file can be written below.
  for(const dir of parentDirs(file)){const d=join(target,dir);if(existsSync(d)&&!readdirSync(d).length)rmdirSync(d);}
}
for(const file of included){
  const to=join(target,file);mkdirSync(dirname(to),{recursive:true});
  if(file==='docs/README.md')writeFileSync(to,stripInternalSection(readFileSync(file,'utf8')));
  else copyFileSync(file,to);
}
const source=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim();
console.log(`Exported ${included.length} of ${files.length} tracked files from ${source} to ${target}`);
console.log(included.filter(f=>f.startsWith('docs/')).join('\n'));
