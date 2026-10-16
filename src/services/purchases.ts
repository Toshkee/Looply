import type { CurrencyCode } from '@/domain/currency';

/**
 * Looply Pro purchases.
 *
 * TEST MODE: no store is connected yet. "Buying" unlocks Pro on this device
 * after an in-app confirmation and nothing is charged. Before a store release
 * this adapter is replaced by a real StoreKit / Google Play Billing one (for
 * example RevenueCat) behind the same interface; the price then comes from the
 * store, and restore asks the store for past purchases.
 */
export type PurchaseMode = 'test' | 'store';

export interface PurchaseService {
  mode: PurchaseMode;
  /** One-time price shown on the offer. */
  price: { amountMinor: number; currency: CurrencyCode };
  /** Resolves `true` when Pro was bought, `false` when the user backed out. */
  purchasePro(): Promise<boolean>;
  /** Resolves `true` when an earlier purchase was found. */
  restorePurchases(): Promise<boolean>;
}

export const purchases: PurchaseService = {
  mode: 'test',
  price: { amountMinor: 499, currency: 'EUR' },
  purchasePro: async () => true,
  // Test unlocks live only in local settings; there is no store history to restore from.
  restorePurchases: async () => false,
};
