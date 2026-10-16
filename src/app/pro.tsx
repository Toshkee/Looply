import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { FREE_SUBSCRIPTION_LIMIT, isProFeature, type ProFeature } from '@/domain/pro';
import { useFormatters } from '@/hooks/useFormatters';
import { haptics } from '@/services/haptics';
import { purchases } from '@/services/purchases';
import { buyPro, restorePro, useIsPro } from '@/state/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, spacing } from '@/theme/tokens';

const REASON_KEYS = {
  limit: 'pro.reasonLimit',
  insights: 'pro.reasonInsights',
  calendar: 'pro.reasonCalendar',
} as const satisfies Record<ProFeature, string>;

export default function ProScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useFormatters();
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();
  const params = useLocalSearchParams<{ feature?: string }>();
  const feature = isProFeature(params.feature) ? params.feature : null;
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const price = format.money(purchases.price.amountMinor, purchases.price.currency);

  const features: { icon: IconName; title: string; body: string }[] = [
    {
      icon: 'infinite-outline',
      title: t('pro.featureUnlimited'),
      body: t('pro.featureUnlimitedBody', { limit: FREE_SUBSCRIPTION_LIMIT }),
    },
    { icon: 'pie-chart-outline', title: t('pro.featureInsights'), body: t('pro.featureInsightsBody') },
    { icon: 'calendar-outline', title: t('pro.featureCalendar'), body: t('pro.featureCalendarBody') },
    { icon: 'lock-open-outline', title: t('pro.featureOnce'), body: t('pro.featureOnceBody') },
  ];

  const finishPurchase = async () => {
    setBusy('buy');
    try {
      if (await buyPro()) {
        haptics.success();
        Alert.alert(t('pro.unlocked'));
        router.back();
      }
    } catch {
      Alert.alert(t('pro.error'));
    } finally {
      setBusy(null);
    }
  };

  const purchase = () => {
    if (purchases.mode !== 'test') {
      finishPurchase().catch(() => undefined);
      return;
    }
    // A test purchase is confirmed in the app, since no store sheet appears.
    Alert.alert(t('pro.testConfirmTitle'), t('pro.testConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('pro.testConfirm'), onPress: () => void finishPurchase() },
    ]);
  };

  const restore = async () => {
    setBusy('restore');
    try {
      if (await restorePro()) {
        haptics.success();
        Alert.alert(t('pro.restored'));
        router.back();
      } else {
        Alert.alert(t('pro.restoreNone'));
      }
    } catch {
      Alert.alert(t('pro.error'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.sm }]}>
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={() => router.back()} size={40} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.mark, { backgroundColor: colors.accent }]}>
            <Icon name={isPro ? 'checkmark' : 'sparkles'} size={34} color="#FFFFFF" />
          </View>
          <AppText variant="title" align="center" accessibilityRole="header">
            {isPro ? t('pro.activeTitle') : t('pro.title')}
          </AppText>
          <AppText variant="callout" tone="secondary" align="center" style={styles.lead}>
            {isPro
              ? t('pro.activeBody')
              : feature
                ? t(REASON_KEYS[feature], { limit: FREE_SUBSCRIPTION_LIMIT })
                : t('pro.tagline')}
          </AppText>
        </View>

        <Card padded={false}>
          {features.map((item, index) => (
            <View
              key={item.icon}
              style={[styles.feature, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name={item.icon} size={20} color={colors.accentText} />
              </View>
              <View style={styles.featureText}>
                <AppText variant="bodyStrong">{item.title}</AppText>
                <AppText variant="caption" tone="secondary">
                  {item.body}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {isPro ? (
          <Button label={t('common.close')} onPress={() => router.back()} />
        ) : (
          <>
            <Button
              label={t('pro.buy', { price })}
              onPress={purchase}
              loading={busy === 'buy'}
              disabled={busy !== null}
            />
            <Button
              label={t('pro.restore')}
              variant="ghost"
              size="md"
              onPress={() => void restore()}
              loading={busy === 'restore'}
              disabled={busy !== null}
            />
            {purchases.mode === 'test' ? (
              <AppText variant="caption" tone="tertiary" align="center">
                {t('pro.testModeNote')}
              </AppText>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: GUTTER, alignItems: 'flex-end' },
  content: { paddingHorizontal: GUTTER, paddingBottom: spacing.xl, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  mark: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  lead: { maxWidth: 340 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  featureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, gap: 2 },
  footer: { paddingHorizontal: GUTTER, paddingTop: spacing.md, gap: spacing.xs },
});
