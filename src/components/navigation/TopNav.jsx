import React from 'react';
import logoMarkUrl from '../../assets/logo-mark.svg';
import logoMarkInverseUrl from '../../assets/logo-mark-inverse.svg';

/* tone="inverse" sits on a dark surface (the website hero): transparent, light text. */
export function TopNav({ links = [], activeHref = null, cta = null, onNavigate, tone = 'default', style, ...rest }) {
  const inverse = tone === 'inverse';
  return (
    <header
      style={{
        background: inverse ? 'transparent' : 'var(--surface-page)',
        borderBottom: inverse ? '1px solid rgba(235, 244, 247, 0.12)' : '1px solid var(--border-subtle)',
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          maxWidth: 'var(--container-web)',
          margin: '0 auto',
          padding: '0 var(--gutter-web)',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 40,
        }}
      >
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 'none' }}
        >
          <img src={inverse ? logoMarkInverseUrl : logoMarkUrl} width="34" height="34" alt="" />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 21,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: inverse ? 'var(--text-inverse)' : 'var(--ink-1)',
            }}
          >
            Culti<span style={{ color: inverse ? 'var(--sky-300)' : 'var(--accent)' }}>Sync</span>
          </span>
        </a>
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {links.map((link) => {
            const isActive = link.href === activeHref;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); onNavigate && onNavigate(link.href); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-pill)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontWeight: 500,
                  color: inverse ? (isActive ? 'var(--text-inverse)' : 'rgba(235, 244, 247, 0.72)')
                    : isActive ? 'var(--text-body)' : 'var(--text-muted)',
                  background: isActive ? (inverse ? 'rgba(235, 244, 247, 0.08)' : 'var(--surface-sunken)') : 'transparent',
                }}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
        {cta}
      </div>
    </header>
  );
}
