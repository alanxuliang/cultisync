// Three views of the same qualified acquisition day; no synthetic spatial detail.
export function rasterBounds(boundary) {
  const ring = boundary.coordinates[0];
  const west=Math.min(...ring.map(p=>p[0])), east=Math.max(...ring.map(p=>p[0]));
  const south=Math.min(...ring.map(p=>p[1])), north=Math.max(...ring.map(p=>p[1]));
  const widthM=(east-west)*111320*Math.cos((north+south)*Math.PI/360);
  const heightM=(north-south)*111320;
  const pixelSize=Math.max(10,widthM/256,heightM/256);
  return {bbox:[west,south,east,north],coordinates:[[west,north],[east,north],[east,south],[west,south]],
    width:Math.max(1,Math.ceil(widthM/pixelSize)),height:Math.max(1,Math.ceil(heightM/pixelSize)),pixelSizeM:pixelSize};
}
export function imageScript(view) {
  if (!['ndvi','rgb','falseColor'].includes(view)) throw new Error('Unknown image view');
  const render=view==='rgb'?'[2.5*s.B04,2.5*s.B03,2.5*s.B02]':view==='falseColor'?'[2.5*s.B08,2.5*s.B04,2.5*s.B03]':
    'colorBlend((s.B08-s.B04)/(s.B08+s.B04),[-1,0,0.2,0.4,0.6,0.8,1],[[0.16,0.32,0.52],[0.60,0.40,0.24],[0.88,0.80,0.54],[0.66,0.76,0.39],[0.35,0.61,0.28],[0.16,0.43,0.22],[0.06,0.25,0.15]])';
  return `//VERSION=3
function setup(){return {input:['B02','B03','B04','B08','SCL','dataMask'],output:{bands:4,sampleType:'AUTO'}};}
function evaluatePixel(s){
 const clear=s.dataMask && [4,5,6,7].includes(s.SCL) && s.B08+s.B04>0;
 if(!clear)return [0,0,0,0];
 return [...${render},1];
}`;
}
export function imageRequest(field,date,view) {
  const bounds=rasterBounds(field.boundary);
  const day=date.slice(0,10);
  return {input:{bounds:{bbox:bounds.bbox,geometry:field.boundary},data:[{type:'sentinel-2-l2a',
    dataFilter:{timeRange:{from:day+'T00:00:00Z',to:day+'T23:59:59Z'},mosaickingOrder:'mostRecent'},
    processing:{upsampling:'NEAREST',downsampling:'NEAREST'}}]},
    output:{width:bounds.width,height:bounds.height,responses:[{identifier:'default',format:{type:'image/png'}}]},evalscript:imageScript(view)};
}
