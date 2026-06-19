import { auth, db } from '../config/firebase';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { isCurrentUserDeveloper } from './devMode';

export interface DemoSeedResult {
  businessId: string;
  businessName: string;
  categoriesCreated: number;
  productsCreated: number;
}

type CategorySpec = { name: string };
type ProductSpec = {
  name: string;
  categoryName: string;
  price: number;
  unit: string;
  description: string;
  barcode: string;
  stockQty?: number;
  reorderPoint?: number;
  trackInventory?: boolean;
  qrCode?: string;
};

export const DEMO_BUSINESS_NAME = 'Loopify Demo Wholesale Co.';
/** Public demo login (see `loginOrProvisionLoopifyDemo` in auth). */
export const LOOPIFY_DEMO_EMAIL = 'demo@loopify.web';

const CATEGORIES: CategorySpec[] = [
  { name: 'Cleaning & Janitorial' },
  { name: 'Packaging & Disposables' },
  { name: 'Paper & Printing' },
  { name: 'Beverages' },
  { name: 'Snacks & Pantry' },
  { name: 'Office Supplies' },
  { name: 'IT & Electronics' },
  { name: 'Safety & PPE' },
  { name: 'Warehouse & Logistics' },
  { name: 'Facility & Maintenance' },
];

const PRODUCTS: ProductSpec[] = [
  // Cleaning
  { name: 'Industrial Floor Degreaser 5L', categoryName: 'Cleaning & Janitorial', price: 42.9, unit: 'bottle', description: 'Heavy-duty degreaser for commercial kitchens and workshops.', barcode: 'DEMO-CLN-00001', stockQty: 48, reorderPoint: 12, trackInventory: true },
  { name: 'Microfiber Mop Set', categoryName: 'Cleaning & Janitorial', price: 28.5, unit: 'set', description: '3-piece wet/dry mop system with telescopic handle.', barcode: 'DEMO-CLN-00002', stockQty: 22, reorderPoint: 8, trackInventory: true },
  { name: 'Glass Cleaner Concentrate 2L', categoryName: 'Cleaning & Janitorial', price: 18.0, unit: 'bottle', description: 'Streak-free formula; dilute 1:10 for daily use.', barcode: 'DEMO-CLN-00003', stockQty: 60, reorderPoint: 15, trackInventory: true },
  { name: 'Antibacterial Hand Soap 5L', categoryName: 'Cleaning & Janitorial', price: 34.75, unit: 'jug', description: 'Refill for dispensers; mild citrus scent.', barcode: 'DEMO-CLN-00004', stockQty: 10, reorderPoint: 20, trackInventory: true },
  { name: 'Trash Bags 240L Heavy Duty (50)', categoryName: 'Cleaning & Janitorial', price: 89.0, unit: 'box', description: 'Black HDPE, 35µm, roll of 50.', barcode: 'DEMO-CLN-00005', stockQty: 35, reorderPoint: 10, trackInventory: true },
  { name: 'Scouring Pads (24 pack)', categoryName: 'Cleaning & Janitorial', price: 14.2, unit: 'pack', description: 'Commercial grade green pads.', barcode: 'DEMO-CLN-00006', stockQty: 100, reorderPoint: 24, trackInventory: true },
  // Packaging
  { name: 'Kraft Takeaway Boxes 750ml (200)', categoryName: 'Packaging & Disposables', price: 156.0, unit: 'case', description: 'Compostable lining option; stackable.', barcode: 'DEMO-PKG-00001', stockQty: 14, reorderPoint: 5, trackInventory: true },
  { name: 'PET Cups 12oz (1000)', categoryName: 'Packaging & Disposables', price: 112.5, unit: 'case', description: 'Clear cups with flat lids included.', barcode: 'DEMO-PKG-00002', stockQty: 8, reorderPoint: 4, trackInventory: true },
  { name: 'Wooden Cutlery Set (500)', categoryName: 'Packaging & Disposables', price: 67.0, unit: 'case', description: 'Fork, knife, spoon pre-wrapped sets.', barcode: 'DEMO-PKG-00003', stockQty: 40, reorderPoint: 10, trackInventory: true },
  { name: 'Aluminum Foil Roll 45cm x 150m', categoryName: 'Packaging & Disposables', price: 44.9, unit: 'roll', description: 'Food service grade.', barcode: 'DEMO-PKG-00004', stockQty: 25, reorderPoint: 8, trackInventory: true },
  { name: 'Cling Film 30cm x 300m', categoryName: 'Packaging & Disposables', price: 29.99, unit: 'roll', description: 'PVC-free professional wrap.', barcode: 'DEMO-PKG-00005', stockQty: 30, reorderPoint: 10, trackInventory: true },
  // Paper
  { name: 'A4 Paper 80gsm (5 reams)', categoryName: 'Paper & Printing', price: 22.5, unit: 'box', description: '2500 sheets total; FSC certified.', barcode: 'DEMO-PAP-00001', stockQty: 200, reorderPoint: 40, trackInventory: true },
  { name: 'Thermal Receipt Rolls 80×80 (24)', categoryName: 'Paper & Printing', price: 48.0, unit: 'box', description: 'BPA-free; fits most POS printers.', barcode: 'DEMO-PAP-00002', stockQty: 55, reorderPoint: 12, trackInventory: true },
  { name: 'Sticky Notes 76×76 (12 pads)', categoryName: 'Paper & Printing', price: 16.9, unit: 'pack', description: 'Canary yellow, repositionable.', barcode: 'DEMO-PAP-00003', stockQty: 80, reorderPoint: 20, trackInventory: true },
  { name: 'Business Card Stock 300gsm (250)', categoryName: 'Paper & Printing', price: 39.0, unit: 'pack', description: 'Matte white, laser compatible.', barcode: 'DEMO-PAP-00004', stockQty: 15, reorderPoint: 6, trackInventory: true },
  { name: 'Kraft Envelopes C4 (250)', categoryName: 'Paper & Printing', price: 31.5, unit: 'box', description: 'Self-seal strip; 120gsm.', barcode: 'DEMO-PAP-00005', stockQty: 12, reorderPoint: 5, trackInventory: true },
  // Beverages
  { name: 'Espresso Beans 1kg', categoryName: 'Beverages', price: 52.0, unit: 'bag', description: 'Arabica blend; medium roast.', barcode: 'DEMO-BEV-00001', stockQty: 70, reorderPoint: 15, trackInventory: true },
  { name: 'Green Tea Bags (200)', categoryName: 'Beverages', price: 24.9, unit: 'box', description: 'Individual envelopes; fair trade.', barcode: 'DEMO-BEV-00002', stockQty: 45, reorderPoint: 12, trackInventory: true },
  { name: 'Orange Juice 1L (12)', categoryName: 'Beverages', price: 36.0, unit: 'case', description: 'Not from concentrate; chilled chain.', barcode: 'DEMO-BEV-00003', stockQty: 28, reorderPoint: 10, trackInventory: true },
  { name: 'Sparkling Water 500ml (24)', categoryName: 'Beverages', price: 19.99, unit: 'case', description: 'Glass bottles; assorted flavours.', barcode: 'DEMO-BEV-00004', stockQty: 90, reorderPoint: 24, trackInventory: true },
  { name: 'Energy Drink 250ml (24)', categoryName: 'Beverages', price: 42.0, unit: 'case', description: 'Sugar-free variant available in notes.', barcode: 'DEMO-BEV-00005', stockQty: 6, reorderPoint: 12, trackInventory: true },
  // Snacks
  { name: 'Mixed Nuts 1kg', categoryName: 'Snacks & Pantry', price: 38.5, unit: 'bag', description: 'Roasted unsalted; HACCP facility.', barcode: 'DEMO-SNK-00001', stockQty: 33, reorderPoint: 10, trackInventory: true },
  { name: 'Granola Bars (40)', categoryName: 'Snacks & Pantry', price: 29.0, unit: 'box', description: 'Honey & oat; individually wrapped.', barcode: 'DEMO-SNK-00002', stockQty: 50, reorderPoint: 15, trackInventory: true },
  { name: 'Instant Soup Cups (24)', categoryName: 'Snacks & Pantry', price: 41.25, unit: 'case', description: 'Vegetable & noodle variety pack.', barcode: 'DEMO-SNK-00003', stockQty: 18, reorderPoint: 8, trackInventory: true },
  { name: 'Dark Chocolate 70% 100g (20)', categoryName: 'Snacks & Pantry', price: 55.0, unit: 'box', description: 'EU origin cocoa; shelf stable.', barcode: 'DEMO-SNK-00004', stockQty: 24, reorderPoint: 10, trackInventory: true },
  { name: 'Rice Basmati 5kg', categoryName: 'Snacks & Pantry', price: 27.9, unit: 'bag', description: 'Extra long grain; export grade.', barcode: 'DEMO-SNK-00005', stockQty: 120, reorderPoint: 30, trackInventory: true },
  // Office
  { name: 'Blue Ballpoint Pens (50)', categoryName: 'Office Supplies', price: 18.5, unit: 'box', description: '1.0mm tip; smudge resistant.', barcode: 'DEMO-OFF-00001', stockQty: 65, reorderPoint: 20, trackInventory: true },
  { name: 'Heavy Duty Stapler', categoryName: 'Office Supplies', price: 24.0, unit: 'unit', description: '50-sheet capacity; includes 5000 staples.', barcode: 'DEMO-OFF-00002', stockQty: 20, reorderPoint: 6, trackInventory: true },
  { name: 'Desk Organizer Mesh', categoryName: 'Office Supplies', price: 32.0, unit: 'unit', description: '6 compartments; black powder coat.', barcode: 'DEMO-OFF-00003', stockQty: 15, reorderPoint: 5, trackInventory: true },
  { name: 'File Folders A4 (100)', categoryName: 'Office Supplies', price: 44.5, unit: 'box', description: 'Manila; 2-ply reinforced tab.', barcode: 'DEMO-OFF-00004', stockQty: 40, reorderPoint: 10, trackInventory: true },
  { name: 'Whiteboard Markers (12)', categoryName: 'Office Supplies', price: 21.99, unit: 'pack', description: 'Low-odour dry erase; chisel tip.', barcode: 'DEMO-OFF-00005', stockQty: 88, reorderPoint: 24, trackInventory: true },
  { name: 'Binder Clips Assorted (120)', categoryName: 'Office Supplies', price: 12.75, unit: 'pack', description: 'Sizes 19–51mm tin reusable tub.', barcode: 'DEMO-OFF-00006', stockQty: 44, reorderPoint: 12, trackInventory: true },
  // IT
  { name: 'USB-C Hub 7-in-1', categoryName: 'IT & Electronics', price: 49.99, unit: 'unit', description: 'HDMI 4K, SD, USB 3.0, PD pass-through.', barcode: 'DEMO-IT-00001', stockQty: 30, reorderPoint: 10, trackInventory: true, qrCode: 'QR-DEMO-IT-HUB-01' },
  { name: 'Wireless Mouse Ergonomic', categoryName: 'IT & Electronics', price: 36.5, unit: 'unit', description: 'Silent clicks; multi-device pairing.', barcode: 'DEMO-IT-00002', stockQty: 45, reorderPoint: 12, trackInventory: true },
  { name: 'Mechanical Keyboard TKL', categoryName: 'IT & Electronics', price: 129.0, unit: 'unit', description: 'Hot-swap switches; RGB optional.', barcode: 'DEMO-IT-00003', stockQty: 12, reorderPoint: 4, trackInventory: true },
  { name: 'Webcam 1080p', categoryName: 'IT & Electronics', price: 59.0, unit: 'unit', description: 'Autofocus; privacy shutter.', barcode: 'DEMO-IT-00004', stockQty: 22, reorderPoint: 8, trackInventory: true },
  { name: 'Cat6 Ethernet Cable 3m (10)', categoryName: 'IT & Electronics', price: 34.0, unit: 'pack', description: 'Snagless boots; 550MHz rated.', barcode: 'DEMO-IT-00005', stockQty: 60, reorderPoint: 15, trackInventory: true },
  { name: 'Portable SSD 1TB', categoryName: 'IT & Electronics', price: 89.99, unit: 'unit', description: 'USB 3.2 Gen2; IP55 rated enclosure.', barcode: 'DEMO-IT-00006', stockQty: 8, reorderPoint: 4, trackInventory: true, qrCode: 'QR-DEMO-IT-SSD-1TB' },
  // Safety
  { name: 'Nitrile Gloves L (100)', categoryName: 'Safety & PPE', price: 22.0, unit: 'box', description: 'Powder-free; medical grade.', barcode: 'DEMO-SAF-00001', stockQty: 200, reorderPoint: 40, trackInventory: true },
  { name: 'Safety Vest Hi-Vis XL', categoryName: 'Safety & PPE', price: 15.5, unit: 'unit', description: 'EN ISO 20471 Class 2; zip front.', barcode: 'DEMO-SAF-00002', stockQty: 75, reorderPoint: 20, trackInventory: true },
  { name: 'Ear Plugs Corded (200)', categoryName: 'Safety & PPE', price: 48.0, unit: 'box', description: 'SNR 32dB; individually bagged.', barcode: 'DEMO-SAF-00003', stockQty: 30, reorderPoint: 10, trackInventory: true },
  { name: 'First Aid Cabinet Refill Kit', categoryName: 'Safety & PPE', price: 95.0, unit: 'kit', description: 'DIN 13157 compliant contents.', barcode: 'DEMO-SAF-00004', stockQty: 9, reorderPoint: 3, trackInventory: true },
  { name: 'Safety Goggles Anti-Fog', categoryName: 'Safety & PPE', price: 8.9, unit: 'unit', description: 'Indirect vent; over-glasses fit.', barcode: 'DEMO-SAF-00005', stockQty: 110, reorderPoint: 30, trackInventory: true },
  // Warehouse
  { name: 'Pallet Jack 2.5T', categoryName: 'Warehouse & Logistics', price: 420.0, unit: 'unit', description: 'Polyurethane wheels; pump tested.', barcode: 'DEMO-WH-00001', stockQty: 4, reorderPoint: 2, trackInventory: true },
  { name: 'Stretch Wrap 50cm x 300m', categoryName: 'Warehouse & Logistics', price: 38.0, unit: 'roll', description: '18µm cast film; quiet unwind.', barcode: 'DEMO-WH-00002', stockQty: 36, reorderPoint: 10, trackInventory: true },
  { name: 'Barcode Labels 100×150 (2000)', categoryName: 'Warehouse & Logistics', price: 72.0, unit: 'roll', description: 'Thermal transfer; permanent adhesive.', barcode: 'DEMO-WH-00003', stockQty: 18, reorderPoint: 6, trackInventory: true },
  { name: 'Packing Tape Gun', categoryName: 'Warehouse & Logistics', price: 14.5, unit: 'unit', description: '3" core; metal frame.', barcode: 'DEMO-WH-00004', stockQty: 25, reorderPoint: 8, trackInventory: true },
  { name: 'Storage Bin 60L (4)', categoryName: 'Warehouse & Logistics', price: 54.99, unit: 'pack', description: 'Stackable with lids; grey.', barcode: 'DEMO-WH-00005', stockQty: 14, reorderPoint: 5, trackInventory: true },
  // Facility
  { name: 'LED Tube 120cm 4000K (10)', categoryName: 'Facility & Maintenance', price: 118.0, unit: 'case', description: 'Direct wire; DLC listed.', barcode: 'DEMO-FAC-00001', stockQty: 11, reorderPoint: 4, trackInventory: true },
  { name: 'Air Filter HVAC G4 600×600', categoryName: 'Facility & Maintenance', price: 28.0, unit: 'unit', description: 'Pleated synthetic; disposable.', barcode: 'DEMO-FAC-00002', stockQty: 40, reorderPoint: 12, trackInventory: true },
  { name: 'Hand Dryer Sensor 1.8kW', categoryName: 'Facility & Maintenance', price: 289.0, unit: 'unit', description: 'Brushless motor; 12s dry time.', barcode: 'DEMO-FAC-00003', stockQty: 3, reorderPoint: 2, trackInventory: true },
  { name: 'Smoke Detector Battery 9V (12)', categoryName: 'Facility & Maintenance', price: 19.5, unit: 'pack', description: 'Alkaline; 5-year shelf life.', barcode: 'DEMO-FAC-00004', stockQty: 95, reorderPoint: 24, trackInventory: true },
  { name: 'WD-40 Multi-Use 400ml', categoryName: 'Facility & Maintenance', price: 11.9, unit: 'can', description: 'Lubricant and moisture displacer.', barcode: 'DEMO-FAC-00005', stockQty: 150, reorderPoint: 36, trackInventory: true },
  // App / local test items (for QA in Loopify demos)
  { name: 'Mobile application', categoryName: 'IT & Electronics', price: 12000.0, unit: 'unit', description: 'Custom mobile app development package.', barcode: 'DEMO-WEB-00001', stockQty: 3, reorderPoint: 1, trackInventory: true },
  { name: 'Barber Shop App', categoryName: 'IT & Electronics', price: 8500.0, unit: 'unit', description: 'Booking and POS app for barber shops.', barcode: 'DEMO-WEB-00002', stockQty: 2, reorderPoint: 1, trackInventory: true },
  { name: 'Activia Yogurt 1.5%', categoryName: 'Beverages', price: 15.0, unit: 'unit', description: 'Probiotic yogurt drink 325ml.', barcode: '3232312323', stockQty: 48, reorderPoint: 12, trackInventory: true },
  { name: 'Cups 7', categoryName: 'Packaging & Disposables', price: 50.0, unit: 'unit', description: '7oz disposable cups for hot drinks.', barcode: '0555555', stockQty: 200, reorderPoint: 40, trackInventory: true },
];

