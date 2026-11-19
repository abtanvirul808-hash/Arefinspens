import { CategoryId, InkColorOption, Product, ProductColorVariant } from '../types';

export interface CategoryMeta {
  id: CategoryId;
  title: string;
  description: string;
}

export const PEN_CATEGORY_IDS = [
  'gel-pens',
  'ballpoint-pens',
  'fountain-pens',
  'marker-pens',
  'mechanical-pencils',
  'highlighters',
] as const;

export const PEN_CATEGORIES: { id: (typeof PEN_CATEGORY_IDS)[number]; label: string }[] = [
  { id: 'gel-pens', label: 'Gel Pens' },
  { id: 'ballpoint-pens', label: 'Ballpoint Pens' },
  { id: 'fountain-pens', label: 'Fountain & Luxury' },
  { id: 'marker-pens', label: 'Marker Pens' },
  { id: 'mechanical-pencils', label: 'Mechanical Pencils' },
  { id: 'highlighters', label: 'Highlighters' },
];

export const OTHER_PRODUCT_SUBCATEGORIES: string[] = [
  'Notebooks & Journals',
  'Desk Accessories',
  'Art & Craft Supplies',
  'Geometry & Measurement',
  'Sticky Notes & Files',
  'Gift Sets & Combos',
  'Other Products',
];

export function isOtherProduct(product?: Pick<Product, 'category'> | null): boolean {
  return product?.category === 'other-products';
}

export const HOMEPAGE_CATEGORIES: CategoryMeta[] = [
  {
    id: 'gel-pens',
    title: 'Gel Pens',
    description: 'Smooth writing with vibrant colours.',
  },
  {
    id: 'ballpoint-pens',
    title: 'Ballpoint Pens',
    description: 'Reliable everyday writing.',
  },
  {
    id: 'marker-pens',
    title: 'Marker Pens',
    description: 'Bold colours for creative expression.',
  },
  {
    id: 'mechanical-pencils',
    title: 'Mechanical Pencils',
    description: 'Precision for writing and drawing.',
  },
  {
    id: 'highlighters',
    title: 'Highlighters',
    description: 'Make important details stand out.',
  },
  {
    id: 'other-products',
    title: 'Other Products',
    description: 'Notebooks, desk tools & everyday essentials — coming soon.',
  },
];

export const CATALOGUE_CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'all', label: 'All Products' },
  { id: 'all-pens', label: 'All Pens' },
  { id: 'gel-pens', label: 'Gel Pens' },
  { id: 'ballpoint-pens', label: 'Ballpoint Pens' },
  { id: 'fountain-pens', label: 'Fountain & Luxury' },
  { id: 'marker-pens', label: 'Marker Pens' },
  { id: 'mechanical-pencils', label: 'Mechanical Pencils' },
  { id: 'highlighters', label: 'Highlighters' },
  { id: 'other-products', label: 'Other Products' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'neucose-b',
    slug: 'neucose-b',
    name: 'Neucose B',
    brand: 'Neucos-B',
    category: 'gel-pens',
    categoryLabel: 'Gel Pens',
    shortDescription:
      '0.5mm black needle-tip gel pen with visible ink window and pastel gradient body in Pink, Yellow, and Aqua.',
    description:
      'Neucose B features a smooth 0.5mm needle-point tip with crisp black gel ink, an ink-level viewing window along the barrel, and a lightweight pastel-gradient design available in Pink, Yellow, and Aqua.',
    priceBdt: 50,
    rating: 4.9,
    reviewCount: 18,
    popularityScore: 99,
    featured: false,
    isNew: true,
    inStock: true,
    stockCount: 120,
    images: [
      '/assets/aistudio/20261115_191701_6025b891.jpg',
      '/assets/aistudio/20261115_191311_29fd86e7.jpg',
      '/assets/aistudio/20261115_191847_c391cd06.jpg',
    ],
    colors: [
      {
        id: 'pink',
        name: 'Pink',
        hex: '#F4A9C8',
        inStock: true,
        stockCount: 40,
        image: '/assets/aistudio/20261115_191701_6025b891.jpg',
      },
      {
        id: 'yellow',
        name: 'Yellow',
        hex: '#E6D47A',
        inStock: true,
        stockCount: 40,
        image: '/assets/aistudio/20261115_191311_29fd86e7.jpg',
      },
      {
        id: 'aqua',
        name: 'Aqua',
        hex: '#3FD0E4',
        inStock: true,
        stockCount: 40,
        image: '/assets/aistudio/20261115_191847_c391cd06.jpg',
      },
    ],
    specs: {
      tipSize: '0.5 mm Black Needle Tip',
      inkType: 'Smooth Quick-Dry Black Gel Ink',
      inkColor: 'Black',
      inkColorHex: '#111827',
      inkColors: [{ id: 'black', name: 'Black', hex: '#111827' }],
      bodyMaterial: 'Matte Pastel Gradient Barrel with Ink Window & Clip Cap',
      weight: '11 g',
      origin: 'Neucos-B Series',
    },
    sampleReviews: [
      {
        id: 'nb-1',
        author: 'Tanvirul Islam (Sample)',
        city: 'Dhaka',
        rating: 5,
        date: '2026-11-15',
        comment:
          'Very smooth 0.5mm needle tip and the ink level window is super helpful for daily writing.',
      },
    ],
  },
];

