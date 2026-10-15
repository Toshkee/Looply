import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { AppText, type TextTone } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors, shadows } = useTheme();
  const look: Record<ButtonVariant, { background: string; tone: TextTone; iconColor: string; shadow?: string }> = {
    primary: { background: colors.primary, tone: 'onPrimary', iconColor: colors.onPrimary, shadow: shadows.raised },
    secondary: { background: colors.surfaceMuted, tone: 'primary', iconColor: colors.text },
    ghost: { background: 'transparent', tone: 'accent', iconColor: colors.accentText },
    danger: { background: colors.dangerSoft, tone: 'danger', iconColor: colors.danger },
  };
  const { background, tone, iconColor, shadow } = look[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading }}
      style={[
        styles.base,
        { minHeight: size === 'lg' ? 56 : 46, backgroundColor: background, boxShadow: shadow },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === 'lg' ? 22 : 18} color={iconColor} /> : null}
          <AppText variant={size === 'lg' ? 'headline' : 'bodyStrong'} tone={tone} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
});
