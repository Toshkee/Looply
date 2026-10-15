import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

/** Exports are a few kilobytes; anything far larger is not a Looply file. */
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export class ImportFileTooLargeError extends Error {
  constructor() {
    super('Import file is too large');
    this.name = 'ImportFileTooLargeError';
  }
}

/**
 * Lets the user pick an export file and returns its text, or `null` when the
 * picker was dismissed. Android file providers often label JSON as a generic
 * binary type, so any file is offered there and the parser decides.
 */
export async function pickImportFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: Platform.OS === 'ios' ? 'application/json' : '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;

  const file = new File(asset.uri);
  try {
    if ((asset.size ?? file.size) > MAX_IMPORT_BYTES) throw new ImportFileTooLargeError();
    return await file.text();
  } finally {
    // The picker's cache copy is no longer needed; failing to remove it is harmless.
    try {
      if (file.exists) file.delete();
    } catch {}
  }
}
