import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';

export async function pickSpreadsheetFile(): Promise<ArrayBuffer | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve(await file.arrayBuffer());
      };
      input.click();
    });
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/comma-separated-values',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  const base64 = await readAsStringAsync(result.assets[0].uri, {
    encoding: EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
