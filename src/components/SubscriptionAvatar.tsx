import { StyleSheet, View } from 'react-native';

import type { CategoryId } from '@/domain/subscription';
import { useTheme } from '@/theme/ThemeProvider';

import { categoryHue, withAlpha } from './categoryVisuals';
import { AppText } from './ui/AppText';

interface SubscriptionAvatarProps {
  name: string;
  category: CategoryId;
  size?: number;
  shape?: 'rounded' | 'circle';
  /** A solid fill with light text, used where the avatar sits on a tinted card. */
  solid?: boolean;
}

/** First letter of the name (full grapheme for Cyrillic and accented letters). */
export function monogram(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase() : '?';
}

/**
 * A monogram tile tinted by category. Service logos are deliberately not
 * bundled: they are third-party trademarks and would need a network lookup.
 */
export function SubscriptionAvatar({ name, category, size = 44, shape = 'rounded', solid = false }: SubscriptionAvatarProps) {
  const { scheme } = useTheme();
  const hue = categoryHue(category, scheme);
  const background = solid ? hue : withAlpha(hue, scheme === 'dark' ? 0.2 : 0.14);
  const letterColor = solid ? (scheme === 'dark' ? '#17140F' : '#FFFFFF') : hue;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : size * 0.3, backgroundColor: background },
      ]}
    >
      <AppText
        style={{ color: letterColor, fontSize: size * 0.42, lineHeight: size * 0.52, fontWeight: '700' }}
        maxFontSizeMultiplier={1}
      >
        {monogram(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
