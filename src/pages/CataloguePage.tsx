import React, { useEffect, useMemo, useState } from 'react';
import {
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATALOGUE_CATEGORIES } from '../data/products';
import { CategoryId, SortOption } from '../types';
import { ProductCard } from '../components/ProductCard';

export const CataloguePage: React.FC = () => {
  const { selectedCategory, navigate, searchQuery, setSearchQuery, products } = useStore();

  const sliderMax = useMemo(
    () => Math.max(3000, ...products.map((p) => Math.ceil(p.priceBdt / 50) * 50)),
    [products]
  );

  const [maxPrice, setMaxPrice] = useState<number>(sliderMax);

  useEffect(() => {
    setMaxPrice((prev) => (prev < sliderMax ? sliderMax : prev));
  }, [sliderMax]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  const allBrands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))),
    [products]
  );

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

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const toggleColor = (colorId: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorId) ? prev.filter((c) => c !== colorId) : [...prev, colorId]
    );
  };

  const resetFilters = () => {
    navigate('shop', { category: 'all', scrollToTop: false });
    setSearchQuery('');
    setMaxPrice(sliderMax);
    setSelectedBrands([]);
    setSelectedColors([]);
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('popularity');
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const list = products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (p.priceBdt > maxPrice) return false;
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;
      if (
        selectedColors.length > 0 &&
        !p.colors.some((c) => c.inStock && selectedColors.includes(c.name.trim().toLowerCase()))
      ) {
        return false;
      }
      if (p.rating < minRating) return false;
      if (inStockOnly && !p.inStock) return false;
      if (query) {
        const hay = `${p.name} ${p.brand} ${p.categoryLabel} ${p.shortDescription} ${p.specs.tipSize}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceBdt - b.priceBdt;
      if (sortBy === 'price-desc') return b.priceBdt - a.priceBdt;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
      return b.popularityScore - a.popularityScore;
    });

    return sorted;
  }, [
    products,
    selectedCategory,
    maxPrice,
    selectedBrands,
    selectedColors,
    minRating,
    inStockOnly,
    searchQuery,
    sortBy,
  ]);

  const activeCategoryLabel =
    CATALOGUE_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'All Pens';

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
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Category</h3>
        <div className="space-y-1">
          {CATALOGUE_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate('shop', { category: cat.id as CategoryId, scrollToTop: false })}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between ${
                  active
                    ? 'bg-accent/15 border border-accent/50 text-accent dark:text-accent-bright font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-main)]'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
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
        <input
          type="range"
          min={50}
          max={sliderMax}
          step={50}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-accent"
          aria-label="Maximum price in Bangladeshi Taka"
        />
        <div className="flex justify-between text-[11px] font-mono-num text-[var(--text-muted)]">
          <span>৳50</span>
          <span>৳{Math.round(sliderMax / 2).toLocaleString('en-US')}</span>
          <span>৳{sliderMax.toLocaleString('en-US')}</span>
        </div>
      </div>

      {/* Colour Filter */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Colour</h3>
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

      {/* Brand Filter */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Brand</h3>
        <div className="space-y-2">
          {allBrands.map((brand) => (
            <label
              key={brand}
              className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand)}
                onChange={() => toggleBrand(brand)}
                className="w-4 h-4 rounded accent-accent"
              />
              <span>{brand}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Minimum Rating</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'All', val: 0 },
            { label: '4.8+', val: 4.8 },
            { label: '4.9+', val: 4.9 },
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
        <label className="flex items-center justify-between gap-2 text-sm text-[var(--text-main)] cursor-pointer">
          <span>In Stock Only</span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
        </label>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            {FilterPanelContent}
          </div>
        </aside>

        {/* Main Catalogue Area */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-accent dark:text-accent-bright">
                Stationery Catalogue
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
                {activeCategoryLabel}
              </h1>
            </div>
            <p className="text-sm text-[var(--text-secondary)] font-mono-num">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} available
            </p>
          </div>

          {/* Search + Mobile Filter Trigger + Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gel pens, fountain nibs, 0.5mm, markers..."
                aria-label="Search pens and stationery"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm font-semibold text-[var(--text-main)] inline-flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4 text-accent" />
                <span>Filters</span>
              </button>

              <div className="flex items-center gap-2">
                <label htmlFor="catalogue-sort" className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                  Sort by:
                </label>
                <select
                  id="catalogue-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                >
                  <option value="popularity">Popularity</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slide-Out Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-start" role="dialog" aria-modal="true" aria-label="Product Filters">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xs h-full bg-white dark:bg-[var(--bg-secondary)] border-r border-accent/40 p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-bold text-[var(--text-main)]">
                Filter Collection
              </span>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)]"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {FilterPanelContent}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold cta-glow-red"
            >
              Show {filteredProducts.length} Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
