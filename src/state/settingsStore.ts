import { create } from 'zustand';

import { DEFAULT_SETTINGS, type AppSettings } from '@/domain/settings';
import { changeAppLanguage } from '@/i18n';

import { getServices } from './services';

interface SettingsState {
  settings: AppSettings;
  hydrate(settings: AppSettings): void;
  /** Applies the change immediately and persists it; reverts if saving fails. */
  update(patch: Partial<AppSettings>): Promise<void>;
  reset(): void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,

  hydrate(settings) {
    set({ settings });
  },

  async update(patch) {
    const previous = get().settings;
    set({ settings: { ...previous, ...patch } });
    try {
      if (patch.language && patch.language !== previous.language) await changeAppLanguage(patch.language);
      await getServices().settings.save(patch);
    } catch (error) {
      set({ settings: previous });
      if (previous.language && patch.language && patch.language !== previous.language) {
        await changeAppLanguage(previous.language);
      }
      throw error;
    }
  },

  reset() {
    set({ settings: DEFAULT_SETTINGS });
  },
}));
