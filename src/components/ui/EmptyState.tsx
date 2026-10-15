import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={28} color={colors.accentText} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="callout" tone="secondary" align="center" style={styles.body}>
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} icon="add" style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg, gap: spacing.md },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  body: { maxWidth: 320 },
  action: { marginTop: spacing.md, alignSelf: 'stretch' },
});
