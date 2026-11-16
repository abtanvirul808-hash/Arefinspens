import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  LogOut,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AccentThemeColor } from '../types';
import { SafeImage } from './SafeImage';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    cart,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    navigate,
    products,
  } = useStore();

  if (!isCartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Cart">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="relative z-10 w-full max-w-md h-full bg-white dark:bg-[var(--bg-secondary)] border-l border-accent/40 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
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
                  Explore our gel pens, fountain pens, and drafting instruments to get started.
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
                  <span>Choose a pen, select your colour &amp; quantity, and click Add to Cart.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono-num font-bold text-accent shrink-0">02.</span>
                  <span>Open your cart and click Checkout (or View Cart to review items).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono-num font-bold text-accent shrink-0">03.</span>
                  <span>Enter your name, phone number, and select Al Amanah Academy or Home Delivery.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono-num font-bold text-accent shrink-0">04.</span>
                  <span>Click Place Order to get your Order ID (#1, #2…) — pay Cash on Delivery.</span>
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
                const variant = product.colors.find((c) => c.id === item.colorId);
                const thumb = variant?.image || product.images[0];

                return (
                  <div
                    key={item.key}
                    className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex gap-3.5"
                  >
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
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.key)}
                          className="text-[var(--text-muted)] hover:text-accent-bright p-1"
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <span
                          className="w-3 h-3 rounded-full border border-white/25 inline-block"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        <span>{item.colorName}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)]">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.key, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-mono-num font-semibold text-[var(--text-main)]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.key, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold font-mono-num text-[var(--text-main)]">
                          ৳{(product.priceBdt * item.quantity).toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 pt-4 pb-6 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] space-y-4 shrink-0">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                  <span className="text-lg font-bold font-mono-num text-[var(--text-main)]">
                    ৳{cartSubtotal.toLocaleString('en-US')}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Cash on Delivery available across Bangladesh · Zero extra delivery fee.
                </p>
              </div>

              {/* Elevated Action Buttons positioned mid-lower for comfortable reach */}
              <div className="grid grid-cols-2 gap-2.5 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('cart');
                  }}
                  className="py-2.5 px-4 rounded-xl border border-[var(--border-strong)] text-sm font-semibold text-[var(--text-main)] hover:bg-accent/10 transition-colors whitespace-nowrap"
                >
                  View Cart
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
                    <span>Review your pen colours &amp; quantities, or click View Cart to edit.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono-num font-bold text-accent shrink-0">02.</span>
                    <span>Tap Checkout above to go to the order form.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono-num font-bold text-accent shrink-0">03.</span>
                    <span>Fill in your name, phone, and pick Al Amanah Academy or Home Delivery.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono-num font-bold text-accent shrink-0">04.</span>
                    <span>Tap Place Order to receive your Order ID (#1, #2…) — pay Cash on Delivery.</span>
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
];

export const SettingsPanel: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, preferences, updatePreferences } = useStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 pt-20" role="dialog" aria-modal="true" aria-label="Display Settings">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => setIsSettingsOpen(false)}
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-accent/45 bg-white dark:bg-[var(--bg-input)] p-5 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <h2 className="font-display text-base font-bold text-[var(--text-main)]">
            Display &amp; Accessibility Settings
          </h2>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="w-8 h-8 rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] inline-flex items-center justify-center"
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
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
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
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
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
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border inline-flex items-center gap-2 transition-all ${
                    active
                      ? 'border-accent bg-accent/15 text-[var(--text-main)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.25)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent/50'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/30 shrink-0"
                    style={{ backgroundColor: opt.swatch }}
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
                className={`py-2 px-2 rounded-xl text-xs font-semibold capitalize border transition-colors ${
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
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                preferences.reducedMotion ? 'translate-x-5' : 'translate-x-0'
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
    loginDemoUser,
    logoutDemoUser,
    wishlist,
    navigate,
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register' && name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    loginDemoUser({
      name: mode === 'register' ? name.trim() : email.split('@')[0],
      email: email.trim(),
      phone: phone.trim() || '01711000000',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Account">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => setIsAuthModalOpen(false)}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-accent/45 bg-white dark:bg-[var(--bg-input)] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center text-accent-bright">
              <User className="w-4 h-4" />
            </div>
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              {demoUser
                ? 'Customer Account'
                : mode === 'login'
                ? 'Sign In to Arefin’s Pen'
                : 'Create Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="w-8 h-8 rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] inline-flex items-center justify-center"
            aria-label="Close account dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {demoUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-1">
              <p className="text-sm font-semibold text-[var(--text-main)]">{demoUser.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{demoUser.email}</p>
              <p className="text-xs text-[var(--text-muted)]">
                Saved wishlist items: {wishlist.length}
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Local browser demonstration session. Ready to connect to a live authentication
              provider.
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
                Track Orders
              </button>
              <button
                type="button"
                onClick={logoutDemoUser}
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
                Login
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
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Arefin Chowdhury"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>

              {error && <p className="text-xs text-accent-bright">{error}</p>}

              <p className="text-[11px] text-[var(--text-muted)]">
                Demonstration sign-in stored locally in your browser. Backend authentication is not
                yet connected.
              </p>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white cta-glow-red"
              >
                {mode === 'login' ? 'Sign In (Demo)' : 'Create Demo Account'}
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
      className="fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl bg-[var(--bg-secondary)]/95 border border-accent/60 text-[var(--text-main)] shadow-[0_12px_32px_rgba(var(--accent-rgb),0.25)] flex items-center gap-2.5 text-sm backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 className="w-4 h-4 text-accent-bright shrink-0" />
      <span>{toast.message}</span>
    </div>
  );
};
