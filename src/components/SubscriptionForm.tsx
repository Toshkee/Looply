import { router, Stack } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CURRENCY_CODES } from '@/domain/currency';
import { formatAmountForInput } from '@/domain/money';
import { matchPresets, type ServicePreset } from '@/domain/presets';
import {
  BILLING_INTERVALS,
  CATEGORY_IDS,
  REMINDER_OPTIONS,
  SUBSCRIPTION_STATUSES,
  type SubscriptionInput,
} from '@/domain/subscription';
import { validateSubscriptionForm, type FormErrors, type SubscriptionFormValues } from '@/domain/validation';
import { useFormatters } from '@/hooks/useFormatters';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/state/settingsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, spacing } from '@/theme/tokens';

import { CATEGORY_ICONS } from './categoryVisuals';
import { ChoiceChips } from './form/ChoiceChips';
import { DateField } from './form/DateField';
import { fieldErrorMessage } from './form/fieldErrors';
import { FormSection } from './form/FormSection';
import { SelectSheet } from './SelectSheet';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Icon } from './ui/Icon';
import { SegmentedControl } from './ui/SegmentedControl';
import { TextField } from './ui/TextField';

export interface SubmitMeta {
  /** Whether the user picked a new next billing date in this session. */
  dateChanged: boolean;
}

interface SubscriptionFormProps {
  mode: 'create' | 'edit';
  initial: SubscriptionFormValues;
  onSubmit: (input: SubscriptionInput, meta: SubmitMeta) => Promise<void>;
}

