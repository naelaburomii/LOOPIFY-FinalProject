import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getCurrentBusinessId } from './rbac';
import { Product } from './inventory';
import { InventoryImportRow } from '../utils/inventoryExcel';

export interface InventoryImportResult {
  categoriesCreated: number;
  productsCreated: number;
  productsUpdated: number;
  skipped: number;
  errors: string[];
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function productMatchKey(name: string, categoryName: string): string {
  return `${normalizeKey(name)}::${normalizeKey(categoryName)}`;
}

function buildProductPayload(
  businessId: string,
  row: InventoryImportRow,
  categoryId: string,
  categoryName: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    businessId,
    name: row.name.trim(),
    categoryId,
    categoryName,
    price: row.price,
    unit: row.unit.trim() || 'unit',
    stockQty: row.stock,
    trackInventory: true,
    updatedAt: serverTimestamp(),
  };
  if (row.description) payload.description = row.description.trim();
  if (row.barcode) payload.barcode = row.barcode.trim();
  if (row.reorderPoint !== undefined && row.reorderPoint > 0) {
    payload.reorderPoint = row.reorderPoint;
  }
  return payload;
}

export async function importInventoryRows(rows: InventoryImportRow[]): Promise<InventoryImportResult> {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const businessId = await getCurrentBusinessId();
  if (!businessId) {
    throw new Error('Business profile not found');
  }

  if (rows.length === 0) {
    throw new Error('No valid product rows found in the spreadsheet.');
  }

  const firestore = db;
  const result: InventoryImportResult = {
    categoriesCreated: 0,
    productsCreated: 0,
    productsUpdated: 0,
    skipped: 0,
    errors: [],
  };

  const [categorySnap, productSnap] = await Promise.all([
    getDocs(query(collection(firestore, 'productCategories'), where('businessId', '==', businessId))),
    getDocs(query(collection(firestore, 'products'), where('businessId', '==', businessId))),
  ]);

  const categoryIdByName = new Map<string, string>();
  categorySnap.docs.forEach((item) => {
    const name = String(item.data().name || '');
    categoryIdByName.set(normalizeKey(name), item.id);
  });

  const productByBarcode = new Map<string, Product>();
  const productByKey = new Map<string, Product>();

  productSnap.docs.forEach((item) => {
    const data = item.data();
    const product = {
      id: item.id,
      businessId: data.businessId,
      name: data.name,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      price: data.price || 0,
      unit: data.unit || 'unit',
      description: data.description,
      barcode: data.barcode,
      stockQty: data.stockQty,
      reorderPoint: data.reorderPoint,
      trackInventory: data.trackInventory,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as Product;

    productByKey.set(productMatchKey(product.name, product.categoryName), product);
    if (product.barcode) {
      productByBarcode.set(normalizeKey(product.barcode), product);
    }
  });

  const pendingCategoryNames = new Set<string>();
  rows.forEach((row) => pendingCategoryNames.add(normalizeKey(row.category)));

  const newCategoryRefs = new Map<string, ReturnType<typeof doc>>();
  let batch = writeBatch(firestore);
  let batchCount = 0;

  const commitBatch = async () => {
    if (batchCount === 0) return;
    await batch.commit();
    batch = writeBatch(firestore);
    batchCount = 0;
  };

  for (const categoryKey of pendingCategoryNames) {
    if (categoryIdByName.has(categoryKey)) continue;
    const row = rows.find((item) => normalizeKey(item.category) === categoryKey);
    if (!row) continue;
    const ref = doc(collection(firestore, 'productCategories'));
    newCategoryRefs.set(categoryKey, ref);
    categoryIdByName.set(categoryKey, ref.id);
    batch.set(ref, {
      name: row.category.trim(),
      businessId,
      createdAt: serverTimestamp(),
    });
    batchCount += 1;
    result.categoriesCreated += 1;
    if (batchCount >= 400) await commitBatch();
  }
  await commitBatch();

  for (const row of rows) {
    try {
      const categoryKey = normalizeKey(row.category);
      const categoryId = categoryIdByName.get(categoryKey);
      if (!categoryId) {
        result.skipped += 1;
        result.errors.push(`Skipped "${row.name}" — category "${row.category}" could not be resolved.`);
        continue;
      }

      const categoryName = row.category.trim();
      const existing =
        (row.barcode ? productByBarcode.get(normalizeKey(row.barcode)) : undefined) ||
        productByKey.get(productMatchKey(row.name, categoryName));

      const payload = buildProductPayload(businessId, row, categoryId, categoryName);

      if (existing) {
        batch.update(doc(firestore, 'products', existing.id), payload);
        result.productsUpdated += 1;

        const updatedProduct = {
          ...existing,
          ...row,
          categoryId,
          categoryName,
          price: row.price,
          stockQty: row.stock,
        } as Product;
        productByKey.set(productMatchKey(row.name, categoryName), updatedProduct);
        if (row.barcode) productByBarcode.set(normalizeKey(row.barcode), updatedProduct);
      } else {
        const ref = doc(collection(firestore, 'products'));
        batch.set(ref, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        result.productsCreated += 1;

        const createdProduct = {
          id: ref.id,
          businessId,
          name: row.name.trim(),
          categoryId,
          categoryName,
          price: row.price,
          unit: row.unit.trim() || 'unit',
          description: row.description,
          barcode: row.barcode,
          stockQty: row.stock,
          reorderPoint: row.reorderPoint,
          trackInventory: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Product;
        productByKey.set(productMatchKey(row.name, categoryName), createdProduct);
        if (row.barcode) productByBarcode.set(normalizeKey(row.barcode), createdProduct);
      }

      batchCount += 1;
      if (batchCount >= 400) await commitBatch();
    } catch (error: any) {
      result.skipped += 1;
      result.errors.push(`"${row.name}": ${error?.message || 'Import failed'}`);
    }
  }

  await commitBatch();
  return result;
}
