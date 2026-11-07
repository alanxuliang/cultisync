import { TERRAIN_TILES } from './basemap.js';

// Relative-elevation tint: compares ground height inside one field, so colours mean "lower/higher than
// the rest of this field", never absolute elevation. Colours mirror design tokens (MapLibre can't read CSS).
export const RELIEF_LOW='rgba(61,91,168,0.6)';    // --blue-600 Horizon Blue: water and cold air collect low
export const RELIEF_HIGH='rgba(233,230,218,0.5)'; // --stone-100 Loam: ground, no health/alert meaning
const RELIEF_CLEAR='rgba(0,0,0,0)';
export const RELIEF_MIN_SPAN=1; // metres; narrower spans would paint lidar noise as terrain

export const terrariumElevation=(r,g,b)=>r*256+g+b/256-32768;

export function lngLatToPixel(lon,lat,z,size){
  const n=2**z*size,s=Math.sin(lat*Math.PI/180);
  return [(lon+180)/360*n,(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n];
}
export function pixelToLngLat(gx,gy,z,size){
  const n=2**z*size;
  return [gx/n*360-180,Math.atan(Math.sinh(Math.PI*(1-2*gy/n)))*180/Math.PI];
}
export const pixelSizeMeters=(lat,z,size)=>40075016.686*Math.cos(lat*Math.PI/180)/(2**z*size);
export function tilesForBounds([w,s,e,n],z,size){
  const [x0,y0]=lngLatToPixel(w,n,z,size),[x1,y1]=lngLatToPixel(e,s,z,size),tiles=[];
  for(let y=Math.floor(y0/size);y<=Math.floor(y1/size);y++)for(let x=Math.floor(x0/size);x<=Math.floor(x1/size);x++)tiles.push({x,y});
  return tiles;
}
export function pointInRing([x,y],ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
}
const quantile=(sorted,p)=>{const i=(sorted.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);};

export function reliefStops(values){
  if(!values.length)return null;
  const sorted=Float64Array.from(values).sort();
  let low=quantile(sorted,0.05),mid=quantile(sorted,0.5),high=quantile(sorted,0.95);
  const flat=high-low<RELIEF_MIN_SPAN;
  if(flat){low=mid-RELIEF_MIN_SPAN/2;high=mid+RELIEF_MIN_SPAN/2;}
  if(!(low<mid&&mid<high))mid=(low+high)/2;
  return {low,mid,high,flat,count:values.length};
}
export const reliefColorExpression=({low,mid,high})=>['interpolate',['linear'],['elevation'],low,RELIEF_LOW,mid,RELIEF_CLEAR,high,RELIEF_HIGH];

// Reads the finest zoom whose tiles all exist over the field (lidar z16 ≈ 1 m; outside lidar, coarser zooms).
export async function sampleFieldElevations(polygon,{loadTile=loadTerrariumTile,zooms=[16,15,14,13,12],size=512,maxTiles=16,maxSamples=200000,signal}={}){
  const ring=polygon.coordinates[0],lons=ring.map(p=>p[0]),lats=ring.map(p=>p[1]);
  const bbox=[Math.min(...lons),Math.min(...lats),Math.max(...lons),Math.max(...lats)];
  for(const z of zooms){
    const tiles=tilesForBounds(bbox,z,size);
    if(tiles.length>maxTiles)continue;
    const images=await Promise.all(tiles.map(t=>loadTile(z,t.x,t.y,{signal})));
    if(images.some(img=>!img))continue;
    const [x0,y0]=lngLatToPixel(bbox[0],bbox[3],z,size),[x1,y1]=lngLatToPixel(bbox[2],bbox[1],z,size);
    const step=Math.max(1,Math.ceil(Math.sqrt((x1-x0)*(y1-y0)/maxSamples))),values=[];
    tiles.forEach((t,k)=>{
      const {width,data}=images[k];
      const px0=Math.max(0,Math.floor(x0)-t.x*size),px1=Math.min(size-1,Math.ceil(x1)-t.x*size);
      const py0=Math.max(0,Math.floor(y0)-t.y*size),py1=Math.min(size-1,Math.ceil(y1)-t.y*size);
      for(let py=py0-(py0%step);py<=py1;py+=step)for(let px=px0-(px0%step);px<=px1;px+=step){
        if(px<px0||py<py0)continue;
        if(!pointInRing(pixelToLngLat(t.x*size+px+0.5,t.y*size+py+0.5,z,size),ring))continue;
        const i=(py*width+px)*4;values.push(terrariumElevation(data[i],data[i+1],data[i+2]));
      }
    });
    if(values.length)return {zoom:z,values};
  }
  return null;
}

export async function loadTerrariumTile(z,x,y,{signal}={}){
  const response=await fetch(TERRAIN_TILES.replace('{z}',z).replace('{x}',x).replace('{y}',y),{signal});
  if(response.status===404)return null;
  if(!response.ok)throw new Error(`Elevation tile ${z}/${x}/${y} failed (${response.status})`);
  const bitmap=await createImageBitmap(await response.blob());
  // Safari before 16.4 has no 2D OffscreenCanvas.
  const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(bitmap.width,bitmap.height):Object.assign(document.createElement('canvas'),{width:bitmap.width,height:bitmap.height});
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(bitmap,0,0);bitmap.close();
  return ctx.getImageData(0,0,canvas.width,canvas.height);
}
