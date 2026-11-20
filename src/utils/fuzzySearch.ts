import { CategoryId, Product } from '../types';
import { getProductInkColors, isOtherProduct, PEN_CATEGORY_IDS } from '../data/products';

export interface FuzzyMatchRange {
  start: number;
  end: number;
}

export interface FuzzyProductResult {
  product: Product;
  score: number;
  nameHighlightRanges: FuzzyMatchRange[];
  matchedReasons: string[];
}

export interface FuzzySearchOptions {
  category?: CategoryId;
  inStockOnly?: boolean;
  limit?: number;
}

export interface FuzzySearchResponse {
  results: FuzzyProductResult[];
  didYouMean: string | null;
}

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'gel-pens': ['gel', 'smooth', 'roller', 'rollerball', 'waterproof', 'needle', 'signo', 'g2'],
  'ballpoint-pens': ['ball', 'ballpoint', 'ballpen', 'oil', 'everyday', 'exam', 'classic'],
  'fountain-pens': ['fountain', 'nib', 'calligraphy', 'luxury', 'refillable', 'cartridge', 'converter'],
  'marker-pens': ['marker', 'permanent', 'whiteboard', 'bold', 'chisel', 'sketch', 'art'],
  'mechanical-pencils': ['mechanical', 'pencil', 'lead', 'drafting', 'clutch', '0.5', '0.7', 'drawing'],
  'highlighters': ['highlighter', 'highlight', 'pastel', 'fluorescent', 'neon', 'study', 'chisel'],
  'other-products': ['other', 'stationery', 'notebook', 'journal', 'desk', 'accessory', 'accessories', 'geometry', 'craft'],
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function compactAlnum(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[\s\-_/|,.;:()]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Optimal String Alignment (Damerau-Levenshtein) distance with early exit threshold.
 */
function damerauLevenshtein(a: string, b: string, maxDist = 4): number {
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1;
  if (a === b) return 0;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array<number>(lenB + 1).fill(0)
  );

  for (let i = 0; i <= lenA; i += 1) dp[i][0] = i;
  for (let j = 0; j <= lenB; j += 1) dp[0][j] = j;

  for (let i = 1; i <= lenA; i += 1) {
    let rowMin = maxDist + 1;
    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + cost);
      }
      dp[i][j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) {
      return maxDist + 1;
    }
  }

  return dp[lenA][lenB];
}

