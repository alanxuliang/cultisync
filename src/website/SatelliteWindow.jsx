import React from 'react';
import { Icon } from '../lib/Icon.jsx';
import aerialUrl from '../assets/imagery/hero-aerial.webp';
import aerialSmallUrl from '../assets/imagery/hero-aerial-900.webp';
import ndviUrl from '../assets/imagery/hero-ndvi.webp';
import ndviSmallUrl from '../assets/imagery/hero-ndvi-900.webp';
import meta from '../assets/imagery/imagery.json';

const clamp = (v) => Math.min(100, Math.max(0, v));
const formatDay = (iso) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/* Real imagery of one place, split by a draggable divider: aerial photo on the left,
   Sentinel-2 NDVI on the right. Pixels stay square (no smoothing) so 10 m is visibly 10 m. */
export function SatelliteWindow() {
  const frame = React.useRef(null);
  const dragging = React.useRef(false);
  const [split, setSplit] = React.useState(96);
  const touched = React.useRef(false);
  const setTouched = () => { touched.current = true; };

  // One orchestrated moment: the divider sweeps in once to show that it moves.
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setSplit(50); return; }
    let raf, start;
    const from = 96, to = 50, duration = 1400;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      if (touched.current) return;
      start ??= now;
      const t = Math.min(1, (now - start - 350) / duration);
      if (t > 0) setSplit(from + (to - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const moveTo = (clientX) => {
    const r = frame.current.getBoundingClientRect();
    setSplit(clamp(((clientX - r.left) / r.width) * 100));
  };
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging.current = true;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const onPointerMove = (e) => { if (dragging.current) moveTo(e.clientX); };
  const onPointerUp = () => { dragging.current = false; };
  const onKeyDown = (e) => {
    const keys = { ArrowLeft: -5, ArrowRight: 5, PageDown: -20, PageUp: 20 };
    if (e.key in keys) { e.preventDefault(); setTouched(true); setSplit((s) => clamp(s + keys[e.key])); }
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); setTouched(true); setSplit(e.key === 'Home' ? 0 : 100); }
  };

  const { aerial, sentinel, hero } = meta;
  return (
    <figure className="satwin">
      <div
        ref={frame}
        className="satwin-frame"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          className="satwin-img"
          src={aerialUrl}
          srcSet={`${aerialSmallUrl} 900w, ${aerialUrl} 1800w`}
          sizes="(min-width: 960px) 60vw, 100vw"
          width="1800" height="1500"
          alt={`Aerial photograph of vineyard blocks in ${meta.place}`}
          draggable="false"
          fetchpriority="high"
        />
        <div className="satwin-ndvi" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
          <img
            className="satwin-img"
            src={ndviUrl}
            srcSet={`${ndviSmallUrl} 900w, ${ndviUrl} 1800w`}
            sizes="(min-width: 960px) 60vw, 100vw"
            width="1800" height="1500"
            alt={`Sentinel-2 NDVI of the same area on ${formatDay(sentinel.date)}`}
            draggable="false"
          />
          <span className="satwin-tag satwin-tag-right">NDVI, {formatDay(sentinel.date)}</span>
        </div>
        <span className="satwin-tag satwin-tag-left" style={{ opacity: split < 22 ? 0 : 1 }} aria-hidden={split < 22}>Aerial photo</span>
        <div className="satwin-divider" style={{ left: `${split}%` }}>
          <button
            type="button"
            className="satwin-handle"
            role="slider"
            aria-label="Compare the aerial photo with NDVI"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(split)}
            aria-valuetext={`NDVI shows on the right ${Math.round(100 - split)} percent of the image`}
            onKeyDown={onKeyDown}
          >
            <Icon name="chevrons-left-right" size={20} />
          </button>
        </div>
      </div>
      <figcaption className="satwin-caption">
        <div className="satwin-place">
          <strong>{meta.place}</strong>
          <span className="data">{(hero.widthM / 1000).toFixed(1)} × {(hero.heightM / 1000).toFixed(1)} km</span>
        </div>
        <dl className="satwin-sources">
          <div><dt>Aerial</dt><dd><span className="data">{aerial.source}, {formatDay(aerial.date)}, {aerial.resolutionM} m</span></dd></div>
          <div><dt>NDVI</dt><dd><span className="data">Sentinel-2, {formatDay(sentinel.date)}, {sentinel.resolutionM} m</span></dd></div>
        </dl>
        <NdviLegend />
        <p className="satwin-credit">{sentinel.attribution}. Aerial imagery: USDA NAIP via USGS.</p>
      </figcaption>
    </figure>
  );
}

/* Covers every colour the renderer paints (imagery.js stops -1 … 1): a short segment for
   negative values (water) and a full 0–1 bar with stops at their true positions. */
export function NdviLegend({ className = '' }) {
  return (
    <div
      className={`ndvi-legend ${className}`}
      role="img"
      aria-label="NDVI colour scale: below 0 is water, 0 is bare soil, 1 is dense canopy"
    >
      <div className="ndvi-legend-part" aria-hidden="true">
        <div className="ndvi-legend-bar ndvi-legend-bar-neg" />
        <div className="ndvi-legend-ticks data"><span>&lt;0</span></div>
        <div className="ndvi-legend-ends"><span>Water</span></div>
      </div>
      <div className="ndvi-legend-part" aria-hidden="true">
        <div className="ndvi-legend-bar" />
        <div className="ndvi-legend-ticks data">
          {['0', '0.2', '0.4', '0.6', '0.8', '1'].map((t) => <span key={t}>{t}</span>)}
        </div>
        <div className="ndvi-legend-ends"><span>Bare soil</span><span>Dense canopy</span></div>
      </div>
    </div>
  );
}
