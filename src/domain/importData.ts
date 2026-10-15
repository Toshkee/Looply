import { parseISODate } from './calendarDate';
import { currencyDecimals, isCurrencyCode } from './currency';
import { EXPORT_FORMAT, EXPORT_VERSION } from './exportData';
import {
  isBillingInterval,
  isCategoryId,
  isSubscriptionStatus,
  REMINDER_OPTIONS,
  type Subscription,
} from './subscription';
import { MAX_AMOUNT_MAJOR, NAME_MAX_LENGTH, normalizeUrl, NOTES_MAX_LENGTH, URL_MAX_LENGTH } from './validation';

/** Upper bound on entries in one file, so a broken or hostile file cannot stall the device. */
export const IMPORT_MAX_ENTRIES = 2000;
const ID_MAX_LENGTH = 64;

/** Why a whole file was rejected. */
export type ImportFileError = 'invalidJson' | 'unknownFormat' | 'unsupportedVersion' | 'tooManyEntries';

/** Why a single entry was skipped. */
export type ImportSkipReason =
  | 'notAnObject'
  | 'invalidId'
  | 'duplicateId'
  | 'invalidName'
  | 'invalidAmount'
  | 'invalidCurrency'
  | 'invalidInterval'
  | 'invalidDate'
  | 'invalidCategory'
  | 'invalidStatus'
  | 'invalidUrl'
  | 'invalidNotes'
  | 'invalidReminder';

export interface SkippedEntry {
  /** Zero-based position in the file's `subscriptions` array. */
  index: number;
  /** The entry's name when one could be read, to help the user find it. */
  name: string | null;
  reason: ImportSkipReason;
}

export type ImportParseResult =
  | { ok: true; subscriptions: Subscription[]; skipped: SkippedEntry[] }
  | { ok: false; error: ImportFileError };

type Entry = Record<string, unknown>;
type EntryResult = { ok: true; subscription: Subscription } | { ok: false; reason: ImportSkipReason };

const isRecord = (value: unknown): value is Entry => typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalText = (value: unknown, maxLength: number): { ok: true; value: string | null } | { ok: false } => {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== 'string' || value.length > maxLength) return { ok: false };
  const trimmed = value.trim();
  return { ok: true, value: trimmed === '' ? null : trimmed };
};

const isTimestamp = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/**
 * Validates one exported entry with the same rules the form and the database
 * apply, so an imported subscription can never break calculations.
 */
function parseEntry(entry: Entry, fallbackTimestamp: string): EntryResult {
  const { id, name, amountMinor, currency, interval, category, status, reminderDaysBefore } = entry;

  if (typeof id !== 'string' || id.trim() === '' || id.length > ID_MAX_LENGTH) return { ok: false, reason: 'invalidId' };

  const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (cleanName === '' || cleanName.length > NAME_MAX_LENGTH) return { ok: false, reason: 'invalidName' };

  if (!isCurrencyCode(currency)) return { ok: false, reason: 'invalidCurrency' };
  const maxMinor = MAX_AMOUNT_MAJOR * 10 ** currencyDecimals(currency);
  if (typeof amountMinor !== 'number' || !Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > maxMinor) {
    return { ok: false, reason: 'invalidAmount' };
  }

  if (!isBillingInterval(interval)) return { ok: false, reason: 'invalidInterval' };
  const anchorDate = typeof entry.anchorDate === 'string' ? parseISODate(entry.anchorDate) : null;
  if (!anchorDate) return { ok: false, reason: 'invalidDate' };
  if (!isCategoryId(category)) return { ok: false, reason: 'invalidCategory' };
  if (!isSubscriptionStatus(status)) return { ok: false, reason: 'invalidStatus' };

  const url = optionalText(entry.url, URL_MAX_LENGTH);
  const normalizedUrl = url.ok && url.value !== null ? normalizeUrl(url.value) : null;
  if (!url.ok || (url.value !== null && normalizedUrl === null)) return { ok: false, reason: 'invalidUrl' };

  const notes = optionalText(entry.notes, NOTES_MAX_LENGTH);
  if (!notes.ok) return { ok: false, reason: 'invalidNotes' };

  const reminder = reminderDaysBefore ?? null;
  if (reminder !== null && !(REMINDER_OPTIONS as readonly unknown[]).includes(reminder)) {
    return { ok: false, reason: 'invalidReminder' };
  }

  const createdAt = isTimestamp(entry.createdAt) ? entry.createdAt : fallbackTimestamp;
  const updatedAt = isTimestamp(entry.updatedAt) ? entry.updatedAt : createdAt;
  return {
    ok: true,
    subscription: {
      id,
      name: cleanName,
      amountMinor,
      currency,
      interval,
      anchorDate,
      category,
      status,
      url: normalizedUrl,
      notes: notes.value,
      reminderDaysBefore: reminder as number | null,
      createdAt,
      updatedAt,
    },
  };
}

