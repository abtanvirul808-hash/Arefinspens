import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BrandNibLogo } from '../components/BrandIcons';
import { SafeImage } from '../components/SafeImage';

export const CartPage: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    navigate,
    products,
  } = useStore();

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <span>Continue Shopping</span>
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
              const variant = product.colors.find((c) => c.id === item.colorId);
              const thumb = variant?.image || product.images[0];

              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
                >
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
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/25 inline-block"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      <span>Colour: {item.colorName}</span>
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
                        className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-sm font-bold font-mono-num text-[var(--text-main)]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.key, item.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold font-mono-num text-[var(--text-main)]">
                        ৳{(product.priceBdt * item.quantity).toLocaleString('en-US')}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.key)}
                        className="text-[var(--text-muted)] hover:text-accent-bright p-1.5"
                        aria-label={`Remove ${product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4 rounded-2xl border border-accent/45 bg-[var(--bg-card)] p-6 space-y-5 sticky top-24">
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

            <button
              type="button"
              onClick={() => navigate('checkout')}
              className="w-full py-3.5 px-5 rounded-xl text-sm font-semibold cta-glow-red inline-flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
