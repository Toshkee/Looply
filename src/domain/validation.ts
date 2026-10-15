import type { ISODate } from './calendarDate';
import { currencyDecimals, type CurrencyCode } from './currency';
import { parseAmountInput } from './money';
import type { BillingInterval, CategoryId, SubscriptionInput, SubscriptionStatus } from './subscription';

export const NAME_MAX_LENGTH = 60;
export const NOTES_MAX_LENGTH = 500;
export const URL_MAX_LENGTH = 300;
/** Largest accepted price per billing period, in major units. */
export const MAX_AMOUNT_MAJOR = 100_000;

/** Raw form state, exactly as edited on screen. */
export interface SubscriptionFormValues {
  name: string;
  amount: string;
  currency: CurrencyCode;
  interval: BillingInterval;
  nextBillingDate: ISODate | null;
  category: CategoryId;
  status: SubscriptionStatus;
  url: string;
  notes: string;
  reminderDaysBefore: number | null;
}

export type FormField = 'name' | 'amount' | 'nextBillingDate' | 'url' | 'notes';

export type ValidationError =
  | 'required'
  | 'tooLong'
  | 'invalidAmount'
  | 'amountNotPositive'
  | 'amountTooLarge'
  | 'invalidUrl';

export type FormErrors = Partial<Record<FormField, ValidationError>>;

export type ValidationResult = { ok: true; input: SubscriptionInput } | { ok: false; errors: FormErrors };

/** Adds `https://` when missing and checks for a plausible web address. */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const match = /^https?:\/\/([^\s/?#:]+)(:\d+)?([/?#]\S*)?$/i.exec(withScheme);
  const host = match?.[1];
  if (!host || !host.includes('.') || host.startsWith('.') || host.endsWith('.')) return null;
  return withScheme;
}

export function validateSubscriptionForm(values: SubscriptionFormValues): ValidationResult {
  const errors: FormErrors = {};

  const name = values.name.trim().replace(/\s+/g, ' ');
  if (name === '') errors.name = 'required';
  else if (name.length > NAME_MAX_LENGTH) errors.name = 'tooLong';

  let amountMinor: number | null = null;
  if (values.amount.trim() === '') {
    errors.amount = 'required';
  } else {
    amountMinor = parseAmountInput(values.amount, values.currency);
    if (amountMinor === null) errors.amount = 'invalidAmount';
    else if (amountMinor <= 0) errors.amount = 'amountNotPositive';
    else if (amountMinor > MAX_AMOUNT_MAJOR * 10 ** currencyDecimals(values.currency)) errors.amount = 'amountTooLarge';
  }

  if (!values.nextBillingDate) errors.nextBillingDate = 'required';

  let url: string | null = null;
  if (values.url.trim() !== '') {
    if (values.url.trim().length > URL_MAX_LENGTH) errors.url = 'tooLong';
    else {
      url = normalizeUrl(values.url);
      if (!url) errors.url = 'invalidUrl';
    }
  }

  const notes = values.notes.trim();
  if (notes.length > NOTES_MAX_LENGTH) errors.notes = 'tooLong';

  if (Object.keys(errors).length > 0 || amountMinor === null || !values.nextBillingDate) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      name,
      amountMinor,
      currency: values.currency,
      interval: values.interval,
      anchorDate: values.nextBillingDate,
      category: values.category,
      status: values.status,
      url,
      notes: notes === '' ? null : notes,
      reminderDaysBefore: values.reminderDaysBefore,
    },
  };
}
