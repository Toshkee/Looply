/** Subscriptions the free version can hold. Pro removes the limit. */
export const FREE_SUBSCRIPTION_LIMIT = 6;

/** Places a Pro offer can be opened from; each one explains itself differently. */
export const PRO_FEATURES = ['limit', 'insights', 'calendar'] as const;
export type ProFeature = (typeof PRO_FEATURES)[number];

export function isProFeature(value: unknown): value is ProFeature {
  return typeof value === 'string' && (PRO_FEATURES as readonly string[]).includes(value);
}

/**
 * Whether one more subscription may be added. Every stored subscription
 * counts, whatever its status. Existing data is never hidden or blocked:
 * a device over the limit (after an import, for example) keeps everything
 * and can still edit, but cannot add more.
 */
export function canAddSubscription(count: number, isPro: boolean): boolean {
  return isPro || count < FREE_SUBSCRIPTION_LIMIT;
}
