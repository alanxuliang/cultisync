"""Export the real imagery used on the public homepage.

Sources (all public, no credentials):
  - USDA NAIP aerial imagery via the USGS National Map ImageServer (public domain).
  - Copernicus Sentinel-2 L2A via the Element84 Earth Search STAC catalog (free and open;
    attribution "Contains modified Copernicus Sentinel data <year>").
  - DWR / Land IQ 2023 statewide crop mapping for the vineyard block boundary.

The NDVI colour ramp, cloud mask (SCL 4-7) and nearest-neighbour upsampling mirror
supabase/functions/field-data/imagery.js so the homepage shows what the app shows.

Usage: python scripts/build_site_imagery.py [--end YYYY-MM-DD] [--days N]
Searches Sentinel-2 scenes in the N days (default 40) up to --end (default today, UTC).
The committed assets were built with --end 2026-09-28 (scene S2B_10SEH_20260918_0_L2A).
Writes src/assets/imagery/*.webp and src/assets/imagery/imagery.json.
"""
import argparse
import io
import json
import math
import os
import sys
from datetime import date, datetime, timedelta, timezone

import numpy as np
import requests
import rasterio
from PIL import Image, ImageChops, ImageDraw
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.windows import from_bounds
from rasterio.transform import from_bounds as transform_from_bounds

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'imagery')
NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer'
STAC = 'https://earth-search.aws.element84.com/v1/search'
CROP = ('https://utility.arcgis.com/usrsvcs/servers/d94e891e00364e49a2ed9e9e2e27837d/rest/services/'
        'Planning/i15_Crop_Mapping_2023/MapServer/0/query')

PLACE = 'Oakville, Napa Valley, California'
HERO_CENTER = (-122.4150, 38.4385)      # lon, lat
HERO_SIZE_M = (2160, 1800)              # width, height on the ground
HERO_PX = (1800, 1500)
LENS_PX = 720

# imagery.js colorBlend stops, 0-1 floats.
NDVI_STOPS = [-1, 0, 0.2, 0.4, 0.6, 0.8, 1]
NDVI_COLORS = np.array([[0.16, 0.32, 0.52], [0.60, 0.40, 0.24], [0.88, 0.80, 0.54], [0.66, 0.76, 0.39],
                        [0.35, 0.61, 0.28], [0.16, 0.43, 0.22], [0.06, 0.25, 0.15]])

# SCL classes the app treats as clear (imagery.js): vegetation, bare soil, water, unclassified.
CLEAR_SCL = [4, 5, 6, 7]

R = 6378137.0


def to_3857(lon, lat):
    return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def extent_3857(center, size_m):
    x, y = to_3857(*center)
    # Web Mercator stretches distances by 1/cos(lat); scale so the extent is true ground metres.
    k = 1 / math.cos(math.radians(center[1]))
    hw, hh = size_m[0] * k / 2, size_m[1] * k / 2
    return (x - hw, y - hh, x + hw, y + hh)


def naip(bbox, px):
    params = dict(f='image', bbox=','.join(map(str, bbox)), bboxSR=3857, imageSR=3857,
                  size=f'{px[0]},{px[1]}', format='png', renderingRule=json.dumps({'rasterFunction': 'NaturalColor'}))
    r = requests.get(NAIP + '/exportImage', params=params, timeout=180)
    r.raise_for_status()
    return Image.open(io.BytesIO(r.content)).convert('RGB')