export const DEMO_SEED_STATS = {
  categories: CATEGORIES.length,
  products: PRODUCTS.length,
  businessName: DEMO_BUSINESS_NAME,
} as const;

/**
 * Seeds demo categories + products for an existing business UID (e.g. Auth uid).
 * No-op if this business already has at least one category.
 */
export async function seedDemoCatalogForBusinessId(
  businessId: string,
  options?: { force?: boolean; skipIfExists?: boolean }
): Promise<DemoSeedResult> {
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  const fs = db;
  const existing = await getDocs(
    query(collection(fs, 'productCategories'), where('businessId', '==', businessId), limit(1))
  );
  if (!existing.empty && !options?.force) {
    if (options?.skipIfExists) {
      return {
        businessId,
        businessName: DEMO_BUSINESS_NAME,
        categoriesCreated: 0,
        productsCreated: 0,
      };
    }
    throw new Error(
      'This business already has categories. Delete existing categories first, or clear inventory before loading samples again.'
    );
  }

  const now = serverTimestamp();
  const categoryRefs = CATEGORIES.map(() => doc(collection(fs, 'productCategories')));
  const categoryIdByName: Record<string, string> = {};
  CATEGORIES.forEach((c, i) => {
    categoryIdByName[c.name] = categoryRefs[i].id;
  });

  const productRefs = PRODUCTS.map(() => doc(collection(fs, 'products')));
  const batch = writeBatch(fs);

  CATEGORIES.forEach((c, i) => {
    batch.set(categoryRefs[i], {
      name: c.name,
      businessId,
      createdAt: now,
    });
  });

  PRODUCTS.forEach((p, i) => {
    const categoryId = categoryIdByName[p.categoryName];
    if (!categoryId) return;
    const payload: Record<string, unknown> = {
      businessId,
      name: p.name,
      categoryId,
      categoryName: p.categoryName,
      price: p.price,
      unit: p.unit,
      description: p.description,
      barcode: p.barcode,
      createdAt: now,
      updatedAt: now,
    };
    if (p.stockQty !== undefined) payload.stockQty = p.stockQty;
    if (p.reorderPoint !== undefined) payload.reorderPoint = p.reorderPoint;
    if (p.trackInventory) payload.trackInventory = true;
    if (p.qrCode) payload.qrCode = p.qrCode;
    batch.set(productRefs[i], payload);
  });

  await batch.commit();

  return {
    businessId,
    businessName: DEMO_BUSINESS_NAME,
    categoriesCreated: CATEGORIES.length,
    productsCreated: PRODUCTS.length,
  };
}

