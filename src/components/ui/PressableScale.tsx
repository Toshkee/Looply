import { useState, type ReactNode } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/services/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed. */
  pressedScale?: number;
  haptic?: boolean;
}

/** A pressable that gives subtle, native-driven scale feedback. */
export function PressableScale({
  children,
  style,
  pressedScale = 0.97,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  accessibilityRole = 'button',
  ...rest
}: PressableScaleProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const animateTo = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
      onPressIn={(event) => {
        animateTo(pressedScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(1);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic) haptics.tap();
        onPress?.(event);
      }}
      style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.45 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}
