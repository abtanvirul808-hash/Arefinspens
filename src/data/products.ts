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

export const PRODUCTS: Product[] = [];

export const ALL_BRANDS = Array.from(new Set(PRODUCTS.map((p) => p.brand)));

export const ALL_FILTER_COLORS: { id: string; name: string; hex: string }[] = [];

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

export function isProductCurrentlyFeatured(
  product: Pick<Product, 'featured' | 'featuredUntilMs'>,
  nowMs: number = Date.now()
): boolean {
  if (!product.featured) return false;
  if (
    typeof product.featuredUntilMs === 'number' &&
    Number.isFinite(product.featuredUntilMs) &&
    product.featuredUntilMs > 0
  ) {
    return nowMs < product.featuredUntilMs;
  }
  return true;
}

export function formatFeaturedRemainingTime(
  featuredUntilMs: number,
  nowMs: number = Date.now()
): string {
  const diffMs = featuredUntilMs - nowMs;
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return 'Expired';
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d ${minutes}m`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${Math.max(1, seconds)}s`;
}

export function sortFeaturedProducts<T extends Pick<Product, 'featuredOrder'>>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const aOrder =
      typeof a.featuredOrder === 'number' && Number.isFinite(a.featuredOrder) && a.featuredOrder >= 1
        ? Math.round(a.featuredOrder)
        : Number.MAX_SAFE_INTEGER;
    const bOrder =
      typeof b.featuredOrder === 'number' && Number.isFinite(b.featuredOrder) && b.featuredOrder >= 1
        ? Math.round(b.featuredOrder)
        : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}
