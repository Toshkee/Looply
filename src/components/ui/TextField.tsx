import { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme/tokens';

import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  /** Rendered inside the field, after the input (e.g. a currency button). */
  trailing?: ReactNode;
  large?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, trailing, large = false, style, onFocus, onBlur, multiline, ...rest },
  ref,
) {
  const { colors, shadows, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.accent : 'transparent';

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="label" tone="secondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          { backgroundColor: colors.surface, borderColor, boxShadow: shadows.card },
          multiline && styles.multiline,
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          keyboardAppearance={scheme}
          maxFontSizeMultiplier={1.5}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            large ? typography.heading : typography.body,
            styles.input,
            { color: colors.text },
            large && { fontVariant: ['tabular-nums'] },
            multiline && styles.multilineInput,
            style,
          ]}
        />
        {trailing}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  label: { marginLeft: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  input: { flex: 1, paddingVertical: spacing.md, paddingRight: spacing.sm },
  multiline: { alignItems: 'flex-start', minHeight: 96 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  error: { marginLeft: spacing.xs },
});
