import * as XLSX from 'xlsx';
import { Platform } from 'react-native';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Product } from '../services/inventory';

export interface InventoryImportRow {
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  description?: string;
  barcode?: string;
  reorderPoint?: number;
}

export interface InventoryImportPreview {
  rows: InventoryImportRow[];
  sheetName: string;
  invalidRows: string[];
}

const HEADER_ALIASES: Record<keyof InventoryImportRow, string[]> = {
  name: ['name', 'product', 'product name', 'product_name', 'item', 'item name'],
  category: ['category', 'categories', 'category name', 'category_name', 'cat'],
  price: ['price', 'unit price', 'unit_price', 'cost', 'sell price'],
  stock: ['stock', 'stock qty', 'stock quantity', 'stock_qty', 'quantity', 'qty', 'inventory'],
  unit: ['unit', 'units', 'uom', 'measure'],
  description: ['description', 'desc', 'details', 'notes'],
  barcode: ['barcode', 'sku', 'code', 'bar code'],
  reorderPoint: ['reorder', 'reorder point', 'reorder_point', 'min stock', 'minimum stock'],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function pickField(row: Record<string, unknown>, field: keyof InventoryImportRow): unknown {
  const aliases = HEADER_ALIASES[field];
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeHeader(key);
    if (aliases.includes(normalized)) return value;
  }
  return undefined;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const text = String(value ?? '').trim().replace(/[₪$,]/g, '');
  if (!text) return fallback;
  const num = Number(text);
  return Number.isNaN(num) ? fallback : num;
}

function parseText(value: unknown): string {
  return String(value ?? '').trim();
}

export function parseInventoryWorkbook(data: ArrayBuffer | Uint8Array): InventoryImportPreview {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], sheetName: '', invalidRows: ['The file has no worksheets.'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const rows: InventoryImportRow[] = [];
  const invalidRows: string[] = [];

  rawRows.forEach((raw, index) => {
    const name = parseText(pickField(raw, 'name'));
    const category = parseText(pickField(raw, 'category'));
    const unit = parseText(pickField(raw, 'unit')) || 'unit';
    const price = parseNumber(pickField(raw, 'price'));
    const stock = parseNumber(pickField(raw, 'stock'));
    const description = parseText(pickField(raw, 'description'));
    const barcode = parseText(pickField(raw, 'barcode'));
    const reorderPoint = parseNumber(pickField(raw, 'reorderPoint'), 0);

    if (!name && !category && !parseText(pickField(raw, 'price'))) {
      return;
    }

    if (!name || !category) {
      invalidRows.push(`Row ${index + 2}: missing product name or category.`);
      return;
    }

    const row: InventoryImportRow = { name, category, price, stock, unit };
    if (description) row.description = description;
    if (barcode) row.barcode = barcode;
    if (reorderPoint > 0) row.reorderPoint = reorderPoint;
    rows.push(row);
  });

  return { rows, sheetName, invalidRows };
}

export function buildInventoryTemplateWorkbook(): XLSX.WorkBook {
  const sample = [
    {
      Name: 'Example Product',
      Category: 'Office Supplies',
      Price: 18.5,
      Stock: 50,
      Unit: 'box',
      Description: 'Short product description',
      Barcode: 'SKU-00001',
      'Reorder Point': 10,
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(sample);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Inventory');
  return workbook;
}

export function downloadInventoryTemplate(fileName = 'inventory-import-template.xlsx'): void {
  const workbook = buildInventoryTemplateWorkbook();
  XLSX.writeFile(workbook, fileName);
}

export async function shareInventoryTemplate(): Promise<void> {
  const fileName = 'inventory-import-template.xlsx';
  const workbook = buildInventoryTemplateWorkbook();

  if (Platform.OS === 'web') {
    XLSX.writeFile(workbook, fileName);
    return;
  }

  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  const uri = `${cacheDirectory}${fileName}`;
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Inventory import template',
    UTI: 'com.microsoft.excel.xlsx',
  });
}

export function buildInventoryExportWorkbook(products: Product[]): XLSX.WorkBook {
  const rows = [...products]
    .sort((a, b) => {
      const categoryCompare = (a.categoryName || '').localeCompare(b.categoryName || '');
      if (categoryCompare !== 0) return categoryCompare;
      return a.name.localeCompare(b.name);
    })
    .map((product) => ({
      Name: product.name,
      Category: product.categoryName || '',
      Price: product.price,
      Stock: product.stockQty ?? 0,
      Unit: product.unit || 'unit',
      Description: product.description || '',
      Barcode: product.barcode || '',
      'Reorder Point': product.reorderPoint ?? '',
      'QR Code': product.qrCode || '',
    }));

  const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{
    Name: '',
    Category: '',
    Price: '',
    Stock: '',
    Unit: '',
    Description: '',
    Barcode: '',
    'Reorder Point': '',
    'QR Code': '',
  }]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Inventory');
  return workbook;
}

export async function exportCurrentInventory(products: Product[]): Promise<void> {
  const fileName = `inventory-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const workbook = buildInventoryExportWorkbook(products);

  if (Platform.OS === 'web') {
    XLSX.writeFile(workbook, fileName);
    return;
  }

  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  const uri = `${cacheDirectory}${fileName}`;
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export inventory',
    UTI: 'com.microsoft.excel.xlsx',
  });
}
