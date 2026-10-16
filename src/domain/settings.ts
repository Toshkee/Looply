import { isAppLanguage, type AppLanguage } from '@/i18n/languages';

import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from './currency';
import { REMINDER_OPTIONS } from './subscription';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export interface AppSettings {
  /** `null` until the user (or first-launch detection) settles on a language. */
  language: AppLanguage | null;
  currency: CurrencyCode;
  theme: ThemePreference;
  remindersEnabled: boolean;
  /** Pre-filled reminder for new subscriptions; `null` = off. */
  defaultReminderDays: number | null;
  reminderHour: number;
  reminderMinute: number;
  onboardingCompleted: boolean;
  /** Looply Pro is unlocked on this device (test purchases for now; see services/purchases). */
  proUnlocked: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: null,
  currency: DEFAULT_CURRENCY,
  theme: 'light',
  remindersEnabled: true,
  defaultReminderDays: 1,
  reminderHour: 9,
  reminderMinute: 0,
  onboardingCompleted: false,
  proUnlocked: false,
};

export const REMINDER_HOURS = [7, 8, 9, 10, 12, 15, 18, 20] as const;

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

const isReminderDays = (value: unknown): value is number | null =>
  value === null || (REMINDER_OPTIONS as readonly unknown[]).includes(value);

/** Builds settings from stored values, ignoring anything malformed. */
export function parseSettings(raw: Record<string, unknown>): AppSettings {
  return {
    language: isAppLanguage(raw.language) ? raw.language : DEFAULT_SETTINGS.language,
    currency: isCurrencyCode(raw.currency) ? raw.currency : DEFAULT_SETTINGS.currency,
    theme: (THEME_PREFERENCES as readonly unknown[]).includes(raw.theme)
      ? (raw.theme as ThemePreference)
      : DEFAULT_SETTINGS.theme,
    remindersEnabled: typeof raw.remindersEnabled === 'boolean' ? raw.remindersEnabled : DEFAULT_SETTINGS.remindersEnabled,
    defaultReminderDays: isReminderDays(raw.defaultReminderDays)
      ? raw.defaultReminderDays
      : DEFAULT_SETTINGS.defaultReminderDays,
    reminderHour: isInt(raw.reminderHour, 0, 23) ? raw.reminderHour : DEFAULT_SETTINGS.reminderHour,
    reminderMinute: isInt(raw.reminderMinute, 0, 59) ? raw.reminderMinute : DEFAULT_SETTINGS.reminderMinute,
    onboardingCompleted:
      typeof raw.onboardingCompleted === 'boolean' ? raw.onboardingCompleted : DEFAULT_SETTINGS.onboardingCompleted,
    proUnlocked: raw.proUnlocked === true,
  };
}
