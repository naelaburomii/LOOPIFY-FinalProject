import { auth, db } from '../config/firebase';
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
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
};

export type DeveloperStoreTheme = 'tnuva' | 'cleaning' | 'plastic';

interface StoreTemplate {
  businessName: string;
  businessType: string;
  phoneNumber: string;
  address: string;
  location: string;
  description: string;
  services: string;
  categories: CategorySpec[];
  products: ProductSpec[];
}

const TNUVA_STORE: StoreTemplate = {
  businessName: 'Tnuva Wholesale',
  businessType: 'Dairy & Food Distribution',
  phoneNumber: '+972-3-555-0201',
  address: 'Industrial Zone, Rehovot',
  location: 'Rehovot, Israel',
  description:
    'B2B dairy and chilled food supplier — yogurts, cheeses, milk, and desserts for restaurants, cafés, and retailers.',
  services: 'Cold-chain delivery • Net-30 terms • Minimum order ₪500',
  categories: [
    { name: 'Milk & Cream' },
    { name: 'Yogurt & Desserts' },
    { name: 'Soft Cheese' },
    { name: 'Hard Cheese' },
  ],
  products: [
    { name: 'Tnuva Milk 3% 1L', categoryName: 'Milk & Cream', price: 6.9, unit: 'bottle', description: 'Fresh pasteurized milk 3% fat.', barcode: 'TNV-MIL-001', stockQty: 120, reorderPoint: 30, trackInventory: true },
    { name: 'Tnuva Milk 1% 1L', categoryName: 'Milk & Cream', price: 6.5, unit: 'bottle', description: 'Low-fat fresh milk 1%.', barcode: 'TNV-MIL-002', stockQty: 90, reorderPoint: 24, trackInventory: true },
    { name: 'Tnuva Chocolate Milk 1L', categoryName: 'Milk & Cream', price: 8.2, unit: 'bottle', description: 'Flavored chocolate milk drink.', barcode: 'TNV-MIL-003', stockQty: 80, reorderPoint: 20, trackInventory: true },
    { name: 'Tnuva Whipping Cream 38% 250ml', categoryName: 'Milk & Cream', price: 9.9, unit: 'carton', description: 'UHT whipping cream for kitchens.', barcode: 'TNV-MIL-004', stockQty: 60, reorderPoint: 15, trackInventory: true },
    { name: 'Tnuva Sour Cream 15% 250ml', categoryName: 'Milk & Cream', price: 7.4, unit: 'tub', description: 'Classic sour cream for cooking and dips.', barcode: 'TNV-MIL-005', stockQty: 70, reorderPoint: 18, trackInventory: true },
    { name: 'Activia Yogurt Natural 325ml', categoryName: 'Yogurt & Desserts', price: 5.8, unit: 'bottle', description: 'Probiotic yogurt drink, natural flavor.', barcode: 'TNV-YOG-001', stockQty: 100, reorderPoint: 25, trackInventory: true },
    { name: 'Tnuva Yogurt Plain 3.5% 500g', categoryName: 'Yogurt & Desserts', price: 6.2, unit: 'tub', description: 'Plain white yogurt for bulk kitchen use.', barcode: 'TNV-YOG-002', stockQty: 85, reorderPoint: 20, trackInventory: true },
    { name: 'Tnuva Strawberry Yogurt 150g', categoryName: 'Yogurt & Desserts', price: 3.9, unit: 'cup', description: 'Fruit yogurt with real strawberry pieces.', barcode: 'TNV-YOG-003', stockQty: 150, reorderPoint: 40, trackInventory: true },
    { name: 'Milki Chocolate Pudding 133g', categoryName: 'Yogurt & Desserts', price: 4.5, unit: 'cup', description: 'Layered chocolate dairy dessert.', barcode: 'TNV-YOG-004', stockQty: 110, reorderPoint: 28, trackInventory: true },
    { name: 'Tnuva Vanilla Pudding 4-pack', categoryName: 'Yogurt & Desserts', price: 14.9, unit: 'pack', description: 'Four single-serve vanilla puddings.', barcode: 'TNV-YOG-005', stockQty: 55, reorderPoint: 14, trackInventory: true },
    { name: 'Tnuva Protein Yogurt 200g', categoryName: 'Yogurt & Desserts', price: 7.8, unit: 'cup', description: 'High-protein yogurt, plain.', barcode: 'TNV-YOG-006', stockQty: 65, reorderPoint: 16, trackInventory: true },
    { name: 'Tnuva Cottage Cheese 5% 250g', categoryName: 'Soft Cheese', price: 8.9, unit: 'tub', description: 'Classic cottage cheese 5% fat.', barcode: 'TNV-SFT-001', stockQty: 95, reorderPoint: 24, trackInventory: true },
    { name: 'Tnuva White Cheese 5% 250g', categoryName: 'Soft Cheese', price: 8.5, unit: 'tub', description: 'Spreadable white cheese for sandwiches.', barcode: 'TNV-SFT-002', stockQty: 88, reorderPoint: 22, trackInventory: true },
    { name: 'Tnuva Cream Cheese 250g', categoryName: 'Soft Cheese', price: 10.5, unit: 'tub', description: 'Plain cream cheese for baking and spreads.', barcode: 'TNV-SFT-003', stockQty: 72, reorderPoint: 18, trackInventory: true },
    { name: 'Tnuva Labneh 250g', categoryName: 'Soft Cheese', price: 11.9, unit: 'tub', description: 'Strained yogurt cheese, Middle Eastern style.', barcode: 'TNV-SFT-004', stockQty: 50, reorderPoint: 12, trackInventory: true },
    { name: 'Tnuva Feta Cheese 200g', categoryName: 'Soft Cheese', price: 12.4, unit: 'pack', description: 'Salted feta in brine, salad ready.', barcode: 'TNV-SFT-005', stockQty: 58, reorderPoint: 14, trackInventory: true },
    { name: 'Tnuva Hard Cheese Emek 28% 150g', categoryName: 'Hard Cheese', price: 15.9, unit: 'pack', description: 'Semi-hard yellow cheese, sliced.', barcode: 'TNV-HRD-001', stockQty: 45, reorderPoint: 12, trackInventory: true },
    { name: 'Tnuva Camembert 125g', categoryName: 'Hard Cheese', price: 18.5, unit: 'wheel', description: 'Soft ripened cheese wheel.', barcode: 'TNV-HRD-002', stockQty: 30, reorderPoint: 8, trackInventory: true },
    { name: 'Tnuva Goat Cheese 150g', categoryName: 'Hard Cheese', price: 19.9, unit: 'log', description: 'Fresh goat cheese log for salads.', barcode: 'TNV-HRD-003', stockQty: 28, reorderPoint: 8, trackInventory: true },
    { name: 'Tnuva Butter 200g', categoryName: 'Hard Cheese', price: 11.2, unit: 'block', description: 'Unsalted butter for professional kitchens.', barcode: 'TNV-HRD-004', stockQty: 64, reorderPoint: 16, trackInventory: true },
  ],
};

