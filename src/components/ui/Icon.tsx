import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];
type IconColor = ComponentProps<typeof Ionicons>['color'];

/** The single icon family used across the app (Ionicons, outline style). */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: IconColor }) {
  return <Ionicons name={name} size={size} color={color} accessible={false} importantForAccessibility="no" />;
}
