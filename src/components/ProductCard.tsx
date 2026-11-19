import React, { useState } from 'react';
import { Check, Eye, Heart, Maximize2, ShoppingBag, Star } from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import {
  getColorAvailableCount,
  getProductTotalAvailableCount,
  getVariantInkColors,
} from '../data/products';
import { ImageLightboxModal, LightboxSlide } from './ImageLightboxModal';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { navigate, addToCart, toggleWishlist, isWishlisted } = useStore();
  const [selectedColorId, setSelectedColorId] = useState(
    product.colors.find((c) => c.inStock)?.id || product.colors[0].id
  );
  const activeColor =
    product.colors.find((c) => c.id === selectedColorId) || product.colors[0];
  const inkColors = getVariantInkColors(product, activeColor);
  const [selectedInkId, setSelectedInkId] = useState(inkColors[0]?.id || 'black');
  const [justAdded, setJustAdded] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const selectedColorAvailable = getColorAvailableCount(product, activeColor);
  const totalAvailable = getProductTotalAvailableCount(product);
  const availableColorCount = product.colors.filter(
    (c) => getColorAvailableCount(product, c) > 0
  ).length;
  const effectiveInStock =
    product.inStock && totalAvailable > 0 && availableColorCount > 0;
  const isSelectedColorInStock = selectedColorAvailable > 0;
  const canQuickAdd = effectiveInStock && isSelectedColorInStock;

  const wishlisted = isWishlisted(product.id);
  const activeInk =
    inkColors.find((i) => i.id === selectedInkId) || inkColors[0];
  const displayImage = activeColor?.image || product.images[0];

  const lightboxSlides: LightboxSlide[] = [];
  const seenSrc = new Set<string>();
  for (const c of product.colors) {
    if (c.image && !seenSrc.has(c.image)) {
      seenSrc.add(c.image);
      lightboxSlides.push({ src: c.image, label: `${c.name} Colour`, colorHex: c.hex });
    }
  }
  for (const img of product.images) {
    if (img && !seenSrc.has(img)) {
      seenSrc.add(img);
      lightboxSlides.push({ src: img, label: product.name });
    }
  }
  const activeSlideIndex = Math.max(
    0,
    lightboxSlides.findIndex((s) => s.src === displayImage)
  );

  const discountPercent =
    product.originalPriceBdt && product.originalPriceBdt > product.priceBdt
      ? Math.round(
          ((product.originalPriceBdt - product.priceBdt) / product.originalPriceBdt) * 100
        )
      : null;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canQuickAdd) return;
    addToCart(product, selectedColorId, 1, true, activeInk?.id);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article
      className="group product-card-surface rounded-2xl border border-[var(--border-subtle)] hover:border-accent/70 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(var(--accent-rgb),0.28)]"
    >
      {/* Image Zone (4:3 uniform studio aspect ratio) */}
      <div
        onClick={() => navigate('product', { productSlug: product.slug })}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-card-elevated)] cursor-pointer"
      >
        <SafeImage
          src={displayImage}
          alt={product.name}
          fallbackLabel={product.name}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04] ${
            !effectiveInStock ? 'opacity-65' : ''
          }`}
        />

        {/* Subtle Top-Right Wishlist Heart */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-10 h-10 sm:w-9 sm:h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
            wishlisted
              ? 'bg-accent border-accent-bright text-[var(--accent-cta-text)]'
              : 'bg-black/55 border-white/15 text-white/85 hover:border-accent hover:text-accent-bright'
          }`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Quiet Single-Line Discount / Stock Label */}
        {!effectiveInStock ? (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-rose-600/90 backdrop-blur-sm border border-rose-400/60 text-[11px] font-bold text-white uppercase tracking-wide">
            Out of Stock
          </span>
        ) : !isSelectedColorInStock ? (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-rose-600/85 backdrop-blur-sm border border-rose-400/60 text-[11px] font-bold text-white tracking-wide">
            {activeColor?.name} Out of Stock
          </span>
        ) : (
          discountPercent && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#050505]/80 backdrop-blur-sm border border-accent/45 text-[11px] font-semibold text-accent-bright font-mono-num">
              -{discountPercent}%
            </span>
          )
        )}

        {lightboxSlides.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            aria-label={`View ${product.name} full screen`}
            title="Full screen pen preview"
            className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 w-8 h-8 rounded-lg bg-black/65 backdrop-blur-md border border-white/20 text-white/90 hover:border-accent hover:text-white flex items-center justify-center transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content Zone */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5 sm:space-y-2">
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            <span className="truncate">{product.categoryLabel}</span>
            <span className="inline-flex items-center gap-1 shrink-0 text-[var(--text-secondary)] font-mono-num">
              <Star className="w-3.5 h-3.5 text-accent-bright fill-accent-bright" />
              <span>{product.rating.toFixed(1)}</span>
            </span>
          </div>

          {/* Product Name */}
          <h3 className="font-display text-base font-semibold text-[var(--text-main)] leading-snug line-clamp-2">
            <button
              type="button"
              onClick={() => navigate('product', { productSlug: product.slug })}
              className="text-left hover:text-accent-bright transition-colors"
            >
              {product.name}
            </button>
          </h3>

          {/* Short Description */}
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>

        <div className="space-y-2.5 sm:space-y-3 pt-1">
          {/* Body Colour Swatches + Selected Colour Qty & Total Available Beside It */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-1.5" role="group" aria-label="Pen body colours">
                {product.colors.map((color) => {
                  const selected = color.id === selectedColorId;
                  const colorCount = getColorAvailableCount(product, color);
                  const out = colorCount <= 0;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        setSelectedColorId(color.id);
                        const nextInks = getVariantInkColors(product, color);
                        if (!nextInks.some((i) => i.id === selectedInkId)) {
                          setSelectedInkId(nextInks[0]?.id || 'black');
                        }
                      }}
                      title={
                        out
                          ? `${color.name} (Out of Stock)`
                          : `${color.name} (${colorCount} available)`
                      }
                      aria-label={
                        out
                          ? `${color.name} colour (Out of Stock)`
                          : `Select ${color.name} colour (${colorCount} available)`
                      }
                      aria-pressed={selected}
                      className={`relative w-6 h-6 sm:w-5 sm:h-5 rounded-full overflow-hidden transition-transform ${
                        selected
                          ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--bg-card)] scale-110'
                          : 'ring-1 ring-black/20 dark:ring-white/25 hover:scale-105'
                      } ${out ? 'opacity-45' : ''}`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {out && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        >
                          <span className="w-[140%] h-[2px] bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)] -rotate-45" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <span
                className={`text-xs truncate ${
                  !isSelectedColorInStock
                    ? 'text-rose-500 font-semibold'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {activeColor?.name}
                {!isSelectedColorInStock ? ' · Out' : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] font-mono-num">
              <span
                className={
                  isSelectedColorInStock
                    ? 'font-semibold text-[var(--text-main)]'
                    : 'font-semibold text-rose-500'
                }
              >
                {activeColor?.name}:{' '}
                {isSelectedColorInStock
                  ? `${selectedColorAvailable} available`
                  : '0 (Out of Stock)'}
              </span>
              <span className="text-[var(--text-secondary)]">
                Total available: {totalAvailable}
              </span>
            </div>
          </div>

          {/* Ink Colour Selector / Indicator */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5" role="group" aria-label="Available ink colours">
              <span className="text-[11px] text-[var(--text-muted)] shrink-0">Ink:</span>
              {inkColors.length > 1 ? (
                <div className="flex items-center gap-1.5">
                  {inkColors.map((ink) => {
                    const selected = ink.id === activeInk?.id;
                    return (
                      <button
                        key={ink.id}
                        type="button"
                        onClick={() => setSelectedInkId(ink.id)}
                        title={`${ink.name} Ink`}
                        aria-label={`Select ${ink.name} ink colour`}
                        aria-pressed={selected}
                        className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full transition-transform ${
                          selected
                            ? 'ring-2 ring-accent ring-offset-1 ring-offset-[var(--bg-card)] scale-110'
                            : 'ring-1 ring-black/20 dark:ring-white/25 hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: ink.hex }}
                      />
                    );
                  })}
                </div>
              ) : (
                <span
                  className="w-3 h-3 rounded-full border border-black/20 dark:border-white/25 inline-block shrink-0"
                  style={{ backgroundColor: activeInk?.hex || '#111827' }}
                />
              )}
            </div>
            <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
              {activeInk?.name || 'Black'} Ink
            </span>
          </div>

          {/* Price, View & Add to Cart */}
          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[var(--border-subtle)]/60">
            <div className="flex flex-col items-start min-w-0 shrink-0">
              <span className="px-2.5 py-1.5 rounded-lg bg-accent/15 border border-accent/50 text-lg sm:text-xl font-extrabold text-accent dark:text-accent-bright font-mono-num shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)] whitespace-nowrap leading-none">
                ৳{product.priceBdt.toLocaleString('en-US')}
              </span>
              {product.originalPriceBdt && (
                <span className="text-[11px] text-[var(--text-muted)] line-through font-mono-num pl-0.5 leading-tight mt-0.5">
                  ৳{product.originalPriceBdt.toLocaleString('en-US')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('product', { productSlug: product.slug });
                }}
                aria-label={`View ${product.name} information and specifications`}
                className="min-h-[40px] px-2.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-main)] hover:border-accent hover:text-accent dark:hover:text-accent-bright hover:bg-accent/10 inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>View</span>
              </button>

              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={!canQuickAdd}
                aria-label={
                  !canQuickAdd
                    ? `${product.name} is out of stock`
                    : justAdded
                    ? `Added ${product.name} to cart`
                    : `Add ${product.name} to cart`
                }
                title={!canQuickAdd ? 'Out of Stock' : 'Add to Cart'}
                className={`min-h-[40px] min-w-[80px] sm:min-w-[84px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  !canQuickAdd
                    ? 'bg-black/10 dark:bg-white/10 text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed'
                    : justAdded
                    ? 'bg-emerald-600 text-white'
                    : 'text-white cta-glow-red'
                }`}
              >
                {!effectiveInStock ? (
                  <span>Sold Out</span>
                ) : !isSelectedColorInStock ? (
                  <span>Sold Out</span>
                ) : justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImageLightboxModal
        isOpen={isLightboxOpen}
        slides={lightboxSlides}
        initialIndex={activeSlideIndex}
        title={product.name}
        onClose={() => setIsLightboxOpen(false)}
      />
    </article>
  );
};
