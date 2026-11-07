export const NAIP_SERVICE='https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer';
export const NAIP_TILES=NAIP_SERVICE+'/exportImage?f=image&bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=jpgpng&renderingRule=%7B%22rasterFunction%22%3A%22NaturalColor%22%7D';
export function naipCatalogLabel(response) {
  const rows=(response?.features||[]).map(f=>f.attributes).filter(a=>Number.isInteger(a?.Year)&&a.Year>=1900&&a.Year<=2100);
  if(!rows.length)return 'Capture year unavailable at the field center.';
  const year=Math.max(...rows.map(a=>a.Year));
  const resolutions=[...new Set(rows.filter(a=>a.Year===year&&a.resolution_units==='METER'&&Number.isFinite(a.resolution_value)&&a.resolution_value>0).map(a=>a.resolution_value))];
  return `Latest catalog year at field center: ${year}${resolutions.length===1?` · ${resolutions[0].toFixed(1)} m source resolution`:''}.`;
}
// Mapterhorn: ~1 m USGS 3DEP lidar where surveyed (z16 at 512 px), coarser open DEMs elsewhere.
export const TERRAIN_TILES='https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
export const TERRAIN_SOURCE={type:'raster-dem',tiles:[TERRAIN_TILES],encoding:'terrarium',tileSize:512,maxzoom:16,attribution:'<a href="https://mapterhorn.com/attribution">© Mapterhorn</a>'}; // Mapterhorn's own credit; its page lists USGS 3DEP and the other sources
export const TERRAIN_EXAGGERATION=1.5;
export const TERRAIN_PITCH=60;
export const TERRAIN_SKY={'sky-color':'#DCEEF4','horizon-color':'#EBF4F7','fog-color':'#F7F5ED','sky-horizon-blend':0.5,'horizon-fog-blend':0.6,'fog-ground-blend':0.4,'atmosphere-blend':0};
export const TERRAIN_HILLSHADE={'hillshade-method':'standard','hillshade-shadow-color':'#1D4C5D','hillshade-highlight-color':'#FFFFFF','hillshade-accent-color':'#266379','hillshade-exaggeration':0.35};
// Over NAIP: igor shading scales with slope, so flat rows keep their true color and only banks, terraces and slopes shade.
// Neutral black/white: a tinted shadow reads as haze over vegetation.
export const TERRAIN_HILLSHADE_AERIAL={'hillshade-method':'igor','hillshade-shadow-color':'rgba(0,0,0,0.5)','hillshade-highlight-color':'rgba(255,255,255,0.25)','hillshade-accent-color':'rgba(0,0,0,0)','hillshade-exaggeration':1};