export function SubscriptionForm({ mode, initial, onSubmit }: SubscriptionFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useFormatters();
  const insets = useSafeAreaInsets();
  const remindersEnabled = useSettingsStore((s) => s.settings.remindersEnabled);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dateChanged, setDateChanged] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<TextInput>(null);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initial), [values, initial]);
  const suggestions = mode === 'create' && nameFocused ? matchPresets(values.name, 8) : [];

  const set = <K extends keyof SubscriptionFormValues>(key: K, value: SubscriptionFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const applyPreset = (preset: ServicePreset) => {
    setValues((current) => ({
      ...current,
      name: preset.name,
      category: preset.category,
      interval: preset.interval,
      url: current.url.trim() === '' ? preset.url : current.url,
    }));
    setErrors((current) => ({ ...current, name: undefined }));
    amountRef.current?.focus();
  };

  const cancel = () => {
    if (!dirty) return router.back();
    Alert.alert(t('form.discardTitle'), t('form.discardMessage'), [
      { text: t('form.keepEditing'), style: 'cancel' },
      { text: t('form.discard'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const submit = async () => {
    const result = validateSubscriptionForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      haptics.warning();
      return;
    }
    setSaving(true);
    try {
      await onSubmit(result.input, { dateChanged });
      haptics.success();
      router.back();
    } catch {
      setSaving(false);
      Alert.alert(t('form.saveError'));
    }
  };

  const reminderOptions = [
    { value: null, label: t('reminder.off') },
    ...REMINDER_OPTIONS.map((days) => ({
      value: days,
      label: days === 0 ? t('reminder.sameDay') : t('reminder.daysBefore', { count: days }),
    })),
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ gestureEnabled: !dirty }} />
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.sm }]}>
        <Pressable onPress={cancel} hitSlop={12} accessibilityRole="button" style={styles.headerButton}>
          <AppText variant="body" tone="secondary">
            {t('common.cancel')}
          </AppText>
        </Pressable>
        <AppText variant="headline" accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
          {mode === 'create' ? t('form.newTitle') : t('form.editTitle')}
        </AppText>
        <Pressable onPress={submit} disabled={saving} hitSlop={12} accessibilityRole="button" style={[styles.headerButton, styles.headerRight]}>
          <AppText variant="bodyStrong" tone="accent">
            {mode === 'create' ? t('form.create') : t('common.save')}
          </AppText>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.nameBlock}>
            <TextField
              label={t('form.name')}
              placeholder={t('form.namePlaceholder')}
              value={values.name}
              onChangeText={(text) => set('name', text)}
              error={fieldErrorMessage(t, errors, 'name')}
              autoFocus={mode === 'create'}
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => amountRef.current?.focus()}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
            {suggestions.length > 0 ? (
              <View style={styles.suggestions}>
                <AppText variant="micro" tone="tertiary" style={styles.suggestionsLabel}>
                  {t('form.suggestions').toLocaleUpperCase()}
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.suggestionRow}>
                  {suggestions.map((preset) => (
                    <Chip key={preset.name} label={preset.name} icon={CATEGORY_ICONS[preset.category]} onPress={() => applyPreset(preset)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          <TextField
            ref={amountRef}
            label={t('form.price')}
            placeholder={formatAmountForInput(0, values.currency, format.decimalSeparator)}
            value={values.amount}
            onChangeText={(text) => set('amount', text)}
            error={fieldErrorMessage(t, errors, 'amount')}
            keyboardType="decimal-pad"
            large
            trailing={
              <Pressable
                onPress={() => setCurrencyOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`${t('form.currency')}, ${t(`currencyName.${values.currency}`)}`}
                hitSlop={8}
                style={[styles.currencyButton, { backgroundColor: colors.surfaceMuted }]}
              >
                <AppText variant="bodyStrong">{values.currency}</AppText>
                <Icon name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>
            }
          />

          <FormSection label={t('form.interval')}>
            <ChoiceChips
              options={BILLING_INTERVALS.map((interval) => ({ value: interval, label: t(`interval.${interval}`) }))}
              value={values.interval}
              onChange={(interval) => set('interval', interval)}
            />
          </FormSection>

          <FormSection label={t('form.nextBillingDate')}>
            <DateField
              value={values.nextBillingDate}
              onChange={(date) => {
                set('nextBillingDate', date);
                setDateChanged(true);
              }}
              error={fieldErrorMessage(t, errors, 'nextBillingDate')}
              initiallyOpen={mode === 'create' && !initial.nextBillingDate}
              accessibilityLabel={t('form.nextBillingDate')}
            />
          </FormSection>

          <FormSection label={t('form.category')}>
            <ChoiceChips
              options={CATEGORY_IDS.map((category) => ({
                value: category,
                label: t(`category.${category}`),
                icon: CATEGORY_ICONS[category],
              }))}
              value={values.category}
              onChange={(category) => set('category', category)}
            />
          </FormSection>

          <FormSection label={t('form.reminder')} hint={remindersEnabled ? null : t('form.remindersDisabledHint')}>
            <ChoiceChips options={reminderOptions} value={values.reminderDaysBefore} onChange={(days) => set('reminderDaysBefore', days)} />
          </FormSection>

          {mode === 'edit' ? (
            <FormSection label={t('form.status')}>
              <SegmentedControl
                accessibilityLabel={t('form.status')}
                options={SUBSCRIPTION_STATUSES.map((status) => ({ value: status, label: t(`status.${status}`) }))}
                value={values.status}
                onChange={(status) => set('status', status)}
              />
            </FormSection>
          ) : null}

          <FormSection label={t('form.more')}>
            <View style={styles.more}>
              <TextField
                placeholder={t('form.urlPlaceholder')}
                accessibilityLabel={t('form.url')}
                value={values.url}
                onChangeText={(text) => set('url', text)}
                error={fieldErrorMessage(t, errors, 'url')}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextField
                placeholder={t('form.notesPlaceholder')}
                accessibilityLabel={t('form.notes')}
                value={values.notes}
                onChangeText={(text) => set('notes', text)}
                error={fieldErrorMessage(t, errors, 'notes')}
                multiline
              />
            </View>
          </FormSection>

          <Button label={mode === 'create' ? t('home.addSubscription') : t('common.save')} onPress={submit} loading={saving} icon={mode === 'create' ? 'add' : 'checkmark'} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectSheet
        visible={currencyOpen}
        title={t('form.currency')}
        closeLabel={t('common.close')}
        value={values.currency}
        onSelect={(currency) => set('currency', currency)}
        onClose={() => setCurrencyOpen(false)}
        options={CURRENCY_CODES.map((code) => ({ value: code, label: t(`currencyName.${code}`), detail: code }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerButton: { minWidth: 72, minHeight: 44, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: GUTTER, paddingTop: spacing.sm, gap: spacing.xxl },
  nameBlock: { gap: spacing.md },
  suggestions: { gap: spacing.sm },
  suggestionsLabel: { marginLeft: spacing.xs },
  suggestionRow: { gap: spacing.sm, paddingRight: GUTTER },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: 10,
  },
  more: { gap: spacing.md },
});
