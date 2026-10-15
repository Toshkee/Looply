import { buildCsvExport, buildJsonExport, escapeCsvCell } from '../exportData';
import { iso, makeSubscription } from './fixtures';

describe('export', () => {
  const subs = [
    makeSubscription({ name: 'Netflix', amountMinor: 1299, anchorDate: iso('2026-01-20') }),
    makeSubscription({ name: 'Ćevapi, "Klub"', amountMinor: 500, interval: 'weekly', notes: 'Line 1\nLine 2' }),
    makeSubscription({ name: 'Яндекс Плюс', amountMinor: 29900, currency: 'RUB', status: 'paused' }),
  ];

  test('JSON contains every subscription with locale-independent amounts', () => {
    const parsed = JSON.parse(
      buildJsonExport(subs, { today: iso('2026-10-15'), exportedAt: '2026-10-15T12:00:00.000Z', defaultCurrency: 'EUR' }),
    );
    expect(parsed.format).toBe('looply-export');
    expect(parsed.version).toBe(1);
    expect(parsed.subscriptions).toHaveLength(3);
    expect(parsed.subscriptions[0]).toMatchObject({ name: 'Netflix', amount: '12.99', nextBillingDate: '2026-10-20' });
  });

  test('CSV has a BOM, a header, quoted fields and CRLF line endings', () => {
    const csv = buildCsvExport(subs, iso('2026-10-15'));
    expect(csv.startsWith('﻿name,amount,currency,')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[1]).toBe('Netflix,12.99,EUR,monthly,2026-10-20,entertainment,active,12.99,155.88,,,,2026-01-01T10:00:00.000Z');
    expect(csv).toContain('"Ćevapi, ""Klub"""');
    expect(csv).toContain('"Line 1\nLine 2"');
    expect(csv).toContain('Яндекс Плюс,299.00,RUB');
  });

  test('neutralizes spreadsheet formulas', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvCell('+381')).toBe("'+381");
    expect(escapeCsvCell('plain')).toBe('plain');
  });
});
