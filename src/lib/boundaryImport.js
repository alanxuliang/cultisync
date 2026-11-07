import { boundaryIssue } from './publicFields.js';
export const IMPORT_ISSUE='Use one California-region polygon with 3–199 corners, longitude/latitude coordinates, a closed outline, no holes and less than 32 KB.';
function polygon(ring,provider) {
  const g={type:'Polygon',coordinates:[ring]};
  if(!Array.isArray(ring)||boundaryIssue(g))throw Error(IMPORT_ISSUE);
  return {...g,cultisyncSource:{provider}};
}
export function geojsonPolygon(text) {
  if(text.length>32000)throw Error(IMPORT_ISSUE);
  let json;try{json=JSON.parse(text);}catch{throw Error(IMPORT_ISSUE);}
  const g=json?.type==='Feature'?json.geometry:json?.type==='FeatureCollection'&&json.features?.length===1?json.features[0].geometry:json;
  if(g?.type!=='Polygon'||g.coordinates?.length!==1)throw Error(IMPORT_ISSUE);
  return polygon(g.coordinates[0],'imported-geojson');
}
// Pattern matching instead of DOMParser so the parser also runs in Node tests. Tolerates kml: prefixes.
export function kmlPolygon(text) {
  if(text.length>200000)throw Error(IMPORT_ISSUE);
  const polygons=text.match(/<(?:\w+:)?Polygon[\s>][\s\S]*?<\/(?:\w+:)?Polygon>/g)||[];
  if(polygons.length!==1||/<(?:\w+:)?innerBoundaryIs[\s>]/.test(polygons[0]))throw Error(IMPORT_ISSUE);
  const outer=polygons[0].match(/<(?:\w+:)?outerBoundaryIs[\s>][\s\S]*?<(?:\w+:)?coordinates>([\s\S]*?)<\/(?:\w+:)?coordinates>/);
  if(!outer)throw Error(IMPORT_ISSUE);
  const ring=outer[1].trim().split(/\s+/).map(t=>t.split(',').slice(0,2).map(Number));
  if(ring.length&&ring[0].some((v,i)=>v!==ring.at(-1)[i]))ring.push([...ring[0]]);
  return polygon(ring,'imported-kml');
}
export function importBoundaryText(text) {
  return text.trimStart().startsWith('<')?kmlPolygon(text):geojsonPolygon(text);
}
