import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  CATALOGUE_CATEGORIES,
  getProductInkColors,
  isOtherProduct,
  PEN_CATEGORIES,
  PEN_CATEGORY_IDS,
} from '../data/products';
import { CategoryId, SortOption } from '../types';
import { BrandPackageLogo, CategoryVectorIcon } from '../components/BrandIcons';
import { ProductCard } from '../components/ProductCard';
import { fuzzySearchProducts } from '../utils/fuzzySearch';

const SORT_OPTIONS: {
  id: SortOption;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'popularity', label: 'Popularity', icon: Flame },
  { id: 'newest', label: 'Newest', icon: Clock },
  { id: 'price-asc', label: 'Price: Low to High', icon: TrendingUp },
  { id: 'price-desc', label: 'Price: High to Low', icon: TrendingDown },
  { id: 'rating', label: 'Highest Rated', icon: Star },
];

export const CataloguePage: React.FC = () => {
  const { selectedCategory, navigate, searchQuery, setSearchQuery, products } = useStore();

  const sliderMin = 20;
  const sliderMax = 500;
  const [maxPrice, setMaxPrice] = useState<number>(sliderMax);
  const [isDraggingPrice, setIsDraggingPrice] = useState<boolean>(false);

  const snapPriceTo10 = (raw: number) =>
    Math.min(sliderMax, Math.max(sliderMin, Math.round(raw / 10) * 10));
  const pricePercent = Math.min(
    100,
    Math.max(0, ((maxPrice - sliderMin) / (sliderMax - sliderMin)) * 100)
  );
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedInkColors, setSelectedInkColors] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [sortMenuOpen, setSortMenuOpen] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sortMenuOpen]);

  const activeSortOption =
    SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0];
  const ActiveSortIcon = activeSortOption.icon;

  const otherProductsCount = useMemo(
    () => products.filter((p) => isOtherProduct(p)).length,
    [products]
  );
  const isViewingOtherOnly = selectedCategory === 'other-products';

  const allFilterColors = useMemo(() => {
    const map = new Map<string, { id: string; name: string; hex: string }>();
    products.forEach((p) => {
      p.colors.forEach((c) => {
        const key = c.name.trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, { id: key, name: c.name.trim(), hex: c.hex });
        }
      });
    });
    return Array.from(map.values());
  }, [products]);

  const allFilterInkColors = useMemo(() => {
    const map = new Map<string, { id: string; name: string; hex: string }>();
    products.forEach((p) => {
      if (isOtherProduct(p)) return;
      getProductInkColors(p).forEach((ink) => {
        const key = ink.name.trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, { id: key, name: ink.name.trim(), hex: ink.hex });
        }
      });
    });
    return Array.from(map.values());
  }, [products]);

  const toggleColor = (colorId: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorId) ? prev.filter((c) => c !== colorId) : [...prev, colorId]
    );
  };

  const toggleInkColor = (inkId: string) => {
    setSelectedInkColors((prev) =>
      prev.includes(inkId) ? prev.filter((i) => i !== inkId) : [...prev, inkId]
    );
  };

  const resetFilters = () => {
    navigate('shop', { category: 'all', scrollToTop: false });
    setSearchQuery('');
    setMaxPrice(sliderMax);
    setSelectedColors([]);
    setSelectedInkColors([]);
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('popularity');
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim();
    const baseCandidates = query
      ? fuzzySearchProducts(products, query, {
          category: selectedCategory,
          inStockOnly,
        }).results.map((r) => r.product)
      : products;

    const list = baseCandidates.filter((p) => {
      const otherItem = isOtherProduct(p);
      const productInks = otherItem ? [] : getProductInkColors(p);
      if (selectedCategory === 'all-pens') {
        if (!PEN_CATEGORY_IDS.includes(p.category as (typeof PEN_CATEGORY_IDS)[number])) {
          return false;
        }
      } else if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (p.priceBdt > maxPrice) return false;
      if (
        selectedColors.length > 0 &&
        !p.colors.some((c) => c.inStock && selectedColors.includes(c.name.trim().toLowerCase()))
      ) {
        return false;
      }
      if (
        selectedInkColors.length > 0 &&
        (otherItem || !productInks.some((ink) => selectedInkColors.includes(ink.name.trim().toLowerCase())))
      ) {
        return false;
      }
      if (p.rating < minRating) return false;
      if (inStockOnly && !p.inStock) return false;
      return true;
    });

    if (query && sortBy === 'popularity') {
      return list;
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceBdt - b.priceBdt;
      if (sortBy === 'price-desc') return b.priceBdt - a.priceBdt;
      if (sortBy === 'rating') {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        const reviewDiff = (b.reviewCount || 0) - (a.reviewCount || 0);
        if (reviewDiff !== 0) return reviewDiff;
        return (b.orderCount ?? 0) - (a.orderCount ?? 0);
      }
      if (sortBy === 'newest') {
        const timeDiff = (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
        if (timeDiff !== 0) return timeDiff;
        const newDiff = Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
        if (newDiff !== 0) return newDiff;
        return (b.orderCount ?? 0) - (a.orderCount ?? 0);
      }
      // Popularity: sort by which pen has the most / highest customer rating, then rating count, orders, and newest
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      const reviewDiff = (b.reviewCount || 0) - (a.reviewCount || 0);
      if (reviewDiff !== 0) return reviewDiff;
      const orderDiff = (b.orderCount ?? 0) - (a.orderCount ?? 0);
      if (orderDiff !== 0) return orderDiff;
      const popDiff = (b.popularityScore || 0) - (a.popularityScore || 0);
      if (popDiff !== 0) return popDiff;
      return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
    });

    return sorted;
  }, [
    products,
    selectedCategory,
    maxPrice,
    selectedColors,
    selectedInkColors,
    minRating,
    inStockOnly,
    searchQuery,
    sortBy,
  ]);

  const activeCategoryLabel =
    isViewingOtherOnly && otherProductsCount === 0
      ? 'Other Products — Coming Soon'
      : CATALOGUE_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'All Products';

  const FilterPanelContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <h2 className="font-display text-sm font-bold text-[var(--text-main)]">Filters</h2>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-semibold text-accent dark:text-accent-bright hover:underline inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Category</h3>
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => navigate('shop', { category: 'all', scrollToTop: false })}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between gap-2 ${
              selectedCategory === 'all'
                ? 'bg-accent/15 border border-accent/50 text-accent dark:text-accent-bright font-semibold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-main)]'
            }`}
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <CategoryVectorIcon category="all" className="w-4 h-4 shrink-0" />
              <span className="truncate">All Products</span>
            </span>
          </button>

          {/* Highlighted Pens Group */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-accent/15 border border-accent/55 shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)]">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-accent dark:text-accent-bright">
                <CategoryVectorIcon category="all-pens" className="w-3.5 h-3.5 shrink-0" />
                <span>Pens</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-accent dark:text-accent-bright opacity-90">
                Collection
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('shop', { category: 'all-pens', scrollToTop: false })}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between gap-2 ${
                selectedCategory === 'all-pens'
                  ? 'bg-accent/15 border border-accent/50 text-accent dark:text-accent-bright font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-main)]'
              }`}
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <CategoryVectorIcon category="all-pens" className="w-4 h-4 shrink-0" />
                <span className="truncate">All Pens</span>
              </span>
            </button>
            {PEN_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate('shop', { category: cat.id as CategoryId, scrollToTop: false })}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-accent/15 border border-accent/50 text-accent dark:text-accent-bright font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <CategoryVectorIcon category={cat.id} className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Highlighted Other Group */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-accent/15 border border-accent/55 shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)]">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-accent dark:text-accent-bright">
                <CategoryVectorIcon category="other-products" className="w-3.5 h-3.5 shrink-0" />
                <span>Other</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-accent dark:text-accent-bright opacity-90">
                {otherProductsCount > 0 ? `${otherProductsCount} Items` : 'Soon'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('shop', { category: 'other-products', scrollToTop: false })}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between gap-2 ${
                selectedCategory === 'other-products'
                  ? 'bg-accent/15 border border-accent/50 text-accent dark:text-accent-bright font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-main)]'
              }`}
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <CategoryVectorIcon category="other-products" className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {otherProductsCount > 0 ? 'Other Products' : 'Coming Soon'}
                </span>
              </span>
              {otherProductsCount === 0 && (
                <span className="px-1.5 py-0.5 rounded bg-accent/15 border border-accent/40 text-[10px] font-bold text-accent dark:text-accent-bright shrink-0">
                  Soon
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--text-secondary)]">Max Price</span>
          <span className="font-mono-num font-bold text-[var(--text-main)]">
            Up to ৳{maxPrice.toLocaleString('en-US')}
          </span>
        </div>
        <div className="relative h-8 flex items-center select-none">
          <div className="relative w-full mx-2.5 h-2.5 liquid-glass-slider-rail overflow-visible">
            <div
              className="absolute inset-y-0 left-0 liquid-glass-slider-fill"
              style={{ width: `${pricePercent}%` }}
            />
            <span
              aria-hidden="true"
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 pointer-events-none liquid-glass-slider-thumb ${
                isDraggingPrice ? 'scale-115' : ''
              }`}
              style={{ left: `${pricePercent}%` }}
            />
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={10}
            value={maxPrice}
            onInput={(e) =>
              setMaxPrice(snapPriceTo10(Number((e.target as HTMLInputElement).value)))
            }
            onChange={(e) => setMaxPrice(snapPriceTo10(Number(e.target.value)))}
            onPointerDown={() => setIsDraggingPrice(true)}
            onPointerUp={() => setIsDraggingPrice(false)}
            onPointerCancel={() => setIsDraggingPrice(false)}
            onBlur={() => setIsDraggingPrice(false)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
            aria-label="Maximum price in Bangladeshi Taka"
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono-num text-[var(--text-muted)]">
          <span>৳{sliderMin}</span>
          <span>৳{Math.round((sliderMin + sliderMax) / 2).toLocaleString('en-US')}</span>
          <span>৳{sliderMax.toLocaleString('en-US')}</span>
        </div>
      </div>

      {/* Colour Filter */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
          {isViewingOtherOnly ? 'Colour' : 'Body / Product Colour'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {allFilterColors.map((c) => {
            const active = selectedColors.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleColor(c.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  active
                    ? 'border-accent bg-accent/15 text-[var(--text-main)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-accent/50'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/20 dark:border-white/25"
                  style={{ backgroundColor: c.hex }}
                />
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ink Colour Multi-Filter (Pens Only) */}
      {!isViewingOtherOnly && allFilterInkColors.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Ink Colour</h3>
          <div className="flex flex-wrap gap-2">
            {allFilterInkColors.map((ink) => {
              const active = selectedInkColors.includes(ink.id);
              return (
                <button
                  key={ink.id}
                  type="button"
                  onClick={() => toggleInkColor(ink.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    active
                      ? 'border-accent bg-accent/15 text-[var(--text-main)] font-semibold'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-accent/50'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 dark:border-white/25"
                    style={{ backgroundColor: ink.hex }}
                  />
                  <span>{ink.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Rating Filter */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Minimum Rating</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'All', val: 0 },
            { label: '4.0+', val: 4.0 },
            { label: '4.5+', val: 4.5 },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setMinRating(opt.val)}
              className={`py-1.5 px-2 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1 ${
                minRating === opt.val
                  ? 'border-accent bg-accent/15 text-accent-bright'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              {opt.val > 0 && <Star className="w-3 h-3 fill-current" />}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Availability Filter */}
      <div className="pt-2 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          role="switch"
          aria-checked={inStockOnly}
          onClick={() => setInStockOnly((prev) => !prev)}
          className={`w-full min-h-[46px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent liquid-glass-toggle-card ${
            inStockOnly ? 'liquid-glass-toggle-card-active' : ''
          }`}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <CheckCircle2
              className={`w-4 h-4 shrink-0 transition-colors ${
                inStockOnly
                  ? 'text-accent dark:text-accent-bright'
                  : 'text-[var(--text-muted)]'
              }`}
            />
            <span className="text-sm font-semibold text-[var(--text-main)] truncate">
              In Stock Only
            </span>
          </span>

          <span
            aria-hidden="true"
            className={`w-11 h-6 p-0.5 shrink-0 inline-flex items-center liquid-glass-switch-track ${
              inStockOnly ? 'liquid-glass-switch-track-on' : ''
            }`}
          >
            <span
              className={`w-[18px] h-[18px] block liquid-glass-switch-thumb ${
                inStockOnly ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            {FilterPanelContent}
          </div>
        </aside>

        {/* Main Catalogue Area */}
        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-accent dark:text-accent-bright">
                Arefin Mart Catalogue
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
                {activeCategoryLabel}
              </h1>
            </div>
            <p className="text-sm text-[var(--text-secondary)] font-mono-num">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} available
            </p>
          </div>

          {/* Mobile & Tablet Horizontal Quick-Category Strip */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {CATALOGUE_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              const isOtherCat = cat.id === 'other-products';
              const isAllPensCat = cat.id === 'all-pens';
              const isHighlightedGroup = isAllPensCat || isOtherCat;
              const isOtherEmpty = isOtherCat && otherProductsCount === 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    navigate('shop', { category: cat.id as CategoryId, scrollToTop: false })
                  }
                  className={`shrink-0 min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'border-accent bg-accent text-[var(--accent-cta-text)] shadow-[0_4px_14px_-4px_rgba(var(--accent-rgb),0.55)]'
                      : isHighlightedGroup
                      ? 'border-accent/55 bg-accent/15 text-accent dark:text-accent-bright font-bold shadow-[0_0_12px_rgba(var(--accent-rgb),0.2)] hover:border-accent'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-accent/60 hover:text-[var(--text-main)]'
                  }`}
                >
                  <CategoryVectorIcon category={cat.id} className="w-3.5 h-3.5 shrink-0" />
                  <span>{isOtherEmpty ? 'Other · Coming Soon' : cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search + Mobile Filter Trigger + Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pens, stationery, and other products..."
                aria-label="Search pens and products"
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm font-semibold text-[var(--text-main)] inline-flex items-center gap-2 shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-accent" />
                <span>Filters</span>
              </button>

              <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-0">
                <label
                  htmlFor="catalogue-sort"
                  className="text-xs text-[var(--text-muted)] whitespace-nowrap shrink-0"
                >
                  Sort by:
                </label>
                <div className="relative z-30 flex-1 sm:flex-none min-w-0" ref={sortDropdownRef}>
                  <div className="liquid-glass-dock w-full sm:w-auto">
                    <button
                      id="catalogue-sort"
                      type="button"
                      onClick={() => setSortMenuOpen((prev) => !prev)}
                      aria-haspopup="listbox"
                      aria-expanded={sortMenuOpen}
                      className={`liquid-glass-item w-full sm:w-auto min-h-[38px] px-3.5 py-1.5 text-xs sm:text-sm font-semibold inline-flex items-center justify-between gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        sortMenuOpen ? 'liquid-glass-item-active' : 'text-[var(--text-main)]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <ActiveSortIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            sortMenuOpen ? 'text-current' : 'text-accent dark:text-accent-bright'
                          }`}
                        />
                        <span className="truncate">{activeSortOption.label}</span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                          sortMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {sortMenuOpen && (
                    <div
                      className="liquid-glass-menu absolute right-0 mt-2.5 w-64 max-w-[calc(100vw-2rem)] p-2.5 z-50 space-y-1.5"
                      role="listbox"
                      aria-labelledby="catalogue-sort"
                    >
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-1 rounded-xl bg-accent/15 border border-accent/55 shadow-[0_0_14px_rgba(var(--accent-rgb),0.24)]">
                        <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-accent dark:text-accent-bright">
                          <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                          <span>Sort By</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-accent dark:text-accent-bright opacity-90">
                          Order
                        </span>
                      </div>

                      <div className="space-y-1">
                        {SORT_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const active = sortBy === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="option"
                              aria-selected={active}
                              onClick={() => {
                                setSortBy(opt.id);
                                setSortMenuOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 transition-colors ${
                                active
                                  ? 'bg-accent/20 text-accent dark:text-accent-bright font-semibold border border-accent/35'
                                  : 'text-[var(--text-secondary)] hover:bg-accent/10 hover:text-[var(--text-main)] border border-transparent'
                              }`}
                            >
                              <span className="inline-flex items-center gap-2.5 min-w-0">
                                <Icon className="w-4 h-4 text-accent dark:text-accent-bright shrink-0" />
                                <span className="truncate whitespace-nowrap">{opt.label}</span>
                              </span>
                              {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            isViewingOtherOnly && otherProductsCount === 0 ? (
              <div className="rounded-2xl border border-accent/45 bg-[var(--bg-card)] p-10 sm:p-14 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl border border-accent/45 bg-accent/10 mx-auto flex items-center justify-center">
                  <BrandPackageLogo className="w-10 h-10" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-accent/15 border border-accent/45 text-[11px] font-bold uppercase tracking-wider text-accent dark:text-accent-bright">
                    Coming Soon
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                    Other Products Arriving Soon
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    We&apos;re preparing notebooks, desk accessories, and everyday essentials for Arefin
                    Mart. In the meantime, explore our full pen collection.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'all-pens' })}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold cta-glow-red"
                >
                  Browse All Pens
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-12 text-center space-y-4">
                <p className="font-display text-lg font-semibold text-[var(--text-main)]">
                  {products.length === 0
                    ? 'No products listed in this category yet'
                    : 'No products matched those filters'}
                </p>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  {products.length === 0
                    ? 'This category is currently empty. Add items from the Admin panel when ready.'
                    : 'Try clearing your search term, raising the maximum price, or exploring other categories.'}
                </p>
                <button
                  type="button"
                  onClick={products.length === 0 ? () => navigate('home') : resetFilters}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold cta-glow-red"
                >
                  {products.length === 0 ? 'Return to Homepage' : 'Reset All Filters'}
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile & Tablet Slide-Out Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-start" role="dialog" aria-modal="true" aria-label="Product Filters">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative z-10 w-[min(86vw,340px)] h-[100dvh] bg-white dark:bg-[var(--bg-secondary)] border-r border-accent/40 p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-bold text-[var(--text-main)]">
                Filter Collection
              </span>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-9 h-9 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)]"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {FilterPanelContent}
            <div className="sticky bottom-0 pt-3 bg-white dark:bg-[var(--bg-secondary)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full min-h-[44px] py-2.5 rounded-xl text-sm font-semibold cta-glow-red"
              >
                Show {filteredProducts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
