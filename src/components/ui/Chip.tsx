import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { haptics } from '@/services/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Custom leading content (e.g. a logo); takes precedence over `icon`. */
  leading?: ReactNode;
  accessibilityLabel?: string;
}

export function Chip({ label, selected = false, onPress, icon, leading, accessibilityLabel }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : pressed ? colors.surfacePressed : colors.surfaceMuted,
        },
      ]}
    >
      {leading ?? (icon ? <Icon name={icon} size={16} color={selected ? colors.onPrimary : colors.textSecondary} /> : null)}
      <AppText variant="label" tone={selected ? 'onPrimary' : 'primary'} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: 38,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
  },
});
