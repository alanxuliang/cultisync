import React from 'react';
import logoMarkInverseUrl from '../assets/logo-mark-inverse.svg';

export function SiteFooter({ onNavigate }) {
  return (
    <footer style={{ background: 'var(--sky-900)', borderTop: '1px solid rgba(238,241,248,0.12)', fontFamily: 'var(--font-body)' }}>
      <div
        style={{
          maxWidth: 'var(--container-web)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '28px var(--gutter-web)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logoMarkInverseUrl} width="28" height="28" alt="CultiSync" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text-inverse)' }}>
            Culti<span style={{ color: 'var(--sky-300)' }}>Sync</span>
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 24, fontSize: 13.5 }}>
          {[
            { label: 'Support', href: 'mailto:support@cultisync.com' },
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={{ color: 'rgba(238,241,248,0.7)', textDecoration: 'none' }}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'rgba(238,241,248,0.45)' }}>
          © 2026 CultiSync
        </span>
      </div>
    </footer>
  );
}