const CLEANING_STORE: StoreTemplate = {
  businessName: 'CleanPro Tools Wholesale',
  businessType: 'Cleaning Equipment & Supplies',
  phoneNumber: '+972-3-555-0202',
  address: '45 HaHashmal Street, Tel Aviv',
  location: 'Tel Aviv, Israel',
  description:
    'Professional cleaning tools and equipment for janitorial teams, hotels, offices, and facility management.',
  services: 'Bulk pricing • Same-week delivery • Tool warranty support',
  categories: [
    { name: 'Mops & Buckets' },
    { name: 'Brushes & Scrubbers' },
    { name: 'Brooms & Dust Control' },
    { name: 'Accessories & Safety' },
  ],
  products: [
    { name: 'Industrial Mop Bucket with Wringer 20L', categoryName: 'Mops & Buckets', price: 189.0, unit: 'unit', description: 'Heavy-duty wringer bucket on casters.', barcode: 'CLN-MOP-001', stockQty: 18, reorderPoint: 5, trackInventory: true },
    { name: 'Microfiber Flat Mop Head 40cm', categoryName: 'Mops & Buckets', price: 34.9, unit: 'unit', description: 'Replaceable flat mop pad, machine washable.', barcode: 'CLN-MOP-002', stockQty: 45, reorderPoint: 12, trackInventory: true },
    { name: 'Telescopic Mop Handle 1.4m', categoryName: 'Mops & Buckets', price: 42.0, unit: 'unit', description: 'Aluminium handle with clip lock.', barcode: 'CLN-MOP-003', stockQty: 38, reorderPoint: 10, trackInventory: true },
    { name: 'Dust Mop Frame 60cm', categoryName: 'Mops & Buckets', price: 58.0, unit: 'unit', description: 'Commercial dust mop frame, swivel head.', barcode: 'CLN-MOP-004', stockQty: 22, reorderPoint: 6, trackInventory: true },
    { name: 'String Mop Head Cotton Large', categoryName: 'Mops & Buckets', price: 24.5, unit: 'unit', description: 'Loop-end cotton mop for wet floors.', barcode: 'CLN-MOP-005', stockQty: 55, reorderPoint: 14, trackInventory: true },
    { name: 'Heavy Duty Scrub Brush', categoryName: 'Brushes & Scrubbers', price: 18.9, unit: 'unit', description: 'Stiff bristle brush for tile and grout.', barcode: 'CLN-BRS-001', stockQty: 70, reorderPoint: 18, trackInventory: true },
    { name: 'Toilet Brush Set with Holder', categoryName: 'Brushes & Scrubbers', price: 22.0, unit: 'set', description: 'Wall-mount or floor stand toilet brush kit.', barcode: 'CLN-BRS-002', stockQty: 40, reorderPoint: 10, trackInventory: true },
    { name: 'Grout Brush Narrow', categoryName: 'Brushes & Scrubbers', price: 12.5, unit: 'unit', description: 'Angled bristles for tile grout lines.', barcode: 'CLN-BRS-003', stockQty: 85, reorderPoint: 20, trackInventory: true },
    { name: 'Floor Scrub Brush 30cm', categoryName: 'Brushes & Scrubbers', price: 36.0, unit: 'unit', description: 'Push-style floor scrubber with handle socket.', barcode: 'CLN-BRS-004', stockQty: 28, reorderPoint: 8, trackInventory: true },
    { name: 'Window Squeegee 35cm', categoryName: 'Brushes & Scrubbers', price: 28.5, unit: 'unit', description: 'Streak-free rubber blade with extension fit.', barcode: 'CLN-BRS-005', stockQty: 32, reorderPoint: 8, trackInventory: true },
    { name: 'Soft Bristle Broom 120cm', categoryName: 'Brooms & Dust Control', price: 29.9, unit: 'unit', description: 'Indoor soft broom for fine dust.', barcode: 'CLN-BRM-001', stockQty: 48, reorderPoint: 12, trackInventory: true },
    { name: 'Hard Bristle Outdoor Broom', categoryName: 'Brooms & Dust Control', price: 34.0, unit: 'unit', description: 'Heavy-duty yard and warehouse broom.', barcode: 'CLN-BRM-002', stockQty: 35, reorderPoint: 10, trackInventory: true },
    { name: 'Dustpan and Brush Set', categoryName: 'Brooms & Dust Control', price: 19.5, unit: 'set', description: 'Metal dustpan with hand brush.', barcode: 'CLN-BRM-003', stockQty: 60, reorderPoint: 15, trackInventory: true },
    { name: 'Extendable Cobweb Duster 3m', categoryName: 'Brooms & Dust Control', price: 45.0, unit: 'unit', description: 'Telescopic duster for ceilings and corners.', barcode: 'CLN-BRM-004', stockQty: 20, reorderPoint: 6, trackInventory: true },
    { name: 'Microfiber Dusting Cloth 10-pack', categoryName: 'Brooms & Dust Control', price: 32.0, unit: 'pack', description: 'Lint-free cloths for surfaces and glass.', barcode: 'CLN-BRM-005', stockQty: 90, reorderPoint: 24, trackInventory: true },
    { name: 'Cleaning Caddy on Wheels', categoryName: 'Accessories & Safety', price: 145.0, unit: 'unit', description: 'Mobile caddy with compartments for supplies.', barcode: 'CLN-ACC-001', stockQty: 12, reorderPoint: 4, trackInventory: true },
    { name: 'Spray Bottle 750ml (3-pack)', categoryName: 'Accessories & Safety', price: 24.0, unit: 'pack', description: 'Trigger spray bottles for dilute cleaners.', barcode: 'CLN-ACC-002', stockQty: 75, reorderPoint: 18, trackInventory: true },
    { name: 'Rubber Gloves Heavy Duty L', categoryName: 'Accessories & Safety', price: 8.5, unit: 'pair', description: 'Chemical-resistant gloves, size L.', barcode: 'CLN-ACC-003', stockQty: 120, reorderPoint: 30, trackInventory: true },
    { name: 'Wet Floor Caution Sign', categoryName: 'Accessories & Safety', price: 38.0, unit: 'unit', description: 'Foldable A-frame safety sign, bilingual.', barcode: 'CLN-ACC-004', stockQty: 25, reorderPoint: 8, trackInventory: true },
    { name: 'Sponge Scourer Pack (10)', categoryName: 'Accessories & Safety', price: 14.9, unit: 'pack', description: 'Dual-side sponges for kitchen and washrooms.', barcode: 'CLN-ACC-005', stockQty: 100, reorderPoint: 25, trackInventory: true },
  ],
};