/**
 * Reads a Looply JSON export (`looply-export`, version 1). Unknown formats and
 * versions are rejected as a whole; invalid or repeated entries are skipped and
 * reported, so one damaged entry never blocks the rest of a restore.
 *
 * Amounts come from `amountMinor`; the decimal `amount` and the computed
 * `nextBillingDate` exist for people reading the file and are ignored.
 */
export function parseImport(text: string, now: Date): ImportParseResult {
  let payload: unknown;
  try {
    payload = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, error: 'invalidJson' };
  }
  if (!isRecord(payload) || payload.format !== EXPORT_FORMAT || !Array.isArray(payload.subscriptions)) {
    return { ok: false, error: 'unknownFormat' };
  }
  if (payload.version !== EXPORT_VERSION) return { ok: false, error: 'unsupportedVersion' };
  if (payload.subscriptions.length > IMPORT_MAX_ENTRIES) return { ok: false, error: 'tooManyEntries' };

  const fallbackTimestamp = now.toISOString();
  const subscriptions: Subscription[] = [];
  const skipped: SkippedEntry[] = [];
  const seen = new Set<string>();

  payload.subscriptions.forEach((entry: unknown, index) => {
    if (!isRecord(entry)) {
      skipped.push({ index, name: null, reason: 'notAnObject' });
      return;
    }
    const name = typeof entry.name === 'string' && entry.name.trim() !== '' ? entry.name.trim() : null;
    const result = parseEntry(entry, fallbackTimestamp);
    if (!result.ok) {
      skipped.push({ index, name, reason: result.reason });
    } else if (seen.has(result.subscription.id)) {
      skipped.push({ index, name, reason: 'duplicateId' });
    } else {
      seen.add(result.subscription.id);
      subscriptions.push(result.subscription);
    }
  });

  return { ok: true, subscriptions, skipped };
}

/** Fields a restore compares; timestamps alone never count as a change. */
function sameContent(a: Subscription, b: Subscription): boolean {
  return (
    a.name === b.name &&
    a.amountMinor === b.amountMinor &&
    a.currency === b.currency &&
    a.interval === b.interval &&
    a.anchorDate === b.anchorDate &&
    a.category === b.category &&
    a.status === b.status &&
    a.url === b.url &&
    a.notes === b.notes &&
    a.reminderDaysBefore === b.reminderDaysBefore
  );
}

export interface ImportPlan {
  /** Ids not on this device yet. */
  toAdd: Subscription[];
  /** Ids already on this device whose content differs; the file wins. */
  toUpdate: Subscription[];
  /** Ids already on this device with identical content; left untouched. */
  unchanged: number;
}

/** Merge strategy: same id updates, a new id is added, nothing is ever deleted. */
export function planImport(incoming: readonly Subscription[], existing: readonly Subscription[]): ImportPlan {
  const byId = new Map(existing.map((s) => [s.id, s]));
  const plan: ImportPlan = { toAdd: [], toUpdate: [], unchanged: 0 };
  for (const subscription of incoming) {
    const current = byId.get(subscription.id);
    if (!current) plan.toAdd.push(subscription);
    else if (sameContent(current, subscription)) plan.unchanged += 1;
    else plan.toUpdate.push(subscription);
  }
  return plan;
}
