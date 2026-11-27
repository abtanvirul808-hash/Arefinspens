import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Droplets,
  ExternalLink,
  Lock,
  Maximize2,
  MessageCircle,
  Package,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { isOtherProduct } from '../data/products';
import { ImageLightboxModal, LightboxSlide } from '../components/ImageLightboxModal';
import { SafeImage } from '../components/SafeImage';
import { TrackedOrder } from '../types';
import { buildChannelChatUrl, buildWhatsAppChatUrl } from '../utils/chatWidget';
import { parseOrderSummaryItems } from '../utils/orderItems';

const STAGES = [
  { title: 'Order Placed', desc: 'Order details submitted.' },
  { title: 'Order Confirmed', desc: 'Verified by store desk.' },
  { title: 'Preparing Your Order', desc: 'Items inspected and securely packed.' },
  { title: 'Shipped', desc: 'Handed over to courier partner.' },
  { title: 'Delivered', desc: 'Delivered to customer address.' },
];

export const TrackOrderPage: React.FC = () => {
  const {
    orders,
    products,
    findOrder,
    demoUser,
    isCustomerSignedIn,
    authLoading,
    setIsAuthModalOpen,
    isAdmin,
    setIsAdminModalOpen,
    navigate,
    chatWidgetConfig,
  } = useStore();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [remoteResult, setRemoteResult] = useState<TrackedOrder | undefined>(undefined);
  const [lightboxState, setLightboxState] = useState<{
    title: string;
    slides: LightboxSlide[];
  } | null>(null);

  useEffect(() => {
    if (!isCustomerSignedIn) {
      setSelectedOrderId(null);
      setRemoteResult(undefined);
      setSearched(false);
      return;
    }
    if (!searched && orders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(orders[0].orderId);
      setOrderIdInput(orders[0].orderId);
      setPhoneInput(orders[0].phone);
    }
  }, [isCustomerSignedIn, orders, searched, selectedOrderId]);

  const localResult = selectedOrderId
    ? orders.find((o) => o.orderId === selectedOrderId)
    : undefined;
  const result: TrackedOrder | undefined = localResult || remoteResult;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCustomerSignedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    setSearched(true);
    setSearching(true);
    try {
      const found = await findOrder(orderIdInput, phoneInput);
      setSelectedOrderId(found ? found.orderId : null);
      setRemoteResult(found);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 space-y-8 sm:space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)]">
          Your <span className="text-accent">Order</span>
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          {isCustomerSignedIn && demoUser
            ? `Showing private orders for ${demoUser.email}. Enter your Order ID and Phone Number or pick from your saved orders below.`
            : 'Sign in with the Google account you used to place your order to view your private order history and live delivery updates.'}
        </p>
        {isAdmin && (
          <p className="text-xs text-[var(--text-muted)]">
            Store admin? Manage all customer orders exclusively in the{' '}
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(true)}
              className="text-accent dark:text-accent-bright font-semibold hover:underline"
            >
              Admin Panel
            </button>
            .
          </p>
        )}
      </div>

      {!authLoading && !isCustomerSignedIn ? (
        <div className="rounded-2xl border border-accent/40 bg-[var(--bg-card)] p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/45 mx-auto flex items-center justify-center text-accent-bright">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display text-xl font-bold text-[var(--text-main)]">
              Sign In to View Your Orders
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Orders are strictly private — only you and the store admin can access them. Sign in
              with Google to check your order status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="min-h-[44px] px-6 py-3 rounded-xl text-sm font-semibold text-[var(--accent-cta-text)] cta-glow-red"
          >
            Sign In with Google
          </button>
        </div>
      ) : (
        <>
          {/* Lookup / Filter Form across customer's own orders */}
          <form
            onSubmit={handleTrack}
            className="rounded-2xl border border-accent/40 bg-[var(--bg-card)] p-4 sm:p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="track-order-id"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  Your Order ID
                </label>
                <input
                  id="track-order-id"
                  type="text"
                  required
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  placeholder="e.g. #1"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="track-order-phone"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  Phone Number
                </label>
                <input
                  id="track-order-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 017XXXXXXXX"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>Your orders:</span>
                {orders.length === 0 ? (
                  <span>No orders placed with this account yet</span>
                ) : (
                  orders.map((ord) => (
                    <button
                      key={ord.orderId}
                      type="button"
                      onClick={() => {
                        setOrderIdInput(ord.orderId);
                        setPhoneInput(ord.phone);
                        setSelectedOrderId(ord.orderId);
                        setSearched(true);
                      }}
                      className={`min-h-[44px] sm:min-h-[34px] px-3.5 sm:px-3 py-1.5 rounded-lg border font-mono-num transition-colors ${
                        selectedOrderId === ord.orderId
                          ? 'border-accent bg-accent/15 text-accent-bright font-semibold'
                          : 'border-[var(--border-subtle)] hover:border-accent text-[var(--text-secondary)]'
                      }`}
                    >
                      {ord.orderId}
                    </button>
                  ))
                )}
              </div>

              <button
                type="submit"
                disabled={searching}
                className="min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-semibold cta-glow-red inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                <span>{searching ? 'Searching...' : 'View Your Order'}</span>
              </button>
            </div>
          </form>

          {/* Result Timeline, Empty Account Orders, or Order Not Found */}
          {result ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-8 space-y-6 sm:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-muted)]">
                    Order Record · Private Account ({result.userEmail || demoUser?.email || 'Verified'})
                  </p>
                  <h2 className="font-display text-xl font-bold text-[var(--text-main)] font-mono-num">
                    {result.orderId}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {result.customerName} · {result.address}
                  </p>
                </div>
                <div className="sm:text-right space-y-1">
                  <p className="text-lg font-bold font-mono-num text-accent dark:text-accent-bright">
                    ৳{result.totalBdt.toLocaleString('en-US')}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">Cash on Delivery</p>
                  <p className="text-xs text-[var(--text-muted)]">{result.placedAt}</p>
                </div>
              </div>

              {/* Order Disclaimer: Please Message Us */}
              {(() => {
                const orderMsg = `Assalamu Alaikum! Checking on my Order ${result.orderId} (Total: ৳${result.totalBdt.toLocaleString('en-US')}) on Arefin Mart.`;
                const whatsappHref = buildWhatsAppChatUrl({
                  ...chatWidgetConfig,
                  prefillMessage: orderMsg,
                });
                const fallbackChannelHref = (chatWidgetConfig.channels || [])
                  .filter((ch) => ch.enabled)
                  .map((ch) => buildChannelChatUrl({ ...ch, prefillMessage: orderMsg }, orderMsg))
                  .find(Boolean);
                const messageHref = whatsappHref || fallbackChannelHref || '';

                return (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.08] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <MessageCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--text-main)] leading-relaxed">
                        <span className="font-bold">Disclaimer:</span> After ordering, please message us with your Order ID ({result.orderId}) for quick confirmation.
                      </p>
                    </div>
                    {messageHref && (
                      <a
                        href={messageHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-accent text-[var(--accent-cta-text)] text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 hover:opacity-90 transition-opacity"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Message Us</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })()}

              {/* Visual Ordered Pens: Pen Image, Name, Body Colour & Ink Colour */}
              {(() => {
                const parsedItems = parseOrderSummaryItems(result.itemsSummary, products);
                if (parsedItems.length === 0) {
                  return (
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-main)]">Items: </span>
                      {result.itemsSummary}
                    </p>
                  );
                }

                return (
                  <div className="space-y-3 rounded-2xl border border-accent/35 bg-accent/[0.04] p-3.5 sm:p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent dark:text-accent-bright">
                      Ordered Items ({parsedItems.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {parsedItems.map((item) => {
                        const matchedProd = item.productId
                          ? products.find((p) => p.id === item.productId)
                          : undefined;
                        const otherItem = isOtherProduct(matchedProd);
                        return (
                        <div
                          key={item.key}
                          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 flex items-center gap-3.5 shadow-sm"
                        >
                          {item.image ? (
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxState({
                                  title: item.name,
                                  slides: [
                                    {
                                      src: item.image!,
                                      label: item.bodyColorName
                                        ? `${item.bodyColorName}${
                                            !otherItem && item.inkColorName
                                              ? ` · ${item.inkColorName} Ink`
                                              : ''
                                          }`
                                        : !otherItem && item.inkColorName
                                        ? `${item.inkColorName} Ink`
                                        : undefined,
                                      colorHex: item.bodyColorHex,
                                    },
                                  ],
                                })
                              }
                              title="View full-screen product photo"
                              aria-label={`View ${item.name} full screen`}
                              className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-accent/45 hover:border-accent bg-[#080506] shrink-0 flex items-center justify-center transition-colors"
                            >
                              <SafeImage
                                src={item.image}
                                alt={`${item.name}${item.bodyColorName ? ` — ${item.bodyColorName}` : ''}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute bottom-1 right-1 w-4 h-4 rounded bg-black/75 text-white flex items-center justify-center">
                                <Maximize2 className="w-2.5 h-2.5" />
                              </span>
                            </button>
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-accent/45 bg-[#080506] shrink-0 flex items-center justify-center">
                              <Package className="w-6 h-6 text-accent-bright" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-display text-sm sm:text-base font-bold text-[var(--text-main)] leading-snug break-words">
                                {item.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded-md bg-accent text-[var(--accent-cta-text)] text-xs font-bold font-mono-num shrink-0">
                                × {item.quantity}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.bodyColorName && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-500/45 bg-sky-500/12 text-sky-900 dark:text-sky-200 text-xs font-semibold">
                                  <span
                                    className="w-3 h-3 rounded-full border border-white/80 dark:border-white/35 shrink-0"
                                    style={{ backgroundColor: item.bodyColorHex || '#64748B' }}
                                  />
                                  <span>
                                    {otherItem ? 'Colour' : 'Body'}: {item.bodyColorName}
                                  </span>
                                </span>
                              )}

                              {!otherItem && item.inkColorName && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-violet-500/45 bg-violet-500/12 text-violet-900 dark:text-violet-200 text-xs font-semibold">
                                  <Droplets className="w-3 h-3 shrink-0" />
                                  <span
                                    className="w-3 h-3 rounded-full border border-white/80 dark:border-white/35 shrink-0"
                                    style={{ backgroundColor: item.inkColorHex || '#111827' }}
                                  />
                                  <span>Ink: {item.inkColorName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 5-Stage Order Timeline */}
              <div className="space-y-4">
                {STAGES.map((stage, idx) => {
                  const completed = idx < result.currentStageIndex;
                  const current = idx === result.currentStageIndex;
                  const pending = idx > result.currentStageIndex;

                  return (
                    <div key={stage.title} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 ${
                            completed
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                              : current
                              ? 'bg-accent border-accent-bright text-[var(--accent-cta-text)] shadow-[0_0_16px_rgba(var(--accent-rgb),0.65)]'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                          }`}
                        >
                          {completed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : current ? (
                            idx === 3 ? (
                              <Truck className="w-4 h-4" />
                            ) : (
                              <Package className="w-4 h-4" />
                            )
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        {idx < STAGES.length - 1 && (
                          <div
                            className={`w-0.5 h-8 mt-1 ${
                              completed ? 'bg-emerald-500/60' : 'bg-[var(--border-subtle)]'
                            }`}
                          />
                        )}
                      </div>

                      <div className="pt-1 space-y-0.5">
                        <div className="flex items-center gap-2.5">
                          <h3
                            className={`text-sm font-semibold ${
                              pending ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'
                            }`}
                          >
                            {stage.title}
                          </h3>
                          {current && (
                            <span className="text-[11px] font-semibold text-accent-bright">
                              Current Stage
                            </span>
                          )}
                          {completed && (
                            <span className="text-[11px] font-medium text-emerald-500">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">{stage.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : searched && !searching ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center space-y-3">
              <XCircle className="w-10 h-10 text-accent-bright mx-auto" />
              <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
                Order Not Found
              </h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                No order matched that Order ID and phone number. Please double-check your Order # and
                mobile number.
              </p>
            </div>
          ) : (
            orders.length === 0 && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center space-y-3">
                <Package className="w-10 h-10 text-accent-bright mx-auto" />
                <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
                  No Orders Placed Yet
                </h2>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  When you place an order with your signed-in account, it will appear here
                  automatically with live delivery updates.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'all-pens' })}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--accent-cta-text)] cta-glow-red"
                >
                  Browse Products
                </button>
              </div>
            )
          )}
        </>
      )}

      {lightboxState && (
        <ImageLightboxModal
          isOpen
          title={lightboxState.title}
          slides={lightboxState.slides}
          initialIndex={0}
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
};
