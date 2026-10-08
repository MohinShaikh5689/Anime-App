/** Small colour helpers for per-show theming from AniList's cover colour. */

type RGB = [number, number, number];

function parse(hex: string): RGB | null {
  const h = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

function toHex([r, g, b]: RGB) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** #RRGGBB plus an alpha, as #RRGGBBAA. */
export function withAlpha(hex: string, alpha: number) {
  const rgb = parse(hex);
  if (!rgb) return hex;
  return `${toHex(rgb)}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

/** Mixes `hex` toward `target` by `amount` (0–1). */
export function mix(hex: string, target: string, amount: number) {
  const a = parse(hex);
  const b = parse(target);
  if (!a || !b) return hex;
  return toHex(a.map((v, i) => v + (b[i] - v) * amount) as RGB);
}

/** Black or white, whichever reads better on `hex`. */
export function readableOn(hex: string) {
  const rgb = parse(hex);
  if (!rgb) return '#FFFFFF';
  return luminance(rgb) > 0.36 ? '#0B0B10' : '#FFFFFF';
}

/**
 * A show's accent, tuned so it works as a button fill in both appearances:
 * very light colours are deepened, very dark ones lifted.
 */
export function showAccent(hex: string | null | undefined, fallback: string) {
  const rgb = hex ? parse(hex) : null;
  if (!rgb) return fallback;
  const l = luminance(rgb);
  if (l > 0.55) return mix(hex!, '#000000', 0.35);
  if (l < 0.04) return mix(hex!, '#FFFFFF', 0.3);
  return toHex(rgb);
}
