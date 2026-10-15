import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

import { AppText } from './AppText';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';

interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  accessory?: ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
}

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  onPress,
  accessory,
  showChevron = !!onPress,
  destructive = false,
  accessibilityHint,
}: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: destructive ? colors.dangerSoft : colors.surfaceMuted }]}>
          <Icon name={icon} size={18} color={destructive ? colors.danger : colors.text} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <AppText variant="body" tone={destructive ? 'danger' : 'primary'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="callout" tone="secondary" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {accessory}
      {showChevron ? <Icon name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={[title, value, subtitle].filter(Boolean).join(', ')}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, value].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      {content}
    </Pressable>
  );
}

/** A row whose whole surface toggles a switch (one accessible control, not two). */
export function SwitchRow({
  title,
  subtitle,
  icon,
  value,
  onValueChange,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: colors.surfaceMuted }]}>
          <Icon name={icon} size={18} color={colors.text} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <AppText variant="body">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.surfaceMuted }}
        ios_backgroundColor={colors.surfaceMuted}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

/** A card of rows separated by inset hairlines. */
export function ListSection({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.section}>
      {title ? (
        <AppText variant="label" tone="secondary" style={styles.sectionTitle}>
          {title}
        </AppText>
      ) : null}
      <Card padded={false} style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? <View style={[styles.separator, { backgroundColor: colors.separator }]} /> : null}
            {row}
          </Fragment>
        ))}
      </Card>
      {footer ? (
        <AppText variant="caption" tone="tertiary" style={styles.footer}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  iconTile: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  value: { maxWidth: '45%' },
  section: { gap: spacing.sm },
  sectionTitle: { marginLeft: spacing.xs },
  card: { overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  footer: { marginHorizontal: spacing.xs },
});
