import type { ReactNode } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/services/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  detail?: string;
  leading?: ReactNode;
}

interface SelectSheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: readonly SelectOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
  closeLabel: string;
}

/** A native-feeling sheet with a single-choice list. */
export function SelectSheet<T extends string>({ visible, title, options, value, onSelect, onClose, closeLabel }: SelectSheetProps<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <View style={styles.header}>
          <AppText variant="heading" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          <IconButton icon="close" onPress={onClose} accessibilityLabel={closeLabel} size={36} />
        </View>
        <FlatList
          data={options}
          keyExtractor={(option) => option.value}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
          renderItem={({ item }) => {
            const selected = item.value === value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                accessibilityLabel={[item.label, item.detail].filter(Boolean).join(', ')}
                onPress={() => {
                  haptics.selection();
                  onSelect(item.value);
                  onClose();
                }}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
              >
                {item.leading}
                <View style={styles.texts}>
                  <AppText variant="body">{item.label}</AppText>
                  {item.detail ? (
                    <AppText variant="caption" tone="secondary">
                      {item.detail}
                    </AppText>
                  ) : null}
                </View>
                {selected ? <Icon name="checkmark" size={22} color={colors.accentText} /> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: GUTTER,
    paddingVertical: spacing.sm,
  },
  texts: { flex: 1, gap: 2 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: GUTTER },
});
