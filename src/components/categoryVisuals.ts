import type { CategoryId } from '@/domain/subscription';
import type { ColorScheme } from '@/theme/ThemeProvider';
import { categoryHues } from '@/theme/tokens';

import type { IconName } from './ui/Icon';

export const CATEGORY_ICONS: Record<CategoryId, IconName> = {
  entertainment: 'film-outline',
  music: 'musical-notes-outline',
  productivity: 'briefcase-outline',
  cloud: 'cloud-outline',
  gaming: 'game-controller-outline',
  fitness: 'barbell-outline',
  utilities: 'flash-outline',
  telecom: 'wifi-outline',
  education: 'school-outline',
  other: 'pricetag-outline',
};

export function categoryHue(category: CategoryId, scheme: ColorScheme): string {
  return categoryHues[category][scheme];
}

/** Hex color with an alpha suffix, e.g. a 14% tint of a category hue. */
export function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${value}`;
}