function maxEditsForLength(len: number): number {
  if (len <= 2) return 0;
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

function mergeRanges(ranges: FuzzyMatchRange[]): FuzzyMatchRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: FuzzyMatchRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

function findSubstringRanges(text: string, token: string): FuzzyMatchRange[] {
  if (!token) return [];
  const lower = text.toLowerCase();
  const needle = token.toLowerCase();
  const ranges: FuzzyMatchRange[] = [];
  let idx = lower.indexOf(needle);
  while (idx !== -1) {
    ranges.push({ start: idx, end: idx + needle.length });
    idx = lower.indexOf(needle, idx + needle.length);
  }
  return ranges;
}

function findSubsequenceRanges(text: string, query: string): { score: number; ranges: FuzzyMatchRange[] } | null {
  const cleanQuery = query.replace(/\s+/g, '').toLowerCase();
  if (cleanQuery.length < 2) return null;
  const lower = text.toLowerCase();

  let qi = 0;
  let consecutiveBonus = 0;
  let prevMatchIndex = -2;
  const rawRanges: FuzzyMatchRange[] = [];

  for (let ti = 0; ti < lower.length && qi < cleanQuery.length; ti += 1) {
    if (lower[ti] === cleanQuery[qi]) {
      const isWordStart = ti === 0 || /[\s\-_.]/.test(lower[ti - 1]);
      if (ti === prevMatchIndex + 1) {
        consecutiveBonus += 6;
      } else if (isWordStart) {
        consecutiveBonus += 4;
      }
      rawRanges.push({ start: ti, end: ti + 1 });
      prevMatchIndex = ti;
      qi += 1;
    }
  }

  if (qi < cleanQuery.length) return null;

  const span = rawRanges[rawRanges.length - 1].end - rawRanges[0].start;
  const compactness = cleanQuery.length / Math.max(1, span);
  if (compactness < 0.32 && consecutiveBonus < 10) return null;

  return {
    score: Math.round(24 + consecutiveBonus + compactness * 22),
    ranges: mergeRanges(rawRanges),
  };
}

function bestTokenFuzzyScore(
  queryToken: string,
  candidateWords: string[]
): { score: number; matchedWord?: string; exact?: boolean } {
  const qNorm = normalizeText(queryToken);
  const qCompact = compactAlnum(queryToken);
  if (!qNorm) return { score: 0 };

  const allowedDist = maxEditsForLength(qNorm.length);
  let bestScore = 0;
  let bestWord: string | undefined;
  let bestExact = false;

  for (const word of candidateWords) {
    const wNorm = normalizeText(word);
    const wCompact = compactAlnum(word);
    if (!wNorm) continue;

    if (wNorm === qNorm || (qCompact.length >= 2 && wCompact === qCompact)) {
      return { score: 100, matchedWord: word, exact: true };
    }

    if (wNorm.startsWith(qNorm) || (qCompact.length >= 2 && wCompact.startsWith(qCompact))) {
      const ratio = qNorm.length / wNorm.length;
      const candidate = Math.round(74 + ratio * 20);
      if (candidate > bestScore) {
        bestScore = candidate;
        bestWord = word;
        bestExact = true;
      }
      continue;
    }

    if (qNorm.length >= 2 && (wNorm.includes(qNorm) || (qCompact.length >= 2 && wCompact.includes(qCompact)))) {
      const candidate = 62;
      if (candidate > bestScore) {
        bestScore = candidate;
        bestWord = word;
        bestExact = true;
      }
      continue;
    }

    if (allowedDist > 0) {
      const target = qCompact.length >= 3 && wCompact.length >= 3 ? wCompact : wNorm;
      const source = qCompact.length >= 3 && wCompact.length >= 3 ? qCompact : qNorm;
      const dist = damerauLevenshtein(source, target, allowedDist);
      if (dist <= allowedDist) {
        const penalty = dist * 20;
        const candidate = Math.max(24, 68 - penalty);
        if (candidate > bestScore) {
          bestScore = candidate;
          bestWord = word;
          bestExact = false;
        }
      } else if (source.length >= 4 && target.length > source.length) {
        // Check prefix fuzzy match (user still typing a longer word with a typo)
        const targetPrefix = target.slice(0, source.length);
        const prefixDist = damerauLevenshtein(source, targetPrefix, 1);
        if (prefixDist <= 1) {
          const candidate = 42;
          if (candidate > bestScore) {
            bestScore = candidate;
            bestWord = word;
            bestExact = false;
          }
        }
      }
    }
  }

  return { score: bestScore, matchedWord: bestWord, exact: bestExact };
}

function matchesCategoryFilter(product: Product, category?: CategoryId): boolean {
  if (!category || category === 'all') return true;
  if (category === 'all-pens') {
    return PEN_CATEGORY_IDS.includes(product.category as (typeof PEN_CATEGORY_IDS)[number]);
  }
  return product.category === category;
}

export function fuzzySearchProducts(
  products: Product[],
  rawQuery: string,
  options: FuzzySearchOptions = {}
): FuzzySearchResponse {
  const { category = 'all', inStockOnly = false, limit } = options;
  const query = normalizeText(rawQuery);

  const eligible = products.filter((p) => {
    if (!matchesCategoryFilter(p, category)) return false;
    if (inStockOnly && !p.inStock) return false;
    return true;
  });

  if (!query) {
    const baseResults: FuzzyProductResult[] = eligible.map((product) => ({
      product,
      score: (product.orderCount ?? 0) * 10 + (product.popularityScore || 0),
      nameHighlightRanges: [],
      matchedReasons: [],
    }));
    return {
      results: typeof limit === 'number' ? baseResults.slice(0, limit) : baseResults,
      didYouMean: null,
    };
  }

  const queryTokens = tokenize(query);
  const queryCompact = compactAlnum(query);
  const vocabulary = new Set<string>();
  const scored: FuzzyProductResult[] = [];

  for (const product of eligible) {
    const otherItem = isOtherProduct(product);
    const inkColors = otherItem ? [] : getProductInkColors(product);
    const bodyColors = Array.isArray(product.colors) ? product.colors : [];
    const synonyms = CATEGORY_SYNONYMS[product.category] || [];

    const nameWords = tokenize(product.name);
    const brandWords = tokenize(product.brand || '');
    const categoryWords = [...tokenize(product.categoryLabel || ''), ...synonyms];
    const specParts = otherItem
      ? [product.specs?.bodyMaterial || '']
      : [
          product.specs?.tipSize || '',
          product.specs?.inkType || '',
          product.specs?.bodyMaterial || '',
        ];
    const specWords = specParts.flatMap(tokenize);
    const bodyColorNames = bodyColors.map((c) => c.name).filter(Boolean);
    const inkColorNames = inkColors.map((i) => i.name).filter(Boolean);
    const colorWords = bodyColorNames.flatMap(tokenize);
    const inkWords = inkColorNames.flatMap(tokenize);
    const descWords = tokenize(`${product.shortDescription || ''} ${product.description || ''}`);

    for (const w of [
      ...nameWords,
      ...brandWords,
      ...tokenize(product.categoryLabel || ''),
      ...colorWords,
      ...inkWords,
      ...specWords,
    ]) {
      if (w.length >= 3) vocabulary.add(w);
    }

    let totalScore = 0;
    const highlightRanges: FuzzyMatchRange[] = [];
    const reasonSet = new Set<string>();
    let matchedTokenCount = 0;

    const nameLower = normalizeText(product.name);
    const brandLower = normalizeText(product.brand || '');

    // Whole-query boosts
    if (nameLower === query) {
      totalScore += 240;
      highlightRanges.push({ start: 0, end: product.name.length });
    } else if (nameLower.startsWith(query)) {
      totalScore += 180;
      highlightRanges.push({ start: 0, end: Math.min(product.name.length, query.length) });
    } else if (nameLower.includes(query)) {
      totalScore += 135;
      highlightRanges.push(...findSubstringRanges(product.name, rawQuery.trim()));
    } else if (queryCompact.length >= 3 && compactAlnum(product.name).includes(queryCompact)) {
      totalScore += 110;
    }

    if (brandLower && (brandLower === query || brandLower.startsWith(query))) {
      totalScore += 95;
      reasonSet.add(`Brand: ${product.brand}`);
    }

    // Per-token multi-field fuzzy scoring
    for (const token of queryTokens) {
      let tokenBest = 0;

      // 1. Product Name
      const nameMatch = bestTokenFuzzyScore(token, nameWords);
      if (nameMatch.score > 0) {
        const weighted = nameMatch.score * 1.45;
        tokenBest = Math.max(tokenBest, weighted);
        if (nameMatch.exact) {
          highlightRanges.push(...findSubstringRanges(product.name, token));
        } else if (nameMatch.matchedWord) {
          highlightRanges.push(...findSubstringRanges(product.name, nameMatch.matchedWord));
        }
      }

      // 2. Brand
      const brandMatch = bestTokenFuzzyScore(token, brandWords);
      if (brandMatch.score > 0) {
        const weighted = brandMatch.score * 1.15;
        if (weighted > tokenBest) tokenBest = weighted;
        if (product.brand) reasonSet.add(`Brand: ${product.brand}`);
      }

      // 3. Category & Synonyms
      const catMatch = bestTokenFuzzyScore(token, categoryWords);
      if (catMatch.score > 0) {
        const weighted = catMatch.score * 1.0;
        if (weighted > tokenBest) tokenBest = weighted;
        reasonSet.add(product.categoryLabel);
      }

      // 4. Ink Colours (Pens)
      if (!otherItem) {
        const inkMatch = bestTokenFuzzyScore(token, inkWords);
        if (inkMatch.score > 0) {
          const weighted = inkMatch.score * 0.95;
          if (weighted > tokenBest) tokenBest = weighted;
          const matchedInk = inkColorNames.find((n) =>
            tokenize(n).some((w) => normalizeText(w) === normalizeText(inkMatch.matchedWord || ''))
          );
          if (matchedInk) reasonSet.add(`${matchedInk} Ink`);
        }
      }

      // 5. Body / Product Colours
      const colorMatch = bestTokenFuzzyScore(token, colorWords);
      if (colorMatch.score > 0) {
        const weighted = colorMatch.score * 0.9;
        if (weighted > tokenBest) tokenBest = weighted;
        const matchedColor = bodyColorNames.find((n) =>
          tokenize(n).some((w) => normalizeText(w) === normalizeText(colorMatch.matchedWord || ''))
        );
        if (matchedColor) reasonSet.add(`${matchedColor} Finish`);
      }

      // 6. Technical Specs (tip size, ink type, material)
      const specMatch = bestTokenFuzzyScore(token, specWords);
      if (specMatch.score > 0) {
        const weighted = specMatch.score * 0.9;
        if (weighted > tokenBest) tokenBest = weighted;
        if (!otherItem && product.specs?.tipSize && tokenize(product.specs.tipSize).includes(normalizeText(specMatch.matchedWord || ''))) {
          reasonSet.add(`${product.specs.tipSize} Tip`);
        } else if (specMatch.matchedWord) {
          reasonSet.add(specMatch.matchedWord);
        }
      }

      // 7. Description
      const descMatch = bestTokenFuzzyScore(token, descWords);
      if (descMatch.score > 0) {
        const weighted = descMatch.score * 0.62;
        if (weighted > tokenBest) tokenBest = weighted;
      }

      if (tokenBest >= 24) {
        matchedTokenCount += 1;
        totalScore += tokenBest;
      }
    }

    // Subsequence fallback on product name for abbreviations/shorthand
    if (matchedTokenCount === 0) {
      const subseq = findSubsequenceRanges(product.name, rawQuery.trim());
      if (subseq) {
        totalScore += subseq.score;
        highlightRanges.push(...subseq.ranges);
        matchedTokenCount = 1;
      }
    }

    // Bonus when every token matched across fields (multi-attribute search)
    if (queryTokens.length > 1) {
      if (matchedTokenCount === queryTokens.length) {
        totalScore += 45;
      } else if (matchedTokenCount < Math.ceil(queryTokens.length / 2)) {
        continue;
      }
    }

    if (totalScore < 26) continue;

    // Gentle nudge for in-stock items and popular items
    if (product.inStock) totalScore += 6;
    totalScore += Math.min(8, Math.round((product.orderCount ?? 0) * 0.25 + (product.popularityScore || 0) * 0.04));

    scored.push({
      product,
      score: Math.round(totalScore),
      nameHighlightRanges: mergeRanges(highlightRanges),
      matchedReasons: Array.from(reasonSet).slice(0, 2),
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const stockDiff = Number(b.product.inStock) - Number(a.product.inStock);
    if (stockDiff !== 0) return stockDiff;
    return (b.product.orderCount ?? 0) - (a.product.orderCount ?? 0);
  });

  let didYouMean: string | null = null;
  if (scored.length === 0 && queryTokens.length > 0 && vocabulary.size > 0) {
    const correctedTokens = queryTokens.map((t) => {
      if (vocabulary.has(t)) return t;
      let closest = t;
      let bestDist = 3;
      for (const vocabWord of vocabulary) {
        const dist = damerauLevenshtein(t, vocabWord, 2);
        if (dist < bestDist) {
          bestDist = dist;
          closest = vocabWord;
        }
      }
      return closest;
    });
    const candidate = correctedTokens.join(' ');
    if (candidate !== queryTokens.join(' ')) {
      didYouMean = candidate;
    }
  }

  return {
    results: typeof limit === 'number' ? scored.slice(0, limit) : scored,
    didYouMean,
  };
}
