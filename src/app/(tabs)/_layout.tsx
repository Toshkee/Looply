import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Icon name={focused ? active : inactive} size={24} color={color} />;
  };
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.separator,
        },
        tabBarAllowFontScaling: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen
        name="subscriptions"
        options={{ title: t('tabs.subscriptions'), tabBarIcon: tabIcon('albums', 'albums-outline') }}
      />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: tabIcon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
