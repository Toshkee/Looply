import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { CurrencyCode } from '@/domain/currency';
import type { CategorySpend } from '@/domain/insights';
import { useFormatters } from '@/hooks/useFormatters';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

import { CATEGORY_ICONS } from './categoryVisuals';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

/**
 * Ranked single-hue bars: bar length shows each category's share of the
 * monthly estimate; the label, not color, identifies the category.
 */
export function CategoryBars({ items, currency, limit }: { items: readonly CategorySpend[]; currency: CurrencyCode; limit?: number }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const format = useFormatters();
  const shown = limit ? items.slice(0, limit) : items;
  const max = Math.max(...shown.map((item) => item.share), 0);

  return (
    <View style={styles.list}>
      {shown.map((item) => {
        const label = t(`category.${item.category}`);
        const amount = format.money(item.monthlyMinor, currency);
        const percent = format.percent(item.share);
        return (
          <View key={item.category} style={styles.row} accessible accessibilityLabel={`${label}, ${amount}, ${percent}`}>
            <View style={styles.labels}>
              <Icon name={CATEGORY_ICONS[item.category]} size={16} color={colors.textSecondary} />
              <AppText variant="callout" numberOfLines={1} style={styles.name}>
                {label}
              </AppText>
              <AppText variant="amount" style={styles.amount}>
                {amount}
              </AppText>
              <AppText variant="caption" tone="tertiary" style={styles.percent}>
                {percent}
              </AppText>
            </View>
            <View style={[styles.track, { backgroundColor: colors.chartTrack }]}>
              <View style={[styles.fill, { backgroundColor: colors.chartMark, width: `${max > 0 ? (item.share / max) * 100 : 0}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md + 2 },
  row: { gap: spacing.sm },
  labels: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 },
  amount: { fontSize: 15 },
  percent: { minWidth: 36, textAlign: 'right' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
});
