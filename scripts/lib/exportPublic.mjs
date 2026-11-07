// Paths that stay in the private repository. Keep in sync with docs/README.md "Internal".
const INTERNAL=[/^docs\/superpowers\//,/^docs\/COMPETITIVE_LANDSCAPE\.md$/,/^docs\/IMPLEMENTATION_PLAN\.md$/,
  /^docs\/EXECUTION_RUNBOOK\.md$/,/^docs\/FALLBACK_SOLUTIONS\.md$/,/^docs\/legal\//,/^\.claude\//,/^\.superpowers\//];
export function isPublicPath(path) {
  return !INTERNAL.some(pattern=>pattern.test(path));
}
// Remove "## Internal (not published)" and everything up to the next level-2 heading. Line endings are
// normalized first, so a CRLF checkout cannot slip the section past the match.
export function stripInternalSection(markdown) {
  const out=markdown.replace(/\r\n/g,'\n').replace(/\n## Internal \(not published\)\n[\s\S]*?(?=\n## |$)/,'');
  return out.endsWith('\n')?out:`${out}\n`;
}
export const PUBLIC_REMOTE='https://github.com/alanxuliang/cultisync.git';
// A first release writes into an empty directory; a refresh writes over a clean checkout of the public copy.
// The private repository has the same package name, so the copy is recognised by its origin URL, and the
// source itself or any checkout holding internal plans is refused before anything is copied or deleted.
export function pathsOverlap(a,b) {
  const inside=(child,parent)=>child.startsWith(`${parent}/`);
  return a===b||inside(a,b)||inside(b,a);
}
export function targetIssue({entries,overlapsSource,hasGit,clean,originUrl,hasInternalDocs}) {
  if(overlapsSource)return 'Target overlaps the private source repository (the same directory, inside it, or containing it).';
  if(!entries.length)return null;
  if(!hasGit)return 'Target is not empty and not a git checkout.';
  if(hasInternalDocs)return 'Target contains docs/superpowers/, so it is a private checkout.';
  if(originUrl!==PUBLIC_REMOTE)return `Target is not a checkout of ${PUBLIC_REMOTE}.`;
  if(!clean)return 'Target checkout has uncommitted changes.';
  return null;
}
export function staleFiles(existing,exported) {
  const keep=new Set(exported);
  return existing.filter(file=>!keep.has(file));
}
// The export copies working-tree files but is labelled with HEAD, so the two must be the same.
export function sourceIssue({dirty}) {
  return dirty?'Source repository has uncommitted changes to tracked files; commit or stash them so the export matches HEAD.':null;
}
export function parentDirs(file) {
  const parts=file.split('/').slice(0,-1);
  return parts.map((_,i)=>parts.slice(0,parts.length-i).join('/'));
}
// Output of `git ls-files -s -z`: "<mode> <object> <stage>\t<path>" records separated by NUL.
export function indexEntries(output) {
  return output.split('\0').filter(Boolean).map(entry=>({mode:entry.slice(0,entry.indexOf(' ')),path:entry.slice(entry.indexOf('\t')+1)}));
}
// The export moves regular non-executable files only. A symbolic link would be copied as, or written through
// to, the file it points to; a submodule is not a file; and file modes are not carried across.
export function modeIssue(entries,where) {
  const odd=entries.filter(e=>e.mode!=='100644').map(e=>e.path);
  return odd.length?`${where} has a tracked symbolic link, submodule or executable file: ${odd.join(', ')}; the export handles regular non-executable files only.`:null;
}
