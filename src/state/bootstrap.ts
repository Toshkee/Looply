import { getLocales } from 'expo-localization';

import { openAppDatabase } from '@/data/database';
import { createSqliteSettingsRepository, eraseAllData } from '@/data/settingsRepository';
import { createSqliteSubscriptionRepository } from '@/data/subscriptionRepository';
import { DEFAULT_SETTINGS } from '@/domain/settings';
import { changeAppLanguage, initI18n } from '@/i18n';
import { detectLanguage } from '@/i18n/languages';

import { getServices, setServices } from './services';
import { useSettingsStore } from './settingsStore';
import { useSubscriptionStore } from './subscriptionStore';

/**
 * Starts the app: i18n first (so even a storage error is shown in the right
 * language), then the database, settings and subscriptions.
 */
export async function bootstrapApp(): Promise<void> {
  const deviceLanguage = detectLanguage(getLocales());
  await initI18n(deviceLanguage);

  const db = await openAppDatabase();
  const services = {
    db,
    subscriptions: createSqliteSubscriptionRepository(db),
    settings: createSqliteSettingsRepository(db),
  };
  setServices(services);

  const settings = await services.settings.load();
  // A language saved by the user always wins over the device language.
  const language = settings.language ?? deviceLanguage;
  if (language !== deviceLanguage) await changeAppLanguage(language);
  useSettingsStore.getState().hydrate({ ...settings, language });

  const [subscriptions, snapshots] = await Promise.all([
    services.subscriptions.list(),
    services.subscriptions.listSnapshots(),
  ]);
  useSubscriptionStore.getState().hydrate(subscriptions, snapshots);
}

/** Deletes everything stored on the device and returns the app to first launch. */
export async function resetAllData(): Promise<void> {
  await eraseAllData(getServices().db);
  useSubscriptionStore.getState().clear();
  const language = detectLanguage(getLocales());
  await changeAppLanguage(language);
  useSettingsStore.getState().hydrate({ ...DEFAULT_SETTINGS, language });
}
