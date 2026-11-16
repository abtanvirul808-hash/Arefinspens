import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderPlus,
  ImagePlus,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATALOGUE_CATEGORIES } from '../data/products';
import { CategoryId, Product } from '../types';
import { SafeImage } from './SafeImage';

const ADMIN_STAGE_OPTIONS = [
  { index: 1, label: 'Confirmed', fullTitle: 'Order Confirmed' },
  { index: 2, label: 'Preparing Order', fullTitle: 'Preparing Your Order' },
  { index: 3, label: 'Shipped', fullTitle: 'Shipped' },
  { index: 4, label: 'Delivered', fullTitle: 'Delivered' },
];

const PEN_CATEGORIES = CATALOGUE_CATEGORIES.filter(
  (c): c is { id: Exclude<CategoryId, 'all'>; label: string } => c.id !== 'all'
);

interface ColorDraft {
  id: string;
  colorId?: string;
  name: string;
  hex: string;
  image: string;
}

function getStageLabel(stageIndex: number): string {
  if (stageIndex === 0) return 'Order Placed';
  return ADMIN_STAGE_OPTIONS.find((s) => s.index === stageIndex)?.label || 'Order Confirmed';
}

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => resolve(rawUrl);
      img.onload = () => {
        const maxDim = 700;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const AdminModal: React.FC = () => {
  const {
    isAdmin,
    isFirebaseAdmin,
    adminEmail,
    isAdminModalOpen,
    setIsAdminModalOpen,
    loginAdmin,
    loginAdminWithGoogle,
    logoutAdmin,
    orders,
    updateOrderStage,
    deleteOrder,
    products,
    isCloudSynced,
    hasUnpublishedProductChanges,
    exportLiveProductsJson,
    syncWithLiveCatalog,
    addAdminProduct,
    updateAdminProduct,
    toggleProductOutOfStock,
    deleteAdminProduct,
    showToast,
  } = useStore();

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Admin modal tabs
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');

  // Order management state
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<number | 'all'>('all');
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);

  // Set Category + Manage/Add/Edit Product form state
  const productsTabScrollRef = useRef<HTMLDivElement | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodCategory, setProdCategory] = useState<Exclude<CategoryId, 'all'>>('gel-pens');
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState("Arefin's Pen");
  const [prodPrice, setProdPrice] = useState<string>('50');
  const [prodOriginalPrice, setProdOriginalPrice] = useState<string>('');
  const [prodStock, setProdStock] = useState<string>('100');
  const [prodTipSize, setProdTipSize] = useState('0.5 mm Needle Tip');
  const [prodInkType, setProdInkType] = useState('Smooth Gel Ink');
  const [prodShortDesc, setProdShortDesc] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodOutOfStock, setProdOutOfStock] = useState(false);
  const [colorDrafts, setColorDrafts] = useState<ColorDraft[]>([
    { id: 'c-1', name: 'Black', hex: '#1E293B', image: '' },
  ]);
  const [prodFormError, setProdFormError] = useState('');
  const [catalogListFilter, setCatalogListFilter] = useState<CategoryId>('all');
  const [prodSearchTerm, setProdSearchTerm] = useState('');
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [copiedCatalogJson, setCopiedCatalogJson] = useState(false);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((ord) => {
      if (stageFilter !== 'all' && ord.currentStageIndex !== stageFilter) return false;
      if (!q) return true;
      const hay = `${ord.orderId} ${ord.customerName} ${ord.phone} ${ord.address} ${ord.city} ${ord.itemsSummary}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orders, searchTerm, stageFilter]);

  const counts = useMemo(() => {
    return {
      total: orders.length,
      preparing: orders.filter((o) => o.currentStageIndex === 2).length,
      shipped: orders.filter((o) => o.currentStageIndex === 3).length,
      delivered: orders.filter((o) => o.currentStageIndex === 4).length,
    };
  }, [orders]);

  const filteredProducts = useMemo(() => {
    const q = prodSearchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (catalogListFilter !== 'all' && p.category !== catalogListFilter) return false;
      if (!q) return true;
      const hay = `${p.name} ${p.brand} ${p.categoryLabel} ${p.colors.map((c) => c.name).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, catalogListFilter, prodSearchTerm]);

  if (!isAdminModalOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginAdmin(email, password);
    if (!res.ok) {
      setError(res.error || 'Invalid admin Gmail or password.');
      return;
    }
    setError('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const handleGoogleAdminLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const res = await loginAdminWithGoogle();
      if (!res.ok) {
        setError(res.error || 'Google Admin sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAddColorDraft = () => {
    setColorDrafts((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${prev.length}`,
        name: '',
        hex: '#FF1428',
        image: '',
      },
    ]);
  };

  const handleUpdateColorDraft = (id: string, patch: Partial<ColorDraft>) => {
    setColorDrafts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleRemoveColorDraft = (id: string) => {
    setColorDrafts((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  const handleColorImageUpload = async (id: string, file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      handleUpdateColorDraft(id, { image: dataUrl });
      showToast('Product photo attached');
    } catch {
      setProdFormError('Could not read selected image file.');
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdFormError('');
    setProdName('');
    setProdBrand("Arefin's Pen");
    setProdPrice('50');
    setProdOriginalPrice('');
    setProdStock('100');
    setProdTipSize('0.5 mm Needle Tip');
    setProdInkType('Smooth Gel Ink');
    setProdShortDesc('');
    setProdFeatured(false);
    setProdOutOfStock(false);
    setColorDrafts([{ id: `c-${Date.now()}`, name: 'Black', hex: '#1E293B', image: '' }]);
  };

  const handleStartEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProdFormError('');
    setProdCategory(prod.category);
    setProdName(prod.name);
    setProdBrand(prod.brand);
    setProdPrice(String(prod.priceBdt));
    setProdOriginalPrice(prod.originalPriceBdt ? String(prod.originalPriceBdt) : '');
    setProdStock(String(prod.stockCount));
    setProdTipSize(prod.specs.tipSize);
    setProdInkType(prod.specs.inkType);
    setProdShortDesc(prod.shortDescription);
    setProdFeatured(Boolean(prod.featured));
    setProdOutOfStock(!prod.inStock);
    setColorDrafts(
      prod.colors.length > 0
        ? prod.colors.map((c, idx) => ({
            id: `${prod.id}-${c.id}-${idx}`,
            colorId: c.id,
            name: c.name,
            hex: c.hex,
            image: c.image || '',
          }))
        : [{ id: `c-${Date.now()}`, name: 'Black', hex: '#1E293B', image: '' }]
    );
    productsTabScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadCatalogJson = () => {
    const jsonText = exportLiveProductsJson();
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded products.json — replace public/data/products.json in GitHub');
  };

  const handleCopyCatalogJson = async () => {
    const jsonText = exportLiveProductsJson();
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopiedCatalogJson(true);
      window.setTimeout(() => setCopiedCatalogJson(false), 1800);
      showToast('Copied products.json to clipboard');
    } catch {
      showToast('Use Download products.json to save the updated catalog');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = Number(prodPrice);
    const parsedOriginal = prodOriginalPrice.trim() ? Number(prodOriginalPrice) : undefined;
    const parsedStock = Number(prodStock || '100');

    const payload = {
      name: prodName,
      brand: prodBrand,
      category: prodCategory,
      priceBdt: parsedPrice,
      originalPriceBdt: parsedOriginal,
      stockCount: parsedStock,
      outOfStock: prodOutOfStock,
      shortDescription: prodShortDesc,
      tipSize: prodTipSize,
      inkType: prodInkType,
      featured: prodFeatured,
      images: colorDrafts.map((c) => c.image).filter(Boolean),
      colors: colorDrafts.map((c) => ({
        id: c.colorId,
        name: c.name,
        hex: c.hex,
        image: c.image || undefined,
      })),
    };

    setSavingProduct(true);
    try {
      const result = editingProductId
        ? await updateAdminProduct(editingProductId, payload)
        : await addAdminProduct(payload);

      if (!result.ok) {
        setProdFormError(result.error || 'Please fill in all required product fields.');
        return;
      }

      const savedCategory = prodCategory;
      resetProductForm();
      setCatalogListFilter(savedCategory);
    } catch (err) {
      setProdFormError(
        err instanceof Error
          ? err.message
          : 'Could not save product to live cloud database. Please try again.'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Admin Control Panel"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => setIsAdminModalOpen(false)}
      />

      <div
        className={`relative z-10 w-full ${
          isAdmin ? 'max-w-4xl' : 'max-w-md'
        } rounded-2xl border border-accent/50 bg-white dark:bg-[var(--bg-input)] p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/45 flex items-center justify-center text-accent-bright shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-[var(--text-main)] truncate">
                {isAdmin ? 'Admin Control Panel' : 'Admin Portal'}
              </h2>
              {isAdmin && adminEmail && (
                <p className="text-xs text-[var(--text-muted)] truncate">{adminEmail}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => void logoutAdmin()}
                className="px-3 py-1.5 rounded-xl bg-accent/15 border border-accent/40 text-xs font-semibold text-accent-bright hover:bg-accent/25 inline-flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="w-8 h-8 rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent inline-flex items-center justify-center"
              aria-label="Close admin panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isAdmin ? (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Sign in with your authorized Google account for real-time cloud sync across all
              devices, or unlock with your admin Gmail and password.
            </p>

            <button
              type="button"
              onClick={() => void handleGoogleAdminLogin()}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold cta-glow-red inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Cloud className="w-4 h-4" />
              <span>
                {googleLoading
                  ? 'Connecting Google Admin...'
                  : 'Sign in with Google (Live Sync)'}
              </span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border-subtle)]" />
              <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                or
              </span>
              <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5" noValidate>
              <div>
                <label
                  htmlFor="admin-login-email"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  Admin Gmail
                </label>
                <input
                  id="admin-login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter admin Gmail"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-login-password"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter admin password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs font-medium text-rose-500 bg-rose-500/10 border border-rose-500/35 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-accent transition-colors"
              >
                Sign In with Gmail &amp; Password
              </button>
            </form>
          </div>
        ) : (
          <>
            {!isFirebaseAdmin && (
              <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs">
                    <p className="font-semibold text-amber-700 dark:text-amber-300">
                      Connect your Google Account to save live changes across all devices
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Firebase requires verified Google Admin authentication before writing new
                      products, stock toggles, or order updates to the cloud database.
                    </p>
                    {error && <p className="text-[11px] font-medium text-rose-500">{error}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGoogleAdminLogin()}
                  disabled={googleLoading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold cta-glow-red inline-flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{googleLoading ? 'Connecting...' : 'Connect Google Account'}</span>
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-accent text-[var(--accent-cta-text)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>Order Management ({orders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'products'
                    ? 'bg-accent text-[var(--accent-cta-text)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <FolderPlus className="w-4 h-4 shrink-0" />
                <span>Set Category &amp; Product ({products.length})</span>
              </button>
            </div>

            {activeTab === 'orders' ? (
              <>
                {/* Quick Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2.5">
                    <p className="text-[11px] text-[var(--text-muted)]">Total Orders</p>
                    <p className="font-display text-lg font-bold font-mono-num text-[var(--text-main)]">
                      {counts.total}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2.5">
                    <p className="text-[11px] text-[var(--text-muted)]">Preparing Order</p>
                    <p className="font-display text-lg font-bold font-mono-num text-amber-500">
                      {counts.preparing}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2.5">
                    <p className="text-[11px] text-[var(--text-muted)]">Shipped</p>
                    <p className="font-display text-lg font-bold font-mono-num text-accent-bright">
                      {counts.shipped}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2.5">
                    <p className="text-[11px] text-[var(--text-muted)]">Delivered</p>
                    <p className="font-display text-lg font-bold font-mono-num text-emerald-500">
                      {counts.delivered}
                    </p>
                  </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search order #1, customer name, phone, or location..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStageFilter('all')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        stageFilter === 'all'
                          ? 'border-accent bg-accent/15 text-accent-bright'
                          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      All
                    </button>
                    {ADMIN_STAGE_OPTIONS.map((st) => (
                      <button
                        key={st.index}
                        type="button"
                        onClick={() => setStageFilter(st.index)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          stageFilter === st.index
                            ? 'border-accent bg-accent/15 text-accent-bright'
                            : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {filteredOrders.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">
                      No matching orders found.
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const stageLabel = getStageLabel(order.currentStageIndex);
                      const isDelivered = order.currentStageIndex === 4;
                      const confirmingDelete = confirmDeleteOrderId === order.orderId;

                      return (
                        <div
                          key={order.orderId}
                          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-display text-base font-bold font-mono-num text-[var(--text-main)]">
                                  {order.orderId}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                    isDelivered
                                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                                      : 'bg-accent/15 border-accent/40 text-accent-bright'
                                  }`}
                                >
                                  {stageLabel}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">
                                  {order.placedAt}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-[var(--text-main)]">
                                {order.customerName}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="text-sm sm:text-base font-bold font-mono-num text-accent dark:text-accent-bright">
                                  ৳{order.totalBdt.toLocaleString('en-US')}
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)]">COD</p>
                              </div>

                              {confirmingDelete ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void deleteOrder(order.orderId);
                                      setConfirmDeleteOrderId(null);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors"
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteOrderId(null)}
                                    className="px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteOrderId(order.orderId)}
                                  className="px-2.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                  aria-label={`Delete order ${order.orderId}`}
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Bold & Highlighted Phone Number and Location */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-400">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold font-mono-num tracking-wide">
                                {order.phone}
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/55 bg-amber-500/15 text-amber-800 dark:text-amber-300 max-w-full">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold break-words">
                                {order.address}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border-subtle)]/50">
                            <span className="font-semibold text-[var(--text-main)]">Items: </span>
                            {order.itemsSummary}
                          </p>

                          {/* Stage Update Buttons */}
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                              Update Order Status:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {ADMIN_STAGE_OPTIONS.map((stage) => {
                                const active = order.currentStageIndex === stage.index;
                                return (
                                  <button
                                    key={stage.index}
                                    type="button"
                                    onClick={() => void updateOrderStage(order.orderId, stage.index)}
                                    aria-pressed={active}
                                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border inline-flex items-center justify-center gap-1.5 transition-all ${
                                      active
                                        ? stage.index === 4
                                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                                          : 'bg-accent border-accent-bright text-[var(--accent-cta-text)] shadow-[0_0_14px_rgba(var(--accent-rgb),0.45)]'
                                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-accent hover:text-[var(--text-main)]'
                                    }`}
                                  >
                                    {stage.index === 2 && (
                                      <Package className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                    {stage.index === 3 && (
                                      <Truck className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                    {stage.index === 4 && (
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                    <span className="truncate">{stage.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              /* Set Category & Manage Products Tab */
              <div
                ref={productsTabScrollRef}
                className="flex-1 overflow-y-auto space-y-5 pr-1"
              >
                {/* Live Cloud Sync & Catalog Backup Bar */}
                <div className="rounded-xl border border-accent/45 bg-[var(--bg-card)] p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-xs sm:text-sm font-bold text-[var(--text-main)]">
                          Real-Time Cloud Database Sync
                        </h3>
                        {isFirebaseAdmin || isCloudSynced ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/45 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                            <Cloud className="w-3 h-3" />
                            <span>Live Cloud Sync Active</span>
                          </span>
                        ) : hasUnpublishedProductChanges ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/50 text-amber-600 dark:text-amber-400">
                            Connect Google for Live Sync
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] sm:text-xs text-[var(--text-secondary)]">
                        {isFirebaseAdmin
                          ? 'Every product add, edit, delete, or Out of Stock toggle syncs instantly across all phones, browsers, and your Netlify site.'
                          : 'Sign in with Google Admin above to sync products, stock switches, and orders live across all devices.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadCatalogJson}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-main)] hover:border-accent inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export products.json</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyCatalogJson}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-main)] hover:border-accent inline-flex items-center gap-1.5 transition-colors"
                    >
                      {copiedCatalogJson ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied JSON</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void syncWithLiveCatalog()}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent inline-flex items-center gap-1.5 transition-colors"
                      title="Refresh live product catalog from cloud database"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Live Catalog</span>
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleSaveProduct}
                  className="rounded-xl border border-accent/40 bg-[var(--bg-card)] p-4 sm:p-5 space-y-4"
                  noValidate
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                        {editingProductId
                          ? `Edit Product: ${prodName || 'Pen'}`
                          : 'Add Product to Pen Category'}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {editingProductId
                          ? 'Update category, price, colours, photos, or out-of-stock status below.'
                          : 'Products added here immediately appear in the selected category and in All Pens.'}
                      </p>
                    </div>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={resetProductForm}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-main)] hover:border-accent"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  {/* Category Selector across ALL pen categories */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                      Select Pen Category *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PEN_CATEGORIES.map((cat) => {
                        const selected = prodCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setProdCategory(cat.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                              selected
                                ? 'border-accent bg-accent/15 text-accent dark:text-accent-bright shadow-[0_0_12px_rgba(var(--accent-rgb),0.25)]'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-accent/60 hover:text-[var(--text-main)]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        placeholder="e.g. Matador Hi-School / Neucose B"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={prodBrand}
                        onChange={(e) => setProdBrand(e.target.value)}
                        placeholder="e.g. Arefin's Pen"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Price (৳ BDT) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Original Price (Optional ৳)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={prodOriginalPrice}
                        onChange={(e) => setProdOriginalPrice(e.target.value)}
                        placeholder="Leave blank if no discount"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Tip / Nib Size
                      </label>
                      <input
                        type="text"
                        value={prodTipSize}
                        onChange={(e) => setProdTipSize(e.target.value)}
                        placeholder="e.g. 0.5 mm Needle Tip"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Ink / Lead Type
                      </label>
                      <input
                        type="text"
                        value={prodInkType}
                        onChange={(e) => setProdInkType(e.target.value)}
                        placeholder="e.g. Quick-Dry Black Gel Ink"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
                      <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--text-main)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prodFeatured}
                          onChange={(e) => setProdFeatured(e.target.checked)}
                          className="w-4 h-4 accent-accent rounded"
                        />
                        <span>Feature on Homepage</span>
                      </label>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={prodOutOfStock}
                        onClick={() => setProdOutOfStock((prev) => !prev)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                          prodOutOfStock
                            ? 'border-rose-500/60 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            prodOutOfStock ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span>Out of Stock: {prodOutOfStock ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Short Description
                      </label>
                      <textarea
                        rows={2}
                        value={prodShortDesc}
                        onChange={(e) => setProdShortDesc(e.target.value)}
                        placeholder="Describe grip, ink flow, tip precision..."
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* Colour Options + Per-Colour Product Photo */}
                  <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        Colour Choices &amp; Photos *
                      </span>
                      <button
                        type="button"
                        onClick={handleAddColorDraft}
                        className="px-2.5 py-1 rounded-lg border border-accent/50 text-xs font-semibold text-accent dark:text-accent-bright hover:bg-accent/10 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Colour</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {colorDrafts.map((col, idx) => (
                        <div
                          key={col.id}
                          className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-wrap sm:flex-nowrap items-center gap-2"
                        >
                          <input
                            type="color"
                            value={col.hex}
                            onChange={(e) =>
                              handleUpdateColorDraft(col.id, { hex: e.target.value })
                            }
                            aria-label={`Colour picker ${idx + 1}`}
                            className="w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-transparent cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) =>
                              handleUpdateColorDraft(col.id, { name: e.target.value })
                            }
                            placeholder="Colour name (e.g. Pink)"
                            className="w-28 sm:w-32 px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
                          />
                          <input
                            type="text"
                            value={col.image}
                            onChange={(e) =>
                              handleUpdateColorDraft(col.id, { image: e.target.value })
                            }
                            placeholder="Photo URL or upload ->"
                            className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
                          />
                          <label className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-main)] hover:border-accent cursor-pointer inline-flex items-center gap-1 shrink-0">
                            <ImagePlus className="w-3.5 h-3.5 text-accent-bright" />
                            <span>Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleColorImageUpload(col.id, e.target.files?.[0])
                              }
                            />
                          </label>
                          {colorDrafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveColorDraft(col.id)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-rose-500"
                              aria-label="Remove colour option"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {prodFormError && (
                    <p className="text-xs font-medium text-rose-500 bg-rose-500/10 border border-rose-500/35 rounded-xl px-3 py-2">
                      {prodFormError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold cta-glow-red inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {savingProduct ? (
                      <span>Saving Live Changes...</span>
                    ) : editingProductId ? (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Product Changes</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>
                          Add Product to{' '}
                          {PEN_CATEGORIES.find((c) => c.id === prodCategory)?.label || 'Category'}
                        </span>
                      </>
                    )}
                  </button>
                </form>

                {/* Manage Existing Catalogue Products */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                      Manage Products ({filteredProducts.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {CATALOGUE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCatalogListFilter(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                            catalogListFilter === cat.id
                              ? 'border-accent bg-accent/15 text-accent-bright'
                              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={prodSearchTerm}
                      onChange={(e) => setProdSearchTerm(e.target.value)}
                      placeholder="Search products by name, category, or colour..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                    />
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-center text-xs text-[var(--text-secondary)]">
                      No matching products in this category. Use the form above to add one.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.map((prod) => {
                        const confirmingProdDelete = confirmDeleteProductId === prod.id;
                        const isOutOfStock = !prod.inStock;
                        const isEditingThis = editingProductId === prod.id;
                        return (
                          <div
                            key={prod.id}
                            className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              isEditingThis
                                ? 'border-accent bg-accent/5'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-14 h-11 rounded-lg overflow-hidden bg-[#080506] shrink-0 relative">
                                <SafeImage
                                  src={prod.colors[0]?.image || prod.images[0]}
                                  alt={prod.name}
                                  className={`w-full h-full object-cover ${
                                    isOutOfStock ? 'opacity-50' : ''
                                  }`}
                                />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="text-sm font-bold text-[var(--text-main)] truncate">
                                    {prod.name}
                                  </p>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-accent/10 border border-accent/30 text-accent-bright">
                                    {prod.categoryLabel}
                                  </span>
                                  {isOutOfStock && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 border border-rose-500/45 text-rose-500">
                                      Out of Stock
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                                  <span className="font-mono-num font-semibold text-[var(--text-main)]">
                                    ৳{prod.priceBdt.toLocaleString('en-US')}
                                  </span>
                                  <span>·</span>
                                  <span className="truncate">
                                    {prod.colors.map((c) => c.name).join(', ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isOutOfStock}
                                onClick={() => {
                                  void toggleProductOutOfStock(prod.id);
                                  if (isEditingThis && isFirebaseAdmin) {
                                    setProdOutOfStock(!isOutOfStock);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                                  isOutOfStock
                                    ? 'border-rose-500/60 bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                                    : 'border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                                title="Toggle Out of Stock ON/OFF"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isOutOfStock ? 'bg-rose-500' : 'bg-emerald-500'
                                  }`}
                                />
                                <span>Out of Stock: {isOutOfStock ? 'ON' : 'OFF'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  isEditingThis ? resetProductForm() : handleStartEditProduct(prod)
                                }
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                                  isEditingThis
                                    ? 'border-accent bg-accent text-[var(--accent-cta-text)]'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-main)] hover:border-accent'
                                }`}
                                aria-label={`Edit ${prod.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>{isEditingThis ? 'Editing' : 'Edit'}</span>
                              </button>

                              {confirmingProdDelete ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void deleteAdminProduct(prod.id);
                                      if (isEditingThis) resetProductForm();
                                      setConfirmDeleteProductId(null);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteProductId(null)}
                                    className="px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteProductId(prod.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                  aria-label={`Delete ${prod.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
