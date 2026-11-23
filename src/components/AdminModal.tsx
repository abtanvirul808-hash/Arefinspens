import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  PenTool,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
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
  isOtherProduct,
  OTHER_PRODUCT_SUBCATEGORIES,
  PEN_CATEGORIES,
  PEN_CATEGORY_IDS,
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

const BODY_COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#1E293B' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'White', hex: '#F8FAFC' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Green', hex: '#059669' },
  { name: 'Sky Blue', hex: '#0EA5E9' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Silver', hex: '#94A3B8' },
  { name: 'Gold', hex: '#D97706' },
];

const TIP_SIZE_PRESETS = [
  '0.5 mm Needle Tip',
  '0.7 mm Bullet Tip',
  '1.0 mm Broad Tip',
  '0.5 mm Lead',
  'Fine Nib (0.5 mm)',
  'Chisel Tip',
];

const INK_TYPE_PRESETS = [
  'Smooth Gel Ink',
  'Low-Viscosity Ballpoint',
  'Quick-Dry Ink',
  'Permanent Marker Ink',
  'Liquid Fountain Ink',
  '2B Polymer Lead',
];

const LOW_STOCK_THRESHOLD = 5;

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

function computeOrderFinancials(
  order: { itemsSummary: string; totalBdt: number; orderItems?: { productId?: string; quantity?: number }[] },
  products: Product[]
) {
  const parsedItems = parseOrderSummaryItems(order.itemsSummary, products);
  const itemBreakdowns = parsedItems.map((item) => {
    const matchedProd =
      (item.productId
        ? products.find((p) => p.id === item.productId)
        : undefined) ||
      products.find(
        (p) => p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
      );
    const qtyNum = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
    const unitPrice = matchedProd ? matchedProd.priceBdt : undefined;
    const lineTotal =
      typeof unitPrice === 'number' ? unitPrice * qtyNum : undefined;
    return { item, matchedProd, qtyNum, unitPrice, lineTotal };
  });
  const allPricesResolved =
    itemBreakdowns.length > 0 &&
    itemBreakdowns.every((b) => typeof b.lineTotal === 'number');
  const summedSubtotal = allPricesResolved
    ? itemBreakdowns.reduce((sum, b) => sum + (b.lineTotal ?? 0), 0)
    : 0;
  const calculatedSubtotal =
    allPricesResolved && summedSubtotal > 0 ? summedSubtotal : order.totalBdt;
  const totalUnitsCount = itemBreakdowns.reduce((sum, b) => sum + b.qtyNum, 0);
  const totalPenCount =
    itemBreakdowns.length > 0
      ? itemBreakdowns.reduce(
          (sum, b) => sum + (b.matchedProd && isOtherProduct(b.matchedProd) ? 0 : b.qtyNum),
          0
        )
      : (order.orderItems || []).reduce((sum, oi) => {
          const prod = oi.productId ? products.find((p) => p.id === oi.productId) : undefined;
          return sum + (prod && isOtherProduct(prod) ? 0 : Math.max(1, oi.quantity || 1));
        }, 0);
  return { parsedItems, itemBreakdowns, calculatedSubtotal, totalUnitsCount, totalPenCount };
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
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [isOrdersHeaderCollapsed, setIsOrdersHeaderCollapsed] = useState(false);

  const ordersScrollRef = useRef<HTMLDivElement | null>(null);
  const lastOrdersScrollTopRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const autoScrollLockUntilRef = useRef(0);

  // Set Category + Manage/Add/Edit Product form state
  const productsTabScrollRef = useRef<HTMLDivElement | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodCategory, setProdCategory] = useState<Exclude<CategoryId, 'all' | 'all-pens'>>('gel-pens');
  const [otherSubcategory, setOtherSubcategory] = useState<string>(
    OTHER_PRODUCT_SUBCATEGORIES[0] || 'Other Products'
  );
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('Arefin Mart');
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
  const [expandedInkDraftIds, setExpandedInkDraftIds] = useState<Record<string, boolean>>({});
  const [prodFormError, setProdFormError] = useState('');
  const [catalogListFilter, setCatalogListFilter] = useState<CategoryId>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
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

  const allOrdersSubtotal = useMemo(
    () =>
      adminOrders.reduce(
        (sum, ord) => sum + computeOrderFinancials(ord, products).calculatedSubtotal,
        0
      ),
    [adminOrders, products]
  );

  const filteredOrdersSubtotal = useMemo(
    () =>
      filteredOrders.reduce(
        (sum, ord) => sum + computeOrderFinancials(ord, products).calculatedSubtotal,
        0
      ),
    [filteredOrders, products]
  );

  // Reset scroll-expand state cleanly whenever opening Order Management
  useEffect(() => {
    if (isAdminModalOpen && activeTab === 'orders') {
      setIsOrdersHeaderCollapsed(false);
      setExpandedOrderIds({});
      lastOrdersScrollTopRef.current = 0;
      if (ordersScrollRef.current) {
        ordersScrollRef.current.scrollTop = 0;
      }
    }
  }, [isAdminModalOpen, activeTab]);

  const applyScrollExpand = useCallback(() => {
    const container = ordersScrollRef.current;
    if (!container) return;

    setIsOrdersHeaderCollapsed(true);

    const containerRect = container.getBoundingClientRect();
    const cards = container.querySelectorAll<HTMLElement>('[data-order-card-id]');
    const isScrollable = container.scrollHeight > container.clientHeight + 10;

    setExpandedOrderIds((prev) => {
      const next = { ...prev };
      let changed = false;

      cards.forEach((card) => {
        const orderId = card.dataset.orderCardId;
        if (!orderId) return;
        const rect = card.getBoundingClientRect();
        const inReadingZone =
          !isScrollable ||
          (rect.bottom > containerRect.top + 8 &&
            rect.top < containerRect.bottom - 24);
        if (inReadingZone && !next[orderId]) {
          next[orderId] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, []);

  const applyScrollContract = useCallback((atTop: boolean) => {
    if (atTop) {
      setIsOrdersHeaderCollapsed(false);
    }

    setExpandedOrderIds((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      return {};
    });
  }, []);

  const triggerOrderScrollDirection = useCallback(
    (direction: 'down' | 'up', force = false) => {
      const now = performance.now();
      if (!force && now < autoScrollLockUntilRef.current) return;
      autoScrollLockUntilRef.current = now + 340;

      const container = ordersScrollRef.current;
      if (direction === 'down') {
        applyScrollExpand();
      } else {
        const nearTop = !container || container.scrollTop <= 28;
        applyScrollContract(nearTop);
      }

      window.requestAnimationFrame(() => {
        if (ordersScrollRef.current) {
          lastOrdersScrollTopRef.current = ordersScrollRef.current.scrollTop;
        }
      });
    },
    [applyScrollContract, applyScrollExpand]
  );

  const handleOrdersScroll = useCallback(() => {
    const container = ordersScrollRef.current;
    if (!container) return;

    const currentTop = container.scrollTop;
    const prevTop = lastOrdersScrollTopRef.current;
    const delta = currentTop - prevTop;
    lastOrdersScrollTopRef.current = currentTop;

    if (performance.now() < autoScrollLockUntilRef.current) {
      return;
    }

    if (delta > 10 && currentTop > 8) {
      triggerOrderScrollDirection('down');
    } else if (currentTop <= 6 && prevTop > 6) {
      triggerOrderScrollDirection('up', true);
    } else if (delta < -16) {
      triggerOrderScrollDirection('up');
    }
  }, [triggerOrderScrollDirection]);

  const handleOrdersWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (Math.abs(e.deltaY) < 12) return;
      if (e.deltaY > 0) {
        triggerOrderScrollDirection('down');
      } else {
        const container = ordersScrollRef.current;
        if (!container || container.scrollTop <= 24 || e.deltaY < -28) {
          triggerOrderScrollDirection('up');
        }
      }
    },
    [triggerOrderScrollDirection]
  );

  const handleOrdersTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  }, []);

  const handleOrdersTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (touchStartYRef.current === null) return;
      const currentY = e.touches[0]?.clientY;
      if (typeof currentY !== 'number') return;
      const fingerSwipeDelta = touchStartYRef.current - currentY;
      if (Math.abs(fingerSwipeDelta) < 18) return;

      if (fingerSwipeDelta > 0) {
        triggerOrderScrollDirection('down');
      } else {
        triggerOrderScrollDirection('up');
      }
      touchStartYRef.current = currentY;
    },
    [triggerOrderScrollDirection]
  );

  const toggleSingleOrderExpanded = useCallback((orderId: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }, []);

  const lowStockCount = useMemo(
    () =>
      products.filter((p) => {
        const total = getProductTotalAvailableCount(p);
        return p.inStock && total > 0 && total < LOW_STOCK_THRESHOLD;
      }).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = prodSearchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (catalogListFilter === 'all-pens') {
        if (!PEN_CATEGORY_IDS.includes(p.category as (typeof PEN_CATEGORY_IDS)[number])) {
          return false;
        }
      } else if (catalogListFilter !== 'all' && p.category !== catalogListFilter) {
        return false;
      }
      if (lowStockOnly) {
        const total = getProductTotalAvailableCount(p);
        if (!p.inStock || total <= 0 || total >= LOW_STOCK_THRESHOLD) {
          return false;
        }
      }
      if (!q) return true;
      const hay = `${p.name} ${p.brand} ${p.categoryLabel} ${p.colors.map((c) => c.name).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, catalogListFilter, lowStockOnly, prodSearchTerm]);

  const isOtherMode = prodCategory === 'other-products';

  const autoTotalStock = useMemo(() => {
    if (prodOutOfStock) return 0;
    return colorDrafts.reduce((sum, c) => {
      if (!c.inStock) return sum;
      const qty = Math.max(0, Math.round(Number(c.stockCount) || 0));
      return sum + qty;
    }, 0);
  }, [colorDrafts, prodOutOfStock]);

  const parsedSellingPrice = Number(prodPrice);
  const parsedMrpPrice = prodOriginalPrice.trim() ? Number(prodOriginalPrice) : 0;
  const discountInfo = useMemo(() => {
    if (!prodOriginalPrice.trim() || !Number.isFinite(parsedMrpPrice) || parsedMrpPrice <= 0) {
      return null;
    }
    if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice <= 0) {
      return null;
    }
    if (parsedMrpPrice <= parsedSellingPrice) {
      return { valid: false as const, percent: 0, savings: 0 };
    }
    const savings = Math.round(parsedMrpPrice - parsedSellingPrice);
    const percent = Math.max(1, Math.round((savings / parsedMrpPrice) * 100));
    return { valid: true as const, percent, savings };
  }, [prodOriginalPrice, parsedMrpPrice, parsedSellingPrice]);

  const selectedCategoryLabel = isOtherMode
    ? otherSubcategory || 'Other Products'
    : PEN_CATEGORIES.find((c) => c.id === prodCategory)?.label || 'Pen Category';

  const readinessIssues = useMemo(() => {
    const issues: string[] = [];
    if (prodName.trim().length < 2) {
      issues.push('Product name (at least 2 characters)');
    }
    if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice <= 0) {
      issues.push('Valid selling price (> ৳0)');
    }
    const namedColors = colorDrafts.filter((c) => c.name.trim().length > 0);
    if (namedColors.length === 0) {
      issues.push('At least 1 named colour variant');
    }
    return issues;
  }, [prodName, parsedSellingPrice, colorDrafts]);

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
    if (googleLoading) return;
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
    setOtherSubcategory(OTHER_PRODUCT_SUBCATEGORIES[0] || 'Other Products');
    setProdName('');
    setProdBrand('Arefin Mart');
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
    setExpandedInkDraftIds({});
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
    if (prod.category === 'other-products') {
      setOtherSubcategory(
        prod.categoryLabel?.trim() || OTHER_PRODUCT_SUBCATEGORIES[0] || 'Other Products'
      );
    }
    setProdName(prod.name);
    setProdBrand(prod.brand || 'Arefin Mart');
    setProdPrice(String(prod.priceBdt));
    setProdOriginalPrice(prod.originalPriceBdt ? String(prod.originalPriceBdt) : '');
    setProdTipSize(prod.specs.tipSize || '0.5 mm Needle Tip');
    setProdInkType(prod.specs.inkType || 'Smooth Gel Ink');
    const baseInks = getProductInkColors(prod);
    setProdInkColors(
      baseInks.length > 0 ? baseInks : [{ id: 'black', name: 'Black', hex: '#111827' }]
    );
    setCustomInkName('');
    setCustomInkHex('#1D4ED8');
    setProdShortDesc(prod.shortDescription);
    setProdFeatured(Boolean(prod.featured));
    setProdOutOfStock(!prod.inStock);
    setComboCustomInkByDraft({});
    setExpandedInkDraftIds({});
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

    const payload = isOtherMode
      ? {
          name: prodName,
          brand: prodBrand.trim() || 'Arefin Mart',
          category: 'other-products' as const,
          categoryLabel: otherSubcategory.trim() || 'Other Products',
          priceBdt: parsedPrice,
          originalPriceBdt: parsedOriginal,
          stockCount: autoTotalStock,
          outOfStock: prodOutOfStock,
          shortDescription: prodShortDesc,
          tipSize: 'Standard',
          inkType: 'N/A',
          inkColor: '',
          inkColorHex: '',
          inkColors: [],
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
            };
          }),
        }
      : {
          name: prodName,
          brand: prodBrand.trim() || 'Arefin Mart',
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
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
        } rounded-t-2xl sm:rounded-2xl border border-accent/50 bg-white dark:bg-[var(--bg-input)] p-3.5 sm:p-6 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-2xl space-y-3.5 sm:space-y-4 max-h-[95dvh] sm:max-h-[92dvh] flex flex-col`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/45 flex items-center justify-center text-accent-bright shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)] truncate">
                {isAdmin ? 'Admin Control Panel' : 'Admin Portal'}
              </h2>
              {isAdmin && (
                <p className="text-[11px] sm:text-xs text-[var(--text-muted)] truncate">
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
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-accent/15 border border-accent/40 text-xs font-semibold text-accent-bright hover:bg-accent/25 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="w-10 h-10 sm:w-9 sm:h-9 rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent inline-flex items-center justify-center shrink-0"
              aria-label="Close admin panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isAdmin ? (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Sign in with your authorized Google account for real-time cross-device sync, or use
              your store admin Gmail and password.
            </p>

            <button
              type="button"
              disabled={googleLoading}
              onClick={() => void handleGoogleAdminLogin()}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-[var(--accent-cta-text)] cta-glow-red inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            >
              <Cloud className="w-4 h-4" />
              <span>
                {googleLoading ? 'Connecting Google Account...' : 'Sign In with Admin Google Account'}
              </span>
            </button>

            <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <span className="h-px flex-1 bg-[var(--border-subtle)]" />
              <span>or</span>
              <span className="h-px flex-1 bg-[var(--border-subtle)]" />
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
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-[var(--accent-cta-text)] cta-glow-red transition-all"
              >
                Sign In to Admin Panel
              </button>
            </form>
          </div>
        ) : (
          <>
            {!isFirebaseAdmin && (
              <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-medium">
                    Connect your Google Account to save live changes across all devices
                  </span>
                </div>
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={() => void handleGoogleAdminLogin()}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 disabled:opacity-60 inline-flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{googleLoading ? 'Connecting...' : 'Connect Google Sync'}</span>
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`min-h-[44px] py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'bg-accent text-[var(--accent-cta-text)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">Orders ({adminOrders.length})</span>
                <span className="hidden sm:inline">Order Management ({adminOrders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`min-h-[44px] py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap ${
                  activeTab === 'products'
                    ? 'bg-accent text-[var(--accent-cta-text)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                <FolderPlus className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">Products ({products.length})</span>
                <span className="hidden sm:inline">Set Category &amp; Product ({products.length})</span>
              </button>
            </div>

            {activeTab === 'orders' ? (
              <div
                onWheel={handleOrdersWheel}
                onTouchStart={handleOrdersTouchStart}
                onTouchMove={handleOrdersTouchMove}
                className="flex-1 min-h-0 flex flex-col space-y-3 sm:space-y-3.5"
              >
                {/* Quick Summary Stats (Smoothly Contracts/Expands on Scroll) */}
                <div
                  className={`grid transition-[grid-template-rows,opacity,transform,margin] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] shrink-0 ${
                    isOrdersHeaderCollapsed
                      ? 'grid-rows-[0fr] opacity-0 -translate-y-1.5 pointer-events-none !mt-0'
                      : 'grid-rows-[1fr] opacity-100 translate-y-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 pb-0.5">
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 sm:px-3.5 sm:py-2.5">
                        <p className="text-[11px] text-[var(--text-muted)]">Total Orders</p>
                        <p className="font-display text-base sm:text-lg font-bold font-mono-num text-[var(--text-main)]">
                          {counts.total}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 sm:px-3.5 sm:py-2.5">
                        <p className="text-[11px] text-[var(--text-muted)]">Preparing Order</p>
                        <p className="font-display text-base sm:text-lg font-bold font-mono-num text-amber-500">
                          {counts.preparing}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 sm:px-3.5 sm:py-2.5">
                        <p className="text-[11px] text-[var(--text-muted)]">Shipped</p>
                        <p className="font-display text-base sm:text-lg font-bold font-mono-num text-accent-bright">
                          {counts.shipped}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 sm:px-3.5 sm:py-2.5">
                        <p className="text-[11px] text-[var(--text-muted)]">Delivered</p>
                        <p className="font-display text-base sm:text-lg font-bold font-mono-num text-emerald-500">
                          {counts.delivered}
                        </p>
                      </div>
                      <div className="col-span-2 sm:col-span-1 rounded-xl border border-accent/55 bg-accent/15 px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)] flex sm:block items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-accent dark:text-accent-bright">
                          All Orders Subtotal
                        </p>
                        <p className="font-display text-base sm:text-lg font-extrabold font-mono-num text-[var(--text-main)]">
                          ৳{allOrdersSubtotal.toLocaleString('en-US')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 shrink-0">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search order #1, customer name, phone, or location..."
                      className="w-full min-h-[42px] pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap pb-0.5 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => setStageFilter('all')}
                      className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
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
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
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

                {/* Subtotal Price Summary Bar (Down of Search Order) */}
                <div className="rounded-xl border border-accent/50 bg-accent/10 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    {filteredOrders.length === adminOrders.length
                      ? `All Orders Subtotal (${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'})`
                      : `Matching Orders Subtotal (${filteredOrders.length} of ${adminOrders.length} orders)`}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {filteredOrders.length !== adminOrders.length && (
                      <span className="text-[11px] text-[var(--text-secondary)] font-mono-num">
                        All Orders: ৳{allOrdersSubtotal.toLocaleString('en-US')}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-lg bg-accent/20 border border-accent/55 text-xs sm:text-sm font-extrabold font-mono-num text-accent dark:text-accent-bright">
                      ৳{filteredOrdersSubtotal.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>

                {/* Order List (Scroll-driven auto-expand & auto-contract) */}
                <div
                  ref={ordersScrollRef}
                  onScroll={handleOrdersScroll}
                  style={{ overflowAnchor: 'none' }}
                  className="flex-1 overflow-y-auto overflow-x-hidden space-y-2.5 sm:space-y-3 pr-1 overscroll-contain"
                >
                  {filteredOrders.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">
                      {!isFirebaseAdmin
                        ? 'Connect your Google Account above to view live customer orders from the cloud database.'
                        : 'No matching orders found.'}
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const stageLabel = getStageLabel(order.currentStageIndex);
                      const isDelivered = order.currentStageIndex === 4;
                      const confirmingDelete = confirmDeleteOrderId === order.orderId;
                      const isOrderExpanded = Boolean(expandedOrderIds[order.orderId]);
                      const {
                        parsedItems,
                        itemBreakdowns,
                        calculatedSubtotal,
                        totalUnitsCount,
                        totalPenCount,
                      } = computeOrderFinancials(order, products);
                      const unitCountDisplay = totalUnitsCount || parsedItems.length;

                      return (
                        <div
                          key={order.orderId}
                          data-order-card-id={order.orderId}
                          className={`rounded-xl border bg-[var(--bg-card)] p-3.5 sm:p-4 transition-[border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            isOrderExpanded
                              ? 'border-accent/55 shadow-[0_12px_28px_-14px_rgba(var(--accent-rgb),0.32)]'
                              : 'border-[var(--border-subtle)] hover:border-accent/45'
                          }`}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={isOrderExpanded}
                            aria-label={`${isOrderExpanded ? 'Contract' : 'Expand'} order ${order.orderId}`}
                            onClick={() => toggleSingleOrderExpanded(order.orderId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleSingleOrderExpanded(order.orderId);
                              }
                            }}
                            className="flex flex-wrap items-start justify-between gap-2 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
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
                              {order.userEmail && isOrderExpanded && (
                                <p className="text-xs text-[var(--text-muted)] break-all">
                                  {order.userEmail}
                                </p>
                              )}
                              {!isOrderExpanded && (
                                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] truncate">
                                  <span className="font-mono-num">{order.phone}</span> · {order.address}
                                  {unitCountDisplay > 0
                                    ? ` · ${unitCountDisplay} ${unitCountDisplay === 1 ? 'item' : 'items'}`
                                    : ''}
                                </p>
                              )}
                            </div>

                            <div
                              className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {(totalPenCount > 0 || unitCountDisplay > 0) && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-accent/45 bg-accent/10 text-xs font-bold font-mono-num text-accent dark:text-accent-bright whitespace-nowrap">
                                  <PenTool className="w-3.5 h-3.5 shrink-0" />
                                  <span>
                                    {totalPenCount > 0
                                      ? `Total Pens: ${totalPenCount}`
                                      : `Total Items: ${unitCountDisplay}`}
                                  </span>
                                </div>
                              )}

                              <div className="text-right">
                                {isOrderExpanded && (
                                  <p className="text-[11px] text-[var(--text-muted)] font-mono-num">
                                    Subtotal: ৳{calculatedSubtotal.toLocaleString('en-US')}
                                  </p>
                                )}
                                <p className="text-sm sm:text-base font-bold font-mono-num text-accent dark:text-accent-bright">
                                  ৳{order.totalBdt.toLocaleString('en-US')}
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)]">Total (COD)</p>
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
                                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-60 transition-colors"
                                      >
                                        {deletingOrderId === order.orderId
                                          ? 'Restoring & Deleting...'
                                          : 'Confirm Delete'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={deletingOrderId === order.orderId}
                                        onClick={() => setConfirmDeleteOrderId(null)}
                                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-main)] disabled:opacity-60"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-[var(--text-muted)]">
                                      Deletes order &amp; restores ordered stock
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteOrderId(order.orderId)}
                                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                    aria-label={`Delete order ${order.orderId}`}
                                    title="Delete Order & Restore Stock"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Delete</span>
                                  </button>
                                )}

                              <button
                                type="button"
                                onClick={() => toggleSingleOrderExpanded(order.orderId)}
                                aria-expanded={isOrderExpanded}
                                aria-label={
                                  isOrderExpanded
                                    ? `Contract order ${order.orderId}`
                                    : `Expand order ${order.orderId}`
                                }
                                className={`w-9 h-9 rounded-lg border inline-flex items-center justify-center transition-colors ${
                                  isOrderExpanded
                                    ? 'border-accent bg-accent/15 text-accent-bright'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-accent hover:text-[var(--text-main)]'
                                }`}
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                    isOrderExpanded ? 'rotate-180' : 'rotate-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Smooth Expand / Contract Order Body */}
                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              isOrderExpanded
                                ? 'grid-rows-[1fr] opacity-100'
                                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]/70 space-y-3">
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

                          {/* Highlighted Ordered Items: Image, Item Name, Ink Colour, Body Colour, Subtotal */}
                          {parsedItems.length === 0 ? (
                            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)]/70 bg-[var(--bg-secondary)] px-3 py-2.5">
                              <p className="text-xs text-[var(--text-secondary)]">
                                <span className="font-semibold text-[var(--text-main)]">Items: </span>
                                {order.itemsSummary}
                              </p>
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]/60 text-xs">
                                <span className="font-semibold text-[var(--text-secondary)]">
                                  Subtotal:{' '}
                                  <span className="font-mono-num font-bold text-[var(--text-main)]">
                                    ৳{order.totalBdt.toLocaleString('en-US')}
                                  </span>
                                </span>
                                <span className="font-bold text-accent dark:text-accent-bright font-mono-num">
                                  Total (COD): ৳{order.totalBdt.toLocaleString('en-US')}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 rounded-xl border border-accent/45 bg-accent/[0.06] p-2.5 sm:p-3">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-accent dark:text-accent-bright">
                                Ordered Items ({parsedItems.length})
                              </p>
                              <div className="space-y-2">
                                {itemBreakdowns.map(
                                  ({ item, matchedProd, qtyNum, unitPrice, lineTotal }) => {
                                    const hideInk =
                                      !item.inkColorName ||
                                      Boolean(matchedProd && isOtherProduct(matchedProd));
                                    return (
                                      <div
                                        key={item.key}
                                        className="rounded-xl border border-accent/40 bg-[var(--bg-secondary)] p-2.5 flex items-start sm:items-center gap-2.5 sm:gap-3 shadow-[0_4px_14px_-6px_rgba(var(--accent-rgb),0.25)]"
                                      >
                                        {/* Highlighted Product Image */}
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-accent/70 bg-[#080506] shadow-[0_0_14px_rgba(var(--accent-rgb),0.3)] shrink-0 flex items-center justify-center">
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

                                        {/* Highlighted Item Name, Ink Colour, Body Colour & Price Breakdown */}
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-accent/15 border border-accent/45 text-xs sm:text-sm font-bold text-[var(--text-main)] max-w-full">
                                              <span className="truncate">{item.name}</span>
                                            </span>
                                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                              {typeof unitPrice === 'number' &&
                                                typeof lineTotal === 'number' && (
                                                  <span className="px-2 py-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] font-bold font-mono-num text-[var(--text-main)]">
                                                    ৳{unitPrice.toLocaleString('en-US')} × {qtyNum} = ৳
                                                    {lineTotal.toLocaleString('en-US')}
                                                  </span>
                                                )}
                                              <span className="px-2.5 py-0.5 rounded-lg bg-accent text-[var(--accent-cta-text)] text-xs font-extrabold font-mono-num shadow-[0_0_10px_rgba(var(--accent-rgb),0.38)] shrink-0">
                                                Qty × {item.quantity}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex flex-wrap items-center gap-1.5">
                                            {!hideInk && (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-violet-500/60 bg-violet-500/15 text-violet-900 dark:text-violet-200 text-xs font-bold">
                                                <Droplets className="w-3 h-3 shrink-0" />
                                                <span
                                                  className="w-3 h-3 rounded-full border border-white/75 dark:border-white/35 shrink-0"
                                                  style={{
                                                    backgroundColor: item.inkColorHex || '#111827',
                                                  }}
                                                />
                                                <span>Ink: {item.inkColorName}</span>
                                              </span>
                                            )}

                                            {item.bodyColorName && (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-500/60 bg-sky-500/15 text-sky-900 dark:text-sky-200 text-xs font-bold">
                                                <span
                                                  className="w-3.5 h-3.5 rounded-full border-2 border-white/85 dark:border-white/40 shadow-sm shrink-0"
                                                  style={{
                                                    backgroundColor: item.bodyColorHex || '#64748B',
                                                  }}
                                                />
                                                <span>
                                                  {matchedProd && isOtherProduct(matchedProd)
                                                    ? `Colour: ${item.bodyColorName}`
                                                    : `Body: ${item.bodyColorName}`}
                                                </span>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>

                              {/* Order Subtotal & Total Summary Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-accent/30 text-xs sm:text-sm">
                                <span className="text-[var(--text-secondary)] font-semibold">
                                  Subtotal ({totalUnitsCount || parsedItems.length}{' '}
                                  {(totalUnitsCount || parsedItems.length) === 1 ? 'item' : 'items'}):{' '}
                                  <span className="font-mono-num font-bold text-[var(--text-main)]">
                                    ৳{calculatedSubtotal.toLocaleString('en-US')}
                                  </span>
                                </span>
                                <span className="font-extrabold font-mono-num text-accent dark:text-accent-bright">
                                  Total (COD): ৳{order.totalBdt.toLocaleString('en-US')}
                                </span>
                              </div>
                            </div>
                          )}

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
                                    className={`min-h-[44px] sm:min-h-[38px] px-2.5 py-2 rounded-xl text-xs font-semibold border inline-flex items-center justify-center gap-1.5 transition-all ${
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
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Set Category & Manage Products Tab */
              <div
                ref={productsTabScrollRef}
                className="flex-1 overflow-y-auto overflow-x-hidden space-y-5 pr-1"
              >
                {/* Real-Time Cloud Database Sync & Backup Bar */}
                <div className="rounded-xl border border-accent/45 bg-[var(--bg-card)] p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Cloud className="w-4 h-4 text-accent-bright shrink-0" />
                        <h3 className="font-display text-xs sm:text-sm font-bold text-[var(--text-main)]">
                          Real-Time Cloud Database Sync
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isFirebaseAdmin || isCloudSynced
                              ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isFirebaseAdmin
                            ? 'Live Cloud Sync Active'
                            : isCloudSynced
                            ? 'Cloud Read Active'
                            : 'Local Changes Only'}
                        </span>
                        {hasUnpublishedProductChanges && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/50 text-amber-600 dark:text-amber-400">
                            Local Edits Unexported
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-[var(--text-secondary)]">
                        {isFirebaseAdmin
                          ? 'Every add, edit, stock change, and delete saves immediately to Firestore for all visitors and devices.'
                          : 'Connect Google Sync above to save products to the live cloud database, or export products.json for deployment backup.'}
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
                  className="rounded-2xl border border-accent/45 bg-[var(--bg-card)] p-4 sm:p-6 space-y-6"
                  noValidate
                >
                  {/* Form Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
                    <div className="space-y-1">
                      <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)]">
                        {editingProductId
                          ? `Edit Product: ${prodName || (isOtherMode ? 'Other Product' : 'Pen')}`
                          : 'Add New Product'}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {editingProductId
                          ? 'Update any details below and click Save Changes to update the live storefront.'
                          : 'Follow the four steps below. Required fields are marked with *.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {editingProductId ? (
                        <button
                          type="button"
                          onClick={resetProductForm}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-main)] hover:border-accent transition-colors whitespace-nowrap shrink-0"
                        >
                          Cancel Edit
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={resetProductForm}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                          title="Reset all fields back to default values"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Form</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step 01: Category & Basic Details */}
                  <section className="space-y-4">
                    <div className="px-3.5 py-2.5 rounded-xl border border-accent/45 bg-accent/10 space-y-0.5">
                      <h4 className="font-display text-sm font-bold text-accent dark:text-accent-bright">
                        01. Category &amp; Basic Information
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Choose where this product appears in the store and enter its name, brand, and description.
                      </p>
                    </div>

                    {/* Product Type */}
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright">
                        <span>Product Type</span>
                        <span className="text-rose-500">*</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          aria-pressed={!isOtherMode}
                          onClick={() => {
                            if (isOtherMode) {
                              setProdCategory('gel-pens');
                              setProdFormError('');
                            }
                          }}
                          className={`px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                            !isOtherMode
                              ? 'border-accent bg-accent/15 text-[var(--text-main)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.18)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-accent/60 hover:text-[var(--text-main)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs sm:text-sm font-bold ${
                                !isOtherMode ? 'text-accent dark:text-accent-bright' : ''
                              }`}
                            >
                              Pens
                            </span>
                            {!isOtherMode && (
                              <CheckCircle2 className="w-4 h-4 text-accent-bright shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            Gel, ballpoint, fountain, marker &amp; mechanical pens
                          </p>
                        </button>

                        <button
                          type="button"
                          aria-pressed={isOtherMode}
                          onClick={() => {
                            setProdCategory('other-products');
                            setProdFormError('');
                          }}
                          className={`px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                            isOtherMode
                              ? 'border-accent bg-accent/15 text-[var(--text-main)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.18)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-accent/60 hover:text-[var(--text-main)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs sm:text-sm font-bold ${
                                isOtherMode ? 'text-accent dark:text-accent-bright' : ''
                              }`}
                            >
                              Other Product
                            </span>
                            {isOtherMode && (
                              <CheckCircle2 className="w-4 h-4 text-accent-bright shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            Notebooks, geometry boxes, ink bottles &amp; stationery
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Category Selector */}
                    {isOtherMode ? (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="admin-other-category-select"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright"
                        >
                          <span>Stationery Subcategory</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="admin-other-category-select"
                          value={otherSubcategory}
                          onChange={(e) => setOtherSubcategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-accent/35 text-sm font-medium text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        >
                          {!OTHER_PRODUCT_SUBCATEGORIES.includes(otherSubcategory) && (
                            <option value={otherSubcategory}>{otherSubcategory}</option>
                          )}
                          {OTHER_PRODUCT_SUBCATEGORIES.map((subcat) => (
                            <option key={subcat} value={subcat}>
                              {subcat}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright">
                          <span>Pen Category</span>
                          <span className="text-rose-500">*</span>
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {PEN_CATEGORIES.map((cat) => {
                            const selected = prodCategory === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setProdCategory(cat.id)}
                                className={`px-3 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 text-left transition-all ${
                                  selected
                                    ? 'border-accent bg-accent/15 text-accent dark:text-accent-bright font-bold shadow-[0_0_12px_rgba(var(--accent-rgb),0.18)]'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold hover:border-accent/60 hover:text-[var(--text-main)]'
                                }`}
                              >
                                <span className="truncate">{cat.label}</span>
                                {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Name & Brand */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label
                          htmlFor="admin-product-name"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright"
                        >
                          <span>Product Name</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="admin-product-name"
                          type="text"
                          required
                          value={prodName}
                          onChange={(e) => {
                            setProdName(e.target.value);
                            if (prodFormError) setProdFormError('');
                          }}
                          placeholder={
                            isOtherMode
                              ? 'e.g. A5 Hardcover Dotted Notebook'
                              : 'e.g. Matador Hi-School Gel Pen'
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-accent/35 text-sm text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="admin-product-brand"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright"
                        >
                          <span>Brand</span>
                          <span className="font-normal text-[var(--text-muted)]">(Optional)</span>
                        </label>
                        <input
                          id="admin-product-brand"
                          type="text"
                          value={prodBrand}
                          onChange={(e) => setProdBrand(e.target.value)}
                          placeholder="e.g. Matador, Deli, Pilot"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-accent/35 text-sm text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                      </div>
                    </div>

                    {/* Short Description */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="admin-product-desc"
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright"
                      >
                        <span>Short Description</span>
                        <span className="font-normal text-[var(--text-muted)]">(Optional)</span>
                      </label>
                      <textarea
                        id="admin-product-desc"
                        rows={2}
                        value={prodShortDesc}
                        onChange={(e) => setProdShortDesc(e.target.value)}
                        placeholder={
                          isOtherMode
                            ? 'Describe size, page count, material, or key features...'
                            : 'Describe ink smoothness, grip comfort, and tip precision...'
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-accent/35 text-sm text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Shown on product cards and search results. Leave blank to auto-generate a summary.
                      </p>
                    </div>
                  </section>

                  {/* Step 02: Pricing & Pen Specs */}
                  <section className="space-y-4 pt-5 border-t border-[var(--border-subtle)]">
                    <div className="px-3.5 py-2.5 rounded-xl border border-accent/45 bg-accent/10 space-y-0.5">
                      <h4 className="font-display text-sm font-bold text-accent dark:text-accent-bright">
                        {isOtherMode
                          ? '02. Pricing & Stock Overview'
                          : '02. Pricing & Pen Specs'}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {isOtherMode
                          ? 'Set your selling price and an optional original price to highlight a discount.'
                          : 'Set selling price, optional original price, and tip & ink specifications.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="admin-product-price"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright"
                        >
                          <span>Selling Price (৳ BDT)</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="admin-product-price"
                          type="number"
                          min={1}
                          required
                          value={prodPrice}
                          onChange={(e) => {
                            setProdPrice(e.target.value);
                            if (prodFormError) setProdFormError('');
                          }}
                          className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-accent/35 text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="admin-product-original-price"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright"
                        >
                          <span>Original Price (৳)</span>
                          <span className="font-normal text-[var(--text-muted)]">(Optional)</span>
                        </label>
                        <input
                          id="admin-product-original-price"
                          type="number"
                          min={0}
                          value={prodOriginalPrice}
                          onChange={(e) => setProdOriginalPrice(e.target.value)}
                          placeholder="Leave blank if no discount"
                          className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-accent/35 text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                        {discountInfo && (
                          <p
                            className={`text-[11px] font-medium font-mono-num ${
                              discountInfo.valid
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {discountInfo.valid
                              ? `${discountInfo.percent}% off · Customer saves ৳${discountInfo.savings.toLocaleString('en-US')}`
                              : 'Must be higher than selling price to show discount'}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright">
                          Total Stock
                        </span>
                        <div className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-accent/30 text-sm font-mono-num font-bold text-[var(--text-main)] flex items-center justify-between gap-2">
                          <span>{autoTotalStock.toLocaleString('en-US')} pcs</span>
                          <span className="text-[11px] font-sans font-normal text-[var(--text-muted)]">
                            Auto-summed
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isOtherMode && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="admin-product-tip"
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright"
                          >
                            Tip / Nib Size
                          </label>
                          <input
                            id="admin-product-tip"
                            type="text"
                            value={prodTipSize}
                            onChange={(e) => setProdTipSize(e.target.value)}
                            placeholder="e.g. 0.5 mm Needle Tip"
                            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-accent/35 text-sm text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {TIP_SIZE_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setProdTipSize(preset)}
                                className={`min-h-[32px] sm:min-h-0 px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md border text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                                  prodTipSize === preset
                                    ? 'border-accent bg-accent/15 text-accent dark:text-accent-bright font-semibold'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:border-accent/60 hover:text-[var(--text-main)]'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="admin-product-ink-type"
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright"
                          >
                            Ink / Lead Type
                          </label>
                          <input
                            id="admin-product-ink-type"
                            type="text"
                            value={prodInkType}
                            onChange={(e) => setProdInkType(e.target.value)}
                            placeholder="e.g. Smooth Gel Ink"
                            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-accent/35 text-sm text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {INK_TYPE_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setProdInkType(preset)}
                                className={`min-h-[32px] sm:min-h-0 px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md border text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                                  prodInkType === preset
                                    ? 'border-accent bg-accent/15 text-accent dark:text-accent-bright font-semibold'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:border-accent/60 hover:text-[var(--text-main)]'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Step 03: Ink Colours, Body Colours, Photos & Stock */}
                  <section className="space-y-3.5 pt-5 border-t border-[var(--border-subtle)]">
                    <div className="px-3.5 py-2.5 rounded-xl border border-accent/45 bg-accent/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display text-sm font-bold text-accent dark:text-accent-bright">
                            {isOtherMode
                              ? '03. Colour Variants, Photos & Stock'
                              : '03. Ink Colours, Body Colours, Photos & Stock'}
                          </h4>
                          <span className="text-xs font-mono-num text-[var(--text-secondary)]">
                            {colorDrafts.filter((c) => c.inStock).length}/{colorDrafts.length} in stock ·{' '}
                            {autoTotalStock.toLocaleString('en-US')} pcs
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {isOtherMode
                            ? 'Add each product colour, set available units, and upload a photo or paste an image URL.'
                            : 'Choose ink colours first, then add each pen body colour, available units, and photo.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddColorDraft}
                        className="min-h-[40px] sm:min-h-0 px-3 py-2 rounded-xl border border-accent/55 bg-accent/10 text-xs font-semibold text-accent dark:text-accent-bright hover:bg-accent/20 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isOtherMode ? 'Add Colour' : 'Add Body Colour'}</span>
                      </button>
                    </div>

                    {/* Default Ink Colours (Positioned BEFORE Body Colours & Stock) */}
                    {!isOtherMode && (
                      <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/45 font-bold text-accent dark:text-accent-bright">
                                <Droplets className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Default Ink Colours <span className="text-rose-500">*</span>
                                </span>
                              </span>
                              <span className="text-[var(--text-muted)] font-normal font-mono-num">
                                · {prodInkColors.length} selected
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              New body colours copy these inks automatically, or tap &ldquo;Apply to All Body Colours&rdquo; to sync variants below.
                            </p>
                          </div>

                          {colorDrafts.length > 0 && (
                            <button
                              type="button"
                              onClick={handleApplyDefaultInksToAllBodies}
                              className="min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg border border-accent/45 bg-accent/10 text-[11px] font-semibold text-accent dark:text-accent-bright hover:bg-accent/20 transition-colors whitespace-nowrap shrink-0"
                              title="Replace ink choices on every body colour below with these defaults"
                            >
                              Apply to All Body Colours
                            </button>
                          )}
                        </div>

                        {/* Multi-Toggle Ink Presets */}
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
                                className={`min-h-[38px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                                  selected
                                    ? 'border-accent bg-accent/15 text-[var(--text-main)] font-semibold'
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

                        {/* Selected Custom Inks (if any non-preset added) */}
                        {prodInkColors.some(
                          (sel) =>
                            !INK_COLOR_PRESETS.some(
                              (p) => p.name.toLowerCase() === sel.name.trim().toLowerCase()
                            )
                        ) && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[11px] text-[var(--text-muted)]">
                              Custom inks:
                            </span>
                            {prodInkColors
                              .filter(
                                (sel) =>
                                  !INK_COLOR_PRESETS.some(
                                    (p) => p.name.toLowerCase() === sel.name.trim().toLowerCase()
                                  )
                              )
                              .map((ink) => (
                                <span
                                  key={ink.id}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-accent/45 bg-accent/10 text-xs font-medium text-[var(--text-main)]"
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/30 shrink-0"
                                    style={{ backgroundColor: ink.hex }}
                                  />
                                  <span>{ink.name}</span>
                                  {prodInkColors.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSelectedInkColor(ink.id)}
                                      className="text-[var(--text-muted)] hover:text-rose-500 p-0.5"
                                      aria-label={`Remove ${ink.name} ink`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              ))}
                          </div>
                        )}

                        {/* Custom Ink Adder */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                          <input
                            type="color"
                            value={customInkHex}
                            onChange={(e) => setCustomInkHex(e.target.value)}
                            aria-label="Custom ink colour picker"
                            className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg border border-[var(--border-subtle)] bg-transparent cursor-pointer shrink-0"
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
                            placeholder="Or add a custom ink (e.g. Blue-Black)"
                            className="flex-1 min-w-[140px] min-h-[42px] sm:min-h-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomInkColor}
                            className="min-h-[42px] sm:min-h-[36px] px-3 py-2 rounded-lg border border-accent/55 bg-accent/10 text-xs font-semibold text-accent dark:text-accent-bright hover:bg-accent/20 inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Ink</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Body Colour Variants */}
                    <div className="space-y-3">
                      {colorDrafts.map((col, idx) => {
                        const colorOutOfStock = !col.inStock;
                        const isInkEditorOpen = Boolean(expandedInkDraftIds[col.id]);
                        return (
                          <div
                            key={col.id}
                            className={`p-3.5 rounded-xl border space-y-3 transition-colors ${
                              colorOutOfStock
                                ? 'border-rose-500/45 bg-rose-500/[0.04]'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]'
                            }`}
                          >
                            {/* Variant Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-black/25 dark:border-white/30 shrink-0"
                                  style={{ backgroundColor: col.hex }}
                                />
                                <span className="font-semibold text-[var(--text-main)]">
                                  Variant {idx + 1}
                                  {col.name.trim() ? `: ${col.name.trim()}` : ''}
                                </span>
                                <span className="text-[var(--text-muted)]">·</span>
                                <span
                                  className={`font-mono-num font-medium ${
                                    colorOutOfStock
                                      ? 'text-rose-500'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {colorOutOfStock
                                    ? 'Out of Stock'
                                    : `${Math.max(0, Math.round(Number(col.stockCount) || 0))} pcs in stock`}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={!colorOutOfStock}
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
                                  className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                                    colorOutOfStock
                                      ? 'border-rose-500/60 bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                                      : 'border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                  title={`Toggle ${col.name || `Variant ${idx + 1}`} availability`}
                                >
                                  <span>{colorOutOfStock ? 'Marked Sold Out' : 'In Stock'}</span>
                                </button>

                                {colorDrafts.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColorDraft(col.id)}
                                    className="inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-rose-500 hover:border-rose-500/50 transition-colors shrink-0"
                                    aria-label={`Remove variant ${idx + 1}`}
                                    title="Remove this colour variant"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Per-Body Ink Colours (Switched BEFORE Body Colour Name) */}
                            {!isOtherMode && (
                              <div className="pb-2.5 border-b border-[var(--border-subtle)] space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-[11px] font-bold text-accent dark:text-accent-bright">
                                      Ink options
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {col.inkColors.map((ink) => (
                                        <span
                                          key={ink.id}
                                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-main)]"
                                        >
                                          <span
                                            className="w-2.5 h-2.5 rounded-full border border-black/25 dark:border-white/30 shrink-0"
                                            style={{ backgroundColor: ink.hex }}
                                          />
                                          <span>{ink.name}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedInkDraftIds((prev) => ({
                                        ...prev,
                                        [col.id]: !prev[col.id],
                                      }))
                                    }
                                    className="min-h-[38px] sm:min-h-0 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)] hover:border-accent hover:text-[var(--text-main)] inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                                  >
                                    <span>{isInkEditorOpen ? 'Done' : 'Customize Inks'}</span>
                                    {isInkEditorOpen ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>

                                {isInkEditorOpen && (
                                  <div className="space-y-2.5 pt-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-[11px] text-[var(--text-muted)]">
                                        Select ink colours sold specifically inside this{' '}
                                        {col.name.trim() || `variant ${idx + 1}`} body:
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateColorDraft(col.id, {
                                            inkColors: prodInkColors.map((i) => ({ ...i })),
                                          })
                                        }
                                        className="min-h-[34px] sm:min-h-0 text-[11px] font-semibold text-accent dark:text-accent-bright hover:underline whitespace-nowrap shrink-0"
                                      >
                                        Reset to Default Inks
                                      </button>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                      {INK_COLOR_PRESETS.map((ink) => {
                                        const selected = col.inkColors.some(
                                          (item) =>
                                            item.name.trim().toLowerCase() ===
                                            ink.name.toLowerCase()
                                        );
                                        return (
                                          <button
                                            key={ink.name}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => handleToggleVariantInkColor(col.id, ink)}
                                            className={`min-h-[36px] sm:min-h-[30px] px-2.5 py-1 sm:px-2 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                                              selected
                                                ? 'border-accent bg-accent/15 text-[var(--text-main)] font-semibold'
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

                                    {col.inkColors.some(
                                      (sel) =>
                                        !INK_COLOR_PRESETS.some(
                                          (p) =>
                                            p.name.toLowerCase() === sel.name.trim().toLowerCase()
                                        )
                                    ) && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {col.inkColors
                                          .filter(
                                            (sel) =>
                                              !INK_COLOR_PRESETS.some(
                                                (p) =>
                                                  p.name.toLowerCase() ===
                                                  sel.name.trim().toLowerCase()
                                              )
                                          )
                                          .map((ink) => (
                                            <span
                                              key={ink.id}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-accent/45 bg-accent/10 text-[11px] font-medium text-[var(--text-main)]"
                                            >
                                              <span
                                                className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/30 shrink-0"
                                                style={{ backgroundColor: ink.hex }}
                                              />
                                              <span>{ink.name}</span>
                                              {col.inkColors.length > 1 && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleRemoveVariantInkColor(col.id, ink.id)
                                                  }
                                                  className="text-[var(--text-muted)] hover:text-rose-500 p-0.5"
                                                  aria-label={`Remove ${ink.name} ink`}
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              )}
                                            </span>
                                          ))}
                                      </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
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
                                        aria-label={`Custom ink colour picker for ${col.name || `Variant ${idx + 1}`}`}
                                        className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-[var(--border-subtle)] bg-transparent cursor-pointer shrink-0"
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
                                        placeholder={`Add custom ink for ${col.name || 'this body'}...`}
                                        className="flex-1 min-w-[130px] min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-main)] focus:outline-none focus:border-accent"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAddCustomVariantInkColor(col.id)}
                                        className="min-h-[40px] sm:min-h-[30px] px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-accent/55 bg-accent/10 text-[11px] font-semibold text-accent dark:text-accent-bright hover:bg-accent/20 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Variant Main Controls: Photo Thumb + Body Colour Name + Hex + Quick Swatches + Qty */}
                            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                              {/* Photo Preview */}
                              <div className="shrink-0">
                                {col.image ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const variantSlides: LightboxSlide[] = colorDrafts
                                        .filter((draft) => Boolean(draft.image))
                                        .map((draft, slideIdx) => ({
                                          src: draft.image,
                                          label: draft.name.trim() || `Variant ${slideIdx + 1}`,
                                          colorHex: draft.hex,
                                        }));
                                      const startIdx = Math.max(
                                        0,
                                        variantSlides.findIndex((s) => s.src === col.image)
                                      );
                                      setLightboxState({
                                        title: prodName.trim() || col.name.trim() || 'Product Photo',
                                        slides:
                                          variantSlides.length > 0
                                            ? variantSlides
                                            : [
                                                {
                                                  src: col.image,
                                                  label: col.name.trim() || `Variant ${idx + 1}`,
                                                  colorHex: col.hex,
                                                },
                                              ],
                                        initialIndex: startIdx,
                                      });
                                    }}
                                    title="Click to inspect photo full screen"
                                    aria-label={`View ${col.name || `variant ${idx + 1}`} photo full screen`}
                                    className="group relative w-24 h-20 sm:w-20 sm:h-16 rounded-xl overflow-hidden border border-accent/45 hover:border-accent bg-[#0B0809] flex items-center justify-center transition-all"
                                  >
                                    <SafeImage
                                      src={col.image}
                                      alt={col.name || `Variant ${idx + 1}`}
                                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${
                                        colorOutOfStock ? 'opacity-45 grayscale-[30%]' : ''
                                      }`}
                                    />
                                    <span className="absolute bottom-1 right-1 w-5 h-5 rounded bg-black/75 border border-white/25 text-white flex items-center justify-center shadow">
                                      <Maximize2 className="w-3 h-3" />
                                    </span>
                                  </button>
                                ) : (
                                  <div className="w-24 h-20 sm:w-20 sm:h-16 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-input)] flex flex-col items-center justify-center gap-0.5 text-[var(--text-muted)]">
                                    <ImageIcon className="w-4 h-4" />
                                    <span className="text-[10px]">No photo</span>
                                  </div>
                                )}
                              </div>

                              {/* Body Colour Name, Picker, Quick Swatches, Qty */}
                              <div className="flex-1 space-y-2.5 min-w-0">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                  <div className="sm:col-span-8 space-y-1">
                                    <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-[11px] font-bold text-accent dark:text-accent-bright">
                                      <span>{isOtherMode ? 'Colour Name' : 'Body Colour Name'}</span>
                                      <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        value={col.hex}
                                        onChange={(e) =>
                                          handleUpdateColorDraft(col.id, { hex: e.target.value })
                                        }
                                        aria-label={`Colour picker for variant ${idx + 1}`}
                                        className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg border border-[var(--border-subtle)] bg-transparent cursor-pointer shrink-0"
                                      />
                                      <input
                                        type="text"
                                        value={col.name}
                                        onChange={(e) => {
                                          handleUpdateColorDraft(col.id, { name: e.target.value });
                                          if (prodFormError) setProdFormError('');
                                        }}
                                        placeholder={
                                          isOtherMode
                                            ? 'e.g. Navy Blue, Classic Black'
                                            : 'e.g. Matte Black, Pastel Pink'
                                        }
                                        className="flex-1 min-w-0 min-h-[42px] sm:min-h-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-accent/35 text-xs sm:text-sm text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                                      />
                                    </div>
                                  </div>

                                  <div className="sm:col-span-4 space-y-1">
                                    <label className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-[11px] font-bold text-accent dark:text-accent-bright">
                                      Stock Quantity
                                    </label>
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
                                      aria-label={`Stock quantity for ${col.name || `variant ${idx + 1}`}`}
                                      className="w-full min-h-[42px] sm:min-h-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-accent/35 text-xs sm:text-sm font-mono-num text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                                    />
                                  </div>
                                </div>

                                {/* 1-Click Quick Body Colour Presets */}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-1.5">
                                  <span className="text-[11px] text-[var(--text-muted)] mr-0.5">
                                    Quick pick:
                                  </span>
                                  {BODY_COLOR_PRESETS.map((preset) => {
                                    const active =
                                      col.name.trim().toLowerCase() === preset.name.toLowerCase();
                                    return (
                                      <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() =>
                                          handleUpdateColorDraft(col.id, {
                                            name: preset.name,
                                            hex: preset.hex,
                                          })
                                        }
                                        title={`Use ${preset.name} (${preset.hex})`}
                                        aria-label={`Set colour to ${preset.name}`}
                                        className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full border transition-transform hover:scale-110 shrink-0 ${
                                          active
                                            ? 'ring-2 ring-accent ring-offset-1 ring-offset-[var(--bg-secondary)] border-white/60'
                                            : 'border-black/25 dark:border-white/30'
                                        }`}
                                        style={{ backgroundColor: preset.hex }}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Photo URL & Upload Row */}
                            <div className="space-y-1.5">
                              <label className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-[11px] font-bold text-accent dark:text-accent-bright">
                                Product Photo (Upload or Image URL)
                              </label>
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <input
                                  type="text"
                                  value={col.image}
                                  onChange={(e) =>
                                    handleUpdateColorDraft(col.id, { image: e.target.value })
                                  }
                                  placeholder="Paste https:// image URL or click Upload Photo"
                                  className="flex-1 min-w-[200px] min-h-[42px] sm:min-h-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-accent/35 text-xs text-[var(--text-main)] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                                />

                                <label className="min-h-[42px] sm:min-h-0 px-3.5 py-2 rounded-lg border border-accent/60 bg-accent/10 hover:bg-accent/20 text-xs font-semibold text-[var(--text-main)] cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors">
                                  <ImagePlus className="w-4 h-4 text-accent-bright" />
                                  <span>{col.image ? 'Replace Photo' : 'Upload Photo'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleColorImageUpload(col.id, e.target.files?.[0])
                                    }
                                  />
                                </label>

                                {col.image && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateColorDraft(col.id, { image: '' })}
                                    className="min-h-[42px] sm:min-h-0 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)] hover:text-rose-500 hover:border-rose-500/45 whitespace-nowrap shrink-0 transition-colors"
                                    title="Remove attached photo"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Step 04: Visibility & Publish Summary */}
                  <section className="space-y-4 pt-5 border-t border-[var(--border-subtle)]">
                    <div className="px-3.5 py-2.5 rounded-xl border border-accent/45 bg-accent/10 space-y-0.5">
                      <h4 className="font-display text-sm font-bold text-accent dark:text-accent-bright">
                        04. Visibility &amp; Publish
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Choose whether to highlight this item on the homepage or mark the entire product sold out.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          prodFeatured
                            ? 'border-accent bg-accent/10'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-accent/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={prodFeatured}
                          onChange={(e) => setProdFeatured(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-accent rounded shrink-0"
                        />
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-xs font-bold text-accent dark:text-accent-bright">
                            Feature on Homepage
                          </span>
                          <span className="block text-[11px] text-[var(--text-muted)]">
                            Displays this item inside the Featured Pens &amp; Supplies showcase.
                          </span>
                        </div>
                      </label>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={prodOutOfStock}
                        onClick={() => setProdOutOfStock((prev) => !prev)}
                        className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-left transition-colors ${
                          prodOutOfStock
                            ? 'border-rose-500/60 bg-rose-500/10'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-accent/60'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span
                            className={`block text-xs font-semibold ${
                              prodOutOfStock
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-[var(--text-main)]'
                            }`}
                          >
                            {prodOutOfStock
                              ? 'Entire Product Marked Out of Stock'
                              : 'Product Available for Order'}
                          </span>
                          <span className="block text-[11px] text-[var(--text-muted)]">
                            {prodOutOfStock
                              ? 'Click to re-enable ordering based on variant stock.'
                              : 'Click to override variants and mark entire product Sold Out.'}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${
                            prodOutOfStock
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {prodOutOfStock ? 'Sold Out' : 'Active'}
                        </span>
                      </button>
                    </div>

                    {/* Live Publish Preview Bar */}
                    <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-[var(--text-main)] truncate">
                            {prodName.trim() || 'Untitled Product'}
                          </span>
                          <span className="text-[var(--text-muted)]">·</span>
                          <span className="text-[var(--text-secondary)]">
                            {selectedCategoryLabel}
                          </span>
                          <span className="text-[var(--text-muted)]">·</span>
                          <span className="font-mono-num font-bold text-[var(--text-main)]">
                            ৳
                            {(Number.isFinite(parsedSellingPrice) && parsedSellingPrice > 0
                              ? Math.round(parsedSellingPrice)
                              : 0
                            ).toLocaleString('en-US')}
                          </span>
                          {discountInfo?.valid && (
                            <span className="font-mono-num text-[11px] text-[var(--text-muted)] line-through">
                              ৳{Math.round(parsedMrpPrice).toLocaleString('en-US')}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono-num">
                          {colorDrafts.filter((c) => c.name.trim()).length}{' '}
                          {colorDrafts.filter((c) => c.name.trim()).length === 1
                            ? 'colour'
                            : 'colours'}{' '}
                          · {autoTotalStock.toLocaleString('en-US')} pcs total ·{' '}
                          {colorDrafts.filter((c) => Boolean(c.image.trim())).length}{' '}
                          {colorDrafts.filter((c) => Boolean(c.image.trim())).length === 1
                            ? 'photo'
                            : 'photos'}
                        </p>
                      </div>

                      <div className="text-xs font-semibold shrink-0">
                        {readinessIssues.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Ready to {editingProductId ? 'save' : 'publish'}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            Needed: {readinessIssues.join(', ')}
                          </span>
                        )}
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
                      className="w-full py-3 px-4 rounded-xl text-sm font-semibold cta-glow-red inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                    >
                      {savingProduct ? (
                        <span>Saving Live Changes...</span>
                      ) : editingProductId ? (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Changes to {prodName.trim() || 'Product'}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Add Product to {selectedCategoryLabel}</span>
                        </>
                      )}
                    </button>
                  </section>
                </form>

                {/* Manage Existing Catalogue Products */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                        Manage Products ({filteredProducts.length})
                      </h3>
                      {lowStockCount > 0 && (
                        <button
                          type="button"
                          aria-pressed={lowStockOnly}
                          onClick={() => setLowStockOnly((prev) => !prev)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                            lowStockOnly
                              ? 'border-amber-500 bg-amber-500 text-black'
                              : 'border-amber-500/55 bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                          }`}
                          title="Filter to items with fewer than 5 units in stock"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Low Stock Alert ({lowStockCount})</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap w-full sm:w-auto pb-0.5 sm:pb-0">
                      {CATALOGUE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCatalogListFilter(cat.id)}
                          className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap shrink-0 transition-colors ${
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
                      placeholder="Search products by name, brand, category, or colour..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
                    />
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-center text-xs text-[var(--text-secondary)]">
                      {lowStockOnly
                        ? 'No products with fewer than 5 units in stock match the current filter.'
                        : 'No matching products in this category. Use the form above to add one.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.map((prod) => {
                        const confirmingProdDelete = confirmDeleteProductId === prod.id;
                        const totalAvailableUnits = getProductTotalAvailableCount(prod);
                        const isOutOfStock = !prod.inStock || totalAvailableUnits <= 0;
                        const isLowStock =
                          !isOutOfStock && totalAvailableUnits < LOW_STOCK_THRESHOLD;
                        const isEditingThis = editingProductId === prod.id;
                        return (
                          <div
                            key={prod.id}
                            className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              isEditingThis
                                ? 'border-accent bg-accent/5'
                                : isLowStock
                                ? 'border-amber-500/65 bg-amber-500/[0.06]'
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
                                  {isLowStock && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/55 text-amber-700 dark:text-amber-300">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>Low Stock · {totalAvailableUnits} left</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                                  <span className="font-mono-num font-semibold text-[var(--text-main)]">
                                    ৳{prod.priceBdt.toLocaleString('en-US')}
                                  </span>
                                  <span>·</span>
                                  <span
                                    className={`text-[11px] font-mono-num ${
                                      isLowStock
                                        ? 'font-bold text-amber-600 dark:text-amber-400'
                                        : 'text-[var(--text-muted)]'
                                    }`}
                                  >
                                    Total: {totalAvailableUnits.toLocaleString('en-US')} pcs
                                    {' · '}
                                    {prod.colors.filter((c) => getColorAvailableCount(prod, c) > 0).length}/
                                    {prod.colors.length}{' '}
                                    {prod.colors.length === 1 ? 'colour' : 'colours'}
                                  </span>
                                  <span>·</span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {prod.colors.map((c) => {
                                      const otherItem = isOtherProduct(prod);
                                      const comboInks = otherItem
                                        ? []
                                        : getVariantInkColors(prod, c);
                                      const colorSoldOut = !c.inStock;
                                      const colorCount = getColorAvailableCount(prod, c);
                                      const colorLowStock =
                                        !colorSoldOut &&
                                        colorCount > 0 &&
                                        colorCount < LOW_STOCK_THRESHOLD;
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
                                          className={`min-h-[34px] sm:min-h-0 inline-flex items-center gap-1.5 px-2 py-1 sm:px-1.5 sm:py-0.5 rounded-md border text-[11px] transition-colors ${
                                            colorSoldOut
                                              ? 'border-rose-500/45 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                                              : colorLowStock
                                              ? 'border-amber-500/55 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                                              : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-accent/60'
                                          }`}
                                          title={`Click to mark ${c.name} colour ${
                                            colorSoldOut ? 'In Stock' : 'Out of Stock'
                                          }${
                                            otherItem
                                              ? ''
                                              : ` · ${comboInks.map((i) => i.name).join(', ')} ink`
                                          }`}
                                        >
                                          {!otherItem && comboInks.length > 0 && (
                                            <>
                                              <span className="inline-flex items-center -space-x-1 shrink-0">
                                                {comboInks.map((ink) => (
                                                  <span
                                                    key={ink.id}
                                                    className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/30 inline-block"
                                                    style={{ backgroundColor: ink.hex }}
                                                  />
                                                ))}
                                              </span>
                                              <span className="text-[var(--text-muted)]">·</span>
                                            </>
                                          )}
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
                                            <span
                                              className={`text-[10px] font-mono-num ${
                                                colorLowStock
                                                  ? 'font-bold text-amber-700 dark:text-amber-300'
                                                  : 'text-[var(--text-muted)]'
                                              }`}
                                            >
                                              ({colorCount})
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
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
                                className={`min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
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
                                className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
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
                                    className="min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteProductId(null)}
                                    className="min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteProductId(prod.id)}
                                  className="min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
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