def naip_meta(center):
    r = requests.get(NAIP + '/query', params=dict(f='json', geometry=f'{center[0]},{center[1]}', geometryType='esriGeometryPoint',
                     inSR=4326, spatialRel='esriSpatialRelIntersects', outFields='*', returnGeometry='false',
                     where='Category=1'), timeout=60)
    r.raise_for_status()
    body = r.json()
    if 'error' in body:
        raise SystemExit(f"NAIP catalog query failed: {body['error']}")
    rows = [f.get('attributes') or {} for f in body.get('features', [])]
    rows = [a for a in rows if a.get('acquisition_date')]
    if not rows:
        raise SystemExit(f'No dated NAIP tile at {center}; cannot caption the aerial photo.')
    row = max(rows, key=lambda a: a['acquisition_date'])
    day = datetime.fromtimestamp(row['acquisition_date'] / 1000, tz=timezone.utc).date().isoformat()
    return {'date': day, 'resolutionM': row['resolution_value']}


def sentinel_scene(bbox4326, window):
    q = dict(collections=['sentinel-2-l2a'], bbox=bbox4326, datetime=window, limit=30,
             query={'eo:cloud_cover': {'lt': 10}}, sortby=[{'field': 'properties.datetime', 'direction': 'desc'}])
    r = requests.post(STAC, json=q, timeout=60)
    r.raise_for_status()
    return r.json()['features']


def read_band(href, bbox3857, px, resampling=Resampling.nearest):
    """Read a Sentinel-2 COG window and warp it onto the Web Mercator output grid."""
    with rasterio.open(href) as src:
        b = transform_bounds('EPSG:3857', src.crs, *bbox3857, densify_pts=21)
        pad = 60
        win = from_bounds(b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad, src.transform).round_offsets().round_lengths()
        data = src.read(1, window=win).astype('float32')
        dst = np.zeros((px[1], px[0]), dtype='float32')
        reproject(data, dst, src_transform=src.window_transform(win), src_crs=src.crs,
                  dst_transform=transform_from_bounds(*bbox3857, px[0], px[1]), dst_crs='EPSG:3857',
                  resampling=resampling)
        return dst


def clear_scene(features, bbox3857):
    """Newest scene whose SCL shows the hero extent fully clear (vegetation/soil/water classes)."""
    for f in features:
        scl = read_band(f['assets']['scl']['href'], bbox3857, (216, 180))
        clear = np.isin(scl, CLEAR_SCL).mean()
        print(f"  {f['id']}: {clear:.1%} clear")
        if clear > 0.995:
            return f
    raise SystemExit('No fully clear Sentinel-2 scene in the search window.')


_clear_cache = {}


def clear_pixels(scene, bbox3857, px):
    """Per-pixel SCL clear mask on the output grid, like the app's evalscript."""
    key = (scene['id'], tuple(bbox3857), tuple(px))
    if key not in _clear_cache:
        _clear_cache[key] = np.isin(read_band(scene['assets']['scl']['href'], bbox3857, px), CLEAR_SCL)
    return _clear_cache[key]


def reflectance(scene, band, bbox3857, px):
    """Band values as surface reflectance; cloud, shadow and nodata pixels become NaN.
    Earth Search flags scenes whose DNs already have the baseline-04.00 BOA offset removed;
    their raster:bands offset must not be applied twice."""
    asset = scene['assets'][band]
    rb = (asset.get('raster:bands') or [{}])[0]
    offset = 0 if scene['properties'].get('earthsearch:boa_offset_applied') else rb.get('offset', 0)
    dn = read_band(asset['href'], bbox3857, px)
    valid = (dn > 0) & clear_pixels(scene, bbox3857, px)
    return np.where(valid, dn * rb.get('scale', 1e-4) + offset, np.nan)


def with_alpha(rgb, valid):
    """RGBA image; invalid pixels are transparent, as in the app."""
    alpha = (valid * 255).astype('uint8')[..., None]
    return Image.fromarray(np.concatenate([rgb, alpha], axis=2), 'RGBA')


def ndvi_rgb(nir, red):
    with np.errstate(invalid='ignore', divide='ignore'):
        ndvi = np.where(nir + red > 0, (nir - red) / (nir + red), np.nan)
    out = np.zeros(ndvi.shape + (3,), dtype='float32')
    for c in range(3):
        out[..., c] = np.interp(np.nan_to_num(ndvi, nan=0), NDVI_STOPS, NDVI_COLORS[:, c])
    return with_alpha((out * 255).clip(0, 255).astype('uint8'), ~np.isnan(ndvi)), ndvi


