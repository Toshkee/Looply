import { buildJsonExport } from '../exportData';
import { IMPORT_MAX_ENTRIES, parseImport, planImport } from '../importData';
import { iso, makeSubscription } from './fixtures';

const NOW = new Date('2026-10-15T12:00:00.000Z');

const exportOf = (subscriptions: Parameters<typeof buildJsonExport>[0]) =>
  buildJsonExport(subscriptions, { today: iso('2026-10-15'), exportedAt: NOW.toISOString(), defaultCurrency: 'EUR' });

/** A valid export wrapped around hand-written entries. */
const fileWith = (entries: unknown[], overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ format: 'looply-export', version: 1, exportedAt: NOW.toISOString(), subscriptions: entries, ...overrides });

const validEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'abc',
  name: 'Netflix',
  amount: '12.99',
  amountMinor: 1299,
  currency: 'EUR',
  interval: 'monthly',
  anchorDate: '2026-01-31',
  nextBillingDate: '2026-10-31',
  category: 'entertainment',
  status: 'active',
  url: null,
  notes: null,
  reminderDaysBefore: 1,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-02-01T10:00:00.000Z',
  ...overrides,
});

describe('parseImport', () => {
  test('round-trips an export exactly', () => {
    const subs = [
      makeSubscription({ name: 'Netflix', amountMinor: 1299, anchorDate: iso('2026-01-31'), reminderDaysBefore: 3 }),
      makeSubscription({ name: 'Ćevapi, "Klub"', amountMinor: 500, interval: 'weekly', notes: 'Line 1\nLine 2' }),
      makeSubscription({ name: 'Яндекс Плюс', amountMinor: 29900, currency: 'RUB', status: 'paused', category: 'music' }),
      makeSubscription({ name: 'Album', amountMinor: 1200, currency: 'ALL', url: 'https://example.al', status: 'cancelled' }),
    ];
    expect(parseImport(exportOf(subs), NOW)).toEqual({ ok: true, subscriptions: subs, skipped: [] });
  });

  test('reads amounts from amountMinor, not the decimal string', () => {
    const result = parseImport(fileWith([validEntry({ amount: '999.99', amountMinor: 1299 })]), NOW);
    expect(result.ok && result.subscriptions[0]?.amountMinor).toBe(1299);
  });

  test('accepts a leading byte-order mark', () => {
    expect(parseImport(`﻿${fileWith([validEntry()])}`, NOW).ok).toBe(true);
  });

  test.each([
    ['', 'invalidJson'],
    ['{"format":', 'invalidJson'],
    ['[]', 'unknownFormat'],
    ['null', 'unknownFormat'],
    [JSON.stringify({ format: 'other-app', version: 1, subscriptions: [] }), 'unknownFormat'],
    [JSON.stringify({ format: 'looply-export', version: 1 }), 'unknownFormat'],
    [fileWith([], { version: 2 }), 'unsupportedVersion'],
    [fileWith([], { version: '1' }), 'unsupportedVersion'],
  ])('rejects %j as %s', (text, error) => {
    expect(parseImport(text, NOW)).toEqual({ ok: false, error });
  });

  test('rejects files with too many entries', () => {
    expect(parseImport(fileWith(Array.from({ length: IMPORT_MAX_ENTRIES + 1 }, () => ({}))), NOW)).toEqual({
      ok: false,
      error: 'tooManyEntries',
    });
  });

  test('skips invalid entries, keeps the rest and reports why', () => {
    const result = parseImport(
      fileWith([
        validEntry({ id: 'ok-1' }),
        'not an object',
        validEntry({ id: '' }),
        validEntry({ id: 'n', name: '   ' }),
        validEntry({ id: 'a1', amountMinor: 12.5 }),
        validEntry({ id: 'a2', amountMinor: 0 }),
        validEntry({ id: 'a3', amountMinor: '1299' }),
        validEntry({ id: 'a4', amountMinor: 100_000_01 }),
        validEntry({ id: 'c', currency: 'XYZ' }),
        validEntry({ id: 'i', interval: 'daily' }),
        validEntry({ id: 'd1', anchorDate: '2026-02-30' }),
        validEntry({ id: 'd2', anchorDate: undefined }),
        validEntry({ id: 'k', category: 'food' }),
        validEntry({ id: 's', status: 'deleted' }),
        validEntry({ id: 'u', url: 'not a url' }),
        validEntry({ id: 'no', notes: 42 }),
        validEntry({ id: 'r', reminderDaysBefore: 5 }),
        validEntry({ id: 'ok-2', name: 'Spotify' }),
      ]),
      NOW,
    );
    if (!result.ok) throw new Error('expected a parsed file');
    expect(result.subscriptions.map((s) => s.id)).toEqual(['ok-1', 'ok-2']);
    expect(result.skipped.map((s) => [s.index, s.reason])).toEqual([
      [1, 'notAnObject'],
      [2, 'invalidId'],
      [3, 'invalidName'],
      [4, 'invalidAmount'],
      [5, 'invalidAmount'],
      [6, 'invalidAmount'],
      [7, 'invalidAmount'],
      [8, 'invalidCurrency'],
      [9, 'invalidInterval'],
      [10, 'invalidDate'],
      [11, 'invalidDate'],
      [12, 'invalidCategory'],
      [13, 'invalidStatus'],
      [14, 'invalidUrl'],
      [15, 'invalidNotes'],
      [16, 'invalidReminder'],
    ]);
    expect(result.skipped[0]?.name).toBeNull();
    expect(result.skipped[7]?.name).toBe('Netflix');
  });

  test('keeps the first of repeated ids and reports the rest as duplicates', () => {
    const result = parseImport(
      fileWith([validEntry({ id: 'x', name: 'First' }), validEntry({ id: 'x', name: 'Second' }), validEntry({ id: 'y' })]),
      NOW,
    );
    if (!result.ok) throw new Error('expected a parsed file');
    expect(result.subscriptions.map((s) => s.name)).toEqual(['First', 'Netflix']);
    expect(result.skipped).toEqual([{ index: 1, name: 'Second', reason: 'duplicateId' }]);
  });

  test('normalizes text fields and fills missing optional fields', () => {
    const result = parseImport(
      fileWith([
        validEntry({
          name: '  Disney   Plus ',
          url: 'disneyplus.com',
          notes: '   ',
          reminderDaysBefore: undefined,
          createdAt: 'yesterday',
          updatedAt: undefined,
        }),
      ]),
      NOW,
    );
    expect(result.ok && result.subscriptions[0]).toMatchObject({
      name: 'Disney Plus',
      url: 'https://disneyplus.com',
      notes: null,
      reminderDaysBefore: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });
});

describe('planImport', () => {
  test('adds new ids, updates changed ones and leaves identical ones alone', () => {
    const kept = makeSubscription({ id: 'kept' });
    const changed = makeSubscription({ id: 'changed', amountMinor: 999 });
    const onlyLocal = makeSubscription({ id: 'local' });
    const incoming = [
      { ...kept, updatedAt: '2030-01-01T00:00:00.000Z' },
      { ...changed, amountMinor: 1499 },
      makeSubscription({ id: 'new' }),
    ];
    const plan = planImport(incoming, [kept, changed, onlyLocal]);
    expect(plan.toAdd.map((s) => s.id)).toEqual(['new']);
    expect(plan.toUpdate.map((s) => [s.id, s.amountMinor])).toEqual([['changed', 1499]]);
    expect(plan.unchanged).toBe(1);
  });
});
