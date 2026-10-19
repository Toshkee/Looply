import { BRAND_ICONS, type BrandIcon } from '@/assets/brandIcons.generated';

export type { BrandIcon };

/**
 * Aliases shorter than this only match a whole first word or the whole name
 * ("EA Play" but not "Easy", "Canva Pro" but not "Canvas", "m:tel").
 */
const SHORT_ALIAS_LENGTH = 6;

/** Longest aliases first, so "YouTube Music" wins over "YouTube". */
const ALIAS_INDEX = BRAND_ICONS.flatMap((icon) => icon.aliases.map((alias) => ({ alias, icon }))).sort(
  (a, b) => b.alias.length - a.alias.length,
);

export function normalizeServiceName(name: string): { compact: string; firstWord: string } {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .replace(/\+/g, ' plus')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return { compact: words.join(''), firstWord: words[0] ?? '' };
}

const cache = new Map<string, BrandIcon | null>();

/** The bundled logo for a subscription name, or `null` to fall back to a monogram. */
export function findBrand(name: string): BrandIcon | null {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const { compact, firstWord } = normalizeServiceName(name);
  let match: BrandIcon | null = null;
  if (compact !== '') {
    for (const { alias, icon } of ALIAS_INDEX) {
      const matches =
        alias.length >= SHORT_ALIAS_LENGTH ? compact.startsWith(alias) : firstWord === alias || compact === alias;
      if (matches) {
        match = icon;
        break;
      }
    }
  }
  cache.set(name, match);
  return match;
}

/** Relative luminance (WCAG) of a `#RRGGBB` color. */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Glyph color that stays legible on the brand color. */
export function glyphColorFor(hex: string): string {
  return relativeLuminance(hex) > 0.45 ? '#17140F' : '#FFFFFF';
}
