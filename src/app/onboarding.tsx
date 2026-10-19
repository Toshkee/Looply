import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SelectSheet } from '@/components/SelectSheet';
import { SubscriptionAvatar } from '@/components/SubscriptionAvatar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { CURRENCY_CODES, type CurrencyCode } from '@/domain/currency';
import { SERVICE_PRESETS } from '@/domain/presets';
import { FREE_SUBSCRIPTION_LIMIT } from '@/domain/pro';
import { changeAppLanguage, currentLanguage } from '@/i18n';
import { APP_LANGUAGES, LANGUAGE_NATIVE_NAMES, type AppLanguage } from '@/i18n/languages';
import { haptics } from '@/services/haptics';
import { useIsPro } from '@/state/pro';
import { useSettingsStore } from '@/state/settingsStore';
import { queueFirstSubscriptions } from '@/state/setupQueue';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, radius, spacing } from '@/theme/tokens';

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const update = useSettingsStore((s) => s.update);
  const isPro = useIsPro();
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<AppLanguage>(currentLanguage());
  const [currency, setCurrency] = useState<CurrencyCode>(useSettingsStore.getState().settings.currency);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [step, fade]);

  const chooseLanguage = (value: AppLanguage) => {
    setLanguage(value);
    // The whole screen switches immediately; it is saved when onboarding finishes.
    changeAppLanguage(value).catch(() => undefined);
  };

  const togglePreset = (name: string) => {
    if (picked.includes(name)) setPicked(picked.filter((other) => other !== name));
    // The free version holds a limited number, so no more can be picked than it can save.
    else if (isPro || picked.length < FREE_SUBSCRIPTION_LIMIT) setPicked([...picked, name]);
    else haptics.warning();
  };

  const finish = async () => {
    setSaving(true);
    try {
      queueFirstSubscriptions(picked);
      await update({ language, currency, onboardingCompleted: true });
      haptics.success();
    } catch {
      queueFirstSubscriptions([]);
      setSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.progressRow}>
        <AppText variant="label" tone="tertiary">
          {t('onboarding.stepOf', { current: step, total: TOTAL_STEPS })}
        </AppText>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <View
              key={index}
              style={[styles.dot, { backgroundColor: index < step ? colors.accent : colors.surfaceMuted, width: index + 1 === step ? 22 : 8 }]}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fade, gap: spacing.xxl }}>
          {step === 1 ? (
            <>
              <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
              <View style={styles.intro}>
                <AppText variant="title" accessibilityRole="header">
                  {t('onboarding.welcomeTitle')}
                </AppText>
                <AppText variant="body" tone="secondary">
                  {t('onboarding.welcomeBody')}
                </AppText>
              </View>
              <View style={styles.group}>
                <AppText variant="label" tone="secondary" style={styles.groupLabel}>
                  {t('onboarding.languageLabel')}
                </AppText>
                <Card padded={false}>
                  {APP_LANGUAGES.map((code, index) => {
                    const selected = code === language;
                    return (
                      <Pressable
                        key={code}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, checked: selected }}
                        accessibilityLabel={LANGUAGE_NATIVE_NAMES[code]}
                        onPress={() => {
                          haptics.selection();
                          chooseLanguage(code);
                        }}
                        style={({ pressed }) => [
                          styles.option,
                          index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                          pressed && { backgroundColor: colors.surfacePressed },
                        ]}
                      >
                        <AppText variant="body" style={styles.optionLabel}>
                          {LANGUAGE_NATIVE_NAMES[code]}
                        </AppText>
                        <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.textTertiary }]}>
                          {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            </>
          ) : step === 2 ? (
            <>
              <View style={styles.intro}>
                <AppText variant="title" accessibilityRole="header">
                  {t('onboarding.setupTitle')}
                </AppText>
                <AppText variant="body" tone="secondary">
                  {t('onboarding.setupBody')}
                </AppText>
              </View>
              <View style={styles.group}>
                <AppText variant="label" tone="secondary" style={styles.groupLabel}>
                  {t('onboarding.currencyLabel')}
                </AppText>
                <Card padded={false}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('onboarding.currencyLabel')}, ${t(`currencyName.${currency}`)}`}
                    onPress={() => setCurrencyOpen(true)}
                    style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surfacePressed }]}
                  >
                    <View style={[styles.currencyBadge, { backgroundColor: colors.accentSoft }]}>
                      <AppText variant="label" tone="accent">
                        {currency}
                      </AppText>
                    </View>
                    <AppText variant="body" style={styles.optionLabel}>
                      {t(`currencyName.${currency}`)}
                    </AppText>
                    <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
                  </Pressable>
                </Card>
              </View>
              <Card style={styles.privacy}>
                <View style={[styles.privacyIcon, { backgroundColor: colors.surfaceMuted }]}>
                  <Icon name="shield-checkmark-outline" size={22} color={colors.text} />
                </View>
                <View style={styles.privacyText}>
                  <AppText variant="headline">{t('onboarding.privacyTitle')}</AppText>
                  <AppText variant="callout" tone="secondary">
                    {t('onboarding.privacyBody')}
                  </AppText>
                </View>
              </Card>
            </>
          ) : (
            <>
              <View style={styles.intro}>
                <AppText variant="title" accessibilityRole="header">
                  {t('onboarding.pickTitle')}
                </AppText>
                <AppText variant="body" tone="secondary">
                  {t('onboarding.pickBody')}
                </AppText>
              </View>
              <View style={styles.presets}>
                {SERVICE_PRESETS.map((preset) => (
                  <Chip
                    key={preset.name}
                    label={preset.name}
                    selected={picked.includes(preset.name)}
                    onPress={() => togglePreset(preset.name)}
                    leading={<SubscriptionAvatar name={preset.name} category={preset.category} size={22} shape="circle" />}
                  />
                ))}
              </View>
              {!isPro ? (
                <AppText variant="caption" tone="tertiary" style={styles.groupLabel}>
                  {t('pro.featureUnlimitedBody', { limit: FREE_SUBSCRIPTION_LIMIT })}
                </AppText>
              ) : null}
            </>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {step > 1 ? <Button label={t('common.back')} variant="secondary" onPress={() => setStep(step - 1)} style={styles.backButton} /> : null}
        <Button
          label={
            step < TOTAL_STEPS
              ? t('common.continue')
              : picked.length > 0
                ? t('onboarding.addPicked', { count: picked.length })
                : t('onboarding.start')
          }
          onPress={() => (step < TOTAL_STEPS ? setStep(step + 1) : finish())}
          loading={saving}
          style={styles.primaryButton}
        />
      </View>

      <SelectSheet
        visible={currencyOpen}
        title={t('onboarding.currencyLabel')}
        closeLabel={t('common.close')}
        value={currency}
        onSelect={setCurrency}
        onClose={() => setCurrencyOpen(false)}
        options={CURRENCY_CODES.map((code) => ({ value: code, label: t(`currencyName.${code}`), detail: code }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  content: { paddingHorizontal: GUTTER, paddingTop: spacing.xxxl, paddingBottom: spacing.xl },
  logo: { width: 72, height: 72, borderRadius: 18 },
  intro: { gap: spacing.md },
  group: { gap: spacing.sm },
  groupLabel: { marginLeft: spacing.xs },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg },
  optionLabel: { flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  currencyBadge: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  privacy: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  privacyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  privacyText: { flex: 1, gap: spacing.xs },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: GUTTER, paddingTop: spacing.md },
  backButton: { flex: 1 },
  primaryButton: { flex: 2 },
});
