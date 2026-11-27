import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  LogOut,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getColorAvailableCount, isOtherProduct } from '../data/products';
import { AccentThemeColor } from '../types';
import { CartItemVariantEditor } from './CartItemVariantEditor';
import { SafeImage } from './SafeImage';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    setIsCartDrawerOpen,
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

  if (!isCartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Cart">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="relative z-10 w-[min(100vw,26rem)] h-[100dvh] bg-white dark:bg-[var(--bg-secondary)] border-l border-accent/40 shadow-2xl flex flex-col">
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              Your Shopping Cart
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(false)}
            className="w-9 h-9 rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent inline-flex items-center justify-center"
            aria-label="Close cart drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {cart.length === 0 ? (
          <>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full border border-accent/40 bg-accent/10 flex items-center justify-center text-accent-bright">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-semibold text-[var(--text-main)]">
                  Your cart is empty
                </h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                  Explore our curated pens and everyday essentials to get started.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[210px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('shop', { category: 'all' });
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--accent-cta-text)] cta-glow-red"
                >
                  Start Shopping
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('checkout');
                  }}
                  className="px-5 py-2.5 rounded-xl border border-accent/55 text-xs font-semibold text-[var(--text-main)] hover:bg-accent/10"
                >
                  Create Order (Checkout)
                </button>
              </div>
            </div>

            <div className="px-5 pt-4 pb-5 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] space-y-2.5 shrink-0">
              <h3 className="font-display text-xs font-bold tracking-wide text-[var(--text-main)]">
                How to Order — Step by Step
              </h3>
              <ol className="space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-mono-num font-bold text-accent shrink-0">01.</span>
                  <span>Choose a product, select your colour &amp; quantity, and click Add to Cart.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono-num font-bold text-accent shrink-0">02.</span>
                  <span>Open your cart and click Checkout (or Order More to keep adding items).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono-num font-bold text-accent shrink-0">03.</span>
                  <span>Enter your name, phone number, and select Al Amanah Academy or Sylhet Uposhahr Home Delivery.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono-num font-bold text-accent shrink-0">04.</span>
                  <span>Click Place Order to get your Order ID (#1, #2…) — pay Cash on Delivery.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono-num font-bold text-accent shrink-0">05.</span>
                  <span className="font-medium text-[var(--text-main)]">
                    After ordering, please message us with your Order ID to confirm.
                  </span>
                </li>
              </ol>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product) return null;
                const otherItem = isOtherProduct(product);
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
                    className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2"
                  >
                    <div className="flex gap-3.5">
                      <div className="w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-[#050505]">
                        <SafeImage src={thumb} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCartDrawerOpen(false);
                              navigate('product', { productSlug: product.slug });
                            }}
                            className="text-sm font-semibold text-[var(--text-main)] hover:text-accent-bright text-left line-clamp-1"
                          >
                            {product.name}
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
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
                              aria-label={otherItem ? `Edit ${product.name} colour` : `Edit ${product.name} colour or ink`}
                              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
                                isEditing
                                  ? 'border-accent bg-accent/15 text-accent dark:text-accent-bright'
                                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-accent hover:text-[var(--text-main)]'
                              }`}
                            >
                              <Pencil className="w-3 h-3" />
                              <span>{isEditing ? 'Close' : 'Edit'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) setEditingKey(null);
                                removeFromCart(item.key);
                              }}
                              className="text-[var(--text-muted)] hover:text-accent-bright p-1.5"
                              aria-label={`Remove ${product.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-3 h-3 rounded-full border border-white/25 inline-block"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            <span>{item.colorName}</span>
                          </span>
                          {!otherItem && item.inkColorName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/25 inline-block"
                                  style={{ backgroundColor: item.inkColorHex || '#111827' }}
                                />
                                <span>{item.inkColorName} Ink</span>
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)]">
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.key, item.quantity - 1)}
                                className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2.5 text-xs font-mono-num font-semibold text-[var(--text-main)]">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={atColorMax}
                                onClick={() => updateCartQuantity(item.key, item.quantity + 1)}
                                className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)] disabled:opacity-35 disabled:cursor-not-allowed"
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
                              <span className="text-[10px] font-semibold text-rose-500">
                                Out of stock
                              </span>
                            ) : atColorMax ? (
                              <span className="text-[10px] font-mono-num text-[var(--text-muted)]">
                                Max {colorAvailable}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-sm font-bold font-mono-num text-[var(--text-main)]">
                            ৳{(product.priceBdt * item.quantity).toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <CartItemVariantEditor
                        compact
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

            <div className="px-4 sm:px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] space-y-3.5 sm:space-y-4 shrink-0">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                  <span className="text-lg font-bold font-mono-num text-[var(--text-main)]">
                    ৳{cartSubtotal.toLocaleString('en-US')}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Cash on Delivery available in Sylhet Uposhahr only · Zero extra delivery fee.
                </p>
              </div>

              {/* Elevated Action Buttons positioned mid-lower for comfortable reach */}
              <div className="grid grid-cols-2 gap-2.5 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('shop', { category: 'all' });
                  }}
                  className="py-2.5 px-4 rounded-xl border border-[var(--border-strong)] text-sm font-semibold text-[var(--text-main)] hover:bg-accent/10 transition-colors whitespace-nowrap"
                >
                  Order More
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('checkout');
                  }}
                  className="py-2.5 px-4 rounded-xl text-sm font-semibold text-[var(--accent-cta-text)] cta-glow-red inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Step-by-Step How to Order Guide below action buttons */}
              <div className="pt-3.5 border-t border-[var(--border-subtle)] space-y-2">
                <h3 className="font-display text-xs font-bold tracking-wide text-[var(--text-main)]">
                  How to Order — Step by Step
                </h3>
                <ol className="space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="font-mono-num font-bold text-accent shrink-0">01.</span>
                    <span>Review your items, tap Edit to change your variant, or tap Order More to add more.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono-num font-bold text-accent shrink-0">02.</span>
                    <span>Tap Checkout above to go to the order form.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono-num font-bold text-accent shrink-0">03.</span>
                    <span>Fill in your name, phone, and pick Al Amanah Academy or Sylhet Uposhahr Home Delivery.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono-num font-bold text-accent shrink-0">04.</span>
                    <span>Tap Place Order to receive your Order ID (#1, #2…) — pay Cash on Delivery.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono-num font-bold text-accent shrink-0">05.</span>
                    <span className="font-medium text-[var(--text-main)]">
                      After ordering, please message us with your Order ID to confirm.
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const THEME_COLOR_OPTIONS: {
  id: AccentThemeColor;
  label: string;
  swatch: string;
}[] = [
  { id: 'red', label: 'Red (Default)', swatch: '#FF1428' },
  { id: 'purple', label: 'Purple', swatch: '#A855F7' },
  { id: 'yellow', label: 'Yellow', swatch: '#FACC15' },
  { id: 'green', label: 'Green', swatch: '#10B981' },
  { id: 'sky-blue', label: 'Sky Blue', swatch: '#38BDF8' },
  {
    id: 'monochrome',
    label: 'White / Black',
    swatch: 'linear-gradient(135deg, #ffffff 50%, #09090b 50%)',
  },
];

export const SettingsPanel: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, preferences, updatePreferences } = useStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-end p-0 sm:p-6 sm:pt-20" role="dialog" aria-modal="true" aria-label="Display Settings">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => setIsSettingsOpen(false)}
      />

      <div className="relative z-10 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-accent/45 bg-white dark:bg-[var(--bg-input)] p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-5 max-h-[88dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <h2 className="font-display text-base font-bold text-[var(--text-main)]">
            Display &amp; Accessibility Settings
          </h2>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] inline-flex items-center justify-center"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Preference */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Theme Mode</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updatePreferences({ theme: 'dark' })}
              className={`min-h-[44px] sm:min-h-0 py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                preferences.theme === 'dark'
                  ? 'border-accent bg-accent/15 text-accent-bright'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              Dark Mode
            </button>
            <button
              type="button"
              onClick={() => updatePreferences({ theme: 'light' })}
              className={`min-h-[44px] sm:min-h-0 py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                preferences.theme === 'light'
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              Light Studio
            </button>
          </div>
        </div>

        {/* Theme Colour */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Theme Colour</p>
          <div className="grid grid-cols-2 gap-2">
            {THEME_COLOR_OPTIONS.map((opt) => {
              const active = (preferences.accentColor || 'red') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updatePreferences({ accentColor: opt.id })}
                  aria-pressed={active}
                  className={`min-h-[44px] sm:min-h-0 py-2 px-2.5 rounded-xl text-xs font-semibold border inline-flex items-center gap-2 transition-all ${
                    active
                      ? 'border-accent bg-accent/15 text-[var(--text-main)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.25)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent/50'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/25 dark:border-white/35 shrink-0"
                    style={{ background: opt.swatch }}
                  />
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Size */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Text Size</p>
          <div className="grid grid-cols-3 gap-2">
            {(['compact', 'standard', 'comfortable'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updatePreferences({ textSize: size })}
                className={`min-h-[44px] sm:min-h-0 py-2 px-2 rounded-xl text-xs font-semibold capitalize border transition-colors ${
                  preferences.textSize === size
                    ? 'border-accent bg-accent/15 text-accent-bright'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Reduced Motion */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-sm font-medium text-[var(--text-main)]">Reduce Motion</p>
            <p className="text-xs text-[var(--text-muted)]">
              Minimizes hover and page transition effects.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.reducedMotion}
            onClick={() =>
              updatePreferences({ reducedMotion: !preferences.reducedMotion })
            }
            className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
              preferences.reducedMotion ? 'bg-accent' : 'bg-zinc-600/50'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full transition-transform ${
                preferences.reducedMotion
                  ? 'translate-x-5 bg-[var(--accent-cta-text)]'
                  : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    demoUser,
    isCustomerSignedIn,
    loginCustomerWithGoogle,
    logoutDemoUser,
    wishlist,
    orders,
    navigate,
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const handleGoogleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await loginCustomerWithGoogle(phone);
      if (!res.ok) {
        setError(res.error || 'Could not sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Account">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => setIsAuthModalOpen(false)}
      />
      <div className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-accent/45 bg-white dark:bg-[var(--bg-input)] p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center text-accent-bright">
              <User className="w-4 h-4" />
            </div>
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              {isCustomerSignedIn && demoUser
                ? 'Customer Account'
                : mode === 'login'
                ? 'Sign In to Arefin Mart'
                : 'Create Your Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] inline-flex items-center justify-center"
            aria-label="Close account dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isCustomerSignedIn && demoUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-1.5">
              <p className="text-sm font-semibold text-[var(--text-main)]">{demoUser.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{demoUser.email}</p>
              <div className="flex items-center gap-2 pt-1 text-xs text-[var(--text-muted)]">
                <span>My orders: {orders.length}</span>
                <span aria-hidden="true">·</span>
                <span>Wishlist: {wishlist.length}</span>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Your orders are private to your account — only you and the store admin can view them.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsAuthModalOpen(false);
                  navigate('track-order');
                }}
                className="py-2.5 px-3 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] hover:border-accent"
              >
                View My Orders
              </button>
              <button
                type="button"
                onClick={() => void logoutDemoUser()}
                className="py-2.5 px-3 rounded-xl bg-accent/15 border border-accent/40 text-xs font-semibold text-accent-bright inline-flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'login'
                    ? 'bg-accent text-[var(--accent-cta-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'register'
                    ? 'bg-accent text-[var(--accent-cta-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleGoogleAuth} className="space-y-4" noValidate>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {mode === 'login'
                  ? 'Sign in with your Google account before placing an order. Only you can view your own orders.'
                  : 'Create your customer account in one click with Google so your orders stay private and receive sequential serial IDs (#1, #2…).'}
              </p>

              <div>
                <label
                  htmlFor="auth-optional-phone"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  Mobile Number (Optional — pre-fills Checkout)
                </label>
                <input
                  id="auth-optional-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>

              {error && (
                <p className="text-xs font-medium text-rose-500 bg-rose-500/10 border border-rose-500/35 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-[var(--accent-cta-text)] cta-glow-red disabled:opacity-60"
              >
                {loading
                  ? 'Connecting Google Account...'
                  : mode === 'login'
                  ? 'Sign In with Google'
                  : 'Create Account with Google'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export const ToastBanner: React.FC = () => {
  const { toast } = useStore();
  if (!toast) return null;

  return (
    <div
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 sm:left-auto sm:right-5 sm:bottom-5 z-50 max-w-sm mx-auto sm:mx-0 px-4 py-3 rounded-xl bg-[var(--bg-secondary)]/95 border border-accent/60 text-[var(--text-main)] shadow-[0_12px_32px_rgba(var(--accent-rgb),0.25)] flex items-center gap-2.5 text-sm backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 className="w-4 h-4 text-accent-bright shrink-0" />
      <span>{toast.message}</span>
    </div>
  );
};
