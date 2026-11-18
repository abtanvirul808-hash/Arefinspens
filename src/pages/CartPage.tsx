import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getColorAvailableCount } from '../data/products';
import { BrandNibLogo } from '../components/BrandIcons';
import { CartItemVariantEditor } from '../components/CartItemVariantEditor';
import { SafeImage } from '../components/SafeImage';

export const CartPage: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    updateCartQuantity,
    updateCartItemVariant,
    removeFromCart,
    navigate,
    products,
  } = useStore();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [previewColorByKey, setPreviewColorByKey] = useState<Record<string, string>>({});

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">
            Shopping <span className="text-accent">Cart</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Review your selected writing instruments before checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('shop', { category: 'all' })}
          className="self-start sm:self-auto inline-flex items-center gap-2 text-sm font-semibold text-accent dark:text-accent-bright hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Order More</span>
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-12 sm:p-16 text-center space-y-5">
          <div className="w-20 h-20 rounded-full border border-accent/45 bg-accent/10 mx-auto flex items-center justify-center">
            <BrandNibLogo className="w-10 h-10" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="font-display text-2xl font-bold text-[var(--text-main)]">
              Your cart is currently empty
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Browse our curated gel pens, ballpoint pens, fountain pens, markers, and drafting
              pencils to start building your desk kit.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('shop', { category: 'all' })}
              className="px-7 py-3 rounded-full text-sm font-semibold cta-glow-red inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Start Shopping</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('checkout')}
              className="px-6 py-3 rounded-full border border-accent/55 text-sm font-semibold text-[var(--text-main)] hover:bg-accent/10 transition-colors"
            >
              Create Order / Checkout
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Items */}
          <div className="lg:col-span-8 space-y-4">
            {cart.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              if (!product) return null;
              const isEditing = editingKey === item.key;
              const activePreviewColorId =
                (isEditing ? previewColorByKey[item.key] : undefined) || item.colorId;
              const variant = product.colors.find((c) => c.id === activePreviewColorId);
              const cartColorVariant = product.colors.find((c) => c.id === item.colorId);
              const colorAvailable = getColorAvailableCount(product, cartColorVariant);
              const otherUsedInColor = cart.reduce((sum, other) => {
                if (
                  other.key === item.key ||
                  other.productId !== item.productId ||
                  other.colorId !== item.colorId
                ) {
                  return sum;
                }
                return sum + other.quantity;
              }, 0);
              const maxQtyForItem = Math.max(0, colorAvailable - otherUsedInColor);
              const atColorMax = item.quantity >= maxQtyForItem;
              const thumb = variant?.image || product.images[0];

              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <button
                      type="button"
                      onClick={() => navigate('product', { productSlug: product.slug })}
                      className="w-full sm:w-32 aspect-[4/3] rounded-xl overflow-hidden bg-[#050505] shrink-0"
                    >
                      <SafeImage src={thumb} alt={product.name} className="w-full h-full object-cover" />
                    </button>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-xs text-[var(--text-muted)]">{product.categoryLabel}</p>
                      <button
                        type="button"
                        onClick={() => navigate('product', { productSlug: product.slug })}
                        className="font-display text-base font-bold text-[var(--text-main)] hover:text-accent-bright text-left block"
                      >
                        {product.name}
                      </button>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/25 inline-block"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          <span>Colour: {item.colorName}</span>
                        </span>
                        {item.inkColorName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="w-3 h-3 rounded-full border border-black/20 dark:border-white/25 inline-block"
                                style={{ backgroundColor: item.inkColorHex || '#111827' }}
                              />
                              <span>{item.inkColorName} Ink</span>
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">
                          ৳{product.priceBdt.toLocaleString('en-US')} each
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)]/50">
                      <div className="inline-flex items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)]">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.key, item.quantity - 1)}
                          className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-sm font-bold font-mono-num text-[var(--text-main)]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={atColorMax}
                          onClick={() => updateCartQuantity(item.key, item.quantity + 1)}
                          className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)] disabled:opacity-35 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                          title={
                            atColorMax
                              ? `Maximum available reached (${colorAvailable} ${item.colorName} in stock)`
                              : 'Increase quantity'
                          }
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {colorAvailable <= 0 ? (
                        <span className="text-[11px] font-semibold text-rose-500">
                          Out of stock
                        </span>
                      ) : atColorMax ? (
                        <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
                          Max {colorAvailable} available
                        </span>
                      ) : null}

                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono-num text-[var(--text-main)]">
                          ৳{(product.priceBdt * item.quantity).toLocaleString('en-US')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              setEditingKey(null);
                              setPreviewColorByKey((prev) => {
                                const next = { ...prev };
                                delete next[item.key];
                                return next;
                              });
                            } else {
                              setEditingKey(item.key);
                              setPreviewColorByKey((prev) => ({
                                ...prev,
                                [item.key]: item.colorId,
                              }));
                            }
                          }}
                          aria-expanded={isEditing}
                          aria-label={`Edit ${product.name} colour or ink`}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            isEditing
                              ? 'border-accent bg-accent/15 text-accent dark:text-accent-bright'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-main)] hover:border-accent'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>{isEditing ? 'Close' : 'Edit'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) setEditingKey(null);
                            removeFromCart(item.key);
                          }}
                          className="text-[var(--text-muted)] hover:text-accent-bright p-2"
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <CartItemVariantEditor
                      product={product}
                      currentColorId={item.colorId}
                      currentInkColorId={item.inkColorId}
                      onPreviewColorChange={(nextColorId) =>
                        setPreviewColorByKey((prev) => ({
                          ...prev,
                          [item.key]: nextColorId,
                        }))
                      }
                      onSave={(nextColorId, nextInkColorId) => {
                        updateCartItemVariant(item.key, nextColorId, nextInkColorId);
                        setEditingKey(null);
                        setPreviewColorByKey((prev) => {
                          const next = { ...prev };
                          delete next[item.key];
                          return next;
                        });
                      }}
                      onCancel={() => {
                        setEditingKey(null);
                        setPreviewColorByKey((prev) => {
                          const next = { ...prev };
                          delete next[item.key];
                          return next;
                        });
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4 rounded-2xl border border-accent/45 bg-[var(--bg-card)] p-5 sm:p-6 space-y-5 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm border-b border-[var(--border-subtle)] pb-4">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal</span>
                <span className="font-bold font-mono-num text-[var(--text-main)]">
                  ৳{cartSubtotal.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-[var(--text-main)]">Total</span>
              <span className="text-2xl font-extrabold font-mono-num text-accent dark:text-accent-bright">
                ৳{cartSubtotal.toLocaleString('en-US')}
              </span>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('checkout')}
                className="w-full py-3.5 px-5 rounded-xl text-sm font-semibold cta-glow-red inline-flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('shop', { category: 'all' })}
                className="w-full py-3 px-5 rounded-xl border border-[var(--border-strong)] text-sm font-semibold text-[var(--text-main)] hover:bg-accent/10 transition-colors"
              >
                Order More
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
