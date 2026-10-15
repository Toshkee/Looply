import { formatAmountForInput, formatMoney, parseAmountInput } from '../money';

describe('parseAmountInput', () => {
  test.each([
    ['9.99', 999],
    ['9,99', 999],
    ['9,9', 990],
    ['10', 1000],
    ['0,50', 50],
    [',5', 50],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1 234,56', 123456],
    ['1 234,56', 123456],
    ['1.299', 129900],
    ['1,299', 129900],
    ['9.999', 999900],
    ['1.234.567', 123456700],
    ['12,00', 1200],
    ['  15  ', 1500],
  ])('%s → %d minor units (EUR)', (input, expected) => {
    expect(parseAmountInput(input, 'EUR')).toBe(expected);
  });

  test.each(['', 'abc', '9.9999', '1,2,3', '12..5', '-5', '1.23.4', '€9', '1.2345,6', '.', ','])(
    'rejects %p',
    (input) => {
      expect(parseAmountInput(input, 'EUR')).toBeNull();
    },
  );

  test('zero-decimal currencies', () => {
    expect(parseAmountInput('1299', 'JPY')).toBe(1299);
    expect(parseAmountInput('1.299', 'JPY')).toBe(1299);
    expect(parseAmountInput('500,00', 'HUF')).toBe(500);
    expect(parseAmountInput('500,5', 'HUF')).toBeNull();
  });
});

describe('formatAmountForInput', () => {
  test('uses the given decimal separator and the currency scale', () => {
    expect(formatAmountForInput(1299, 'EUR', ',')).toBe('12,99');
    expect(formatAmountForInput(5, 'EUR', '.')).toBe('0.05');
    expect(formatAmountForInput(1299, 'JPY', ',')).toBe('1299');
  });

  test('round-trips through the parser', () => {
    for (const minor of [1, 99, 100, 1299, 123456]) {
      expect(parseAmountInput(formatAmountForInput(minor, 'EUR', ','), 'EUR')).toBe(minor);
    }
  });
});

describe('formatMoney', () => {
  test('formats per locale', () => {
    expect(formatMoney(123450, 'EUR', 'sr-Latn-ME')).toBe('1.234,50 €');
    expect(formatMoney(123450, 'EUR', 'en-GB')).toBe('€1,234.50');
    expect(formatMoney(999, 'USD', 'en-US')).toBe('$9.99');
  });

  test('rounds fractional normalized estimates once', () => {
    expect(formatMoney(2166.6667, 'EUR', 'en-GB')).toBe('€21.67');
    expect(formatMoney(0.4, 'EUR', 'en-GB')).toBe('€0.00');
  });

  test('signed differences', () => {
    expect(formatMoney(500, 'EUR', 'en-GB', { signed: true })).toBe('+€5.00');
    expect(formatMoney(-500, 'EUR', 'en-GB', { signed: true })).toBe('−€5.00');
    expect(formatMoney(0, 'EUR', 'en-GB', { signed: true })).toBe('€0.00');
  });
});
