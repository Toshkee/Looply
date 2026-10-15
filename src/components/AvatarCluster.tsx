import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { monthlyEstimateMinor } from '@/domain/billing';
import type { Subscription } from '@/domain/subscription';
import { useTheme } from '@/theme/ThemeProvider';

import { categoryHue, withAlpha } from './categoryVisuals';
import { monogram } from './SubscriptionAvatar';
import { AppText } from './ui/AppText';

/**
 * Hand-placed, non-overlapping slots in a 150×110 design box: the largest
 * bubble sits in the middle, the rest orbit it in decreasing size.
 */
const BOX = { width: 150, height: 110 };
const BUBBLES = [
  { x: 75, y: 55, r: 28 },
  { x: 27, y: 38, r: 19 },
  { x: 117, y: 31, r: 17 },
  { x: 111, y: 85, r: 15 },
  { x: 46, y: 89, r: 13 },
  { x: 71, y: 13, r: 11 },
  { x: 79, y: 96, r: 9 },
];
const DOTS = [
  { x: 8, y: 70 },
  { x: 142, y: 60 },
  { x: 100, y: 8 },
  { x: 140, y: 100 },
];

/**
 * Decorative overview of active subscriptions, most expensive (by monthly
 * estimate) in the centre. Hidden from screen readers; the count beside it
 * carries the information.
 */
export function AvatarCluster({ subscriptions }: { subscriptions: readonly Subscription[] }) {
  const { scheme, colors } = useTheme();
  const [width, setWidth] = useState(0);
  const ranked = [...subscriptions].sort(
    (a, b) => monthlyEstimateMinor(b.amountMinor, b.interval) - monthlyEstimateMinor(a.amountMinor, a.interval),
  );
  const bubbles = ranked.slice(0, BUBBLES.length);
  const dots = Math.min(DOTS.length, Math.max(0, ranked.length - BUBBLES.length));
  const scale = width > 0 ? Math.min(width / BOX.width, 1.25) : 0;

  return (
    <View
      style={styles.container}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {scale > 0 ? (
        <View style={{ width: BOX.width * scale, height: BOX.height * scale }}>
          {bubbles.map((subscription, index) => {
            const slot = BUBBLES[index]!;
            const r = slot.r * scale;
            const hue = categoryHue(subscription.category, scheme);
            return (
              <Bubble key={subscription.id} delay={index * 45} style={{ left: slot.x * scale - r, top: slot.y * scale - r }}>
                <View
                  style={[
                    styles.bubble,
                    {
                      width: r * 2,
                      height: r * 2,
                      borderRadius: r,
                      backgroundColor: index === 0 ? hue : withAlpha(hue, scheme === 'dark' ? 0.32 : 0.2),
                      borderColor: colors.surface,
                    },
                  ]}
                >
                  {r >= 12 ? (
                    <AppText
                      maxFontSizeMultiplier={1}
                      style={{
                        fontSize: r * 0.8,
                        lineHeight: r * 1.0,
                        fontWeight: '700',
                        color: index === 0 ? (scheme === 'dark' ? '#17140F' : '#FFFFFF') : hue,
                      }}
                    >
                      {monogram(subscription.name)}
                    </AppText>
                  ) : null}
                </View>
              </Bubble>
            );
          })}
          {DOTS.slice(0, dots).map((dot, index) => (
            <Bubble key={`dot-${index}`} delay={(bubbles.length + index) * 45} style={{ left: dot.x * scale - 4, top: dot.y * scale - 4 }}>
              <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
            </Bubble>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Bubble({ delay, style, children }: { delay: number; style: object; children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(progress, { toValue: 1, delay, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
  }, [delay, progress]);
  return (
    <Animated.View style={[styles.absolute, style, { opacity: progress, transform: [{ scale: progress }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  absolute: { position: 'absolute' },
  bubble: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
