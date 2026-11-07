import { rasterBounds } from './imagery.js';

export function comparisonScript(kind) {
  if(!['values','difference'].includes(kind))throw Error('Unknown comparison output');
  return `//VERSION=3
function setup(){return {input:[
 {datasource:'before',bands:['B04','B08','SCL','dataMask']},
 {datasource:'after',bands:['B04','B08','SCL','dataMask']}],
 output:{bands:${kind==='values'?5:4},sampleType:'${kind==='values'?'FLOAT32':'AUTO'}',nodataValue:0}};}
function clear(s){return s && s.dataMask===1 && [4,5,6,7].includes(s.SCL) && s.B08+s.B04>0;}
function evaluatePixel(samples){
 const a=samples.before[0],b=samples.after[0];
 const va=clear(a)?1:0,vb=clear(b)?1:0;
 const na=va?(a.B08-a.B04)/(a.B08+a.B04):0;
 const nb=vb?(b.B08-b.B04)/(b.B08+b.B04):0;
 ${kind==='values'?'return [na,nb,va,vb,1];':`if(!va||!vb)return [0,0,0,0];
 return [...colorBlend(nb-na,[-0.3,0,0.3],[[0.69,0.34,0.15],[0.95,0.94,0.88],[0.16,0.48,0.48]]),1];`}
}`;
}
export function comparisonRequest(field,beforeDate,afterDate,kind) {
  const bounds=rasterBounds(field.boundary);
  return {input:{bounds:{bbox:bounds.bbox,geometry:field.boundary},data:[['before',beforeDate],['after',afterDate]].map(([id,date])=>({
    id,type:'sentinel-2-l2a',dataFilter:{timeRange:{from:date.slice(0,10)+'T00:00:00Z',to:date.slice(0,10)+'T23:59:59Z'},mosaickingOrder:'mostRecent'},processing:{upsampling:'NEAREST',downsampling:'NEAREST'},
  }))},output:{width:bounds.width,height:bounds.height,responses:[{identifier:'default',format:{type:kind==='values'?'image/tiff':'image/png'}}]},evalscript:comparisonScript(kind)};
}
// Process API evaluates even masked pixels; a constant output band is not a
// polygon footprint. Count centers inside the saved geometry on this exact grid.
export function parcelPixelMask(boundary,grid) {
  const [west,south,east,north]=grid.bbox,ring=boundary.coordinates[0];
  const mask=new Uint8Array(grid.width*grid.height);
  for(let row=0;row<grid.height;row++)for(let col=0;col<grid.width;col++){
    const x=west+(col+.5)*(east-west)/grid.width,y=north-(row+.5)*(north-south)/grid.height;
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [xi,yi]=ring[i],[xj,yj]=ring[j];
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
    }
    mask[row*grid.width+col]=inside?1:0;
  }
  return mask;
}
export function pairedStatistics(bands,polygonMask) {
  if(bands.length!==5||bands.some(b=>b.length!==bands[0].length))throw Error('Invalid raster');
  const [before,after,beforeMask,afterMask]=bands,footprint=polygonMask||bands[4];
  if(footprint.length!==before.length)throw Error('Invalid polygon mask');
  let total=0,validBefore=0,validAfter=0,paired=0,beforeSum=0,afterSum=0,lower=0,higher=0,similar=0;
  for(let i=0;i<footprint.length;i++){
    if(footprint[i]!==1)continue;
    total++;
    const a=beforeMask[i]===1&&Number.isFinite(before[i])&&before[i]>=-1&&before[i]<=1;
    const b=afterMask[i]===1&&Number.isFinite(after[i])&&after[i]>=-1&&after[i]<=1;
    if(a)validBefore++;if(b)validAfter++;
    if(!a||!b)continue;
    paired++;beforeSum+=before[i];afterSum+=after[i];
    const delta=after[i]-before[i];if(delta<-.05)lower++;else if(delta>.05)higher++;else similar++;
  }
  const coverage=total?paired/total:0,comparable=paired>=15&&coverage>=.6;
  return {comparable,parcelPixels:total,pairedPixels:paired,coverage,beforeCoverage:total?validBefore/total:0,afterCoverage:total?validAfter/total:0,
    // Do not publish a change estimate when the jointly valid area is insufficient.
    beforeMean:comparable?beforeSum/paired:null,afterMean:comparable?afterSum/paired:null,delta:comparable?(afterSum-beforeSum)/paired:null,
    lowerFraction:comparable?lower/paired:null,higherFraction:comparable?higher/paired:null,similarFraction:comparable?similar/paired:null};
}
