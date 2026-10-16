import { router } from 'expo-router';
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

/** A tab that belongs to Looply Pro, shown to the free version. */
export function ProLockedScreen({ title, feature }: { title: string; feature: keyof typeof COPY }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const copy = COPY[feature];
  return (
    <ScreenScroll title={title}>
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