/**
 * Creates a new standalone business document plus many productCategories and products.
 * Intended for developers to populate realistic data for QA / demos (dev console).
 */
export async function seedDemoTestStore(): Promise<DemoSeedResult> {
  if (!auth?.currentUser || !db) {
    throw new Error('You must be signed in.');
  }
  if (!isCurrentUserDeveloper()) {
    throw new Error('Only developer accounts can create the demo test store from /dev.');
  }

  const fs = db;

  const businessRef = doc(collection(fs, 'businesses'));
  const businessId = businessRef.id;
  const now = serverTimestamp();

  const businessPayload = {
    uid: businessId,
    email: LOOPIFY_DEMO_EMAIL,
    displayName: DEMO_BUSINESS_NAME,
    businessName: DEMO_BUSINESS_NAME,
    businessType: 'Wholesale & Distribution',
    phoneNumber: '+972-3-555-0100',
    address: '12 HaMasger Street, Tel Aviv',
    location: 'Tel Aviv, Israel',
    workHours: 'Sun–Thu 8:00–18:00, Fri 8:00–13:00',
    description:
      'Demo B2B supplier for Loopify testing: catalog browsing, cart, orders, inventory, low-stock alerts, and barcode/QR flows. Safe to delete from Firestore when no longer needed.',
    services:
      'Same-day dispatch in TLV metro • Net-30 for approved buyers • Dedicated account manager on orders over ₪5,000',
    role: 'manager',
    storeId: businessId,
    ownerBusinessId: businessId,
    isTeamMember: false,
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(fs);
  batch.set(businessRef, businessPayload);
  await batch.commit();

  return seedDemoCatalogForBusinessId(businessId);
}
