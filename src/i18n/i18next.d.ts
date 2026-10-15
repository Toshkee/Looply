import 'i18next';

import type cnr from './locales/cnr';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof cnr };
    returnNull: false;
  }
}
