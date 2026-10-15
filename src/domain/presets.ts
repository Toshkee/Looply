import type { BillingInterval, CategoryId } from './subscription';

/**
 * Well-known services offered as quick suggestions while typing a name.
 * Prices are intentionally absent: they differ by country and plan, and a
 * guessed price would be fake financial data.
 */
export interface ServicePreset {
  name: string;
  category: CategoryId;
  interval: BillingInterval;
  url: string;
}

export const SERVICE_PRESETS: readonly ServicePreset[] = [
  { name: 'Netflix', category: 'entertainment', interval: 'monthly', url: 'netflix.com' },
  { name: 'Spotify', category: 'music', interval: 'monthly', url: 'spotify.com' },
  { name: 'YouTube Premium', category: 'entertainment', interval: 'monthly', url: 'youtube.com/premium' },
  { name: 'Crnogorski Telekom', category: 'telecom', interval: 'monthly', url: 'telekom.me' },
  { name: 'One', category: 'telecom', interval: 'monthly', url: 'one.me' },
  { name: 'm:tel', category: 'telecom', interval: 'monthly', url: 'mtel.me' },
  { name: 'iCloud+', category: 'cloud', interval: 'monthly', url: 'icloud.com' },
  { name: 'ChatGPT Plus', category: 'productivity', interval: 'monthly', url: 'chatgpt.com' },
  { name: 'Disney+', category: 'entertainment', interval: 'monthly', url: 'disneyplus.com' },
  { name: 'Google One', category: 'cloud', interval: 'monthly', url: 'one.google.com' },
  { name: 'HBO Max', category: 'entertainment', interval: 'monthly', url: 'hbomax.com' },
  { name: 'Amazon Prime', category: 'entertainment', interval: 'monthly', url: 'amazon.com/prime' },
  { name: 'Apple Music', category: 'music', interval: 'monthly', url: 'music.apple.com' },
  { name: 'Apple TV', category: 'entertainment', interval: 'monthly', url: 'tv.apple.com' },
  { name: 'Deezer', category: 'music', interval: 'monthly', url: 'deezer.com' },
  { name: 'Dropbox', category: 'cloud', interval: 'monthly', url: 'dropbox.com' },
  { name: 'Microsoft 365', category: 'productivity', interval: 'annual', url: 'microsoft.com/microsoft-365' },
  { name: 'Claude Pro', category: 'productivity', interval: 'monthly', url: 'claude.ai' },
  { name: 'Notion', category: 'productivity', interval: 'monthly', url: 'notion.so' },
  { name: 'Adobe Creative Cloud', category: 'productivity', interval: 'monthly', url: 'adobe.com' },
  { name: 'Canva Pro', category: 'productivity', interval: 'annual', url: 'canva.com' },
  { name: 'Xbox Game Pass', category: 'gaming', interval: 'monthly', url: 'xbox.com' },
  { name: 'PlayStation Plus', category: 'gaming', interval: 'annual', url: 'playstation.com' },
  { name: 'Nintendo Switch Online', category: 'gaming', interval: 'annual', url: 'nintendo.com' },
  { name: 'Duolingo', category: 'education', interval: 'annual', url: 'duolingo.com' },
  { name: 'EPCG', category: 'utilities', interval: 'monthly', url: 'epcg.com' },
];

/** Presets matching a partially typed name; the first few when nothing is typed. */
export function matchPresets(query: string, limit = 8): ServicePreset[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized === '') return SERVICE_PRESETS.slice(0, limit);
  return SERVICE_PRESETS.filter((preset) => {
    const name = preset.name.toLocaleLowerCase();
    return name.includes(normalized) && name !== normalized;
  }).slice(0, limit);
}
