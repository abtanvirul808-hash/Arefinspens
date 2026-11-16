import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { TrackedOrder } from '../types';

type DeliveryLocationOption = 'Al Amanah Academy' | 'Home Delivery';

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    clearCart,
    createOrder,
    nextOrderId,
    navigate,
    demoUser,
    showToast,
    products,
  } = useStore();

  const orderNumber = nextOrderId;
  const [copiedOrderNum, setCopiedOrderNum] = useState(false);

  const [fullName, setFullName] = useState(demoUser?.name || '');
  const [phone, setPhone] = useState(demoUser?.phone || '');
  const [email, setEmail] = useState(demoUser?.email || '');
  const [locationOption, setLocationOption] = useState<DeliveryLocationOption>('Al Amanah Academy');
  const [customLocation, setCustomLocation] = useState('');
  const [instructions, setInstructions] = useState('');

  // Direct/custom order fields when cart has no catalogue items
  const [customItemNote, setCustomItemNote] = useState('Custom Stationery Order');
  const [customAmountBdt, setCustomAmountBdt] = useState<number>(500);

  const [formError, setFormError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<TrackedOrder | null>(null);

  const validCartItems = cart.filter((item) =>
    products.some((p) => p.id === item.productId)
  );
  const isDirectOrder = validCartItems.length === 0;
  const effectiveSubtotal = isDirectOrder ? Math.max(0, customAmountBdt || 0) : cartSubtotal;

  const finalTotal = effectiveSubtotal;

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopiedOrderNum(true);
      window.setTimeout(() => setCopiedOrderNum(false), 1500);
      showToast('Order number copied to clipboard');
    } catch {
      showToast(orderNumber);
    }
  };

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('880') && digits.length === 13) {
      return `0${digits.slice(3)}`;
    }
    return raw.replace(/[\s-]/g, '').trim();
  };

  const failValidation = (msg: string) => {
    setFormError(msg);
    showToast(msg);
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (isDirectOrder && (effectiveSubtotal <= 0 || customItemNote.trim().length < 2)) {
      failValidation('Please enter a valid item description and order amount in BDT.');
      return;
    }
    if (fullName.trim().length < 2) {
      failValidation('Please enter your full name.');
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    const phoneDigits = normalizedPhone.replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      failValidation('Please enter a valid mobile number (e.g. 017XXXXXXXX).');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      failValidation('Please enter a valid email address or leave it blank.');
      return;
    }

    if (locationOption === 'Home Delivery' && customLocation.trim().length < 3) {
      failValidation('Please write your custom location for Home Delivery.');
      return;
    }

    setFormError('');

    const summaryParts = isDirectOrder
      ? [`${customItemNote.trim()} (৳${effectiveSubtotal.toLocaleString('en-US')})`]
      : validCartItems.map((item) => {
          const prod = products.find((p) => p.id === item.productId);
          return `${prod?.name || item.productId} (${item.colorName}) × ${item.quantity}`;
        });

    const fullAddress =
      locationOption === 'Al Amanah Academy'
        ? 'Al Amanah Academy'
        : `Home Delivery — ${customLocation.trim()}`;

    const newOrder: TrackedOrder = {
      orderId: orderNumber,
      phone: normalizedPhone,
      customerName: fullName.trim(),
      city: locationOption,
      address: fullAddress,
      paymentMethod: 'cod',
      totalBdt: finalTotal,
      itemsSummary: summaryParts.join(', '),
      placedAt: 'Just now (Demo Order)',
      currentStageIndex: 1,
      isDemoRecord: true,
    };

    createOrder(newOrder);
    if (!isDirectOrder) {
      clearCart();
    }
    setConfirmedOrder(newOrder);
    showToast(`Order ${newOrder.orderId} placed successfully`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (confirmedOrder) {
    return (
      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <div className="rounded-3xl border border-accent/50 bg-[var(--bg-card)] p-8 sm:p-10 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-bright">
              Demonstration Order Created
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
              Thank you, {confirmedOrder.customerName}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Your Cash on Delivery demonstration order has been saved locally. Connect a courier or
              order API to dispatch live shipments.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 text-left space-y-2.5 text-sm">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[var(--text-muted)]">Order Number</span>
              <span className="font-bold font-mono-num text-accent dark:text-accent-bright text-base">
                {confirmedOrder.orderId}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Phone</span>
              <span className="font-mono-num text-[var(--text-main)]">{confirmedOrder.phone}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Location</span>
              <span className="text-[var(--text-main)] font-medium text-right">
                {confirmedOrder.address}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[var(--text-muted)]">Payment Method</span>
              <span className="text-[var(--text-main)] font-medium">Cash on Delivery</span>
            </div>
            <div className="flex justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]/60">
              <span className="text-[var(--text-muted)]">Total Payable</span>
              <span className="font-bold font-mono-num text-[var(--text-main)]">
                ৳{confirmedOrder.totalBdt.toLocaleString('en-US')}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
            <button
              type="button"
              onClick={() => navigate('track-order')}
              className="px-6 py-3 rounded-xl text-sm font-semibold cta-glow-red"
            >
              Track Order ({confirmedOrder.orderId})
            </button>
            <button
              type="button"
              onClick={() => setConfirmedOrder(null)}
              className="px-6 py-3 rounded-xl border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-main)] hover:border-accent"
            >
              Create Another Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">Checkout</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Complete your delivery details for Bangladesh Cash on Delivery.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('cart')}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 text-sm font-semibold text-accent dark:text-accent-bright hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cart</span>
        </button>
      </div>

      {/* Serial Order ID Bar */}
      <div className="rounded-2xl border border-accent/45 bg-[var(--bg-card)] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs text-[var(--text-muted)]">Order ID</p>
          <p className="font-display text-lg font-bold font-mono-num text-[var(--text-main)]">
            {orderNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] hover:border-accent inline-flex items-center gap-1.5 transition-colors"
          >
            {copiedOrderNum ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Order #</span>
              </>
            )}
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmitOrder}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        noValidate
      >
        {/* Left: Shipping & Payment Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              Customer &amp; Delivery Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Arefin Rahman"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] font-mono-num focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label
                  htmlFor="checkout-location-option"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  Location *
                </label>
                <select
                  id="checkout-location-option"
                  value={locationOption}
                  onChange={(e) => {
                    const next = e.target.value as DeliveryLocationOption;
                    setLocationOption(next);
                    if (formError) setFormError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                >
                  <option value="Al Amanah Academy">Al Amanah Academy</option>
                  <option value="Home Delivery">Home Delivery</option>
                </select>
              </div>

              {locationOption === 'Home Delivery' && (
                <div className="sm:col-span-2">
                  <label
                    htmlFor="checkout-custom-location"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    Location *
                  </label>
                  <input
                    id="checkout-custom-location"
                    type="text"
                    required
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Write your custom location (House, Road, Area, City)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Additional Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Call before arrival, preferred delivery window..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Payment Method: Cash on Delivery */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              Payment Method
            </h2>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-accent bg-accent/10 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                checked
                readOnly
                className="mt-1 accent-accent"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-accent-bright" />
                  <span className="text-sm font-semibold text-[var(--text-main)]">
                    Cash on Delivery (COD)
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pay in Bangladeshi Taka (৳) directly when your parcel arrives at your address.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5 rounded-2xl border border-accent/45 bg-[var(--bg-card)] p-6 space-y-5 sticky top-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              Order Summary
            </h2>
            <span className="text-xs font-mono-num font-semibold text-accent-bright">
              {orderNumber}
            </span>
          </div>

          {isDirectOrder ? (
            <div className="space-y-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
              <p className="text-xs font-semibold text-[var(--text-main)]">
                Direct Order Details
              </p>
              <div>
                <label
                  htmlFor="direct-order-note"
                  className="block text-xs text-[var(--text-muted)] mb-1"
                >
                  Order Description
                </label>
                <input
                  id="direct-order-note"
                  type="text"
                  value={customItemNote}
                  onChange={(e) => setCustomItemNote(e.target.value)}
                  placeholder="e.g. Custom Gel Pen Bundle"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="direct-order-amount"
                  className="block text-xs text-[var(--text-muted)] mb-1"
                >
                  Order Amount (৳ BDT)
                </label>
                <input
                  id="direct-order-amount"
                  type="number"
                  min={50}
                  step={10}
                  value={customAmountBdt}
                  onChange={(e) => setCustomAmountBdt(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 divide-y divide-[var(--border-subtle)]/50">
              {validCartItems.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product) return null;
                return (
                  <div
                    key={item.key}
                    className="pt-3 first:pt-0 flex justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text-main)] line-clamp-1">
                        {product.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {item.colorName} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono-num font-semibold text-[var(--text-main)] shrink-0">
                      ৳{(product.priceBdt * item.quantity).toLocaleString('en-US')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2.5 pt-4 border-t border-[var(--border-subtle)] text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Subtotal</span>
              <span className="font-mono-num font-semibold text-[var(--text-main)]">
                ৳{effectiveSubtotal.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-[var(--border-subtle)]">
              <span className="font-semibold text-[var(--text-main)]">Final Total</span>
              <span className="text-2xl font-extrabold font-mono-num text-accent dark:text-accent-bright">
                ৳{finalTotal.toLocaleString('en-US')}
              </span>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/50 text-xs text-rose-500 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-5 rounded-xl text-sm font-semibold cta-glow-red"
          >
            Confirm Order ({orderNumber})
          </button>

          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-accent-bright shrink-0" />
            <span>Ready to connect to live courier &amp; order APIs without redesign.</span>
          </div>
        </div>
      </form>
    </div>
  );
};
