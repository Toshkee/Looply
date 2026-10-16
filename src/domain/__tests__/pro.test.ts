import { canAddSubscription, FREE_SUBSCRIPTION_LIMIT, isProFeature } from '../pro';

describe('Looply Pro', () => {
  test('the free version holds six subscriptions', () => {
    expect(FREE_SUBSCRIPTION_LIMIT).toBe(6);
    expect(canAddSubscription(0, false)).toBe(true);
    expect(canAddSubscription(5, false)).toBe(true);
    expect(canAddSubscription(6, false)).toBe(false);
    expect(canAddSubscription(10, false)).toBe(false);
  });

  test('Pro has no limit', () => {
    expect(canAddSubscription(6, true)).toBe(true);
    expect(canAddSubscription(500, true)).toBe(true);
  });

  test('recognizes offer reasons', () => {
    expect(isProFeature('insights')).toBe(true);
    expect(isProFeature('export')).toBe(false);
    expect(isProFeature(undefined)).toBe(false);
  });
});