def reflectance_rgb(bands):
    # The app's 2.5x reflectance gain, plus a display gamma so dark soil keeps detail.
    arr = np.dstack([np.clip(np.nan_to_num(b) * 2.5, 0, 1) for b in bands])
    valid = ~np.any(np.isnan(np.dstack(bands)), axis=2)
    return with_alpha((arr ** (1 / 1.6) * 255).astype('uint8'), valid)


def vineyard_block(center, ndvi, bbox3857, px):
    """The public vineyard block inside the hero with the most within-block NDVI variation:
    the case the product exists for (where in this block should I scout?)."""
    lon, lat = center
    params = dict(f='geojson', geometry=f'{lon-0.012},{lat-0.01},{lon+0.012},{lat+0.01}', geometryType='esriGeometryEnvelope',
                  inSR=4326, outSR=4326, spatialRel='esriSpatialRelContains', where="SYMB_CLASS='V'",
                  outFields='UniqueID,ACRES,COUNTY', returnGeometry='true', resultRecordCount=200)
    fc = requests.get(CROP, params=params, timeout=60).json()
    best = None
    for f in fc['features']:
        g = f['geometry']
        if g['type'] != 'Polygon' or len(g['coordinates']) != 1:
            continue
        try:
            ha = float((f.get('properties') or {}).get('ACRES')) * 0.40468564224
        except (TypeError, ValueError):
            continue
        if not math.isfinite(ha):
            continue
        ring = np.array(g['coordinates'][0])
        w = (ring[:, 0].max() - ring[:, 0].min()) * 111320 * math.cos(math.radians(lat))
        h = (ring[:, 1].max() - ring[:, 1].min()) * 111320
        # A compact 5-14 ha block reads well at 10 m: roughly 25-40 pixels across.
        if max(w, h) == 0 or not (5 <= ha <= 14 and min(w, h) / max(w, h) > 0.55):
            continue
        inside = np.array(polygon_mask(ring.tolist(), bbox3857, px)[0]) > 0
        values = ndvi[inside]
        if values.size == 0 or np.isnan(values).mean() > 0.01:
            continue
        spread = float(np.nanpercentile(values, 90) - np.nanpercentile(values, 10))
        if best is None or spread > best[0]:
            best = (spread, f, ha)
    if not best:
        raise SystemExit('No suitable public vineyard block found in the hero extent.')
    print(f"  block {best[1]['properties']['UniqueID']}: {best[2]:.1f} ha, NDVI p10-p90 spread {best[0]:.2f}")
    return best[1], best[2]


def polygon_mask(ring, bbox3857, px):
    img = Image.new('L', px, 0)
    pts = []
    for lon, lat in ring:
        x, y = to_3857(lon, lat)
        pts.append(((x - bbox3857[0]) / (bbox3857[2] - bbox3857[0]) * px[0],
                    (bbox3857[3] - y) / (bbox3857[3] - bbox3857[1]) * px[1]))
    ImageDraw.Draw(img).polygon(pts, fill=255)
    return img, pts


def save(img, name, quality=82):
    path = os.path.join(OUT, name)
    img.save(path, 'WEBP', quality=quality, method=6)
    print(f'  wrote {name} {os.path.getsize(path)//1024} KB')


def search_window(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--end', type=date.fromisoformat, default=datetime.now(timezone.utc).date(),
                    help='last acquisition day to consider (default: today, UTC)')
    ap.add_argument('--days', type=int, default=40, help='length of the search window in days')
    args = ap.parse_args(argv)
    start = args.end - timedelta(days=args.days)
    return f'{start.isoformat()}T00:00:00Z/{args.end.isoformat()}T23:59:59Z'


