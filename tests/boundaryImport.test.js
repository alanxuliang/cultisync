import test from 'node:test';
import assert from 'node:assert/strict';
import { geojsonPolygon,kmlPolygon,importBoundaryText,IMPORT_ISSUE } from '../src/lib/boundaryImport.js';
const ring=[[-122.35,38.42],[-122.348,38.42],[-122.348,38.422],[-122.35,38.422],[-122.35,38.42]];
const kml=(coords,extra='')=>`<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs>${extra}</Polygon></Placemark></kml>`;
test('GeoJSON polygon, feature and single-feature collection are accepted and marked',()=>{
  const g={type:'Polygon',coordinates:[ring]};
  assert.deepEqual(geojsonPolygon(JSON.stringify(g)),{...g,cultisyncSource:{provider:'imported-geojson'}});
  assert.equal(geojsonPolygon(JSON.stringify({type:'Feature',geometry:g})).cultisyncSource.provider,'imported-geojson');
  assert.equal(geojsonPolygon(JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',geometry:g}]})).type,'Polygon');
});
test('GeoJSON holes, other regions, open rings and bad JSON are rejected',()=>{
  assert.throws(()=>geojsonPolygon(JSON.stringify({type:'Polygon',coordinates:[ring,ring]})),{message:IMPORT_ISSUE});
  assert.throws(()=>geojsonPolygon(JSON.stringify({type:'Polygon',coordinates:[ring.map(([x,y])=>[x+10,y])]})),{message:IMPORT_ISSUE});
  assert.throws(()=>geojsonPolygon(JSON.stringify({type:'Polygon',coordinates:[ring.slice(0,-1)]})),{message:IMPORT_ISSUE});
  assert.throws(()=>geojsonPolygon('{not json'),{message:IMPORT_ISSUE});
});
test('Google Earth KML with altitudes and an unclosed ring becomes a closed 2-D polygon',()=>{
  const coords=ring.slice(0,-1).map(([x,y])=>`${x},${y},0`).join(' \n ');
  assert.deepEqual(kmlPolygon(kml(coords)),{type:'Polygon',coordinates:[ring],cultisyncSource:{provider:'imported-kml'}});
});
test('namespaced KML tags are accepted',()=>{
  const text=kml(ring.map(p=>p.join(',')).join(' ')).replaceAll('<Polygon>','<kml:Polygon>').replaceAll('</Polygon>','</kml:Polygon>').replaceAll('coordinates>','kml:coordinates>');
  assert.equal(kmlPolygon(text).coordinates[0].length,5);
});
test('KML holes and multiple polygons are rejected',()=>{
  const coords=ring.map(p=>p.join(',')).join(' ');
  assert.throws(()=>kmlPolygon(kml(coords,`<innerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></innerBoundaryIs>`)),{message:IMPORT_ISSUE});
  assert.throws(()=>kmlPolygon(`<kml>${kml(coords)}${kml(coords)}</kml>`),{message:IMPORT_ISSUE});
  assert.throws(()=>kmlPolygon('<kml><Placemark><Point><coordinates>-122,38</coordinates></Point></Placemark></kml>'),{message:IMPORT_ISSUE});
});
test('text import picks the format from the first character',()=>{
  assert.equal(importBoundaryText('  '+kml(ring.map(p=>p.join(',')).join(' '))).cultisyncSource.provider,'imported-kml');
  assert.equal(importBoundaryText(JSON.stringify({type:'Polygon',coordinates:[ring]})).cultisyncSource.provider,'imported-geojson');
});
