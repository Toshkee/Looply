import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

interface CardProps extends ViewProps {
  padded?: boolean;
}

/** A raised surface with the theme's soft drop shadow. */
export function Card({ padded = true, style, ...rest }: CardProps) {
  const { colors, shadows } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          boxShadow: shadows.card,
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
    />
  );
}
