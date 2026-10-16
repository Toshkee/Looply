import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/services/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedControlProps<T>) {
  const { colors, shadows } = useTheme();
  // Four or more segments get a smaller face and may wrap to two lines. Text is never
  // auto-shrunk: on devices adjustsFontSizeToFit shrinks centered labels far below their size.
  const compact = options.length >= 4;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
            style={[styles.segment, selected && { backgroundColor: colors.segmentSelected, boxShadow: shadows.card }]}
          >
            <AppText
              variant={compact ? 'label' : 'callout'}
              tone={selected ? 'primary' : 'secondary'}
              align="center"
              numberOfLines={compact ? 2 : 1}
              maxFontSizeMultiplier={1.3}
              style={styles.label}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md - 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  label: { fontWeight: '600' },
});
