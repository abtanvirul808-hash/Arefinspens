import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  XCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getProductInkColors, getVariantInkColors } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';

export const ProductDetailsPage: React.FC = () => {
  const { selectedProductSlug, navigate, addToCart, toggleWishlist, isWishlisted, products } =
    useStore();

  const product =
    products.find((p) => p.slug === selectedProductSlug) || products[0];

  const [selectedColorId, setSelectedColorId] = useState<string>(
    product?.colors.find((c) => c.inStock)?.id || product?.colors[0]?.id || ''
  );
  const initialColor =
    product?.colors.find((c) => c.inStock) || product?.colors[0];
  const initialVariantInks = product ? getVariantInkColors(product, initialColor) : [];
  const [selectedInkId, setSelectedInkId] = useState<string>(
    initialVariantInks[0]?.id || 'black'
  );
  const [activeImage, setActiveImage] = useState<string>(product?.images[0] || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [imageFading, setImageFading] = useState<boolean>(false);

  // Reset variant & gallery when navigating between products
  useEffect(() => {
    if (!product) return;
    const defaultColor = product.colors.find((c) => c.inStock) || product.colors[0];
    const inks = getVariantInkColors(product, defaultColor);
    setSelectedColorId(defaultColor?.id || '');
    setSelectedInkId(inks[0]?.id || 'black');
    setActiveImage(defaultColor?.image || product.images[0] || '');
    setQuantity(1);
  }, [product]);

  if (!product) {
    return (
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[var(--text-main)]">
          No product selected
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          There are currently no products in the catalogue.
        </p>
        <button
          type="button"
          onClick={() => navigate('home')}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cta-glow-red"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const activeColor =
    product.colors.find((c) => c.id === selectedColorId) || product.colors[0];
  const variantInkColors = getVariantInkColors(product, activeColor);
  const allProductInkColors = getProductInkColors(product);
  const activeInk =
    variantInkColors.find((i) => i.id === selectedInkId) ||
    variantInkColors[0] || { id: 'black', name: 'Black', hex: '#111827' };
  const wishlisted = isWishlisted(product.id);

  const switchImageSmoothly = (nextSrc: string) => {
    if (nextSrc === activeImage) return;
    setImageFading(true);
    window.setTimeout(() => {
      setActiveImage(nextSrc);
      setImageFading(false);
    }, 120);
  };

  const handleSelectColor = (colorId: string) => {
    setSelectedColorId(colorId);
    const variant = product.colors.find((c) => c.id === colorId);
    if (variant?.image) {
      switchImageSmoothly(variant.image);
    }
    const nextInks = getVariantInkColors(product, variant);
    if (!nextInks.some((i) => i.id === selectedInkId)) {
      setSelectedInkId(nextInks[0]?.id || 'black');
    }
  };

  const relatedProducts = products.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.featured)
  ).slice(0, 4);

  const galleryImages = Array.from(
    new Set([
      ...product.images,
      ...product.colors.map((c) => c.image).filter((x): x is string => Boolean(x)),
    ])
  );

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 space-y-10 sm:space-y-16">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[var(--text-muted)]">
        <button
          type="button"
          onClick={() => navigate('shop', { category: 'all' })}
          className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-accent-bright transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalogue</span>
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          onClick={() => navigate('shop', { category: product.category })}
          className="hover:text-accent-bright transition-colors"
        >
          {product.categoryLabel}
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--text-main)] font-medium truncate">{product.name}</span>
      </div>

      {/* Main Product Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Product Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-accent/40 bg-[#0B0809] shadow-[0_20px_50px_-20px_rgba(var(--accent-rgb),0.3)]">
            <div
              className={`w-full h-full transition-all duration-200 ${
                imageFading ? 'opacity-40 scale-[0.985]' : 'opacity-100 scale-100'
              }`}
            >
              <SafeImage
                src={activeImage}
                alt={`${product.name} — ${activeColor.name}`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {galleryImages.length > 1 && (
            <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => switchImageSmoothly(imgUrl)}
                  className={`w-20 sm:w-24 aspect-[4/3] rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    activeImage === imgUrl
                      ? 'border-accent shadow-[0_0_12px_rgba(var(--accent-rgb),0.45)]'
                      : 'border-[var(--border-subtle)] opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`View gallery image ${idx + 1}`}
                >
                  <SafeImage src={imgUrl} alt={`${product.name} view ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-accent dark:text-accent-bright">
                {product.brand}
              </span>
              <span aria-hidden="true">·</span>
              <span>{product.categoryLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono-num">
                <Star className="w-3.5 h-3.5 text-accent-bright fill-accent-bright" />
                <span>{product.rating.toFixed(1)}</span>
                <span className="text-[var(--text-muted)]">({product.reviewCount} sample reviews)</span>
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] leading-tight">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-3xl font-extrabold font-mono-num text-[var(--text-main)]">
                ৳{product.priceBdt.toLocaleString('en-US')}
              </span>
              {product.originalPriceBdt && (
                <>
                  <span className="text-base text-[var(--text-muted)] line-through font-mono-num">
                    ৳{product.originalPriceBdt.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs font-semibold text-accent dark:text-accent-bright">
                    Save ৳{(product.originalPriceBdt - product.priceBdt).toLocaleString('en-US')}
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            {product.description}
          </p>

          {/* Stock Status */}
          <div className="flex items-center gap-2 text-sm">
            {product.inStock ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  In Stock
                </span>
                <span className="text-[var(--text-muted)] font-mono-num">
                  ({product.stockCount} available)
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Out of Stock
                </span>
                <span className="text-[var(--text-muted)]">(Currently unavailable)</span>
              </>
            )}
          </div>

          {/* Clickable Body Colour Swatches & Multi Ink Colour Selector */}
          <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-[var(--text-main)]">Body Colour:</span>
                <span className="font-semibold text-accent dark:text-accent-bright">
                  {activeColor.name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {product.colors
                  .filter((c) => c.inStock)
                  .map((color) => {
                    const selected = color.id === selectedColorId;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleSelectColor(color.id)}
                        aria-label={`Select colour ${color.name}`}
                        aria-pressed={selected}
                        className={`group relative w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-150 ${
                          selected
                            ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--bg-card)] scale-110 shadow-[0_0_16px_rgba(var(--accent-rgb),0.45)]'
                            : 'ring-1 ring-black/20 dark:ring-white/25 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {selected && (
                          <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)]/60 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-[var(--text-main)]">
                  Ink Colour <span className="text-xs font-normal text-[var(--text-muted)]">({activeColor.name} body)</span>:
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-accent dark:text-accent-bright">
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 dark:border-white/30 inline-block shrink-0"
                    style={{ backgroundColor: activeInk.hex }}
                  />
                  <span>{activeInk.name}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Select ink colour">
                {variantInkColors.map((ink) => {
                  const selected = ink.id === activeInk.id;
                  return (
                    <button
                      key={ink.id}
                      type="button"
                      onClick={() => setSelectedInkId(ink.id)}
                      aria-pressed={selected}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all ${
                        selected
                          ? 'border-accent bg-accent/15 text-[var(--text-main)] font-semibold shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-accent/60 hover:text-[var(--text-main)]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/30 shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: ink.hex }}
                      >
                        {selected && (
                          <Check className="w-2.5 h-2.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]" />
                        )}
                      </span>
                      <span>{ink.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quantity + Action Buttons */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="inline-flex items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] h-12">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold font-mono-num text-[var(--text-main)]">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={!product.inStock}
                  onClick={() =>
                    setQuantity((q) => Math.min(Math.max(1, product.stockCount), q + 1))
                  }
                  className="w-11 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)] disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={!product.inStock}
                onClick={() => addToCart(product, selectedColorId, quantity, true, activeInk.id)}
                className={`flex-1 min-w-[140px] h-12 px-5 sm:px-6 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                  product.inStock
                    ? 'cta-glow-red'
                    : 'bg-black/10 dark:bg-white/10 text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{product.inStock ? 'Add to Cart' : 'Out of Stock'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
                  wishlisted
                    ? 'border-accent bg-accent/15 text-accent-bright'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-accent'
                }`}
              >
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => {
                if (!product.inStock) return;
                addToCart(product, selectedColorId, quantity, false, activeInk.id);
                navigate('checkout');
              }}
              className={`w-full h-12 rounded-xl border text-sm font-semibold transition-colors ${
                product.inStock
                  ? 'border-accent/65 text-[var(--text-main)] hover:bg-accent/10'
                  : 'border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
              }`}
            >
              {product.inStock ? 'Buy Now — Proceed to Checkout' : 'Currently Out of Stock'}
            </button>
          </div>

          {/* Delivery Info */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <Truck className="w-4 h-4 text-accent-bright mt-0.5 shrink-0" />
              <div className="space-y-1 text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-main)]">Bangladesh Delivery</p>
                <p>
                  Inside Dhaka: 1–2 business days · Outside Dhaka: 2–4 business days.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]/50 text-[var(--text-secondary)]">
              <ShieldCheck className="w-4 h-4 text-accent-bright shrink-0" />
              <span>Cash on Delivery supported across Bangladesh.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Sample Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
            Product Specifications
          </h2>
          <dl className="divide-y divide-[var(--border-subtle)]/60 text-sm">
            {[
              { label: 'Tip / Nib Size', value: product.specs.tipSize },
              { label: 'Ink / Lead Type', value: product.specs.inkType },
              {
                label: allProductInkColors.length > 1 ? 'Ink Colours' : 'Ink Colour',
                value: allProductInkColors.map((i) => i.name).join(', '),
                inks: allProductInkColors,
              },
              { label: 'Body Material', value: product.specs.bodyMaterial },
              { label: 'Weight', value: product.specs.weight },
              { label: 'Series / Origin', value: product.specs.origin },
            ].map((row) => (
              <div key={row.label} className="py-3 flex justify-between items-center gap-4">
                <dt className="text-[var(--text-muted)]">{row.label}</dt>
                <dd className="text-[var(--text-main)] font-medium text-right inline-flex flex-wrap justify-end items-center gap-2">
                  {'inks' in row && row.inks && (
                    <span className="inline-flex items-center -space-x-1">
                      {row.inks.map((ink) => (
                        <span
                          key={ink.id}
                          className="w-3 h-3 rounded-full border border-black/20 dark:border-white/30 inline-block shrink-0"
                          style={{ backgroundColor: ink.hex }}
                        />
                      ))}
                    </span>
                  )}
                  <span>{row.value}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              Customer Reviews
            </h2>
            <span className="text-xs text-[var(--text-muted)]">Sample demonstration reviews</span>
          </div>
          <div className="space-y-4">
            {product.sampleReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-xl border border-[var(--border-subtle)]/70 bg-[var(--bg-secondary)] space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-main)]">
                    {rev.author} · {rev.city}
                  </span>
                  <span className="font-mono-num text-[var(--text-muted)]">{rev.date}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 text-accent-bright fill-accent-bright" />
                  ))}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{rev.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-[var(--text-main)]">
            Related <span className="text-accent">Writing Instruments</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
