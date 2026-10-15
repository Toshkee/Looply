import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

interface ScreenScrollProps extends ScrollViewProps {
  title: string;
  eyebrow?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

/** A tab screen: safe-area aware scroll view with a large title. */
export function ScreenScroll({ title, eyebrow, headerRight, children, contentContainerStyle, ...rest }: ScreenScrollProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        {...rest}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.huge },
          contentContainerStyle,
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titles}>
            {eyebrow ? (
              <AppText variant="label" tone="secondary" numberOfLines={1}>
                {eyebrow}
              </AppText>
            ) : null}
            <AppText variant="title" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {title}
            </AppText>
          </View>
          {headerRight}
        </View>
        {children}
      </ScrollView>
      {/* Keeps scrolled content from running under the status bar. */}
      <View pointerEvents="none" style={[styles.statusBarScrim, { height: insets.top, backgroundColor: colors.background }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, gap: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginTop: spacing.sm },
  titles: { flex: 1, gap: 2 },
  statusBarScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
});
