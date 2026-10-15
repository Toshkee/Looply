import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { todayLocal } from '@/domain/calendarDate';
import type { CurrencyCode } from '@/domain/currency';
import { buildCsvExport, buildJsonExport } from '@/domain/exportData';
import type { Subscription } from '@/domain/subscription';

export type ExportFormat = 'json' | 'csv';

const FORMAT_META: Record<ExportFormat, { mimeType: string; uti: string }> = {
  json: { mimeType: 'application/json', uti: 'public.json' },
  csv: { mimeType: 'text/csv', uti: 'public.comma-separated-values-text' },
};

/**
 * Writes the export to the app's cache directory and opens the system share
 * sheet, so the user decides where the copy goes (Files, mail, AirDrop…).
 */
export async function shareExport(
  format: ExportFormat,
  subscriptions: readonly Subscription[],
  defaultCurrency: CurrencyCode,
  dialogTitle: string,
): Promise<void> {
  const now = new Date();
  const today = todayLocal(now);
  const content =
    format === 'json'
      ? buildJsonExport(subscriptions, { today, exportedAt: now.toISOString(), defaultCurrency })
      : buildCsvExport(subscriptions, today);

  const file = new File(Paths.cache, `looply-${today}.${format}`);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  const { mimeType, uti } = FORMAT_META[format];
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle });
}
