import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Clock,
  CornerDownLeft,
  Loader2,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  getProductInkColors,
  getProductTotalAvailableCount,
  isOtherProduct,
  PEN_CATEGORIES,
} from '../data/products';
import { CategoryId, Product } from '../types';
import {
  FuzzyMatchRange,
  FuzzyProductResult,
  fuzzySearchProducts,
} from '../utils/fuzzySearch';
import { CategoryVectorIcon } from './BrandIcons';
import { SafeImage } from './SafeImage';

const RECENT_SEARCHES_KEY = 'arefin_pen_recent_searches_v1';
const MAX_RECENT_SEARCHES = 5;

function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function writeRecentSearches(queries: string[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(queries.slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // ignore storage quota errors
  }
}

function renderHighlightedName(
  text: string,
  ranges: FuzzyMatchRange[]
): React.ReactNode {
  if (!ranges || ranges.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, idx) => {
    const start = Math.max(cursor, Math.min(text.length, range.start));
    const end = Math.max(start, Math.min(text.length, range.end));
    if (start > cursor) {
      parts.push(<span key={`t-${idx}`}>{text.slice(cursor, start)}</span>);
    }
    if (end > start) {
      parts.push(
        <mark
          key={`m-${idx}`}
          className="bg-accent/20 text-accent dark:text-accent-bright rounded-xs px-0.5 font-bold"
        >
          {text.slice(start, end)}
        </mark>
      );
    }
    cursor = end;
  });

  if (cursor < text.length) {
    parts.push(<span key="tail">{text.slice(cursor)}</span>);
  }
  return parts;
}

