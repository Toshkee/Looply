import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { bootstrapApp } from '@/state/bootstrap';
import { useSettingsStore } from '@/state/settingsStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { GUTTER, spacing } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

type StartupState = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const [state, setState] = useState<StartupState>('loading');
  const theme = useSettingsStore((s) => s.settings.theme);

  const start = useCallback(() => {
    bootstrapApp()
      .then(() => setState('ready'))
      .catch((error: unknown) => {
        // Only the error type is logged: never subscription data.
        console.warn('Startup failed:', error instanceof Error ? error.name : 'unknown');
        setState('error');
      });
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  const retry = () => {
    setState('loading');
    start();
  };

  useEffect(() => {
    if (state !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [state]);

  if (state === 'loading') return null;

  return (
    <ThemeProvider preference={theme}>
      {state === 'ready' ? <RootNavigator /> : <StartupError onRetry={retry} />}
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { colors, scheme } = useTheme();
  const onboarded = useSettingsStore((s) => s.settings.onboardingCompleted);

  const pushed = {
    headerShown: true,
    headerTitle: '',
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    headerTintColor: colors.text,
    headerStyle: { backgroundColor: colors.background },
  } as const;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subscription/[id]" options={pushed} />
          <Stack.Screen name="privacy" options={pushed} />
          <Stack.Screen name="subscription/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="subscription/edit/[id]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function StartupError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.error, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.xl }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.errorBody}>
        <View style={[styles.errorIcon, { backgroundColor: colors.dangerSoft }]}>
          <Icon name="alert-circle-outline" size={30} color={colors.danger} />
        </View>
        <AppText variant="heading" align="center">
          {t('errors.startupTitle')}
        </AppText>
        <AppText variant="callout" tone="secondary" align="center">
          {t('errors.startupBody')}
        </AppText>
      </View>
      <Button label={t('common.retry')} onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, paddingHorizontal: GUTTER, justifyContent: 'space-between' },
  errorBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