export const ALL_BRANDS = Array.from(new Set(PRODUCTS.map((p) => p.brand)));

export const ALL_FILTER_COLORS: { id: string; name: string; hex: string }[] = [
  { id: 'pink', name: 'Pink', hex: '#F4A9C8' },
  { id: 'yellow', name: 'Yellow', hex: '#E6D47A' },
  { id: 'aqua', name: 'Aqua', hex: '#3FD0E4' },
];

export const INK_COLOR_HEX_FALLBACK: Record<string, string> = {
  black: '#111827',
  blue: '#1D4ED8',
  'sky blue': '#0EA5E9',
  red: '#DC2626',
  green: '#059669',
  purple: '#7C3AED',
  pink: '#EC4899',
  orange: '#EA580C',
  brown: '#92400E',
  'multi-color': '#F59E0B',
};

function normalizeInkEntry(item: InkColorOption): InkColorOption {
  const name = item.name.trim();
  const id =
    item.id?.trim() ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    'black';
  return {
    id,
    name,
    hex: item.hex?.trim() || INK_COLOR_HEX_FALLBACK[name.toLowerCase()] || '#111827',
  };
}

export function getProductInkColors(product: Product): InkColorOption[] {
  const seen = new Set<string>();
  const combined: InkColorOption[] = [];

  const pushUnique = (entry: InkColorOption) => {
    const key = entry.name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    combined.push(entry);
  };

  if (Array.isArray(product.specs?.inkColors)) {
    for (const item of product.specs.inkColors) {
      if (item && typeof item.name === 'string' && item.name.trim().length > 0) {
        pushUnique(normalizeInkEntry(item));
      }
    }
  }

  if (Array.isArray(product.colors)) {
    for (const variant of product.colors) {
      if (Array.isArray(variant.inkColors)) {
        for (const item of variant.inkColors) {
          if (item && typeof item.name === 'string' && item.name.trim().length > 0) {
            pushUnique(normalizeInkEntry(item));
          }
        }
      }
    }
  }

  if (combined.length > 0) {
    return combined;
  }

  const singleRaw = (product.specs?.inkColor || 'Black').trim();
  const names = singleRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (names.length > 1) {
    return names.map((name, idx) => ({
      id:
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || `ink-${idx + 1}`,
      name,
      hex:
        idx === 0 && product.specs?.inkColorHex
          ? product.specs.inkColorHex
          : INK_COLOR_HEX_FALLBACK[name.toLowerCase()] || '#111827',
    }));
  }

  const singleName = names[0] || 'Black';
  return [
    {
      id:
        singleName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'black',
      name: singleName,
      hex: product.specs?.inkColorHex || INK_COLOR_HEX_FALLBACK[singleName.toLowerCase()] || '#111827',
    },
  ];
}

export function getVariantInkColors(
  product: Product,
  colorVariant?: ProductColorVariant
): InkColorOption[] {
  if (colorVariant && Array.isArray(colorVariant.inkColors) && colorVariant.inkColors.length > 0) {
    const cleaned = colorVariant.inkColors
      .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
      .map(normalizeInkEntry);
    if (cleaned.length > 0) return cleaned;
  }
  return getProductInkColors(product);
}

export function getColorAvailableCount(
  product: Product,
  colorVariant?: ProductColorVariant
): number {
  if (!product.inStock) return 0;
  if (!colorVariant || !colorVariant.inStock) return 0;
  if (
    typeof colorVariant.stockCount === 'number' &&
    Number.isFinite(colorVariant.stockCount)
  ) {
    return Math.max(0, Math.round(colorVariant.stockCount));
  }

  // Fallback for legacy products that only have a product-level stockCount:
  // evenly split across in-stock colour variants so their sum equals product.stockCount.
  const totalProductStock = Math.max(0, Math.round(product.stockCount || 0));
  const activeColors = product.colors.filter((c) => c.inStock);
  if (activeColors.length === 0) return 0;

  const activeIdx = activeColors.findIndex((c) => c.id === colorVariant.id);
  if (activeIdx === -1) return 0;

  const base = Math.floor(totalProductStock / activeColors.length);
  const remainder = totalProductStock % activeColors.length;
  return base + (activeIdx < remainder ? 1 : 0);
}

export function getProductTotalAvailableCount(product: Product): number {
  if (!product.inStock) return 0;
  if (!Array.isArray(product.colors) || product.colors.length === 0) {
    return Math.max(0, Math.round(product.stockCount || 0));
  }
  return product.colors.reduce(
    (sum, color) => sum + getColorAvailableCount(product, color),
    0
  );
}