export const SearchOverlay: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    products,
    isCatalogLoading,
    isCloudSynced,
    searchQuery,
    setSearchQuery,
    navigate,
    addToCart,
    isAdminModalOpen,
    isAuthModalOpen,
    isCartDrawerOpen,
    isSettingsOpen,
  } = useStore();

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryId>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecentSearches());

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcuts: Cmd/Ctrl + K or '/' to open
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
        return;
      }

      if (e.key === '/' && !isSearchOpen) {
        if (isAdminModalOpen || isAuthModalOpen || isCartDrawerOpen || isSettingsOpen) {
          return;
        }
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isSearchOpen,
    setIsSearchOpen,
    isAdminModalOpen,
    isAuthModalOpen,
    isCartDrawerOpen,
    isSettingsOpen,
  ]);

  // Sync initial query and focus input whenever overlay opens
  useEffect(() => {
    if (!isSearchOpen) return;
    setQuery(searchQuery);
    setActiveIndex(0);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [isSearchOpen, searchQuery]);

  // Lock page scroll while overlay is open
  useEffect(() => {
    if (!isSearchOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isSearchOpen]);

  const recordRecentSearch = (term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    setRecentSearches((prev) => {
      const next = [
        clean,
        ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);
      writeRecentSearches(next);
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    writeRecentSearches([]);
  };

  const trimmedQuery = query.trim();

  // Available category filter tabs derived from live Firestore catalog
  const availableCategories = useMemo(() => {
    const countByCat = new Map<string, number>();
    for (const p of products) {
      countByCat.set(p.category, (countByCat.get(p.category) || 0) + 1);
    }
    const items: { id: CategoryId; label: string; count: number }[] = [
      { id: 'all', label: 'All', count: products.length },
    ];
    for (const cat of PEN_CATEGORIES) {
      const count = countByCat.get(cat.id) || 0;
      if (count > 0) {
        items.push({ id: cat.id, label: cat.label, count });
      }
    }
    const otherCount = countByCat.get('other-products') || 0;
    if (otherCount > 0) {
      items.push({ id: 'other-products', label: 'Other Products', count: otherCount });
    }
    return items;
  }, [products]);

  // Real-time fuzzy search over live Firestore products
  const { results: fuzzyResults, didYouMean } = useMemo(() => {
    return fuzzySearchProducts(products, query, {
      category: categoryFilter,
      inStockOnly,
      limit: trimmedQuery ? 12 : 6,
    });
  }, [products, query, categoryFilter, inStockOnly, trimmedQuery]);

  // Total matches without the 12-item preview cap (for "See all X results" CTA)
  const totalMatchCount = useMemo(() => {
    if (!trimmedQuery) return fuzzyResults.length;
    return fuzzySearchProducts(products, query, {
      category: categoryFilter,
      inStockOnly,
    }).results.length;
  }, [products, query, categoryFilter, inStockOnly, trimmedQuery, fuzzyResults.length]);

  // Reset active highlight when result set changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query, categoryFilter, inStockOnly]);

  // Keep active keyboard-selected item visible inside scrollable container
  useEffect(() => {
    if (!isSearchOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-search-index="${activeIndex}"]`
    );
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isSearchOpen]);

  const handleOpenProduct = (product: Product) => {
    if (trimmedQuery) {
      recordRecentSearch(trimmedQuery);
    }
    setIsSearchOpen(false);
    navigate('product', { productSlug: product.slug });
  };

  const handleViewAllInCatalogue = () => {
    if (trimmedQuery) {
      recordRecentSearch(trimmedQuery);
    }
    setSearchQuery(trimmedQuery);
    setIsSearchOpen(false);
    navigate('shop', { category: categoryFilter });
  };

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const firstAvailableColor =
      product.colors.find((c) => c.inStock && (c.stockCount === undefined || c.stockCount > 0)) ||
      product.colors.find((c) => c.inStock);
    if (!product.inStock || !firstAvailableColor) return;
    const otherItem = isOtherProduct(product);
    const defaultInk = otherItem ? undefined : getProductInkColors(product)[0]?.id;
    addToCart(product, firstAvailableColor.id, 1, false, defaultInk);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (fuzzyResults.length > 0) {
        setActiveIndex((prev) => (prev + 1) % fuzzyResults.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (fuzzyResults.length > 0) {
        setActiveIndex((prev) => (prev - 1 + fuzzyResults.length) % fuzzyResults.length);
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = fuzzyResults[activeIndex]?.product;
      if (target && !e.shiftKey) {
        handleOpenProduct(target);
      } else {
        handleViewAllInCatalogue();
      }
    }
  };

  if (!isSearchOpen) return null;

  const renderSuggestionRow = (entry: FuzzyProductResult, index: number) => {
    const { product, nameHighlightRanges, matchedReasons } = entry;
    const isSelected = index === activeIndex;
    const otherItem = isOtherProduct(product);
    const totalStock = getProductTotalAvailableCount(product);
    const effectiveInStock = product.inStock && totalStock > 0;
    const thumb =
      product.colors.find((c) => c.inStock && c.image)?.image || product.images[0];
    const inkNames = otherItem
      ? ''
      : getProductInkColors(product)
          .slice(0, 3)
          .map((i) => i.name)
          .join(', ');

    return (
      <div
        key={product.id}
        data-search-index={index}
        role="option"
        aria-selected={isSelected}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => handleOpenProduct(product)}
        className={`group w-full p-3 rounded-xl border cursor-pointer transition-colors flex items-center gap-3 sm:gap-4 ${
          isSelected
            ? 'border-accent bg-accent/10 dark:bg-accent/15'
            : 'border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-card)]'
        }`}
      >
        {/* Thumbnail */}
        <div className="w-14 h-12 sm:w-16 sm:h-14 rounded-lg overflow-hidden shrink-0 bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)]">
          <SafeImage
            src={thumb}
            alt={product.name}
            fallbackLabel={product.name}
            className={`w-full h-full object-cover ${!effectiveInStock ? 'opacity-60' : ''}`}
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-display text-sm sm:text-[15px] font-semibold text-[var(--text-main)] truncate">
              {renderHighlightedName(product.name, nameHighlightRanges)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-secondary)]">
            {product.brand && <span className="font-medium">{product.brand}</span>}
            {product.brand && <span aria-hidden="true">·</span>}
            <span>{product.categoryLabel}</span>
            {!otherItem && product.specs?.tipSize && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">{product.specs.tipSize}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span
              className={
                effectiveInStock
                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'text-rose-500 font-semibold'
              }
            >
              {effectiveInStock ? `${totalStock} in stock` : 'Out of stock'}
            </span>
          </div>

          {(matchedReasons.length > 0 || inkNames) && (
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {matchedReasons.length > 0
                ? `Matched: ${matchedReasons.join(' · ')}`
                : inkNames
                ? `Ink: ${inkNames}`
                : null}
            </p>
          )}
        </div>

        {/* Price & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right">
            <p className="font-mono-num text-sm sm:text-base font-bold text-accent dark:text-accent-bright">
              ৳{product.priceBdt.toLocaleString('en-US')}
            </p>
            {product.originalPriceBdt && product.originalPriceBdt > product.priceBdt && (
              <p className="font-mono-num text-[11px] text-[var(--text-muted)] line-through">
                ৳{product.originalPriceBdt.toLocaleString('en-US')}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!effectiveInStock}
            onClick={(e) => handleQuickAdd(e, product)}
            aria-label={
              effectiveInStock
                ? `Quick add ${product.name} to cart`
                : `${product.name} is out of stock`
            }
            title={effectiveInStock ? 'Quick add to cart' : 'Out of Stock'}
            className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              effectiveInStock
                ? 'cta-glow-red'
                : 'bg-black/10 dark:bg-white/10 text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{effectiveInStock ? 'Add' : 'Sold Out'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-2.5 sm:p-6 sm:pt-14"
      role="dialog"
      aria-modal="true"
      aria-label="Intelligent product search"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => setIsSearchOpen(false)}
      />

      {/* Search Command Overlay */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-accent/45 bg-white dark:bg-[var(--bg-secondary)] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.75)] flex flex-col max-h-[86dvh] overflow-hidden">
        {/* Top Input Row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-input)]">
          {isCatalogLoading ? (
            <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-accent shrink-0" />
          )}

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search pens, brands, ink colours, 0.5mm tips, or notebooks..."
            aria-label="Search Firestore product catalogue"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="w-8 h-8 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent inline-flex items-center justify-center shrink-0"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent whitespace-nowrap shrink-0"
            aria-label="Close search overlay"
          >
            Esc
          </button>
        </div>

        {/* Category & Availability Filter Strip */}
        <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {availableCategories.map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'bg-accent text-[var(--accent-cta-text)]'
                      : 'bg-transparent text-[var(--text-secondary)] hover:bg-accent/10 hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                  }`}
                >
                  <CategoryVectorIcon category={cat.id} className="w-3.5 h-3.5 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setInStockOnly((prev) => !prev)}
            aria-pressed={inStockOnly}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
              inStockOnly
                ? 'border-accent bg-accent/15 text-accent dark:text-accent-bright'
                : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            In Stock
          </button>
        </div>

        {/* Results / Suggestions Body */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Product search suggestions"
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4"
        >
          {/* Status Summary Line */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              {!trimmedQuery ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    {categoryFilter === 'all'
                      ? 'Popular products from live catalogue'
                      : 'Top matches in selected category'}
                  </span>
                </>
              ) : (
                <span className="font-mono-num">
                  {totalMatchCount} {totalMatchCount === 1 ? 'fuzzy match' : 'fuzzy matches'} for
                  &ldquo;{trimmedQuery}&rdquo;
                </span>
              )}
            </span>
            <span className="font-mono-num shrink-0">
              {isCatalogLoading
                ? 'Syncing Firestore...'
                : isCloudSynced
                ? `${products.length} Firestore items`
                : `${products.length} items`}
            </span>
          </div>

          {/* Recent Searches (only shown when input is empty & history exists) */}
          {!trimmedQuery && recentSearches.length > 0 && (
            <div className="space-y-2 px-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)] inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Recent Searches</span>
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[11px] font-medium text-[var(--text-muted)] hover:text-accent inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-main)] hover:border-accent hover:text-accent dark:hover:text-accent-bright transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product Suggestion Rows or Empty / Loading State */}
          {isCatalogLoading && products.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto" />
              <p className="text-sm font-medium text-[var(--text-main)]">
                Loading live Firestore catalogue...
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Real-time suggestions will appear as soon as products sync.
              </p>
            </div>
          ) : fuzzyResults.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <p className="font-display text-base font-semibold text-[var(--text-main)]">
                {products.length === 0
                  ? 'No products are currently listed in Firestore'
                  : `No matches found for "${trimmedQuery}"`}
              </p>

              {didYouMean && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(didYouMean);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent/15 border border-accent/50 text-xs sm:text-sm font-semibold text-accent dark:text-accent-bright hover:bg-accent/20 transition-colors"
                  >
                    <span>Did you mean &ldquo;{didYouMean}&rdquo;?</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                Try searching by pen type (gel, ballpoint, marker), ink colour (blue, black, red),
                tip size (0.5mm), or brand name.
              </p>

              {(categoryFilter !== 'all' || inStockOnly || trimmedQuery) && (
                <div className="pt-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setCategoryFilter('all');
                      setInStockOnly(false);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] hover:border-accent"
                  >
                    Reset Search &amp; Filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {fuzzyResults.map((entry, idx) => renderSuggestionRow(entry, idx))}
            </div>
          )}
        </div>

        {/* Footer Hints & View All CTA */}
        <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-3">
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-subtle)] font-mono-num text-[10px]">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-subtle)] font-mono-num text-[10px] inline-flex items-center">
                <CornerDownLeft className="w-2.5 h-2.5" />
              </kbd>
              <span>Open product</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-subtle)] font-mono-num text-[10px]">
                Esc
              </kbd>
              <span>Close</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleViewAllInCatalogue}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-accent dark:text-accent-bright hover:underline whitespace-nowrap"
          >
            <span>
              {trimmedQuery
                ? `View all ${totalMatchCount} results in Catalogue`
                : 'Open Full Catalogue'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
