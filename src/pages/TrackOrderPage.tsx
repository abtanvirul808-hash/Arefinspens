import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Lock,
  Package,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { TrackedOrder } from '../types';

const STAGES = [
  { title: 'Order Placed', desc: 'Order details submitted.' },
  { title: 'Order Confirmed', desc: 'Verified by store desk.' },
  { title: 'Preparing Your Order', desc: 'Pens inspected and securely packed.' },
  { title: 'Shipped', desc: 'Handed over to courier partner.' },
  { title: 'Delivered', desc: 'Delivered to customer address.' },
];

export const TrackOrderPage: React.FC = () => {
  const {
    orders,
    findOrder,
    demoUser,
    isCustomerSignedIn,
    isAdmin,
    authLoading,
    setIsAuthModalOpen,
    setIsAdminModalOpen,
    navigate,
  } = useStore();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [remoteResult, setRemoteResult] = useState<TrackedOrder | undefined>(undefined);

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
    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)]">
          Track Your <span className="text-accent">Order</span>
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          {isCustomerSignedIn && demoUser?.email
            ? `Showing private orders placed with ${demoUser.email}. Other customers' orders cannot be viewed here.`
            : 'Only the account and email that placed an order can view its details and live progress.'}
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
        <div className="rounded-2xl border border-accent/45 bg-[var(--bg-card)] p-8 sm:p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/40 mx-auto flex items-center justify-center text-accent-bright">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display text-xl font-bold text-[var(--text-main)]">
              Sign In to View Your Orders
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Please sign in or create your account first. Orders are private to your account so no
              one else can view your order.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-[var(--accent-cta-text)] cta-glow-red"
          >
            Sign In / Create Account
          </button>
        </div>
      ) : (
        <>
          {/* Lookup / Filter Form across user's own orders */}
          <form
            onSubmit={handleTrack}
            className="rounded-2xl border border-accent/40 bg-[var(--bg-card)] p-6 space-y-4"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
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
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
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
                      className={`px-2.5 py-1 rounded-lg border font-mono-num transition-colors ${
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
                className="px-6 py-2.5 rounded-xl text-sm font-semibold cta-glow-red inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                <span>{searching ? 'Searching...' : 'Track Order'}</span>
              </button>
            </div>
          </form>

          {/* Result Timeline, Empty Account Orders, or Order Not Found */}
          {result ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-muted)]">
                    Private Order Record · Visible only to your account
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

              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-main)]">Items: </span>
                {result.itemsSummary}
              </p>

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
                Order Not Found in Your Account
              </h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                No order in your signed-in account matched that Order ID and phone number. For
                privacy, orders placed by other customers cannot be viewed here.
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
                  When you place an order with your account, it will appear here automatically with
                  its live delivery status.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'all' })}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--accent-cta-text)] cta-glow-red"
                >
                  Browse Pens
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};
