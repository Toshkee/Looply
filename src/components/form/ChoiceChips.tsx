import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { Chip } from '../ui/Chip';
import type { IconName } from '../ui/Icon';

export interface ChoiceOption<T> {
  value: T;
  label: string;
  icon?: IconName;
}

/** A wrapping group of single-choice chips. */
export function ChoiceChips<T extends string | number | null>({
  options,
  value,
  onChange,
}: {
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {options.map((option) => (
        <Chip
          key={String(option.value)}
          label={option.label}
          icon={option.icon}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
