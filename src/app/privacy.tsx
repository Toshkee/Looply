import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, spacing } from '@/theme/tokens';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const points: { icon: IconName; title: string; body: string }[] = [
    { icon: 'phone-portrait-outline', title: t('privacy.localTitle'), body: t('privacy.localBody') },
    { icon: 'lock-closed-outline', title: t('privacy.bankTitle'), body: t('privacy.bankBody') },
    { icon: 'cloud-offline-outline', title: t('privacy.backupTitle'), body: t('privacy.backupBody') },
    { icon: 'notifications-outline', title: t('privacy.notificationsTitle'), body: t('privacy.notificationsBody') },
  ];
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
    >
      <AppText variant="title" accessibilityRole="header">
        {t('privacy.title')}
      </AppText>
      {points.map((point) => (
        <Card key={point.title} style={styles.point}>
          <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
            <Icon name={point.icon} size={20} color={colors.text} />
          </View>
          <View style={styles.texts}>
            <AppText variant="headline">{point.title}</AppText>
            <AppText variant="callout" tone="secondary">
              {point.body}
            </AppText>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: GUTTER, paddingTop: spacing.sm, gap: spacing.lg },
  point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: spacing.xs },
});
