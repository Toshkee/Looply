import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { typography, type TypographyVariant } from '@/theme/tokens';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'positive' | 'onPrimary';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
}

/** Large text sizes are capped so Dynamic Type never breaks money layouts. */
const SCALE_LIMIT: Partial<Record<TypographyVariant, number>> = { display: 1.25, title: 1.3, heading: 1.4 };

export function AppText({ variant = 'body', tone = 'primary', align, style, maxFontSizeMultiplier, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const color = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    accent: colors.accentText,
    danger: colors.danger,
    positive: colors.positive,
    onPrimary: colors.onPrimary,
  }[tone];
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? SCALE_LIMIT[variant] ?? 1.6}
      style={[typography[variant], { color }, align ? { textAlign: align } : null, style]}
    />
  );
}
