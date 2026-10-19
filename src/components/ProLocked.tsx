import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ProFeature } from '@/domain/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Icon } from './ui/Icon';
import { ScreenScroll } from './ui/ScreenScroll';

const COPY = {
  insights: { title: 'pro.lockedInsightsTitle', body: 'pro.lockedInsightsBody', icon: 'pie-chart-outline' },
  calendar: { title: 'pro.lockedCalendarTitle', body: 'pro.lockedCalendarBody', icon: 'calendar-outline' },
} as const satisfies Partial<Record<ProFeature, { title: string; body: string; icon: string }>>;

/** One line of the user's own data shown above the offer. */
export interface TeaserItem {
  key: string;
  label: string;
  value: string;
  detail?: string;
  leading?: ReactNode;
}

/** Rows after the first keep their label but hide their numbers and fade out. */
const HIDDEN_ROW_OPACITY = [0.55, 0.3];
const hideDigits = (text: string) => text.replace(/\d/g, '•');

/**
 * A tab that belongs to Looply Pro, shown to the free version. With a teaser
 * it opens on the user's own numbers: the first row in full, the rest hidden.
 */
export function ProLockedScreen({
  title,
  feature,
  teaserTitle,
  teaser = [],
}: {
  title: string;
  feature: keyof typeof COPY;
  teaserTitle?: string;
  teaser?: TeaserItem[];
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const copy = COPY[feature];
  const rows = teaser.slice(0, HIDDEN_ROW_OPACITY.length + 1);
  return (
    <ScreenScroll title={title}>
      {teaserTitle && rows.length > 0 ? (
        <Card padded={false}>
          <AppText variant="label" tone="secondary" style={styles.teaserTitle}>
            {teaserTitle}
          </AppText>
          {rows.map((item, index) => {
            const hidden = index > 0;
            return (
              <View
                key={item.key}
                accessible
                accessibilityLabel={
                  hidden ? `${item.label}, ${t('pro.teaserHidden')}` : [item.label, item.value, item.detail].filter(Boolean).join(', ')
                }
                style={[
                  styles.teaserRow,
                  { borderTopColor: colors.separator },
                  hidden && { opacity: HIDDEN_ROW_OPACITY[index - 1] },
                ]}
              >
                {item.leading}
                <AppText variant="bodyStrong" numberOfLines={1} style={styles.teaserLabel}>
                  {item.label}
                </AppText>
                <View style={styles.teaserValues}>
                  <AppText variant="amount">{hidden ? hideDigits(item.value) : item.value}</AppText>
                  {item.detail && !hidden ? (
                    <AppText variant="caption" tone="secondary">
                      {item.detail}
                    </AppText>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
      <Card>
        <View style={styles.body}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
            <Icon name={copy.icon} size={28} color={colors.accentText} />
            <View style={[styles.lock, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              <Icon name="lock-closed" size={12} color={colors.onPrimary} />
            </View>
          </View>
          <AppText variant="heading" align="center">
            {t(copy.title)}
          </AppText>
          <AppText variant="callout" tone="secondary" align="center" style={styles.text}>
            {t(copy.body)}
          </AppText>
          <Button
            label={t('pro.unlock')}
            icon="sparkles"
            onPress={() => router.push({ pathname: '/pro', params: { feature } })}
            style={styles.action}
          />
        </View>
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  teaserTitle: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  teaserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  teaserLabel: { flex: 1 },
  teaserValues: { alignItems: 'flex-end', gap: 2 },
  body: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg, gap: spacing.md },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  lock: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { maxWidth: 320 },
  action: { marginTop: spacing.md, alignSelf: 'stretch' },
});
