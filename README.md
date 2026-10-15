# Looply

A private, offline-first subscription tracker for iOS and Android. Built for Montenegro first, with Montenegrin, English and Russian from day one.

Looply tracks recurring costs without accounts, a backend or bank connections. Everything lives in a local SQLite database on the device.

## Features

- **Overview:** normalized monthly and yearly estimates, active subscriptions, the next 30 days of real charges, and a category breakdown.
- **Subscriptions:** add, edit, pause, resume, mark as cancelled and delete. The list has diacritic-insensitive search, status and category filters, and sorting.
- **Calendar:** a chronological list of the next 90 days, plus a month grid with per-month totals.
- **Insights:**
  - actual charges per month;
  - spending by category;
  - most expensive subscriptions;
  - upcoming yearly renewals and possible overlaps;
  - a 30-day comparison once enough history exists.
- **Reminders:** local notifications N days before a charge, at a chosen time, in the app's language.
- **Export:** JSON or CSV through the system share sheet.
- **Reset:** erase all local data.
- **Appearance:** light theme by default, plus dark and system.
- **Logos:** bundled service logos (78 brands) with monogram fallbacks.

## Getting started

Requirements: Node 22+, npm, and Xcode (iOS Simulator) and/or Android Studio (emulator).

```bash
npm install
npm run ios        # starts Metro and opens the app in Expo Go on the iOS Simulator
npm run android    # same for an Android emulator
npm start          # dev server only; scan the QR code with Expo Go on a device
```

Quality checks:

```bash
npm run typecheck  # strict TypeScript
npm run lint       # ESLint (expo config, React Compiler rules)
npm test           # Jest unit tests
npm run check      # all of the above
```

Expo Go is enough for development. Remote push is not used, so Expo Go's push limitations do not apply. Local reminders work in Expo Go. For release builds, use a development or production build (`npx expo run:ios`, or EAS Build).

## Project structure

```
src/
  app/          Expo Router routes only (tabs, onboarding, subscription modals, details, privacy)
  domain/       Pure, tested business logic: calendar dates, billing, money, insights,
                reminders planning, validation, export, list filtering, brand matching
  data/         SQLite access: migrations, repositories (behind interfaces)
  state/        Zustand stores, startup bootstrap, service wiring
  services/     Platform adapters: notifications, export/share, haptics
  i18n/         i18next setup, translations (cnr/en/ru), plural rules, formatters
  theme/        Design tokens and theme provider
  components/   UI primitives (ui/) and app components
  hooks/        useToday, useFormatters, reminder sync, notification permission
  assets/       Generated brand icon subset
scripts/        Brand icon generator and alias config
```

## Architecture decisions

- **Calendar dates are `YYYY-MM-DD` strings, not `Date`s.** Billing happens on calendar days. A small, fully tested day-count module does all date arithmetic, so timezones and DST can never shift a payment to another day. No date library is needed.
- **Money is stored in integer minor units.** Each currency has a fixed number of fraction digits. Totals are always grouped per currency and never combined across currencies.
- **Repositories sit behind interfaces** (`SubscriptionRepository`, `SettingsRepository`) that run over a minimal `SqlExecutor`. The same SQL is tested against Node's built-in SQLite, and a future sync layer can replace the implementation without touching UI or logic.
- **Schema migrations** are versioned with `PRAGMA user_version` (`src/data/migrations.ts`). Always append a migration; never edit a released one.
- **Spending history** is kept as snapshots written on every spending-relevant change (amount, currency, interval, status). Snapshots hold no names or notes. Insights compare against real history and stay silent until 30 days of it exist.
- **State:** Zustand stores mirror the database. A mutation updates state only after the write succeeds.
- **Reminders reconcile, not patch.** After any change, on language change and on foreground, the full reminder plan is recomputed and all pending reminders are replaced. Planning is a pure, tested function. The plan stays under the iOS limit of 64 pending notifications.

## Billing assumptions

- A subscription renews on `anchor + n × interval` (n ≥ 0). The anchor is the next billing date the user entered, and no payments are invented before it.
- Monthly, quarterly, semiannual and annual intervals keep the anchor's day and clamp to the end of shorter months (31 Jan → 28/29 Feb → 31 Mar). Each renewal is computed from the anchor, so clamping never drifts.
- Weekly renewals are exactly 7 calendar days apart.
- **Normalized estimates** use payments per year: weekly 52, monthly 12, quarterly 4, semiannual 2, annual 1. Monthly = yearly / 12. They describe average cost, not what is charged in a given month.
- **Actual charges** (upcoming payments, calendar, monthly columns) use the real schedule.
- Only active subscriptions count. Paused and cancelled ones are excluded from totals, schedules and reminders.
- Editing a subscription without changing its date keeps the original anchor, so a 31st-of-month anchor survives edits.

## Localization

- Languages: Montenegrin (`cnr`, Latin script, primary and fallback), English and Russian.
- On first launch the language is chosen from the device. Serbian, Croatian and Bosnian device settings map to Montenegrin, and unsupported languages fall back to Montenegrin. A language chosen in onboarding or Settings is never overridden.
- `src/i18n/locales/cnr.ts` defines the translation shape. The other locales are type-checked against it, and a test verifies identical keys and interpolation variables.
- Plural keys always include `_one/_few/_many/_other` so the shapes match. A small CLDR-based polyfill is installed only when the engine's `Intl.PluralRules` is missing or wrong for `cnr`/`ru`.
- Dates use the app's own month and weekday names, including Russian genitive forms, so they follow the app language rather than the device language. Amounts use `Intl.NumberFormat`. Currency stays independent of language.

## Privacy

- No account, no network calls, no analytics and no bank access.
- Data stays in the local SQLite database. The app never claims to sync or back up. Export is the user's own copy.
- Logs never contain subscription data. The only runtime log is an error type, plus a reminder count in development.

## Brand logos

Logos are a generated subset of [Simple Icons](https://simpleicons.org) (CC0). To add a brand, edit `scripts/brands.config.json` and run `npm run brands`. Brands that asked Simple Icons to remove their icons (for example Microsoft, Adobe, OpenAI, Amazon, Disney) are deliberately not included, and those subscriptions show a monogram. Logos remain trademarks of their owners. Review each brand's guidelines before a store release.

## Known limitations

- No import or restore yet. Export is one-way.
- Exchange rates are not used. Multi-currency totals are shown per currency, by design.
- Reminder delivery time is controlled by the OS. Reminders are planned for a rolling window of 120 days and the window is extended whenever the app is opened.
- Developed and verified on the iOS Simulator. Android has been type- and lint-checked but not yet run on an emulator.
- No custom typeface. The UI uses the platform system fonts.
