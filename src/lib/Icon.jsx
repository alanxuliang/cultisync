import React from 'react';
import { ChevronsLeftRight, CloudRain, Layers3, Sprout } from 'lucide-react';

/* Explicit registry (keeps the bundle tree-shakeable) — add icons here as the
   vocabulary grows. Outlined, 2px stroke, currentColor, per the ICONOGRAPHY rules. */
const REGISTRY = {
  'chevrons-left-right': ChevronsLeftRight,
  'cloud-rain': CloudRain,
  layers: Layers3,
  sprout: Sprout,
};

export function Icon({ name, size = 20, style, ...rest }) {
  const Lucide = REGISTRY[name];
  if (!Lucide) {
    if (import.meta.env.DEV) console.warn(`Icon: "${name}" is not registered in src/lib/Icon.jsx`);
    return null;
  }
  return (
    <Lucide
      size={size}
      strokeWidth={2}
      aria-hidden="true"
      style={{ flex: 'none', ...style }}
      {...rest}
    />
  );
}
