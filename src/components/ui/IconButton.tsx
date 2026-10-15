import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'plain' | 'filled';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, onPress, accessibilityLabel, variant = 'filled', size = TOUCH_TARGET, style }: IconButtonProps) {
  const { colors, shadows } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic
      pressedScale={0.92}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'filled' ? { backgroundColor: colors.surface, boxShadow: shadows.card } : null,
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} color={colors.text} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