const PLASTIC_STORE: StoreTemplate = {
  businessName: 'PlastiPack Supplies',
  businessType: 'Plastic & Disposable Packaging',
  phoneNumber: '+972-3-555-0203',
  address: '8 Logistics Park, Ashdod',
  location: 'Ashdod, Israel',
  description:
    'Wholesale plastic cups, containers, cutlery, and disposable packaging for food service and retail.',
  services: 'Custom branding available • Pallet pricing • Nationwide shipping',
  categories: [
    { name: 'Cups & Lids' },
    { name: 'Plates & Cutlery' },
    { name: 'Containers & Trays' },
    { name: 'Bags & Wrap' },
  ],
  products: [
    { name: 'PET Clear Cups 250ml (100)', categoryName: 'Cups & Lids', price: 42.0, unit: 'pack', description: 'Transparent cold-drink cups, stackable.', barcode: 'PLS-CUP-001', stockQty: 80, reorderPoint: 20, trackInventory: true },
    { name: 'PET Clear Cups 350ml (100)', categoryName: 'Cups & Lids', price: 48.5, unit: 'pack', description: 'Large clear cups for smoothies and iced coffee.', barcode: 'PLS-CUP-002', stockQty: 70, reorderPoint: 18, trackInventory: true },
    { name: 'Dome Lids for 350ml Cups (100)', categoryName: 'Cups & Lids', price: 28.0, unit: 'pack', description: 'Clear dome lids with straw slot.', barcode: 'PLS-CUP-003', stockQty: 65, reorderPoint: 16, trackInventory: true },
    { name: 'Flat Lids for 250ml Cups (100)', categoryName: 'Cups & Lids', price: 22.0, unit: 'pack', description: 'Snap-fit flat lids for hot and cold cups.', barcode: 'PLS-CUP-004', stockQty: 90, reorderPoint: 22, trackInventory: true },
    { name: 'Portion Cups 100ml (100)', categoryName: 'Cups & Lids', price: 18.5, unit: 'pack', description: 'Small cups for sauces and samples.', barcode: 'PLS-CUP-005', stockQty: 110, reorderPoint: 28, trackInventory: true },
    { name: 'Plastic Plates 22cm White (50)', categoryName: 'Plates & Cutlery', price: 32.0, unit: 'pack', description: 'Rigid disposable dinner plates.', barcode: 'PLS-PLT-001', stockQty: 55, reorderPoint: 14, trackInventory: true },
    { name: 'Plastic Forks Heavy (100)', categoryName: 'Plates & Cutlery', price: 24.0, unit: 'pack', description: 'Extra-strong forks for catering.', barcode: 'PLS-PLT-002', stockQty: 95, reorderPoint: 24, trackInventory: true },
    { name: 'Plastic Knives Heavy (100)', categoryName: 'Plates & Cutlery', price: 24.0, unit: 'pack', description: 'Serrated plastic knives, bulk pack.', barcode: 'PLS-PLT-003', stockQty: 88, reorderPoint: 22, trackInventory: true },
    { name: 'Plastic Spoons (100)', categoryName: 'Plates & Cutlery', price: 22.5, unit: 'pack', description: 'Standard weight spoons for takeout.', barcode: 'PLS-PLT-004', stockQty: 100, reorderPoint: 25, trackInventory: true },
    { name: 'Plastic Tongs 25cm', categoryName: 'Plates & Cutlery', price: 9.9, unit: 'unit', description: 'Serving tongs for buffet and salad bars.', barcode: 'PLS-PLT-005', stockQty: 45, reorderPoint: 12, trackInventory: true },
    { name: 'Clamshell Containers 750ml (50)', categoryName: 'Containers & Trays', price: 58.0, unit: 'pack', description: 'Hinged takeaway boxes, microwave safe.', barcode: 'PLS-CON-001', stockQty: 40, reorderPoint: 10, trackInventory: true },
    { name: 'Meal Trays 3-Compartment (50)', categoryName: 'Containers & Trays', price: 52.0, unit: 'pack', description: 'Divided trays for hot meals.', barcode: 'PLS-CON-002', stockQty: 38, reorderPoint: 10, trackInventory: true },
    { name: 'Plastic Salad Bowls 500ml (50)', categoryName: 'Containers & Trays', price: 44.0, unit: 'pack', description: 'Clear bowls with optional lid fit.', barcode: 'PLS-CON-003', stockQty: 42, reorderPoint: 11, trackInventory: true },
    { name: 'Storage Container with Lid 1L (20)', categoryName: 'Containers & Trays', price: 36.0, unit: 'pack', description: 'Reusable round containers for prep kitchens.', barcode: 'PLS-CON-004', stockQty: 50, reorderPoint: 12, trackInventory: true },
    { name: 'Storage Container with Lid 2L (20)', categoryName: 'Containers & Trays', price: 48.0, unit: 'pack', description: 'Large prep containers with snap lids.', barcode: 'PLS-CON-005', stockQty: 35, reorderPoint: 10, trackInventory: true },
    { name: 'Garbage Bags 60L Black (50)', categoryName: 'Bags & Wrap', price: 38.0, unit: 'roll', description: 'Heavy-duty bin liners, perforated roll.', barcode: 'PLS-BAG-001', stockQty: 75, reorderPoint: 18, trackInventory: true },
    { name: 'Plastic Produce Bags Roll (100)', categoryName: 'Bags & Wrap', price: 16.0, unit: 'roll', description: 'Perforated bags on roll for retail counters.', barcode: 'PLS-BAG-002', stockQty: 120, reorderPoint: 30, trackInventory: true },
    { name: 'Cling Wrap 30cm x 300m', categoryName: 'Bags & Wrap', price: 29.9, unit: 'roll', description: 'PVC-free professional food wrap.', barcode: 'PLS-BAG-003', stockQty: 60, reorderPoint: 15, trackInventory: true },
    { name: 'Flexible Straws Wrapped (500)', categoryName: 'Bags & Wrap', price: 34.0, unit: 'box', description: 'Individually wrapped drinking straws.', barcode: 'PLS-BAG-004', stockQty: 48, reorderPoint: 12, trackInventory: true },
    { name: 'Plastic Storage Bin 20L', categoryName: 'Bags & Wrap', price: 24.5, unit: 'unit', description: 'Stackable storage bin with handles.', barcode: 'PLS-BAG-005', stockQty: 30, reorderPoint: 8, trackInventory: true },
  ],
};

