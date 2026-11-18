import { getProductInkColors, INK_COLOR_HEX_FALLBACK, PRODUCTS } from '../data/products';
import { Product } from '../types';

export interface ParsedOrderItem {
  key: string;
  name: string;
  quantity: string;
  bodyColorName?: string;
  bodyColorHex?: string;
  inkColorName?: string;
  inkColorHex?: string;
  image?: string;
}

const EXTRA_COLOR_HEX_FALLBACK: Record<string, string> = {
  ...INK_COLOR_HEX_FALLBACK,
  aqua: '#3FD0E4',
  pink: '#F4A9C8',
  yellow: '#E6D47A',
  white: '#F8FAFC',
  silver: '#CBD5E1',
  gold: '#D97706',
};

export function resolveColorHex(name?: string): string {
  if (!name) return '#64748B';
  const key = name.trim().toLowerCase();
  if (EXTRA_COLOR_HEX_FALLBACK[key]) return EXTRA_COLOR_HEX_FALLBACK[key];
  for (const [k, hex] of Object.entries(EXTRA_COLOR_HEX_FALLBACK)) {
    if (key.includes(k)) return hex;
  }
  return '#64748B';
}

export function parseOrderSummaryItems(
  itemsSummary: string,
  catalogProducts: Product[]
): ParsedOrderItem[] {
  const raw = (itemsSummary || '').trim();
  if (!raw) return [];

  const allCatalog = [...catalogProducts];
  for (const fallbackProd of PRODUCTS) {
    if (!allCatalog.some((p) => p.id === fallbackProd.id)) {
      allCatalog.push(fallbackProd);
    }
  }

  // Split items cleanly on commas outside parentheses
  const segments = raw
    .split(/,(?![^()]*\))/)
    .map((s) => s.trim())
    .filter(Boolean);

  return segments.map((segment, idx) => {
    const fullMatch = segment.match(/^(.+?)\s*\(([^)]+)\)\s*(?:[×x]\s*(\d+))?$/i);
    let itemName = segment;
    let details = '';
    let quantity = '1';

    if (fullMatch) {
      itemName = fullMatch[1].trim();
      details = fullMatch[2].trim();
      quantity = fullMatch[3] || '1';
    } else {
      const qtyMatch = segment.match(/^(.+?)\s*[×x]\s*(\d+)$/i);
      if (qtyMatch) {
        itemName = qtyMatch[1].trim();
        quantity = qtyMatch[2];
      }
    }

    let bodyColorName: string | undefined;
    let inkColorName: string | undefined;

    if (details && !details.startsWith('৳')) {
      if (details.includes('·')) {
        const parts = details.split('·').map((s) => s.trim()).filter(Boolean);
        bodyColorName = parts[0];
        const rawInk = parts.slice(1).join(' · ').replace(/\s*ink$/i, '').trim();
        if (rawInk) inkColorName = rawInk;
      } else if (/\bink$/i.test(details)) {
        inkColorName = details.replace(/\s*ink$/i, '').trim();
      } else {
        bodyColorName = details;
      }
    }

    const lowerName = itemName.toLowerCase();
    const matchedProduct =
      allCatalog.find((p) => p.name.trim().toLowerCase() === lowerName) ||
      allCatalog.find(
        (p) =>
          p.name.trim().toLowerCase().includes(lowerName) ||
          lowerName.includes(p.name.trim().toLowerCase())
      );

    let bodyColorHex: string | undefined;
    let image: string | undefined;

    if (matchedProduct) {
      const matchedVariant = bodyColorName
        ? matchedProduct.colors.find(
            (c) => c.name.trim().toLowerCase() === bodyColorName!.toLowerCase()
          ) ||
          matchedProduct.colors.find((c) =>
            bodyColorName!.toLowerCase().includes(c.name.trim().toLowerCase())
          )
        : matchedProduct.colors[0];

      bodyColorHex =
        matchedVariant?.hex || (bodyColorName ? resolveColorHex(bodyColorName) : undefined);
      image = matchedVariant?.image || matchedProduct.colors[0]?.image || matchedProduct.images[0];

      const productInks = matchedVariant?.inkColors?.length
        ? matchedVariant.inkColors
        : getProductInkColors(matchedProduct);
      if (!inkColorName && productInks.length > 0) {
        inkColorName = productInks[0].name;
      }
    } else if (bodyColorName) {
      bodyColorHex = resolveColorHex(bodyColorName);
    }

    let inkColorHex: string | undefined;
    if (inkColorName) {
      const productInkMatch = matchedProduct
        ? getProductInkColors(matchedProduct).find(
            (i) => i.name.trim().toLowerCase() === inkColorName!.toLowerCase()
          )
        : undefined;
      inkColorHex = productInkMatch?.hex || resolveColorHex(inkColorName);
    }

    return {
      key: `${idx}-${itemName}`,
      name: itemName,
      quantity,
      bodyColorName,
      bodyColorHex,
      inkColorName,
      inkColorHex,
      image,
    };
  });
}
