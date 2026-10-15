import type { SettingsRepository } from '@/data/settingsRepository';
import type { SqlExecutor } from '@/data/sql';
import type { SubscriptionRepository } from '@/data/subscriptionRepository';

/** Storage dependencies, wired once at startup (see bootstrap). */
export interface Services {
  db: SqlExecutor;
  subscriptions: SubscriptionRepository;
  settings: SettingsRepository;
}

let services: Services | null = null;

export function setServices(value: Services): void {
  services = value;
}

export function getServices(): Services {
  if (!services) throw new Error('Services used before the app finished starting');
  return services;
}
