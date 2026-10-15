import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { AppText } from '../ui/AppText';

export function FormSection({ label, hint, children }: { label: string; hint?: string | null; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" style={styles.label}>
        {label}
      </AppText>
      {children}
      {hint ? (
        <AppText variant="caption" tone="tertiary" style={styles.label}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  label: { marginLeft: spacing.xs },
});