export const DEVELOPER_STORE_TEMPLATES: Record<
  DeveloperStoreTheme,
  StoreTemplate & { productCount: number; categoryCount: number }
> = {
  tnuva: { ...TNUVA_STORE, productCount: TNUVA_STORE.products.length, categoryCount: TNUVA_STORE.categories.length },
  cleaning: {
    ...CLEANING_STORE,
    productCount: CLEANING_STORE.products.length,
    categoryCount: CLEANING_STORE.categories.length,
  },
  plastic: {
    ...PLASTIC_STORE,
    productCount: PLASTIC_STORE.products.length,
    categoryCount: PLASTIC_STORE.categories.length,
  },
};

export async function seedCatalogForBusinessId(
  businessId: string,
  template: StoreTemplate,
  options?: { force?: boolean; skipIfExists?: boolean }
): Promise<{ categoriesCreated: number; productsCreated: number }> {
  if (!db) throw new Error('Firestore is not configured');
  const fs = db;

  const existing = await getDocs(
    query(collection(fs, 'productCategories'), where('businessId', '==', businessId), limit(1))
  );
  if (!existing.empty && !options?.force) {
    if (options?.skipIfExists) {
      return { categoriesCreated: 0, productsCreated: 0 };
    }
    throw new Error('This business already has categories. Delete inventory first or use a new business.');
  }

  const now = serverTimestamp();
  const categoryRefs = template.categories.map(() => doc(collection(fs, 'productCategories')));
  const categoryIdByName: Record<string, string> = {};
  template.categories.forEach((category, index) => {
    categoryIdByName[category.name] = categoryRefs[index].id;
  });

  const productRefs = template.products.map(() => doc(collection(fs, 'products')));
  const batch = writeBatch(fs);

  template.categories.forEach((category, index) => {
    batch.set(categoryRefs[index], {
      name: category.name,
      businessId,
      createdAt: now,
    });
  });

  template.products.forEach((product, index) => {
    const categoryId = categoryIdByName[product.categoryName];
    if (!categoryId) return;
    batch.set(productRefs[index], {
      businessId,
      name: product.name,
      categoryId,
      categoryName: product.categoryName,
      price: product.price,
      unit: product.unit,
      description: product.description,
      barcode: product.barcode,
      stockQty: product.stockQty ?? 0,
      reorderPoint: product.reorderPoint ?? 0,
      trackInventory: product.trackInventory ?? true,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
  return {
    categoriesCreated: template.categories.length,
    productsCreated: template.products.length,
  };
}

export async function createDeveloperThemedStore(theme: DeveloperStoreTheme): Promise<DemoSeedResult> {
  if (!auth?.currentUser || !db) throw new Error('You must be signed in.');
  if (!isCurrentUserDeveloper()) {
    throw new Error('Only developer accounts can create themed stores from /dev.');
  }

  const template = DEVELOPER_STORE_TEMPLATES[theme];
  const fs = db;
  const businessRef = doc(collection(fs, 'businesses'));
  const businessId = businessRef.id;
  const now = serverTimestamp();

  const batch = writeBatch(fs);
  batch.set(businessRef, {
    uid: businessId,
    email: `${theme}-store@loopify.dev`,
    displayName: template.businessName,
    businessName: template.businessName,
    businessType: template.businessType,
    phoneNumber: template.phoneNumber,
    address: template.address,
    location: template.location,
    description: template.description,
    services: template.services,
    role: 'manager',
    storeId: businessId,
    ownerBusinessId: businessId,
    isTeamMember: false,
    createdAt: now,
    updatedAt: now,
  });
  await batch.commit();

  const catalog = await seedCatalogForBusinessId(businessId, template);
  return {
    businessId,
    businessName: template.businessName,
    categoriesCreated: catalog.categoriesCreated,
    productsCreated: catalog.productsCreated,
  };
}
