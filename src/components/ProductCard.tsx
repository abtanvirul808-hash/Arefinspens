import React, { useState } from 'react';
import { Check, Heart, ShoppingBag, Star } from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { navigate, addToCart, toggleWishlist, isWishlisted } = useStore();
  const [selectedColorId, setSelectedColorId] = useState(
    product.colors.find((c) => c.inStock)?.id || product.colors[0].id
  );
  const [justAdded, setJustAdded] = useState(false);

  const wishlisted = isWishlisted(product.id);
  const activeColor =
    product.colors.find((c) => c.id === selectedColorId) || product.colors[0];
  const displayImage = activeColor?.image || product.images[0];

  const discountPercent =
    product.originalPriceBdt && product.originalPriceBdt > product.priceBdt
      ? Math.round(
          ((product.originalPriceBdt - product.priceBdt) / product.originalPriceBdt) * 100
        )
      : null;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.inStock) return;
    addToCart(product, selectedColorId, 1, true);
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
            !product.inStock ? 'opacity-65' : ''
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
          className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
            wishlisted
              ? 'bg-accent border-accent-bright text-[var(--accent-cta-text)]'
              : 'bg-black/55 border-white/15 text-white/85 hover:border-accent hover:text-accent-bright'
          }`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Quiet Single-Line Discount / Stock Label */}
        {!product.inStock ? (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-rose-600/90 backdrop-blur-sm border border-rose-400/60 text-[11px] font-bold text-white uppercase tracking-wide">
            Out of Stock
          </span>
        ) : (
          discountPercent && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#050505]/80 backdrop-blur-sm border border-accent/45 text-[11px] font-semibold text-accent-bright font-mono-num">
              -{discountPercent}%
            </span>
          )
        )}
      </div>

      {/* Content Zone */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3.5">
        <div className="space-y-2">
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

        <div className="space-y-3 pt-1">
          {/* Available Colour Indicator Swatches */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5" role="group" aria-label="Available colours">
              {product.colors.map((color) => {
                const selected = color.id === selectedColorId;
                return (
                  <button
                    key={color.id}
                    type="button"
                    disabled={!color.inStock}
                    onClick={() => setSelectedColorId(color.id)}
                    title={color.name}
                    aria-label={`Select ${color.name} colour`}
                    aria-pressed={selected}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      selected
                        ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--bg-card)] scale-110'
                        : 'ring-1 ring-black/20 dark:ring-white/25 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                );
              })}
            </div>
            <span className="text-xs text-[var(--text-muted)] truncate">
              {activeColor?.name}
            </span>
          </div>

          {/* Price & Add to Cart */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]/60">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-lg font-bold text-[var(--text-main)] font-mono-num">
                ৳{product.priceBdt.toLocaleString('en-US')}
              </span>
              {product.originalPriceBdt && (
                <span className="text-xs text-[var(--text-muted)] line-through font-mono-num">
                  ৳{product.originalPriceBdt.toLocaleString('en-US')}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={!product.inStock}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                !product.inStock
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed'
                  : justAdded
                  ? 'bg-emerald-600 text-white'
                  : 'text-white cta-glow-red'
              }`}
            >
              {!product.inStock ? (
                <span>Out of Stock</span>
              ) : justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
