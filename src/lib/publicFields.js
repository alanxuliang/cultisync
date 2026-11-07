export const CROP_SERVICE='https://utility.arcgis.com/usrsvcs/servers/d94e891e00364e49a2ed9e9e2e27837d/rest/services/Planning/i15_Crop_Mapping_2023/MapServer/0';
export const CROP_SOURCE_URL='https://www.arcgis.com/home/item.html?id=d94e891e00364e49a2ed9e9e2e27837d';
export const CROP_YEAR=2023;

export function cropQueryUrl(bounds){
  const params=new URLSearchParams({f:'geojson',geometry:bounds.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',where:"SYMB_CLASS='V'",outFields:'OBJECTID,UniqueID,CROPTYP2,COUNTY,ACRES,DataStatus',returnGeometry:'true',resultRecordCount:'100',orderByFields:'OBJECTID'});
  return `${CROP_SERVICE}/query?${params}`;
}

// Match the existing Beta storage contract; never drop holes or polygon parts.
export function boundaryIssue(g){
  if(g?.type!=='Polygon'||g.coordinates?.length!==1)return 'This boundary has multiple parts or holes. Draw the vineyard block you manage instead.';
  const ring=g.coordinates[0];
  if(!Array.isArray(ring)||ring.length<4||ring.length>200)return 'This boundary exceeds the Beta limit of 199 corners. Draw a smaller vineyard block instead.';
  if(ring.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<-124.5||p[0]>-114||p[1]<32.5||p[1]>42.1)||ring[0].some((v,i)=>v!==ring.at(-1)[i]))return 'A closed California-region polygon is required.';
  if(JSON.stringify(g).length>32000)return 'Boundary exceeds the Beta size limit.';
  return '';
}

export function cropCandidates(result){
  if(result?.error||result?.type!=='FeatureCollection'||!Array.isArray(result.features))throw Error('Public boundaries are unavailable. Retry or draw a boundary.');
  return result.features.map(f=>{
    const p=f.properties||{},areaHa=Number(p.ACRES)*0.40468564224;
    return {...f,id:String(p.OBJECTID),properties:{...p,areaHa},issue:boundaryIssue(f.geometry)||(!Number.isFinite(areaHa)||areaHa<0.1||areaHa>100?'This field is outside the 0.1–100 ha Beta limit. Draw a smaller block instead.':'')};
  });
}

export function publicBoundary(feature){
  if(feature.issue)throw Error(feature.issue);
  return {...feature.geometry,cultisyncSource:{provider:'DWR / Land IQ',year:CROP_YEAR,id:String(feature.properties.UniqueID),county:feature.properties.COUNTY,crop:'Vineyard (grape type unverified)',edited:false}};
}
