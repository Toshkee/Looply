import { normalizeUrl, validateSubscriptionForm, type SubscriptionFormValues } from '../validation';
import { iso } from './fixtures';

const base: SubscriptionFormValues = {
  name: '  Netflix   Premium ',
  amount: '12,99',
  currency: 'EUR',
  interval: 'monthly',
  nextBillingDate: iso('2026-11-01'),
  category: 'entertainment',
  status: 'active',
  url: 'netflix.com',
  notes: '  family plan ',
  reminderDaysBefore: 1,
};

describe('validateSubscriptionForm', () => {
  test('produces a normalized input', () => {
    const result = validateSubscriptionForm(base);
    expect(result).toEqual({
      ok: true,
      input: {
        name: 'Netflix Premium',
        amountMinor: 1299,
        currency: 'EUR',
        interval: 'monthly',
        anchorDate: '2026-11-01',
        category: 'entertainment',
        status: 'active',
        url: 'https://netflix.com',
        notes: 'family plan',
        reminderDaysBefore: 1,
      },
    });
  });

  test('reports every invalid field', () => {
    const result = validateSubscriptionForm({
      ...base,
      name: '   ',
      amount: '12.345.6',
      nextBillingDate: null,
      url: 'not a url',
      notes: 'x'.repeat(501),
    });
    expect(result).toEqual({
      ok: false,
      errors: { name: 'required', amount: 'invalidAmount', nextBillingDate: 'required', url: 'invalidUrl', notes: 'tooLong' },
    });
  });

  test('amount rules', () => {
    const errorFor = (amount: string) => {
      const result = validateSubscriptionForm({ ...base, amount });
      return result.ok ? null : result.errors.amount;
    };
    expect(errorFor('')).toBe('required');
    expect(errorFor('0')).toBe('amountNotPositive');
    expect(errorFor('100000,01')).toBe('amountTooLarge');
    expect(errorFor('100000')).toBeNull();
  });

  test('empty optional fields become null', () => {
    const result = validateSubscriptionForm({ ...base, url: ' ', notes: '' });
    expect(result.ok && result.input.url).toBeNull();
    expect(result.ok && result.input.notes).toBeNull();
  });
});

describe('normalizeUrl', () => {
  test.each([
    ['spotify.com', 'https://spotify.com'],
    ['https://www.telekom.me/privatni', 'https://www.telekom.me/privatni'],
    ['http://example.com:8080/a?b=c', 'http://example.com:8080/a?b=c'],
  ])('%s → %s', (input, expected) => expect(normalizeUrl(input)).toBe(expected));

  test.each(['localhost', 'ftp://example.com', 'https://', 'exa mple.com', '.com'])('rejects %p', (input) =>
    expect(normalizeUrl(input)).toBeNull(),
  );
});
