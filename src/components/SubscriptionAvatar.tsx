import { StyleSheet, View } from 'react-native';

import { findBrand, glyphColorFor, relativeLuminance } from '@/domain/brands';
import type { CategoryId } from '@/domain/subscription';
import { useTheme } from '@/theme/ThemeProvider';

import { BrandGlyph } from './BrandGlyph';
import { categoryHue, withAlpha } from './categoryVisuals';
import { AppText } from './ui/AppText';

interface SubscriptionAvatarProps {
  name: string;
  category: CategoryId;
  size?: number;
  shape?: 'rounded' | 'circle';
  /** For monograms: a solid fill with light text, used where the avatar sits on a tinted card. */
  solid?: boolean;
}

/** First letter of the name (full grapheme for Cyrillic and accented letters). */
export function monogram(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase() : '?';
}

/**
 * The service's logo (or, for brands without a free logo, its initial) on its
 * brand color when the name matches a bundled brand; otherwise a monogram
 * tinted by category.
 */
export function SubscriptionAvatar({ name, category, size = 44, shape = 'rounded', solid = false }: SubscriptionAvatarProps) {
  const { scheme, colors } = useTheme();
  const brand = findBrand(name);
  const borderRadius = shape === 'circle' ? size / 2 : size * 0.3;

  if (brand) {
    const luminance = relativeLuminance(brand.hex);
    // Near-black logos on dark surfaces (and near-white on light) need an edge.
    const needsEdge = (scheme === 'dark' && luminance < 0.04) || (scheme === 'light' && luminance > 0.85);
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.tile,
          { width: size, height: size, borderRadius, backgroundColor: brand.hex },
          needsEdge && { borderWidth: 1, borderColor: colors.separator },
        ]}
      >
        {brand.glyph ? (
          <BrandGlyph glyph={brand.glyph} size={size * 0.5} color={glyphColorFor(brand.hex)} />
        ) : (
          <Initial name={name} size={size} color={glyphColorFor(brand.hex)} />
        )}
      </View>
    );
  }

  const hue = categoryHue(category, scheme);
  const background = solid ? hue : withAlpha(hue, scheme === 'dark' ? 0.2 : 0.14);
  const letterColor = solid ? (scheme === 'dark' ? '#17140F' : '#FFFFFF') : hue;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { width: size, height: size, borderRadius, backgroundColor: background }]}
    >
      <Initial name={name} size={size} color={letterColor} />
    </View>
  );
}

function Initial({ name, size, color }: { name: string; size: number; color: string }) {
  return (
    <AppText style={{ color, fontSize: size * 0.42, lineHeight: size * 0.52, fontWeight: '700' }} maxFontSizeMultiplier={1}>
      {monogram(name)}
    </AppText>
  );
}

/** Accent color for tinting cards: the brand color when known, otherwise the category hue. */
export function useSubscriptionTint(name: string, category: CategoryId): string {
  const { scheme } = useTheme();
  return findBrand(name)?.hex ?? categoryHue(category, scheme);
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