def main():
    window = search_window()
    print(f'Search window {window}')
    os.makedirs(OUT, exist_ok=True)
    hero = extent_3857(HERO_CENTER, HERO_SIZE_M)
    hero4326 = list(transform_bounds('EPSG:3857', 'EPSG:4326', *hero))

    print('Sentinel-2 scenes')
    scene = clear_scene(sentinel_scene(hero4326, window), hero)
    assets, date = scene['assets'], scene['properties']['datetime'][:10]

    print('Hero')
    aerial = naip(hero, HERO_PX)
    nir = reflectance(scene, 'nir', hero, HERO_PX)
    red = reflectance(scene, 'red', hero, HERO_PX)
    ndvi_img, ndvi = ndvi_rgb(nir, red)
    save(aerial, 'hero-aerial.webp', quality=68)
    save(ndvi_img, 'hero-ndvi.webp')
    save(aerial.resize((900, 750), Image.LANCZOS), 'hero-aerial-900.webp')
    save(ndvi_img.resize((900, 750), Image.NEAREST), 'hero-ndvi-900.webp')

    print('Vineyard block')
    block, ha = vineyard_block(HERO_CENTER, ndvi, hero, HERO_PX)
    ring = block['geometry']['coordinates'][0]
    lons, lats = [p[0] for p in ring], [p[1] for p in ring]
    c = ((min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2)
    span = max((max(lons) - min(lons)) * 111320 * math.cos(math.radians(c[1])), (max(lats) - min(lats)) * 111320) * 1.5
    lens = extent_3857(c, (span, span))
    px = (LENS_PX, LENS_PX)
    mask, pts = polygon_mask(ring, lens, px)
    base = naip(lens, px)
    context = Image.blend(base, Image.new('RGB', px, (17, 51, 63)), 0.55)
    b = {k: reflectance(scene, k, lens, px) for k in ('red', 'green', 'blue', 'nir')}
    views = {
        'aerial': base,
        'truecolor': reflectance_rgb([b['red'], b['green'], b['blue']]),
        'ndvi': ndvi_rgb(b['nir'], b['red'])[0],
        'falsecolor': reflectance_rgb([b['nir'], b['red'], b['green']]),
    }
    block_ndvi = None
    for name, img in views.items():
        out = img if name == 'aerial' else Image.composite(
            img.convert('RGB'), context, ImageChops.multiply(mask, img.getchannel('A')))
        d = ImageDraw.Draw(out)
        d.line(pts + [pts[0]], fill=(247, 245, 237), width=3, joint='curve')
        save(out, f'lens-{name}.webp')
    nd = ndvi_rgb(b['nir'], b['red'])[1]
    block_ndvi = float(np.nanmedian(nd[np.array(mask) > 0]))
    pixels = int((np.array(mask) > 0).sum() * (span / LENS_PX) ** 2 / 100)

    meta = {
        'place': PLACE,
        'aerial': {'source': 'USDA NAIP', **naip_meta(HERO_CENTER)},
        'sentinel': {'source': 'Copernicus Sentinel-2 L2A', 'scene': scene['id'], 'date': date, 'resolutionM': 10,
                     'attribution': f'Contains modified Copernicus Sentinel data {date[:4]}'},
        'hero': {'widthM': HERO_SIZE_M[0], 'heightM': HERO_SIZE_M[1],
                 'ndviMedian': round(float(np.nanmedian(ndvi)), 2)},
        'block': {'source': 'DWR / Land IQ 2023 crop mapping', 'id': str(block['properties']['UniqueID']),
                  'areaHa': round(ha, 1), 'pixels': pixels, 'ndviMedian': round(block_ndvi, 2)},
    }
    with open(os.path.join(OUT, 'imagery.json'), 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, indent=2)
    print(json.dumps(meta, indent=2))


if __name__ == '__main__':
    sys.exit(main())
