import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '../components/navigation/TopNav.jsx';
import { Button } from '../components/core/Button.jsx';
import { SiteFooter } from './SiteFooter.jsx';
import { SatelliteWindow, NdviLegend } from './SatelliteWindow.jsx';
import meta from '../assets/imagery/imagery.json';
import lensAerial from '../assets/imagery/lens-aerial.webp';
import lensTrue from '../assets/imagery/lens-truecolor.webp';
import lensNdvi from '../assets/imagery/lens-ndvi.webp';
import lensFalse from '../assets/imagery/lens-falsecolor.webp';
import './home.css';

const SOURCES = [
  { name: 'Copernicus Sentinel-2', gives: 'Vegetation imagery: NDVI, true color and near-infrared', detail: '10 m, every few days, cloud-screened' },
  { name: 'USDA NAIP', gives: 'Aerial photo basemap for drawing your blocks', detail: '0.6 m' },
  { name: 'DWR / Land IQ', gives: 'Public vineyard boundaries you can start from', detail: '2023 crop map' },
  { name: 'National Weather Service', gives: 'Forecast and active alerts for your field', detail: '7 days' },
  { name: 'CIMIS', gives: 'Reference evapotranspiration (ET₀) for your location', detail: 'daily, 2 km grid' },
  { name: 'USDA NRCS', gives: 'Soil water-holding capacity by layer', detail: 'SSURGO' },
  { name: 'NASA POWER', gives: 'Rainfall history at your field', detail: 'daily' },
];

const STEPS = [
  { title: 'Map your vineyard', body: 'Pick your block from public vineyard boundaries, or draw it on the aerial photo. Up to three fields per account.' },
  { title: 'Read the context', body: 'See the latest clear satellite pass, the local forecast and reference ET₀, each with its date. Late or cloudy data shows as a gap.' },
  { title: 'Walk the rows that need it', body: 'Use the map to decide where to scout first, then track how the canopy changes through the season.' },
];

const formatDay = (iso) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/* The brand mark's contour-C, drawn large behind the hero copy. Lines draw in once on load. */
function ContourRings() {
  const rings = [90, 150, 210, 270, 330, 390, 450];
  return (
    <div className="hero-rings-clip" aria-hidden="true">
      <svg className="hero-rings" viewBox="-500 -500 1000 1000">
        {rings.map((r, i) => {
          const a = (38 * Math.PI) / 180; // opening faces the imagery, like the logo's C
          const x = (r * Math.cos(a)).toFixed(1), y = (r * Math.sin(a)).toFixed(1);
          return (
            <path
              key={r}
              d={`M ${x} ${-y} A ${r} ${r} 0 1 0 ${x} ${y}`}
              pathLength="1"
              style={{ animationDelay: `${i * 90}ms`, opacity: 0.72 - i * 0.08 }}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function WebsiteHome({ onNavigate }) {
  const { block, sentinel, aerial } = meta;
  const lenses = [
    { src: lensAerial, title: 'Aerial photo', body: `USDA NAIP, ${formatDay(aerial.date)}, ${aerial.resolutionM} m. Row direction, roads and buildings.` },
    { src: lensTrue, title: 'True color', body: `Sentinel-2, ${formatDay(sentinel.date)}, ${sentinel.resolutionM} m. What the satellite saw.` },
    { src: lensNdvi, title: 'NDVI', body: 'Canopy density from red and near-infrared light. A band through the middle reads thinner than the rows around it.' },
    { src: lensFalse, title: 'Near-infrared', body: 'Near-infrared shown as red. Leafy canopy reflects it strongly, so vigorous rows look brighter.' },
  ];

  return (
    <div className="home" data-screen-label="Website · Home">
      <section className="hero">
        <ContourRings />
        <TopNav
          tone="inverse"
          links={[
            { href: '/#lenses', label: 'Product' },
            { href: '/#how-it-works', label: 'How it works' },
          ]}
          onNavigate={onNavigate}
          cta={<Button size="sm" variant="solid-inverse" onClick={() => onNavigate('/app')}>Open beta</Button>}
          style={{ position: 'relative', zIndex: 2 }}
        />
        <div className="hero-grid">
          <div className="hero-copy">
            <h1 className="hero-title">Know your land like a satellite does.</h1>
            <p className="hero-lede">
              Satellite imagery, local weather and field conditions for your vineyard in one view,
              so you know which blocks to walk first.
            </p>
            <Button size="lg" variant="solid-inverse" onClick={() => onNavigate('/app')}>Map your first field</Button>
            <p className="hero-note">Free, with no paid plans. It shows observations, not irrigation or spray prescriptions.</p>
          </div>
          <SatelliteWindow />
        </div>
      </section>

      <section className="ledger home-container" aria-labelledby="ledger-title">
        <div className="ledger-intro">
          <h2 id="ledger-title">Every reading names its source and date.</h2>
          <p>
            CultiSync is built on public data. When a pass is cloudy or a source is late, you see a gap,
            not a guess.
          </p>
        </div>
        <table className="ledger-table">
          <thead className="visually-hidden">
            <tr><th scope="col">Source</th><th scope="col">What it gives you</th><th scope="col">Resolution or cadence</th></tr>
          </thead>
          <tbody>
            {SOURCES.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.name}</th>
                <td>{s.gives}</td>
                <td className="data">{s.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="lenses" className="lenses">
        <div className="home-container">
          <h2>One {block.areaHa.toFixed(0)}-hectare block, four ways of looking.</h2>
          <p className="lenses-lede">
            In the three satellite views, each square is 10 × 10 m, measured from 786 km up. This block holds
            about <span className="data">{Math.round(block.pixels / 10) * 10}</span> of them, enough to show where the canopy thins.
          </p>
          <div className="lens-grid">
            {lenses.map((l) => (
              <figure key={l.title} className="lens">
                <img src={l.src} width="720" height="720" loading="lazy" alt={`${l.title} view of a ${block.areaHa.toFixed(0)} ha vineyard block in ${meta.place}`} />
                <figcaption><strong>{l.title}</strong> {l.body}</figcaption>
              </figure>
            ))}
          </div>
          <div className="lenses-foot">
            <NdviLegend className="ndvi-legend-light" />
            <p>
              Observations, not prescriptions. Walk the block and talk to your PCA before you change
              irrigation or inputs. Block boundary: {block.source}. {sentinel.attribution}. Aerial
              imagery: USDA NAIP via USGS.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="steps home-container">
        <h2>From orbit to your boots in three steps.</h2>
        <ol className="steps-list">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="steps-num" aria-hidden="true">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="closing">
        <div className="home-container closing-inner">
          <h2>Built for small farms, and free.</h2>
          <p>
            No hardware to install and nothing to pay. Map up to three fields and see what the
            satellites see. CultiSync shows observations, not advice: it does not tell you how much to
            irrigate, when to spray or when to pick. The source code will be published under the
            Apache-2.0 license.
          </p>
          <Button size="lg" variant="solid-inverse" onClick={() => onNavigate('/app')}>Map your first field</Button>
        </div>
      </section>

      <SiteFooter onNavigate={onNavigate} />
    </div>
  );
}

/* Route shell: wires the prototype's onNavigate callback API to react-router. */
export default function WebsiteHomePage() {
  const navigate = useNavigate();
  return <WebsiteHome onNavigate={href => { if(href.startsWith('/#')) document.getElementById(href.slice(2))?.scrollIntoView({behavior:'smooth'}); else navigate(href); }} />;
}
