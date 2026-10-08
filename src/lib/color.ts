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

/** Black or white, whichever has the higher contrast ratio on `hex`. */
export function readableOn(hex: string) {
  const rgb = parse(hex);
  if (!rgb) return '#FFFFFF';
  const l = luminance(rgb);
  const onWhite = 1.05 / (l + 0.05);
  const onBlack = (l + 0.05) / 0.05;
  return onBlack >= onWhite ? '#0B0B10' : '#FFFFFF';
}

function toHsl([r, g, b]: RGB): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6 : max === gn ? ((bn - rn) / d + 2) / 6 : ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function fromHsl([h, s, l]: [number, number, number]): RGB {
  const hue = (p: number, q: number, t: number) => {
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}

/**
 * A show's accent from its AniList cover colour, tuned to be vivid and usable as a
 * button fill in both appearances. Near-greys fall back to the brand colour.
 */
export function showAccent(hex: string | null | undefined, fallback: string) {
  const rgb = hex ? parse(hex) : null;
  if (!rgb) return fallback;
  const [h, s, l] = toHsl(rgb);
  if (s < 0.12) return fallback;
  return toHex(fromHsl([h, Math.max(s, 0.62), Math.min(Math.max(l, 0.5), 0.62)]));
}
