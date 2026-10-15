import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import type { ThemePreference } from '@/domain/settings';

import { darkColors, darkShadows, lightColors, lightShadows, type ColorTokens, type ShadowTokens } from './tokens';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  shadows: ShadowTokens;
}

const lightTheme: Theme = { scheme: 'light', colors: lightColors, shadows: lightShadows };
const darkTheme: Theme = { scheme: 'dark', colors: darkColors, shadows: darkShadows };

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ preference, children }: { preference: ThemePreference; children: ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  // Native UI (alerts, keyboards, pickers) follows the app's choice too.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const theme = useMemo(() => (scheme === 'dark' ? darkTheme : lightTheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
