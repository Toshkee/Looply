import type { TFunction } from 'i18next';

import { NAME_MAX_LENGTH, NOTES_MAX_LENGTH, type FormErrors, type FormField } from '@/domain/validation';

/** Turns validation codes into localized messages. */
export function fieldErrorMessage(t: TFunction, errors: FormErrors, field: FormField): string | null {
  const code = errors[field];
  if (!code) return null;
  switch (field) {
    case 'name':
      return code === 'tooLong' ? t('validation.nameTooLong', { max: NAME_MAX_LENGTH }) : t('validation.nameRequired');
    case 'amount':
      if (code === 'required') return t('validation.amountRequired');
      if (code === 'amountNotPositive') return t('validation.amountNotPositive');
      if (code === 'amountTooLarge') return t('validation.amountTooLarge');
      return t('validation.amountInvalid');
    case 'nextBillingDate':
      return t('validation.dateRequired');
    case 'url':
      return code === 'tooLong' ? t('validation.urlTooLong') : t('validation.urlInvalid');
    case 'notes':
      return t('validation.notesTooLong', { max: NOTES_MAX_LENGTH });
  }
}
