import test from 'node:test';
import assert from 'node:assert/strict';
import {boundaryIssue,cropCandidates,publicBoundary,cropQueryUrl} from '../src/lib/publicFields.js';
const geometry={type:'Polygon',coordinates:[[[-122.35,38.42],[-122.349,38.42],[-122.349,38.421],[-122.35,38.42]]]};
const feature={type:'Feature',geometry,properties:{OBJECTID:12,UniqueID:'napa-test',ACRES:4,COUNTY:'Napa'}};
test('public boundaries preserve geometry and provenance without claiming wine-grape verification',()=>{
  const [candidate]=cropCandidates({type:'FeatureCollection',features:[feature]});
  assert.equal(candidate.issue,'');assert.equal(candidate.properties.areaHa,4*0.40468564224);
  const boundary=publicBoundary(candidate);assert.deepEqual(boundary.coordinates,geometry.coordinates);
  assert.equal(boundary.cultisyncSource.year,2023);assert.match(boundary.cultisyncSource.crop,/unverified/);
  const url=new URL(cropQueryUrl([-122.36,38.41,-122.34,38.43]));assert.equal(url.searchParams.get('where'),"SYMB_CLASS='V'");assert.equal(url.searchParams.get('resultRecordCount'),'100');
});
test('unsupported geometry and area cannot be silently converted into a usable public field',()=>{
  for(const g of [{type:'MultiPolygon',coordinates:[geometry.coordinates]},{...geometry,coordinates:[...geometry.coordinates,geometry.coordinates[0]]},{...geometry,coordinates:[Array(201).fill([-122.35,38.42])]},{...geometry,coordinates:[[[-122.35,38.42],[-122.349,38.42],[-122.349,38.421],[-122,38]]]}])assert.ok(boundaryIssue(g));
  const [tooLarge]=cropCandidates({type:'FeatureCollection',features:[{...feature,properties:{...feature.properties,ACRES:300}}]});
  assert.throws(()=>publicBoundary(tooLarge));assert.throws(()=>cropCandidates({error:{code:503}}));
});
