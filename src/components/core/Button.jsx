import React from 'react';

export function Button({
  variant = 'primary',
  size = 'md',
  icon = null,
  fullWidth = false,
  disabled = false,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const sizes = {
    sm: { height: 36, padding: '0 16px', fontSize: 14, gap: 6 },
    md: { height: 44, padding: '0 20px', fontSize: 15, gap: 8 },
    lg: { height: 52, padding: '0 26px', fontSize: 16, gap: 8 },
  };

  /* primary stays quiet. solid / solid-inverse are for the one loud conversion CTA on a
     surface (see DESIGN_SYSTEM.md §7). */
  const palettes = {
    solid: {
      bg: 'var(--accent)', bgHover: 'var(--accent-hover)', bgPress: 'var(--accent-press)',
      color: 'var(--text-on-accent)', border: '1px solid transparent',
    },
    'solid-inverse': {
      bg: 'var(--sky-300)', bgHover: 'var(--sky-200)', bgPress: 'var(--sky-400)',
      color: 'var(--sky-900)', border: '1px solid transparent',
    },
    primary: {
      bg: 'var(--accent-soft)', bgHover: 'var(--sky-200)', bgPress: 'var(--sky-300)',
      color: 'var(--accent-text)', border: '1px solid transparent',
    },
    secondary: {
      bg: 'transparent', bgHover: 'var(--surface-sunken)', bgPress: 'var(--stone-100)',
      color: 'var(--text-muted)', border: '1px solid var(--border-strong)',
    },
    ghost: {
      bg: 'transparent', bgHover: 'var(--surface-sunken)', bgPress: 'var(--stone-100)',
      color: 'var(--accent-text)', border: '1px solid transparent',
    },
    danger: {
      bg: 'transparent', bgHover: 'var(--danger-soft)', bgPress: 'var(--red-100)',
      color: 'var(--red-700)', border: '1px solid var(--border-strong)',
    },
  };

  const s = sizes[size] || sizes.md;
  const p = palettes[variant] || palettes.primary;
  const bg = disabled ? p.bg : press ? p.bgPress : hover ? p.bgHover : p.bg;

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'var(--font-body)',
        fontWeight: variant.startsWith('solid') ? 600 : 500,
        lineHeight: 1,
        background: bg,
        color: p.color,
        border: p.border,
        borderRadius: 'var(--radius-pill)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background var(--duration-fast) var(--ease-out)',
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
