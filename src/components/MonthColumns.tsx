import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getParts } from '@/domain/calendarDate';
import type { CurrencyCode } from '@/domain/currency';
import type { MonthTotal } from '@/domain/insights';
import { useFormatters } from '@/hooks/useFormatters';
import { haptics } from '@/services/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';

const PLOT_HEIGHT = 120;
const BAR_WIDTH = 22;

/**
 * Single-series columns of scheduled charges per month. Tapping a column
 * shows its value in the header (the touch equivalent of a tooltip), so only
 * one number is ever printed on the chart.
 */
export function MonthColumns({ items, currency }: { items: readonly MonthTotal[]; currency: CurrencyCode }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const format = useFormatters();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const max = Math.max(...items.map((item) => item.amountMinor), 0);
  const selected = items[selectedIndex] ?? items[0];
  const monthsShort = t('dates.monthsShort', { returnObjects: true }) as unknown as readonly string[];

  if (!selected) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header} accessibilityLiveRegion="polite">
        <AppText variant="caption" tone="secondary">
          {format.monthYear(selected.month)}
        </AppText>
        <AppText variant="heading" style={styles.value}>
          {format.money(selected.amountMinor, currency)}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {t('counts.payments', { count: selected.count })}
        </AppText>
      </View>
      <View style={[styles.plot, { borderBottomColor: colors.separator }]}>
        {items.map((item, index) => {
          const height = max > 0 ? Math.max((item.amountMinor / max) * PLOT_HEIGHT, item.amountMinor > 0 ? 4 : 0) : 0;
          const isSelected = index === selectedIndex;
          return (
            <Pressable
              key={item.month}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${format.monthYear(item.month)}, ${format.money(item.amountMinor, currency)}`}
              onPress={() => {
                haptics.selection();
                setSelectedIndex(index);
              }}
              style={styles.slot}
            >
              <View
                style={[
                  styles.bar,
                  { height, backgroundColor: colors.chartMark, opacity: isSelected ? 1 : 0.38 },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labels}>
        {items.map((item, index) => (
          <AppText
            key={item.month}
            variant="micro"
            tone={index === selectedIndex ? 'primary' : 'tertiary'}
            align="center"
            numberOfLines={1}
            style={styles.label}
          >
            {(monthsShort[getParts(item.month).month - 1] ?? '').replace('.', '')}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  header: { gap: 2, marginBottom: spacing.sm },
  value: { fontVariant: ['tabular-nums'] },
  plot: {
    height: PLOT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slot: { flex: 1, height: PLOT_HEIGHT, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: BAR_WIDTH, borderTopLeftRadius: radius.sm / 2, borderTopRightRadius: radius.sm / 2 },
  labels: { flexDirection: 'row' },
  label: { flex: 1 },
});
