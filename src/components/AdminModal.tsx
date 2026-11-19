import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FolderPlus,
  Image as ImageIcon,
  ImagePlus,
  LogOut,
  MapPin,
  Maximize2,
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
import {
  CATALOGUE_CATEGORIES,
  getColorAvailableCount,
  getProductInkColors,
  getProductTotalAvailableCount,
  getVariantInkColors,
} from '../data/products';
import { formatLiveSyncError } from '../firebase';
import { CategoryId, InkColorOption, Product } from '../types';
import { parseOrderSummaryItems } from '../utils/orderItems';
import { ImageLightboxModal, LightboxSlide } from './ImageLightboxModal';
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

const INK_COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#111827' },
  { name: 'Blue', hex: '#1D4ED8' },
  { name: 'Sky Blue', hex: '#0EA5E9' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Green', hex: '#059669' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Multi-Color', hex: '#F59E0B' },
];

interface ColorDraft {
  id: string;
  colorId?: string;
  name: string;
  hex: string;
  inStock: boolean;
  stockCount: string;
  prevStockCount?: string;
  image: string;
  inkColors: InkColorOption[];
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
    isAdminModalOpen,
    setIsAdminModalOpen,
    loginAdmin,
    loginAdminWithGoogle,
    logoutAdmin,
    adminOrders,
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
    toggleProductColorStock,
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
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Set Category + Manage/Add/Edit Product form state
  const productsTabScrollRef = useRef<HTMLDivElement | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodCategory, setProdCategory] = useState<Exclude<CategoryId, 'all'>>('gel-pens');
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState<string>('50');
  const [prodOriginalPrice, setProdOriginalPrice] = useState<string>('');
  const [prodTipSize, setProdTipSize] = useState('0.5 mm Needle Tip');
  const [prodInkType, setProdInkType] = useState('Smooth Gel Ink');
  const [prodInkColors, setProdInkColors] = useState<InkColorOption[]>([
    { id: 'black', name: 'Black', hex: '#111827' },
  ]);
  const [customInkName, setCustomInkName] = useState('');
  const [customInkHex, setCustomInkHex] = useState('#1D4ED8');
  const [prodShortDesc, setProdShortDesc] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodOutOfStock, setProdOutOfStock] = useState(false);
  const [colorDrafts, setColorDrafts] = useState<ColorDraft[]>([
    {
      id: 'c-1',
      name: 'Black',
      hex: '#1E293B',
      inStock: true,
      stockCount: '40',
      prevStockCount: '40',
      image: '',
      inkColors: [{ id: 'black', name: 'Black', hex: '#111827' }],
    },
  ]);
  const [comboCustomInkByDraft, setComboCustomInkByDraft] = useState<
    Record<string, { name: string; hex: string }>
  >({});
  const [prodFormError, setProdFormError] = useState('');
  const [catalogListFilter, setCatalogListFilter] = useState<CategoryId>('all');
  const [prodSearchTerm, setProdSearchTerm] = useState('');
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [copiedCatalogJson, setCopiedCatalogJson] = useState(false);
  const [lightboxState, setLightboxState] = useState<{
    title: string;
    slides: LightboxSlide[];
    initialIndex: number;
  } | null>(null);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return adminOrders.filter((ord) => {
      if (stageFilter !== 'all' && ord.currentStageIndex !== stageFilter) return false;
      if (!q) return true;
      const hay = `${ord.orderId} ${ord.customerName} ${ord.userEmail || ''} ${ord.phone} ${ord.address} ${ord.city} ${ord.itemsSummary}`.toLowerCase();
      return hay.includes(q);
    });
  }, [adminOrders, searchTerm, stageFilter]);

  const counts = useMemo(() => {
    return {
      total: adminOrders.length,
      preparing: adminOrders.filter((o) => o.currentStageIndex === 2).length,
      shipped: adminOrders.filter((o) => o.currentStageIndex === 3).length,
      delivered: adminOrders.filter((o) => o.currentStageIndex === 4).length,
    };
  }, [adminOrders]);

  const filteredProducts = useMemo(() => {
    const q = prodSearchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (catalogListFilter !== 'all' && p.category !== catalogListFilter) return false;
      if (!q) return true;
      const hay = `${p.name} ${p.categoryLabel} ${p.colors.map((c) => c.name).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, catalogListFilter, prodSearchTerm]);

  const autoTotalStock = useMemo(() => {
    if (prodOutOfStock) return 0;
    return colorDrafts.reduce((sum, c) => {
      if (!c.inStock) return sum;
      const qty = Math.max(0, Math.round(Number(c.stockCount) || 0));
      return sum + qty;
    }, 0);
  }, [colorDrafts, prodOutOfStock]);

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
        setError(
          formatLiveSyncError(
            res.error,
            'Wrong Google account. Please sign in with an authorized admin Google account.'
          )
        );
      }
    } catch (err) {
      setError(
        formatLiveSyncError(
          err,
          'Could not connect Live Sync. Please sign in with an authorized admin Google account.'
        )
      );
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
        inStock: true,
        stockCount: '25',
        prevStockCount: '25',
        image: '',
        inkColors: prodInkColors.map((i) => ({ ...i })),
      },
    ]);
  };

  const handleUpdateColorDraft = (id: string, patch: Partial<ColorDraft>) => {
    setColorDrafts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleRemoveColorDraft = (id: string) => {
    setColorDrafts((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  const handleToggleVariantInkColor = (
    draftId: string,
    preset: { name: string; hex: string }
  ) => {
    const key = preset.name.trim().toLowerCase();
    setColorDrafts((prev) =>
      prev.map((c) => {
        if (c.id !== draftId) return c;
        const current = c.inkColors.length > 0 ? c.inkColors : [{ id: 'black', name: 'Black', hex: '#111827' }];
        const exists = current.some((i) => i.name.trim().toLowerCase() === key);
        if (exists) {
          if (current.length <= 1) {
            showToast('Keep at least one ink colour for this body colour');
            return c;
          }
          return {
            ...c,
            inkColors: current.filter((i) => i.name.trim().toLowerCase() !== key),
          };
        }
        const slug =
          key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `ink-${Date.now()}`;
        return {
          ...c,
          inkColors: [...current, { id: slug, name: preset.name, hex: preset.hex }],
        };
      })
    );
  };

  const handleRemoveVariantInkColor = (draftId: string, inkIdOrName: string) => {
    setColorDrafts((prev) =>
      prev.map((c) => {
        if (c.id !== draftId) return c;
        if (c.inkColors.length <= 1) {
          showToast('At least one ink colour is required for this body colour');
          return c;
        }
        return {
          ...c,
          inkColors: c.inkColors.filter((i) => i.id !== inkIdOrName && i.name !== inkIdOrName),
        };
      })
    );
  };

  const handleAddCustomVariantInkColor = (draftId: string) => {
    const draftInput = comboCustomInkByDraft[draftId] || { name: '', hex: '#1D4ED8' };
    const trimmed = draftInput.name.trim();
    if (!trimmed) {
      showToast('Enter a custom ink colour name first');
      return;
    }
    const key = trimmed.toLowerCase();
    setColorDrafts((prev) =>
      prev.map((c) => {
        if (c.id !== draftId) return c;
        const exists = c.inkColors.some((i) => i.name.trim().toLowerCase() === key);
        if (exists) {
          return {
            ...c,
            inkColors: c.inkColors.map((i) =>
              i.name.trim().toLowerCase() === key ? { ...i, hex: draftInput.hex } : i
            ),
          };
        }
        const slug =
          key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `ink-${Date.now()}`;
        return {
          ...c,
          inkColors: [...c.inkColors, { id: slug, name: trimmed, hex: draftInput.hex }],
        };
      })
    );
    setComboCustomInkByDraft((prev) => ({
      ...prev,
      [draftId]: { name: '', hex: draftInput.hex },
    }));
  };

  const handleApplyDefaultInksToAllBodies = () => {
    setColorDrafts((prev) =>
      prev.map((c) => ({
        ...c,
        inkColors: prodInkColors.map((i) => ({ ...i })),
      }))
    );
    showToast('Applied default ink colours to all body colours');
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

  const handleToggleInkColorPreset = (preset: { name: string; hex: string }) => {
    const key = preset.name.trim().toLowerCase();
    setProdInkColors((prev) => {
      const exists = prev.some((i) => i.name.trim().toLowerCase() === key);
      if (exists) {
        if (prev.length <= 1) {
          showToast('Keep at least one ink colour selected');
          return prev;
        }
        return prev.filter((i) => i.name.trim().toLowerCase() !== key);
      }
      const slug =
        key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `ink-${Date.now()}`;
      return [...prev, { id: slug, name: preset.name, hex: preset.hex }];
    });
  };

  const handleAddCustomInkColor = () => {
    const trimmed = customInkName.trim();
    if (!trimmed) {
      showToast('Enter a custom ink colour name first');
      return;
    }
    const key = trimmed.toLowerCase();
    setProdInkColors((prev) => {
      const exists = prev.some((i) => i.name.trim().toLowerCase() === key);
      if (exists) {
        return prev.map((i) =>
          i.name.trim().toLowerCase() === key ? { ...i, hex: customInkHex } : i
        );
      }
      const slug =
        key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `ink-${Date.now()}`;
      return [...prev, { id: slug, name: trimmed, hex: customInkHex }];
    });
    setCustomInkName('');
  };

  const handleRemoveSelectedInkColor = (idOrName: string) => {
    setProdInkColors((prev) => {
      if (prev.length <= 1) {
        showToast('At least one ink colour is required');
        return prev;
      }
      return prev.filter((i) => i.id !== idOrName && i.name !== idOrName);
    });
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdFormError('');
    setProdName('');
    setProdPrice('50');
    setProdOriginalPrice('');
    setProdTipSize('0.5 mm Needle Tip');
    setProdInkType('Smooth Gel Ink');
    setProdInkColors([{ id: 'black', name: 'Black', hex: '#111827' }]);
    setCustomInkName('');
    setCustomInkHex('#1D4ED8');
    setProdShortDesc('');
    setProdFeatured(false);
    setProdOutOfStock(false);
    setComboCustomInkByDraft({});
    setColorDrafts([
      {
        id: `c-${Date.now()}`,
        name: 'Black',
        hex: '#1E293B',
        inStock: true,
        stockCount: '40',
        prevStockCount: '40',
        image: '',
        inkColors: [{ id: 'black', name: 'Black', hex: '#111827' }],
      },
    ]);
  };

  const handleStartEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProdFormError('');
    setProdCategory(prod.category);
    setProdName(prod.name);
    setProdPrice(String(prod.priceBdt));
    setProdOriginalPrice(prod.originalPriceBdt ? String(prod.originalPriceBdt) : '');
    setProdTipSize(prod.specs.tipSize);
    setProdInkType(prod.specs.inkType);
    const baseInks = getProductInkColors(prod);
    setProdInkColors(baseInks);
    setCustomInkName('');
    setCustomInkHex('#1D4ED8');
    setProdShortDesc(prod.shortDescription);
    setProdFeatured(Boolean(prod.featured));
    setProdOutOfStock(!prod.inStock);
    setComboCustomInkByDraft({});
    setColorDrafts(
      prod.colors.length > 0
        ? prod.colors.map((c, idx) => {
            const resolvedQty =
              typeof c.stockCount === 'number' && Number.isFinite(c.stockCount)
                ? Math.max(0, Math.round(c.stockCount))
                : getColorAvailableCount({ ...prod, inStock: true }, c);
            const activeQty = c.inStock ? resolvedQty : 0;
            return {
              id: `${prod.id}-${c.id}-${idx}`,
              colorId: c.id,
              name: c.name,
              hex: c.hex,
              inStock: c.inStock !== false && resolvedQty > 0,
              stockCount: String(activeQty),
              prevStockCount:
                resolvedQty > 0 ? String(resolvedQty) : undefined,
              image: c.image || '',
              inkColors: getVariantInkColors(prod, c),
            };
          })
        : [
            {
              id: `c-${Date.now()}`,
              name: 'Black',
              hex: '#1E293B',
              inStock: true,
              stockCount: String(Math.max(1, prod.stockCount || 25)),
              prevStockCount: String(Math.max(1, prod.stockCount || 25)),
              image: '',
              inkColors: baseInks.map((i) => ({ ...i })),
            },
          ]
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

    const mergedInkMap = new Map<string, InkColorOption>();
    for (const ink of [...prodInkColors, ...colorDrafts.flatMap((c) => c.inkColors)]) {
      const key = ink.name.trim().toLowerCase();
      if (key && !mergedInkMap.has(key)) {
        mergedInkMap.set(key, ink);
      }
    }
    const mergedInks = Array.from(mergedInkMap.values());

    const payload = {
      name: prodName,
      category: prodCategory,
      priceBdt: parsedPrice,
      originalPriceBdt: parsedOriginal,
      stockCount: autoTotalStock,
      outOfStock: prodOutOfStock,
      shortDescription: prodShortDesc,
      tipSize: prodTipSize,
      inkType: prodInkType,
      inkColor: mergedInks.map((i) => i.name).join(', '),
      inkColorHex: mergedInks[0]?.hex || '#111827',
      inkColors: mergedInks,
      featured: prodFeatured,
      images: colorDrafts.map((c) => c.image).filter(Boolean),
      colors: colorDrafts.map((c) => {
        const qty = c.inStock ? Math.max(0, Math.round(Number(c.stockCount) || 0)) : 0;
        return {
          id: c.colorId,
          name: c.name,
          hex: c.hex,
          inStock: c.inStock && qty > 0,
          stockCount: qty,
          image: c.image || undefined,
          inkColors: c.inkColors.length > 0 ? c.inkColors : prodInkColors,
        };
      }),
    };

    setSavingProduct(true);
    try {
      const result = editingProductId
        ? await updateAdminProduct(editingProductId, payload)
        : await addAdminProduct(payload);

      if (!result.ok) {
        setProdFormError(
          formatLiveSyncError(
            result.error,
            'Could not save product to live cloud database. Please ensure you are signed in with an authorized admin account.'
          )
        );
        return;
      }

      const savedCategory = prodCategory;
      resetProductForm();
      setCatalogListFilter(savedCategory);
    } catch (err) {
      setProdFormError(
        formatLiveSyncError(
          err,
          'Could not save product to live cloud database. Please ensure you are signed in with an authorized admin account.'
        )
      );
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4"
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
        } rounded-2xl border border-accent/50 bg-white dark:bg-[var(--bg-input)] p-3.5 sm:p-6 shadow-2xl space-y-4 max-h-[94dvh] flex flex-col`}
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
              {isAdmin && (
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {isFirebaseAdmin ? 'Live Cloud Sync Connected' : 'Local Admin Session'}
                </p>
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
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright mb-1.5"
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
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright mb-1.5"
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
                <span>Order Management ({adminOrders.length})</span>
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
                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1">
                  {filteredOrders.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">
                      {!isFirebaseAdmin
                        ? 'Connect your Google Admin account above to view and manage live customer orders.'
                        : 'No matching orders found.'}
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
                              {order.userEmail && (
                                <p className="text-xs text-[var(--text-muted)] break-all">
                                  {order.userEmail}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="text-sm sm:text-base font-bold font-mono-num text-accent dark:text-accent-bright">
                                  ৳{order.totalBdt.toLocaleString('en-US')}
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)]">COD</p>
                              </div>

                              {confirmingDelete ? (
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={deletingOrderId === order.orderId}
                                      onClick={async () => {
                                        setDeletingOrderId(order.orderId);
                                        try {
                                          await deleteOrder(order.orderId);
                                        } finally {
                                          setDeletingOrderId(null);
                                          setConfirmDeleteOrderId(null);
                                        }
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-60 transition-colors"
                                    >
                                      {deletingOrderId === order.orderId
                                        ? 'Restoring & Deleting...'
                                        : 'Confirm Delete'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingOrderId === order.orderId}
                                      onClick={() => setConfirmDeleteOrderId(null)}
                                      className="px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-main)] disabled:opacity-60"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    Deletes order &amp; restores ordered pen stock
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteOrderId(order.orderId)}
                                  className="px-2.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                  aria-label={`Delete order ${order.orderId}`}
                                  title="Delete Order & Restore Stock"
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

                          {/* Highlighted Ordered Items: Image, Item Name, Body Colour, Ink Colour */}
                          {(() => {
                            const parsedItems = parseOrderSummaryItems(order.itemsSummary, products);
                            if (parsedItems.length === 0) {
                              return (
                                <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border-subtle)]/50">
                                  <span className="font-semibold text-[var(--text-main)]">Items: </span>
                                  {order.itemsSummary}
                                </p>
                              );
                            }

                            return (
                              <div className="space-y-2 rounded-xl border border-accent/45 bg-accent/[0.06] p-2.5 sm:p-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-accent dark:text-accent-bright">
                                  Ordered Items ({parsedItems.length})
                                </p>
                                <div className="space-y-2">
                                  {parsedItems.map((item) => (
                                    <div
                                      key={item.key}
                                      className="rounded-xl border border-accent/40 bg-[var(--bg-secondary)] p-2.5 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(var(--accent-rgb),0.25)]"
                                    >
                                      {/* Highlighted Pen Image */}
                                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-accent/70 bg-[#080506] shadow-[0_0_14px_rgba(var(--accent-rgb),0.3)] shrink-0 flex items-center justify-center">
                                        {item.image ? (
                                          <SafeImage
                                            src={item.image}
                                            alt={`${item.name}${item.bodyColorName ? ` — ${item.bodyColorName}` : ''}`}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <Package className="w-6 h-6 text-accent-bright" />
                                        )}
                                      </div>

                                      {/* Highlighted Item Name, Body Colour & Ink Colour */}
                                      <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-accent/15 border border-accent/45 text-xs sm:text-sm font-bold text-[var(--text-main)]">
                                            <span className="truncate">{item.name}</span>
                                          </span>
                                          <span className="px-2.5 py-0.5 rounded-lg bg-accent text-[var(--accent-cta-text)] text-xs font-extrabold font-mono-num shadow-[0_0_10px_rgba(var(--accent-rgb),0.38)] shrink-0">
                                            Qty × {item.quantity}
                                          </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {item.bodyColorName && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-500/60 bg-sky-500/15 text-sky-900 dark:text-sky-200 text-xs font-bold">
                                              <span
                                                className="w-3.5 h-3.5 rounded-full border-2 border-white/85 dark:border-white/40 shadow-sm shrink-0"
                                                style={{ backgroundColor: item.bodyColorHex || '#64748B' }}
                                              />
                                              <span>Body: {item.bodyColorName}</span>
                                            </span>
                                          )}

                                          {item.inkColorName && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-violet-500/60 bg-violet-500/15 text-violet-900 dark:text-violet-200 text-xs font-bold">
                                              <Droplets className="w-3 h-3 shrink-0" />
                                              <span
                                                className="w-3 h-3 rounded-full border border-white/75 dark:border-white/35 shrink-0"
                                                style={{ backgroundColor: item.inkColorHex || '#111827' }}
                                              />
                                              <span>Ink: {item.inkColorName}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Stage Update Buttons */}
                          <div className="space-y-1.5 pt-1">
                            <p className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-[11px] font-bold text-accent dark:text-accent-bright">
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
                className="flex-1 overflow-y-auto overflow-x-hidden space-y-5 pr-1"
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
                    <label className="inline-flex items-center px-2.5 py-1 rounded-lg bg-accent/20 border border-accent/60 text-xs font-extrabold text-accent dark:text-accent-bright shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)]">
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
                    <div className="sm:col-span-2">
                      <label className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright mb-1.5">
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
                      <label className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright mb-1.5">
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
                      <label className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright mb-1.5">
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
                      <label className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright mb-1.5">
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
                      <label className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright mb-1.5">
                        Total Stock (Auto from Colours)
                      </label>
                      <div className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm font-mono-num font-bold text-[var(--text-main)] flex items-center justify-between gap-2">
                        <span>{autoTotalStock.toLocaleString('en-US')} pcs</span>
                        <span className="text-[11px] font-sans font-normal text-[var(--text-muted)]">
                          Auto-summed
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright mb-1.5">
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

                    {/* Body / Pen Colour Options + Multi-Select Ink Combo + Photo Upload */}
                    <div className="sm:col-span-2 space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-accent/20 border border-accent/60 text-xs font-extrabold text-accent dark:text-accent-bright shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)]">
                            Pen Body Colours, Ink Colour Combos &amp; Photo Upload *
                          </span>
                          <span className="text-[11px] font-mono-num font-bold text-accent dark:text-accent-bright">
                            {colorDrafts.filter((c) => c.inStock).length}/{colorDrafts.length} in stock
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleApplyDefaultInksToAllBodies}
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[11px] font-semibold text-[var(--text-secondary)] hover:border-accent hover:text-[var(--text-main)]"
                            title="Copy default ink colours to every body colour below"
                          >
                            Sync Default Inks
                          </button>
                          <button
                            type="button"
                            onClick={handleAddColorDraft}
                            className="px-2.5 py-1.5 rounded-lg border border-accent/50 text-xs font-semibold text-accent dark:text-accent-bright hover:bg-accent/10 inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Body Colour</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {colorDrafts.map((col, idx) => {
                          const colorOutOfStock = !col.inStock;
                          return (
                            <div
                              key={col.id}
                              className={`p-3 rounded-xl border space-y-2.5 transition-colors ${
                                colorOutOfStock
                                  ? 'border-rose-500/45 bg-rose-500/[0.04]'
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]'
                              }`}
                            >
                              <div className="space-y-2.5 min-w-0">
                                {/* Row 1: Preview + Colour Picker + Name + Qty + Stock Switch + Remove Button */}
                                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                                    {col.image ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const variantSlides: LightboxSlide[] = colorDrafts
                                            .filter((draft) => Boolean(draft.image))
                                            .map((draft, slideIdx) => ({
                                              src: draft.image,
                                              label: draft.name.trim() || `Body ${slideIdx + 1}`,
                                              colorHex: draft.hex,
                                            }));
                                          const startIdx = Math.max(
                                            0,
                                            variantSlides.findIndex((s) => s.src === col.image)
                                          );
                                          setLightboxState({
                                            title: prodName.trim() || col.name.trim() || 'Pen Photo',
                                            slides:
                                              variantSlides.length > 0
                                                ? variantSlides
                                                : [
                                                    {
                                                      src: col.image,
                                                      label: col.name.trim() || `Body ${idx + 1}`,
                                                      colorHex: col.hex,
                                                    },
                                                  ],
                                            initialIndex: startIdx,
                                          });
                                        }}
                                        title="Open pen photo full screen to inspect colour & structure"
                                        aria-label={`View ${col.name || `Pen variant ${idx + 1}`} photo full screen`}
                                        className="group relative w-14 h-11 rounded-lg overflow-hidden border border-accent/45 hover:border-accent bg-[#0B0809] shrink-0 flex items-center justify-center transition-all"
                                      >
                                        <SafeImage
                                          src={col.image}
                                          alt={col.name || `Pen variant ${idx + 1}`}
                                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${
                                            colorOutOfStock ? 'opacity-45 grayscale-[30%]' : ''
                                          }`}
                                        />
                                        <span className="absolute bottom-1 right-1 w-4 h-4 rounded bg-black/75 border border-white/25 text-white flex items-center justify-center shadow">
                                          <Maximize2 className="w-2.5 h-2.5" />
                                        </span>
                                      </button>
                                    ) : (
                                      <div className="w-14 h-11 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[#0B0809] shrink-0 flex items-center justify-center relative">
                                        <ImageIcon className="w-4 h-4 text-[var(--text-muted)]" />
                                      </div>
                                    )}

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
                                      placeholder="Body colour (e.g. Pink)"
                                      className="flex-1 min-w-[120px] px-2.5 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
                                    />
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="px-1.5 py-0.5 rounded bg-accent/15 border border-accent/45 text-[10px] font-bold text-accent dark:text-accent-bright">
                                        Qty
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={col.stockCount}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          if (raw === '') {
                                            handleUpdateColorDraft(col.id, { stockCount: '' });
                                            return;
                                          }
                                          const parsedQty = Math.max(
                                            0,
                                            Math.round(Number(raw) || 0)
                                          );
                                          handleUpdateColorDraft(col.id, {
                                            stockCount: String(parsedQty),
                                            inStock: parsedQty > 0,
                                            prevStockCount:
                                              parsedQty > 0
                                                ? String(parsedQty)
                                                : col.prevStockCount,
                                          });
                                        }}
                                        aria-label={`Stock quantity for ${col.name || `colour ${idx + 1}`}`}
                                        className="w-16 px-2 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={colorOutOfStock}
                                      onClick={() => {
                                        if (col.inStock) {
                                          handleUpdateColorDraft(col.id, {
                                            inStock: false,
                                            prevStockCount:
                                              Number(col.stockCount) > 0
                                                ? col.stockCount
                                                : col.prevStockCount,
                                            stockCount: '0',
                                          });
                                        } else {
                                          const restored =
                                            Number(col.prevStockCount) > 0
                                              ? col.prevStockCount!
                                              : '25';
                                          handleUpdateColorDraft(col.id, {
                                            inStock: true,
                                            stockCount: restored,
                                          });
                                        }
                                      }}
                                      className={`px-2.5 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors ${
                                        colorOutOfStock
                                          ? 'border-rose-500/60 bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                                          : 'border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                                      }`}
                                      title={`Toggle ${col.name || 'this colour'} Out of Stock ON/OFF`}
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          colorOutOfStock ? 'bg-rose-500' : 'bg-emerald-500'
                                        }`}
                                      />
                                      <span>{colorOutOfStock ? 'Out of Stock' : 'In Stock'}</span>
                                    </button>

                                    {colorDrafts.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveColorDraft(col.id)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-rose-500 hover:border-rose-500/50 transition-colors shrink-0"
                                        aria-label="Remove colour option"
                                        title="Remove colour option"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Row 2: Image URL + Enlarged Upload Image Button */}
                                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                                  <input
                                    type="text"
                                    value={col.image}
                                    onChange={(e) =>
                                      handleUpdateColorDraft(col.id, { image: e.target.value })
                                    }
                                    placeholder="Image URL or upload pen photo"
                                    className="flex-1 min-w-[160px] px-2.5 py-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
                                  />

                                  <label className="px-4 py-2.5 rounded-lg border border-accent/45 bg-accent/10 hover:bg-accent/20 text-xs sm:text-sm font-semibold text-[var(--text-main)] hover:border-accent cursor-pointer inline-flex items-center gap-2 shrink-0 transition-colors">
                                    <ImagePlus className="w-4 h-4 text-accent-bright" />
                                    <span>Upload Image</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) =>
                                        handleColorImageUpload(col.id, e.target.files?.[0])
                                      }
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Multi-Select Combo Ink Colours for this Body Colour */}
                              <div className="pt-2.5 border-t border-[var(--border-subtle)]/60 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-[11px] font-bold text-accent dark:text-accent-bright">
                                    <Droplets className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                      Combo Ink Colours for {col.name || `Body ${idx + 1}`} (Multi-Select)
                                    </span>
                                  </span>
                                  <span className="text-[10px] font-bold font-mono-num text-accent dark:text-accent-bright">
                                    {col.inkColors.length} ink{col.inkColors.length === 1 ? '' : 's'}
                                  </span>
                                </div>

                                {/* Selected Combo Ink Chips */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {col.inkColors.map((ink) => (
                                    <span
                                      key={ink.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-accent/45 bg-accent/10 text-[11px] font-semibold text-[var(--text-main)]"
                                    >
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/30 shrink-0"
                                        style={{ backgroundColor: ink.hex }}
                                      />
                                      <span>{ink.name}</span>
                                      {col.inkColors.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveVariantInkColor(col.id, ink.id)}
                                          className="text-[var(--text-muted)] hover:text-rose-500"
                                          aria-label={`Remove ${ink.name} ink from ${col.name || `Body ${idx + 1}`}`}
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </span>
                                  ))}
                                </div>

                                {/* Multi-Select Preset Ink Toggles */}
                                <div className="flex flex-wrap gap-1.5">
                                  {INK_COLOR_PRESETS.map((ink) => {
                                    const selected = col.inkColors.some(
                                      (item) =>
                                        item.name.trim().toLowerCase() === ink.name.toLowerCase()
                                    );
                                    return (
                                      <button
                                        key={ink.name}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => handleToggleVariantInkColor(col.id, ink)}
                                        className={`min-h-[30px] px-2 py-1 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1.5 transition-all ${
                                          selected
                                            ? 'border-accent bg-accent/20 text-[var(--text-main)] font-semibold shadow-[0_0_8px_rgba(var(--accent-rgb),0.2)]'
                                            : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-accent/60 hover:text-[var(--text-main)]'
                                        }`}
                                      >
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/25 shrink-0 flex items-center justify-center"
                                          style={{ backgroundColor: ink.hex }}
                                        >
                                          {selected && (
                                            <Check className="w-2 h-2 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]" />
                                          )}
                                        </span>
                                        <span>{ink.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Custom Ink Adder for this Body Colour */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 min-w-0">
                                  <input
                                    type="color"
                                    value={comboCustomInkByDraft[col.id]?.hex || '#1D4ED8'}
                                    onChange={(e) =>
                                      setComboCustomInkByDraft((prev) => ({
                                        ...prev,
                                        [col.id]: {
                                          name: prev[col.id]?.name || '',
                                          hex: e.target.value,
                                        },
                                      }))
                                    }
                                    aria-label={`Custom ink colour picker for ${col.name || `Body ${idx + 1}`}`}
                                    className="w-8 h-8 rounded-lg border border-[var(--border-subtle)] bg-transparent cursor-pointer shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={comboCustomInkByDraft[col.id]?.name || ''}
                                    onChange={(e) =>
                                      setComboCustomInkByDraft((prev) => ({
                                        ...prev,
                                        [col.id]: {
                                          hex: prev[col.id]?.hex || '#1D4ED8',
                                          name: e.target.value,
                                        },
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCustomVariantInkColor(col.id);
                                      }
                                    }}
                                    placeholder={`Custom ink for ${col.name || 'this body'}...`}
                                    className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-main)] focus:outline-none focus:border-accent"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddCustomVariantInkColor(col.id)}
                                    className="min-h-[30px] px-2.5 py-1 rounded-lg border border-accent/55 bg-accent/10 text-[11px] font-semibold text-accent dark:text-accent-bright hover:bg-accent/20 inline-flex items-center gap-1 shrink-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
                      <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-accent/15 border border-accent/45 text-xs sm:text-sm font-bold text-accent dark:text-accent-bright cursor-pointer">
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
                      <label className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright mb-1.5">
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

                  {/* Dedicated Multi Ink Colour Selector */}
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/20 border border-accent/60 text-xs font-extrabold text-accent dark:text-accent-bright shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)]">
                        <Droplets className="w-3.5 h-3.5 shrink-0" />
                        <span>Multi Ink Colour Selector * (Select one or more)</span>
                      </span>
                      <span className="text-[11px] font-bold font-mono-num text-accent dark:text-accent-bright">
                        {prodInkColors.length} selected
                      </span>
                    </div>

                    {/* Selected Ink Colours Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {prodInkColors.map((ink) => (
                        <span
                          key={ink.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-accent/50 bg-accent/10 text-xs font-semibold text-[var(--text-main)]"
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/20 dark:border-white/30 shrink-0"
                            style={{ backgroundColor: ink.hex }}
                          />
                          <span>{ink.name}</span>
                          {prodInkColors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedInkColor(ink.id)}
                              className="ml-0.5 text-[var(--text-muted)] hover:text-rose-500"
                              aria-label={`Remove ${ink.name} ink`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* Multi-Toggle Preset Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {INK_COLOR_PRESETS.map((ink) => {
                        const selected = prodInkColors.some(
                          (item) => item.name.trim().toLowerCase() === ink.name.toLowerCase()
                        );
                        return (
                          <button
                            key={ink.name}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => handleToggleInkColorPreset(ink)}
                            className={`min-h-[34px] px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all ${
                              selected
                                ? 'border-accent bg-accent/20 text-[var(--text-main)] font-semibold shadow-[0_0_10px_rgba(var(--accent-rgb),0.22)]'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-accent/60 hover:text-[var(--text-main)]'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-black/20 dark:border-white/25 shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: ink.hex }}
                            >
                              {selected && (
                                <Check className="w-2 h-2 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]" />
                              )}
                            </span>
                            <span>{ink.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Ink Colour Adder */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-0.5">
                      <input
                        type="color"
                        value={customInkHex}
                        onChange={(e) => setCustomInkHex(e.target.value)}
                        aria-label="Custom ink colour picker"
                        className="w-10 h-9 rounded-lg border border-[var(--border-subtle)] bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={customInkName}
                        onChange={(e) => setCustomInkName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomInkColor();
                          }
                        }}
                        placeholder="Add custom ink (e.g. Blue-Black)"
                        className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomInkColor}
                        className="min-h-[36px] px-3 py-2 rounded-lg border border-accent/55 bg-accent/10 text-xs font-semibold text-accent dark:text-accent-bright hover:bg-accent/20 inline-flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Ink</span>
                      </button>
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
                              <button
                                type="button"
                                onClick={() => {
                                  const prodSlides: LightboxSlide[] = [];
                                  const seenSrc = new Set<string>();
                                  for (const c of prod.colors) {
                                    if (c.image && !seenSrc.has(c.image)) {
                                      seenSrc.add(c.image);
                                      prodSlides.push({
                                        src: c.image,
                                        label: c.name,
                                        colorHex: c.hex,
                                      });
                                    }
                                  }
                                  for (const img of prod.images) {
                                    if (img && !seenSrc.has(img)) {
                                      seenSrc.add(img);
                                      prodSlides.push({ src: img, label: prod.name });
                                    }
                                  }
                                  if (prodSlides.length === 0) return;
                                  setLightboxState({
                                    title: prod.name,
                                    slides: prodSlides,
                                    initialIndex: 0,
                                  });
                                }}
                                title="View full screen pen photo"
                                aria-label={`View ${prod.name} full screen`}
                                className="group w-14 h-11 rounded-lg overflow-hidden bg-[#080506] border border-[var(--border-subtle)] hover:border-accent shrink-0 relative"
                              >
                                <SafeImage
                                  src={prod.colors[0]?.image || prod.images[0]}
                                  alt={prod.name}
                                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${
                                    isOutOfStock ? 'opacity-50' : ''
                                  }`}
                                />
                                <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded bg-black/75 text-white flex items-center justify-center">
                                  <Maximize2 className="w-2.5 h-2.5" />
                                </span>
                              </button>
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
                                  <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
                                    Total: {getProductTotalAvailableCount(prod).toLocaleString('en-US')} pcs
                                    {' · '}
                                    {prod.colors.filter((c) => getColorAvailableCount(prod, c) > 0).length}/
                                    {prod.colors.length}{' '}
                                    {prod.colors.length === 1 ? 'colour' : 'colours'}
                                  </span>
                                  <span>·</span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {prod.colors.map((c) => {
                                      const comboInks = getVariantInkColors(prod, c);
                                      const colorSoldOut = !c.inStock;
                                      const colorCount = getColorAvailableCount(prod, c);
                                      return (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onClick={() => {
                                            void toggleProductColorStock(prod.id, c.id);
                                            if (isEditingThis && isFirebaseAdmin) {
                                              setColorDrafts((prev) =>
                                                prev.map((d) => {
                                                  const match =
                                                    d.colorId === c.id ||
                                                    d.name.trim().toLowerCase() ===
                                                      c.name.trim().toLowerCase();
                                                  if (!match) return d;
                                                  const nextIn = !c.inStock;
                                                  const restored =
                                                    Number(d.prevStockCount) > 0
                                                      ? d.prevStockCount!
                                                      : String(
                                                          typeof c.stockCount === 'number' &&
                                                            c.stockCount > 0
                                                            ? c.stockCount
                                                            : 25
                                                        );
                                                  return {
                                                    ...d,
                                                    inStock: nextIn,
                                                    prevStockCount: d.inStock
                                                      ? d.stockCount
                                                      : d.prevStockCount,
                                                    stockCount: nextIn ? restored : '0',
                                                  };
                                                })
                                              );
                                            }
                                          }}
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] transition-colors ${
                                            colorSoldOut
                                              ? 'border-rose-500/45 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                                              : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-accent/60'
                                          }`}
                                          title={`Click to mark ${c.name} colour ${
                                            colorSoldOut ? 'In Stock' : 'Out of Stock'
                                          } · ${comboInks.map((i) => i.name).join(', ')} ink`}
                                        >
                                          <span
                                            className={`w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/30 shrink-0 ${
                                              colorSoldOut ? 'opacity-45' : ''
                                            }`}
                                            style={{ backgroundColor: c.hex }}
                                          />
                                          <span
                                            className={`font-medium ${
                                              colorSoldOut
                                                ? 'line-through text-rose-500'
                                                : 'text-[var(--text-main)]'
                                            }`}
                                          >
                                            {c.name}
                                          </span>
                                          {colorSoldOut ? (
                                            <span className="text-[10px] font-bold uppercase text-rose-500">
                                              Out (0)
                                            </span>
                                          ) : (
                                            <>
                                              <span className="text-[10px] font-mono-num text-[var(--text-muted)]">
                                                ({colorCount})
                                              </span>
                                              <span className="text-[var(--text-muted)]">→</span>
                                              <span className="inline-flex items-center -space-x-1">
                                                {comboInks.map((ink) => (
                                                  <span
                                                    key={ink.id}
                                                    className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/30 inline-block"
                                                    style={{ backgroundColor: ink.hex }}
                                                  />
                                                ))}
                                              </span>
                                            </>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
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

      {lightboxState && (
        <ImageLightboxModal
          isOpen
          title={lightboxState.title}
          slides={lightboxState.slides}
          initialIndex={lightboxState.initialIndex}
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
};
