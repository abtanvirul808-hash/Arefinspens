import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  CartItem,
  CategoryId,
  DemoUser,
  InfoTopic,
  InkColorOption,
  OrderLineItem,
  PageRoute,
  Product,
  StorePreferences,
  TrackedOrder,
} from '../types';
import {
  CATALOGUE_CATEGORIES,
  getColorAvailableCount,
  getVariantInkColors,
  isOtherProduct,
  PRODUCTS,
} from '../data/products';
import {
  auth,
  db,
  formatLiveSyncError,
  googleProvider,
  handleFirestoreError,
  isAuthorizedAdminEmail,
  OperationType,
} from '../firebase';
import { parseOrderSummaryItems } from '../utils/orderItems';
import { applyDynamicFavicon } from '../utils/themeFavicon';

interface ToastState {
  id: number;
  message: string;
}

export interface NewProductColorInput {
  id?: string;
  name: string;
  hex: string;
  inStock?: boolean;
  stockCount?: number;
  image?: string;
  inkColors?: InkColorOption[];
}

export interface NewProductInput {
  name: string;
  brand?: string;
  category: Exclude<CategoryId, 'all' | 'all-pens'>;
  categoryLabel?: string;
  priceBdt: number;
  originalPriceBdt?: number;
  stockCount: number;
  outOfStock?: boolean;
  shortDescription: string;
  description?: string;
  tipSize?: string;
  inkType?: string;
  inkColor?: string;
  inkColorHex?: string;
  inkColors?: InkColorOption[];
  bodyMaterial?: string;
  featured?: boolean;
  images: string[];
  colors: NewProductColorInput[];
}

interface StoreContextValue {
  route: PageRoute;
  selectedCategory: CategoryId;
  selectedProductSlug: string;
  infoTopic: InfoTopic;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  navigate: (
    route: PageRoute,
    options?: {
      category?: CategoryId;
      productSlug?: string;
      infoTopic?: InfoTopic;
      scrollToTop?: boolean;
    }
  ) => void;

  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  addToCart: (
    product: Product,
    colorId?: string,
    quantity?: number,
    openDrawer?: boolean,
    inkColorId?: string
  ) => void;
  updateCartQuantity: (key: string, quantity: number) => void;
  updateCartItemVariant: (
    key: string,
    nextColorId: string,
    nextInkColorId: string
  ) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;

  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;

  preferences: StorePreferences;
  toggleTheme: () => void;
  updatePreferences: (patch: Partial<StorePreferences>) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;

  products: Product[];
  isCloudSynced: boolean;
  hasUnpublishedProductChanges: boolean;
  exportLiveProductsJson: () => string;
  syncWithLiveCatalog: () => Promise<void>;
  addAdminProduct: (
    input: NewProductInput
  ) => Promise<{ ok: boolean; error?: string; product?: Product }>;
  updateAdminProduct: (
    productId: string,
    input: NewProductInput
  ) => Promise<{ ok: boolean; error?: string; product?: Product }>;
  toggleProductOutOfStock: (productId: string) => Promise<void>;
  toggleProductColorStock: (productId: string, colorId: string) => Promise<void>;
  deleteAdminProduct: (productId: string) => Promise<void>;

  orders: TrackedOrder[];
  adminOrders: TrackedOrder[];
  nextOrderId: string;
  createOrder: (order: TrackedOrder) => Promise<TrackedOrder>;
  findOrder: (orderId: string, phone: string) => Promise<TrackedOrder | undefined>;
  updateOrderStage: (orderId: string, stageIndex: number) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;

  demoUser: DemoUser | null;
  isCustomerSignedIn: boolean;
  authLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  loginDemoUser: (
    name: string,
    email: string,
    phone: string
  ) => Promise<{ ok: boolean; error?: string }>;
  loginCustomerWithGoogle: (phone?: string) => Promise<{ ok: boolean; error?: string }>;
  logoutDemoUser: () => Promise<void>;

  isAdmin: boolean;
  isFirebaseAdmin: boolean;
  adminEmail: string | null;
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (open: boolean) => void;
  loginAdmin: (email: string, password: string) => { ok: boolean; error?: string };
  loginAdminWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;

  toast: ToastState | null;
  showToast: (message: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_KEYS = {
  cart: 'arefin_pen_cart_v1',
  wishlist: 'arefin_pen_wishlist_v1',
  prefs: 'arefin_pen_prefs_v1',
  user: 'arefin_pen_demo_user_v1',
  orders: 'arefin_pen_demo_orders_v1',
  deletedOrders: 'arefin_pen_deleted_orders_v1',
  orderStages: 'arefin_pen_order_stages_v1',
  customProducts: 'arefin_pen_custom_products_v1',
  productOverrides: 'arefin_pen_product_overrides_v1',
  deletedProducts: 'arefin_pen_deleted_products_v1',
  catalogDraftAt: 'arefin_pen_catalog_draft_at_v1',
  userPhones: 'arefin_pen_user_phones_v1',
};

const ADMIN_ACCOUNT = {
  email: 'adminarefin808@gmail.com',
  password: 'Arefin@808#',
};

const STAGE_LABELS = [
  'Order Placed',
  'Order Confirmed',
  'Preparing Your Order',
  'Shipped',
  'Delivered',
];

const DEFAULT_PREFS: StorePreferences = {
  theme: 'dark',
  accentColor: 'red',
  reducedMotion: false,
  textSize: 'standard',
};

function parseSerialNumber(orderId: string): number {
  const match = orderId.trim().match(/^#?(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function slugifyProductName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'pen';
}

function extractTimestampMs(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === 'object') {
    const ts = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof ts.toMillis === 'function') {
      return ts.toMillis();
    }
    if (typeof ts.seconds === 'number') {
      return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
    }
  }
  return undefined;
}

function normalizeInkColorsList(
  inkColors?: InkColorOption[],
  fallbackName?: string,
  fallbackHex?: string
): InkColorOption[] {
  const seen = new Set<string>();
  const list: InkColorOption[] = [];

  if (Array.isArray(inkColors)) {
    for (const item of inkColors) {
      const name = item?.name?.trim().slice(0, 40);
      if (!name) continue;
      const dedupeKey = name.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      list.push({
        id: item.id?.trim() || slugifyProductName(name),
        name,
        hex: item.hex?.trim() || '#111827',
      });
      if (list.length >= 12) break;
    }
  }

  if (list.length === 0) {
    const safeName = fallbackName?.trim().slice(0, 40) || 'Black';
    list.push({
      id: slugifyProductName(safeName),
      name: safeName,
      hex: fallbackHex?.trim() || '#111827',
    });
  }

  return list;
}

function sanitizeColorsForFirestore(
  product: Product,
  colors: Product['colors']
): Record<string, unknown>[] {
  const otherItem = isOtherProduct(product);
  return colors.slice(0, 12).map((c, idx) => {
    const rawCount =
      typeof c.stockCount === 'number' && Number.isFinite(c.stockCount)
        ? Math.max(0, Math.round(c.stockCount))
        : c.inStock
        ? getColorAvailableCount(product, c)
        : 0;
    const cleaned: Record<string, unknown> = {
      id: c.id?.trim() || `${slugifyProductName(c.name)}-${idx + 1}`,
      name: c.name.trim().slice(0, 80),
      hex: c.hex?.trim() || '#111827',
      inStock: Boolean(c.inStock),
      stockCount: rawCount,
    };
    if (c.image && c.image.trim()) {
      cleaned.image = c.image.trim();
    }
    if (!otherItem && Array.isArray(c.inkColors) && c.inkColors.length > 0) {
      cleaned.inkColors = c.inkColors.slice(0, 12).map((ink) => ({
        id: ink.id?.trim() || slugifyProductName(ink.name),
        name: ink.name.trim().slice(0, 40),
        hex: ink.hex?.trim() || '#111827',
      }));
    }
    return cleaned;
  });
}

function serializeProductForFirestore(
  product: Product,
  isNewDoc: boolean,
  existingCreatedAt?: unknown
): Record<string, unknown> {
  const cleanSpecs: Record<string, unknown> = {
    tipSize: product.specs.tipSize || 'Standard',
    inkType: product.specs.inkType || 'N/A',
    bodyMaterial: product.specs.bodyMaterial || 'Standard',
    weight: product.specs.weight || 'Standard',
    origin: product.specs.origin || product.brand || 'Arefin Mart',
  };
  if (product.specs.inkColor) cleanSpecs.inkColor = product.specs.inkColor;
  if (product.specs.inkColorHex) cleanSpecs.inkColorHex = product.specs.inkColorHex;
  if (Array.isArray(product.specs.inkColors) && product.specs.inkColors.length > 0) {
    cleanSpecs.inkColors = product.specs.inkColors.slice(0, 12).map((ink) => ({
      id: ink.id,
      name: ink.name,
      hex: ink.hex,
    }));
  }

  const payload: Record<string, unknown> = {
    id: product.id,
    slug: product.slug || product.id,
    name: product.name.trim().slice(0, 120),
    brand: (product.brand || 'Arefin Mart').trim().slice(0, 80),
    category: product.category,
    categoryLabel: (product.categoryLabel || 'Pens').trim().slice(0, 80),
    shortDescription: product.shortDescription.trim().slice(0, 400),
    description: (product.description || product.shortDescription).trim().slice(0, 2000),
    priceBdt: Math.max(1, Number(product.priceBdt) || 1),
    rating: Math.min(5, Math.max(0, Number(product.rating) || 4.9)),
    reviewCount: Math.max(0, Math.round(Number(product.reviewCount) || 0)),
    popularityScore: Math.min(1000, Math.max(0, Math.round(Number(product.popularityScore) || 50))),
    orderCount: Math.max(0, Math.round(Number(product.orderCount) || 0)),
    featured: Boolean(product.featured),
    isNew: Boolean(product.isNew),
    inStock: Boolean(product.inStock),
    stockCount: Math.max(0, Math.round(Number(product.stockCount) || 0)),
    images: (Array.isArray(product.images) ? product.images : []).filter(Boolean).slice(0, 12),
    colors: sanitizeColorsForFirestore(product, product.colors || []),
    specs: cleanSpecs,
    sampleReviews: Array.isArray(product.sampleReviews)
      ? product.sampleReviews.slice(0, 20)
      : [],
    createdAt: isNewDoc ? serverTimestamp() : existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (
    typeof product.originalPriceBdt === 'number' &&
    Number.isFinite(product.originalPriceBdt) &&
    product.originalPriceBdt > product.priceBdt
  ) {
    payload.originalPriceBdt = Math.round(product.originalPriceBdt);
  }

  return payload;
}

function normalizeTrackedOrderFromFirestore(
  data: Record<string, unknown>,
  fallbackDocId: string
): TrackedOrder {
  const serialNum =
    typeof data.serialNumber === 'number' && Number.isFinite(data.serialNumber)
      ? Math.round(data.serialNumber)
      : parseSerialNumber(String(data.orderId || fallbackDocId));
  const orderId =
    typeof data.orderId === 'string' && data.orderId.trim()
      ? data.orderId.trim()
      : serialNum > 0
      ? `#${serialNum}`
      : fallbackDocId;
  return {
    orderId,
    serialNumber: serialNum > 0 ? serialNum : undefined,
    userId: typeof data.userId === 'string' ? data.userId : undefined,
    userEmail: typeof data.userEmail === 'string' ? data.userEmail : undefined,
    phone: String(data.phone || ''),
    customerName: String(data.customerName || ''),
    city: String(data.city || ''),
    academyClass:
      data.academyClass === '5' || data.academyClass === '6' || data.academyClass === '7'
        ? data.academyClass
        : undefined,
    address: String(data.address || ''),
    paymentMethod: 'cod',
    totalBdt: Number(data.totalBdt) || 0,
    itemsSummary: String(data.itemsSummary || ''),
    orderItems: Array.isArray(data.orderItems) ? (data.orderItems as OrderLineItem[]) : undefined,
    placedAt: String(data.placedAt || 'Just now'),
    currentStageIndex:
      typeof data.currentStageIndex === 'number' ? Math.max(0, Math.min(4, data.currentStageIndex)) : 1,
    isDemoRecord: false,
  };
}

class StockValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockValidationError';
  }
}

function getCartColorUsedCount(
  cartItems: CartItem[],
  productId: string,
  colorId: string,
  excludeKey?: string
): number {
  return cartItems.reduce((sum, item) => {
    if (item.productId !== productId || item.colorId !== colorId) return sum;
    if (excludeKey && item.key === excludeKey) return sum;
    return sum + Math.max(0, Math.round(item.quantity));
  }, 0);
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<PageRoute>('home');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all-pens');
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>(PRODUCTS[0]?.slug ?? '');
  const [infoTopic, setInfoTopic] = useState<InfoTopic>('shipping');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [cart, setCart] = useState<CartItem[]>(() => readStorage(STORAGE_KEYS.cart, []));
  const [wishlist, setWishlist] = useState<string[]>(() => readStorage(STORAGE_KEYS.wishlist, []));
  const [preferences, setPreferences] = useState<StorePreferences>(() => ({
    ...DEFAULT_PREFS,
    ...readStorage<Partial<StorePreferences>>(STORAGE_KEYS.prefs, DEFAULT_PREFS),
  }));
  const [liveCatalog, setLiveCatalog] = useState<{ updatedAt: string; products: Product[] } | null>(
    null
  );
  const [catalogDraftAt, setCatalogDraftAt] = useState<string | null>(() =>
    readStorage(STORAGE_KEYS.catalogDraftAt, null)
  );
  const [customProducts, setCustomProducts] = useState<Product[]>(() =>
    readStorage(STORAGE_KEYS.customProducts, [])
  );
  const [productOverrides, setProductOverrides] = useState<Record<string, Product>>(() =>
    readStorage(STORAGE_KEYS.productOverrides, {})
  );
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>(() =>
    readStorage(STORAGE_KEYS.deletedProducts, [])
  );
  const [localOrders, setLocalOrders] = useState<(TrackedOrder & { serialNumber?: number })[]>(() =>
    readStorage(STORAGE_KEYS.orders, [])
  );
  const [savedPhonesByUid, setSavedPhonesByUid] = useState<Record<string, string>>(() =>
    readStorage(STORAGE_KEYS.userPhones, {})
  );

  // Firebase Auth & Firestore state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [cloudAdminAllowed, setCloudAdminAllowed] = useState<boolean>(false);

  const [cloudProducts, setCloudProducts] = useState<Product[] | null>(null);
  const [catalogSeeded, setCatalogSeeded] = useState<boolean>(false);
  const [cloudLastOrderNumber, setCloudLastOrderNumber] = useState<number>(0);
  const [cloudOrders, setCloudOrders] = useState<TrackedOrder[]>([]);
  const [cloudAdminOrders, setCloudAdminOrders] = useState<TrackedOrder[]>([]);
  const [adminOrdersLoaded, setAdminOrdersLoaded] = useState<boolean>(false);

  const autoSeedingRef = useRef<boolean>(false);
  const backfilledOrderCountIdsRef = useRef<Set<string>>(new Set());

  const [isLocalAdmin, setIsLocalAdmin] = useState<boolean>(() => {
    const stored = readStorage<{ verified?: boolean } | boolean>(
      'arefin_pen_admin_session_v2',
      false
    );
    if (typeof stored === 'boolean') return stored;
    return typeof stored === 'object' && stored !== null ? Boolean(stored.verified) : false;
  });

  const isFirebaseAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      (isAuthorizedAdminEmail(firebaseUser.email) || cloudAdminAllowed)
  );
  const isAdmin = isLocalAdmin || isFirebaseAdmin;
  const isCustomerSignedIn = Boolean(firebaseUser && firebaseUser.emailVerified);

  const demoUser: DemoUser | null = useMemo(() => {
    if (!isCustomerSignedIn || !firebaseUser) return null;
    return {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Customer',
      email: firebaseUser.email || '',
      phone: savedPhonesByUid[firebaseUser.uid] || '',
    };
  }, [isCustomerSignedIn, firebaseUser, savedPhonesByUid]);

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Firebase Auth listener + /admins/{uid} role verification
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        if (isAuthorizedAdminEmail(user.email)) {
          setCloudAdminAllowed(true);
        } else {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', user.uid));
            setCloudAdminAllowed(adminSnap.exists());
          } catch {
            setCloudAdminAllowed(false);
          }
        }
      } else {
        setCloudAdminAllowed(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to public Firestore meta & products catalog
  useEffect(() => {
    const unsubMeta = onSnapshot(
      doc(db, 'meta', 'catalogMeta'),
      (snap) => {
        setCatalogSeeded(Boolean(snap.data()?.seeded));
      },
      () => {
        // Ignore meta listener errors cleanly
      }
    );

    const unsubCounter = onSnapshot(
      doc(db, 'meta', 'orderCounter'),
      (snap) => {
        const val = snap.data()?.lastOrderNumber;
        if (typeof val === 'number' && Number.isFinite(val)) {
          setCloudLastOrderNumber(val);
        }
      },
      () => {
        // Ignore offline/counter read issues cleanly
      }
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list: Product[] = snapshot.docs.map((d) => {
          const data = d.data() as Product & { createdAt?: unknown };
          return {
            ...data,
            id: data.id || d.id,
            slug: data.slug || d.id,
            orderCount:
              typeof data.orderCount === 'number' && Number.isFinite(data.orderCount)
                ? Math.max(0, Math.round(data.orderCount))
                : undefined,
            createdAtMs: extractTimestampMs(data.createdAt),
          };
        });
        list.sort((a, b) => {
          const orderDiff = (b.orderCount ?? 0) - (a.orderCount ?? 0);
          if (orderDiff !== 0) return orderDiff;
          const popDiff = (b.popularityScore || 0) - (a.popularityScore || 0);
          if (popDiff !== 0) return popDiff;
          return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
        });
        setCloudProducts(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'products');
        } catch {
          // Handled safely; falls back to bundled catalog
        }
      }
    );

    return () => {
      unsubMeta();
      unsubCounter();
      unsubProducts();
    };
  }, []);

  // Subscribe to signed-in customer's own private orders (by uid and email)
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      setCloudOrders([]);
      return;
    }

    const uidMap = new Map<string, TrackedOrder>();
    const emailMap = new Map<string, TrackedOrder>();

    const syncCombinedOrders = () => {
      const merged = new Map<string, TrackedOrder>();
      for (const ord of uidMap.values()) merged.set(ord.orderId, ord);
      for (const ord of emailMap.values()) merged.set(ord.orderId, ord);
      const list = Array.from(merged.values());
      list.sort(
        (a, b) =>
          (b.serialNumber || parseSerialNumber(b.orderId)) -
          (a.serialNumber || parseSerialNumber(a.orderId))
      );
      setCloudOrders(list);
    };

    const unsubByUid = onSnapshot(
      query(collection(db, 'orders'), where('userId', '==', firebaseUser.uid)),
      (snap) => {
        uidMap.clear();
        snap.docs.forEach((d) => {
          const ord = normalizeTrackedOrderFromFirestore(
            d.data() as Record<string, unknown>,
            d.id
          );
          uidMap.set(ord.orderId, ord);
        });
        syncCombinedOrders();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        } catch {
          // Handled safely
        }
      }
    );

    let unsubByEmail: (() => void) | undefined;
    if (firebaseUser.email) {
      unsubByEmail = onSnapshot(
        query(collection(db, 'orders'), where('userEmail', '==', firebaseUser.email)),
        (snap) => {
          emailMap.clear();
          snap.docs.forEach((d) => {
            const ord = normalizeTrackedOrderFromFirestore(
              d.data() as Record<string, unknown>,
              d.id
            );
            emailMap.set(ord.orderId, ord);
          });
          syncCombinedOrders();
        },
        () => {
          // Email fallback listener error ignored silently if uid listener works
        }
      );
    }

    return () => {
      unsubByUid();
      if (unsubByEmail) unsubByEmail();
    };
  }, [firebaseUser?.uid, firebaseUser?.email, firebaseUser?.emailVerified]);

  // Subscribe to all orders when signed in as verified Firebase Admin
  useEffect(() => {
    if (!isFirebaseAdmin) {
      setCloudAdminOrders([]);
      setAdminOrdersLoaded(false);
      return;
    }

    const q = query(collection(db, 'orders'), orderBy('serialNumber', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) =>
          normalizeTrackedOrderFromFirestore(d.data() as Record<string, unknown>, d.id)
        );
        list.sort(
          (a, b) =>
            (b.serialNumber || parseSerialNumber(b.orderId)) -
            (a.serialNumber || parseSerialNumber(a.orderId))
        );
        setCloudAdminOrders(list);
        setAdminOrdersLoaded(true);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        } catch {
          // Handled cleanly
        }
      }
    );

    return () => unsub();
  }, [isFirebaseAdmin]);

  // Apply theme, accent colour, reduced motion, and text size to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-accent', preferences.accentColor || 'red');
    root.setAttribute('data-reduced-motion', String(preferences.reducedMotion));
    root.setAttribute('data-text-size', preferences.textSize);
    applyDynamicFavicon(preferences.theme, preferences.accentColor || 'red');
    try {
      localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(preferences));
    } catch {
      // ignore storage quota errors
    }
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(localOrders));
    } catch {
      // ignore
    }
  }, [localOrders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.userPhones, JSON.stringify(savedPhonesByUid));
    } catch {
      // ignore
    }
  }, [savedPhonesByUid]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.customProducts, JSON.stringify(customProducts));
    } catch {
      // ignore
    }
  }, [customProducts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.productOverrides, JSON.stringify(productOverrides));
    } catch {
      // ignore
    }
  }, [productOverrides]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.deletedProducts, JSON.stringify(deletedProductIds));
    } catch {
      // ignore
    }
  }, [deletedProductIds]);

  useEffect(() => {
    try {
      if (catalogDraftAt) {
        localStorage.setItem(STORAGE_KEYS.catalogDraftAt, JSON.stringify(catalogDraftAt));
      } else {
        localStorage.removeItem(STORAGE_KEYS.catalogDraftAt);
      }
    } catch {
      // ignore
    }
  }, [catalogDraftAt]);

  // Fetch fallback /data/products.json (used when cloud catalog is not yet populated)
  useEffect(() => {
    let active = true;
    const loadLiveCatalog = async () => {
      try {
        const res = await fetch(`/data/products.json?v=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { updatedAt?: string; products?: Product[] };
        if (!active || !Array.isArray(data?.products)) return;
        const liveUpdatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : '';
        setLiveCatalog({ updatedAt: liveUpdatedAt, products: data.products });
      } catch {
        // Offline or fallback uses bundled PRODUCTS
      }
    };
    void loadLiveCatalog();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      if (isLocalAdmin) {
        localStorage.setItem('arefin_pen_admin_session_v2', JSON.stringify(true));
      } else {
        localStorage.removeItem('arefin_pen_admin_session_v2');
      }
    } catch {
      // ignore
    }
  }, [isLocalAdmin]);

  // Sync URL hash for Back/Forward navigation
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) {
        setRoute('home');
        return;
      }
      const [pathPart, queryPart] = hash.split('?');
      const segments = pathPart.split('/').filter(Boolean);
      const base = segments[0] || '';

      if (base === 'shop') {
        const params = new URLSearchParams(queryPart || '');
        const cat = params.get('category') as CategoryId | null;
        setSelectedCategory(cat || 'all-pens');
        setRoute('shop');
      } else if (base === 'product' && segments[1]) {
        setSelectedProductSlug(segments[1]);
        setRoute('product');
      } else if (base === 'cart') {
        setRoute('cart');
      } else if (base === 'checkout') {
        setRoute('checkout');
      } else if (base === 'track-order' || base === 'your-order') {
        setRoute('track-order');
      } else if (base === 'about') {
        setRoute('about');
      } else if (base === 'contact') {
        setRoute('contact');
      } else if (base === 'info' && segments[1]) {
        setInfoTopic(segments[1] as InfoTopic);
        setRoute('info');
      } else {
        setRoute('home');
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const showToast = (message: string) => {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3200);
  };

  const navigate: StoreContextValue['navigate'] = (nextRoute, options) => {
    const { category, productSlug, infoTopic: nextTopic, scrollToTop = true } = options || {};

    if (category !== undefined) {
      setSelectedCategory(category);
    }
    if (productSlug) {
      setSelectedProductSlug(productSlug);
    }
    if (nextTopic) {
      setInfoTopic(nextTopic);
    }

    setRoute(nextRoute);

    let nextHash = '#/';
    if (nextRoute === 'shop') {
      const cat = category ?? selectedCategory;
      nextHash = cat && cat !== 'all' ? `#/shop?category=${cat}` : '#/shop';
    } else if (nextRoute === 'product') {
      nextHash = `#/product/${productSlug || selectedProductSlug}`;
    } else if (nextRoute === 'info') {
      nextHash = `#/info/${nextTopic || infoTopic}`;
    } else if (nextRoute !== 'home') {
      nextHash = `#/${nextRoute}`;
    }

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }

    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: preferences.reducedMotion ? 'auto' : 'smooth' });
    }
  };

  const addToCart = (
    product: Product,
    colorId?: string,
    quantity = 1,
    openDrawer = true,
    inkColorId?: string
  ) => {
    if (!product.inStock) {
      showToast(`${product.name} is currently out of stock`);
      return;
    }
    const availableColors = product.colors.filter((c) => c.inStock);
    if (availableColors.length === 0) {
      showToast(`${product.name} has no colours in stock right now`);
      return;
    }
    if (colorId) {
      const explicitColor = product.colors.find((c) => c.id === colorId);
      if (explicitColor && !explicitColor.inStock) {
        showToast(`${explicitColor.name} colour is currently out of stock`);
        return;
      }
    }
    const chosen =
      (colorId ? availableColors.find((c) => c.id === colorId) : undefined) ||
      availableColors[0];
    const liveProduct = products.find((p) => p.id === product.id) || product;
    const liveChosen = liveProduct.colors.find((c) => c.id === chosen?.id) || chosen;
    const colorAvailable = getColorAvailableCount(liveProduct, liveChosen);
    if (!liveChosen || colorAvailable <= 0) {
      showToast(`${liveChosen?.name || liveProduct.name} is currently out of stock`);
      return;
    }

    const alreadyInColor = getCartColorUsedCount(cart, liveProduct.id, liveChosen.id);
    const remainingAddable = Math.max(0, colorAvailable - alreadyInColor);
    if (remainingAddable <= 0) {
      showToast(
        `Maximum available reached: all ${colorAvailable} ${liveChosen.name} ${liveProduct.name} are already in your cart`
      );
      if (openDrawer) {
        setIsCartDrawerOpen(true);
      }
      return;
    }

    const requestedQty = Math.max(1, Math.round(quantity));
    const addedQty = Math.min(requestedQty, remainingAddable);
    const wasCapped = addedQty < requestedQty;

    const otherItem = isOtherProduct(liveProduct);
    const availableInks = otherItem ? [] : getVariantInkColors(liveProduct, liveChosen);
    const chosenInk = otherItem
      ? undefined
      : availableInks.find((i) => i.id === inkColorId) || availableInks[0];
    const key = otherItem
      ? `${liveProduct.id}__${liveChosen.id}__none`
      : `${liveProduct.id}__${liveChosen.id}__${chosenInk!.id}`;

    setCart((prev) => {
      const prevUsed = getCartColorUsedCount(prev, liveProduct.id, liveChosen.id);
      const prevRemaining = Math.max(0, colorAvailable - prevUsed);
      const safeAdd = Math.min(requestedQty, prevRemaining);
      if (safeAdd <= 0) return prev;

      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + safeAdd } : item
        );
      }
      const nextCartItem: CartItem = {
        key,
        productId: liveProduct.id,
        colorId: liveChosen.id,
        colorName: liveChosen.name,
        colorHex: liveChosen.hex,
        quantity: safeAdd,
      };
      if (!otherItem && chosenInk) {
        nextCartItem.inkColorId = chosenInk.id;
        nextCartItem.inkColorName = chosenInk.name;
        nextCartItem.inkColorHex = chosenInk.hex;
      }
      return [...prev, nextCartItem];
    });

    if (wasCapped) {
      showToast(
        `Added ${addedQty} ${liveProduct.name} (${liveChosen.name}) — capped at ${colorAvailable} available`
      );
    } else {
      showToast(
        `Added ${liveProduct.name} (${liveChosen.name}${
          !otherItem && chosenInk && availableInks.length > 1 ? ` · ${chosenInk.name} Ink` : ''
        }) to cart`
      );
    }
    if (openDrawer) {
      setIsCartDrawerOpen(true);
    }
  };

  const updateCartQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(key);
      return;
    }
    const target = cart.find((item) => item.key === key);
    if (!target) return;
    const product = products.find((p) => p.id === target.productId);
    const variant = product?.colors.find((c) => c.id === target.colorId);
    const colorAvailable = product ? getColorAvailableCount(product, variant) : quantity;
    const otherUsed = getCartColorUsedCount(cart, target.productId, target.colorId, key);
    const maxForThisItem = Math.max(0, colorAvailable - otherUsed);

    if (product && colorAvailable <= 0) {
      showToast(`${target.colorName} ${product.name} is currently out of stock`);
      return;
    }

    const desiredQty = Math.round(quantity);
    const clampedQty = product ? Math.min(desiredQty, Math.max(1, maxForThisItem)) : desiredQty;
    if (product && maxForThisItem === 0) {
      showToast(
        `All ${colorAvailable} ${target.colorName} ${product.name} are already allocated across your cart`
      );
      return;
    }
    if (product && desiredQty > maxForThisItem) {
      showToast(`Only ${colorAvailable} ${target.colorName} ${product.name} available in stock`);
    }

    setCart((prev) =>
      prev.map((item) => (item.key === key ? { ...item, quantity: clampedQty } : item))
    );
  };

  const updateCartItemVariant = (
    key: string,
    nextColorId: string,
    nextInkColorId: string
  ) => {
    const target = cart.find((item) => item.key === key);
    if (!target) return;
    const product = products.find((p) => p.id === target.productId);
    if (!product) return;

    const availableColors = product.colors.filter((c) => getColorAvailableCount(product, c) > 0);
    if (availableColors.length === 0) {
      showToast(`${product.name} has no colours in stock right now`);
      return;
    }
    const explicitColor = product.colors.find((c) => c.id === nextColorId);
    if (explicitColor && getColorAvailableCount(product, explicitColor) <= 0) {
      showToast(`${explicitColor.name} colour is currently out of stock`);
      return;
    }
    const chosen =
      availableColors.find((c) => c.id === nextColorId) || availableColors[0];
    if (!chosen) return;

    const otherItem = isOtherProduct(product);
    const availableInks = otherItem ? [] : getVariantInkColors(product, chosen);
    const chosenInk = otherItem
      ? undefined
      : availableInks.find((i) => i.id === nextInkColorId) || availableInks[0];
    if (!otherItem && !chosenInk) return;

    const nextKey = otherItem
      ? `${product.id}__${chosen.id}__none`
      : `${product.id}__${chosen.id}__${chosenInk!.id}`;
    const variantLabel =
      !otherItem && chosenInk ? `${chosen.name} · ${chosenInk.name} Ink` : chosen.name;
    const colorAvailable = getColorAvailableCount(product, chosen);
    const existingMatch = cart.find((item) => item.key === nextKey);

    if (nextKey === key) {
      const otherUsed = getCartColorUsedCount(cart, product.id, chosen.id, key);
      const maxAllowed = Math.max(0, colorAvailable - otherUsed);
      const safeQty = Math.min(target.quantity, Math.max(1, maxAllowed));
      setCart((prev) =>
        prev.map((item) =>
          item.key === key
            ? {
                ...item,
                colorId: chosen.id,
                colorName: chosen.name,
                colorHex: chosen.hex,
                inkColorId: otherItem ? undefined : chosenInk?.id,
                inkColorName: otherItem ? undefined : chosenInk?.name,
                inkColorHex: otherItem ? undefined : chosenInk?.hex,
                quantity: safeQty,
              }
            : item
        )
      );
      showToast(`Updated ${product.name} (${variantLabel})`);
      return;
    }

    if (existingMatch) {
      const otherUsedOutsidePair = cart.reduce((sum, item) => {
        if (item.productId !== product.id || item.colorId !== chosen.id) return sum;
        if (item.key === key || item.key === nextKey) return sum;
        return sum + Math.max(0, item.quantity);
      }, 0);
      const remainingPool = Math.max(0, colorAvailable - otherUsedOutsidePair);
      const combinedRequested = existingMatch.quantity + target.quantity;
      const cappedCombined = Math.min(combinedRequested, Math.max(existingMatch.quantity, remainingPool));
      const wasCapped = cappedCombined < combinedRequested;

      setCart((prev) =>
        prev
          .map((item) =>
            item.key === nextKey ? { ...item, quantity: cappedCombined } : item
          )
          .filter((item) => item.key !== key)
      );
      showToast(
        wasCapped
          ? `Updated ${product.name} (${variantLabel}) — capped at ${colorAvailable} available`
          : `Updated ${product.name} (${variantLabel})`
      );
      return;
    }

    const otherUsed = getCartColorUsedCount(cart, product.id, chosen.id, key);
    const maxForChosenColor = Math.max(0, colorAvailable - otherUsed);
    if (maxForChosenColor <= 0) {
      showToast(
        `No remaining ${chosen.name} stock available — all ${colorAvailable} are already in your cart`
      );
      return;
    }
    const cappedQty = Math.min(target.quantity, maxForChosenColor);
    const wasCapped = cappedQty < target.quantity;

    setCart((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              key: nextKey,
              colorId: chosen.id,
              colorName: chosen.name,
              colorHex: chosen.hex,
              inkColorId: otherItem ? undefined : chosenInk?.id,
              inkColorName: otherItem ? undefined : chosenInk?.name,
              inkColorHex: otherItem ? undefined : chosenInk?.hex,
              quantity: cappedQty,
            }
          : item
      )
    );

    showToast(
      wasCapped
        ? `Updated ${product.name} (${variantLabel}) — capped at ${cappedQty} available`
        : `Updated ${product.name} (${variantLabel})`
    );
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Guard against an empty Firestore collection when catalogMeta.seeded is true
  // so storefront products never disappear.
  const isCloudCatalogActive = Boolean(cloudProducts !== null && cloudProducts.length > 0);

  const products = useMemo(() => {
    if (isCloudCatalogActive && cloudProducts !== null) {
      return cloudProducts;
    }

    const baseProducts = liveCatalog?.products?.length ? liveCatalog.products : PRODUCTS;
    const deletedSet = new Set(deletedProductIds);
    const seen = new Set<string>();
    const merged: Product[] = [];

    for (const item of [...customProducts, ...baseProducts]) {
      if (deletedSet.has(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(productOverrides[item.id] || item);
    }

    return merged;
  }, [
    isCloudCatalogActive,
    cloudProducts,
    liveCatalog,
    customProducts,
    deletedProductIds,
    productOverrides,
  ]);

  const hasUnpublishedProductChanges = Boolean(
    !isFirebaseAdmin &&
      catalogDraftAt &&
      (!liveCatalog?.updatedAt || catalogDraftAt > liveCatalog.updatedAt)
  );

  const ensureCatalogSeeded = async (): Promise<boolean> => {
    if (!isFirebaseAdmin) return false;
    if (catalogSeeded && cloudProducts !== null && cloudProducts.length > 0) {
      return true;
    }

    const existingIds = new Set((cloudProducts || []).map((p) => p.id));
    const seedSource = liveCatalog?.products?.length ? liveCatalog.products : PRODUCTS;
    const deletedSet = new Set(deletedProductIds);

    for (const item of [...customProducts, ...seedSource]) {
      if (deletedSet.has(item.id) || existingIds.has(item.id)) continue;
      const mergedItem = productOverrides[item.id] || item;
      try {
        await setDoc(
          doc(db, 'products', mergedItem.id),
          serializeProductForFirestore(mergedItem, true)
        );
        existingIds.add(mergedItem.id);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `products/${mergedItem.id}`);
      }
    }

    try {
      await setDoc(
        doc(db, 'meta', 'catalogMeta'),
        { seeded: true, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setCatalogSeeded(true);
      setCatalogDraftAt(null);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'meta/catalogMeta');
    }
  };

  // Auto-seed starter catalog into Firestore when Firebase Admin connects to an empty products collection
  useEffect(() => {
    if (!isFirebaseAdmin) return;
    if (autoSeedingRef.current) return;
    if (cloudProducts === null || cloudProducts.length > 0) return;

    autoSeedingRef.current = true;
    void (async () => {
      try {
        await ensureCatalogSeeded();
      } catch {
        // Admin UI displays sync banner if permissions fail
      } finally {
        autoSeedingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseAdmin, cloudProducts]);

  // One-time historical orderCount backfill for cloud products missing orderCount
  useEffect(() => {
    if (!isFirebaseAdmin || !adminOrdersLoaded || !cloudProducts || cloudProducts.length === 0) {
      return;
    }

    const missingOrderCountProducts = cloudProducts.filter(
      (p) => p.orderCount === undefined && !backfilledOrderCountIdsRef.current.has(p.id)
    );
    if (missingOrderCountProducts.length === 0) return;

    const unitTotalsByProduct = new Map<string, number>();
    for (const ord of cloudAdminOrders) {
      if (Array.isArray(ord.orderItems) && ord.orderItems.length > 0) {
        for (const item of ord.orderItems) {
          const qty = Math.max(0, Math.round(Number(item.quantity) || 0));
          if (item.productId && qty > 0) {
            unitTotalsByProduct.set(
              item.productId,
              (unitTotalsByProduct.get(item.productId) || 0) + qty
            );
          }
        }
      } else if (ord.itemsSummary) {
        const parsed = parseOrderSummaryItems(ord.itemsSummary, cloudProducts);
        for (const item of parsed) {
          const qty = Math.max(0, Math.round(Number.parseInt(item.quantity, 10) || 0));
          if (item.productId && qty > 0) {
            unitTotalsByProduct.set(
              item.productId,
              (unitTotalsByProduct.get(item.productId) || 0) + qty
            );
          }
        }
      }
    }

    for (const prod of missingOrderCountProducts) {
      backfilledOrderCountIdsRef.current.add(prod.id);
      const count = unitTotalsByProduct.get(prod.id) || 0;
      void updateDoc(doc(db, 'products', prod.id), {
        orderCount: count,
        updatedAt: serverTimestamp(),
      }).catch(() => {
        // Ignore transient write failures cleanly
      });
    }
  }, [isFirebaseAdmin, adminOrdersLoaded, cloudProducts, cloudAdminOrders]);

  const exportLiveProductsJson = () => {
    return JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        products,
      },
      null,
      2
    );
  };

  const syncWithLiveCatalog = async () => {
    if (isCloudCatalogActive) {
      showToast('Live cloud database sync is active');
      return;
    }
    try {
      const res = await fetch(`/data/products.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        showToast('Could not fetch live catalogue');
        return;
      }
      const data = (await res.json()) as { updatedAt?: string; products?: Product[] };
      if (!Array.isArray(data?.products)) {
        showToast('Invalid live catalogue format');
        return;
      }
      setLiveCatalog({
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
        products: data.products,
      });
      setCustomProducts([]);
      setProductOverrides({});
      setDeletedProductIds([]);
      setCatalogDraftAt(null);
      showToast('Synced with live catalogue');
    } catch {
      showToast('Could not connect to live catalogue');
    }
  };

  const cartSubtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + (product ? product.priceBdt * item.quantity : 0);
      }, 0),
    [cart, products]
  );

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast(exists ? 'Removed from wishlist' : 'Saved to wishlist');
      return next;
    });
  };

  const isWishlisted = (productId: string) => wishlist.includes(productId);

  const toggleTheme = () => {
    setPreferences((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const updatePreferences = (patch: Partial<StorePreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  };

  // Customer orders are strictly isolated to the signed-in Google account
  const orders = useMemo(() => {
    if (!isCustomerSignedIn) return [];
    return cloudOrders;
  }, [isCustomerSignedIn, cloudOrders]);

  // Admin orders come from live Firestore when Google Admin Sync is connected
  const adminOrders = useMemo(() => {
    if (!isFirebaseAdmin) return [];
    return cloudAdminOrders;
  }, [isFirebaseAdmin, cloudAdminOrders]);

  const nextOrderId = useMemo(() => {
    const maxCloudOrderSerial = Math.max(
      cloudLastOrderNumber,
      cloudOrders.reduce((m, o) => Math.max(m, o.serialNumber || parseSerialNumber(o.orderId)), 0),
      cloudAdminOrders.reduce(
        (m, o) => Math.max(m, o.serialNumber || parseSerialNumber(o.orderId)),
        0
      )
    );
    return `#${Math.max(0, maxCloudOrderSerial) + 1}`;
  }, [cloudLastOrderNumber, cloudOrders, cloudAdminOrders]);

  const persistLocalProductFallback = (updatedProduct: Product) => {
    const isCustom = customProducts.some((p) => p.id === updatedProduct.id);
    if (isCustom) {
      setCustomProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
    }
    setProductOverrides((prev) => ({
      ...prev,
      [updatedProduct.id]: updatedProduct,
    }));
  };

  const createOrder = async (order: TrackedOrder): Promise<TrackedOrder> => {
    if (!firebaseUser || !firebaseUser.emailVerified || !firebaseUser.email) {
      throw new Error('Please sign in with a verified Google account to place your order.');
    }

    const cleanPhone = order.phone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    const phoneSuffix = (phoneDigits.slice(-8) || cleanPhone.slice(-8)).slice(0, 10);

    const groupedDeductions = new Map<
      string,
      Map<string, { colorName: string; productName: string; qty: number }>
    >();
    if (Array.isArray(order.orderItems)) {
      for (const item of order.orderItems) {
        const qty = Math.max(0, Math.round(Number(item.quantity) || 0));
        if (!item.productId || !item.colorId || qty <= 0) continue;
        let colorMap = groupedDeductions.get(item.productId);
        if (!colorMap) {
          colorMap = new Map();
          groupedDeductions.set(item.productId, colorMap);
        }
        const existingEntry = colorMap.get(item.colorId);
        colorMap.set(item.colorId, {
          colorName: item.colorName || existingEntry?.colorName || item.colorId,
          productName: item.productName || existingEntry?.productName || item.productId,
          qty: (existingEntry?.qty || 0) + qty,
        });
      }
    }

    const placedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    try {
      const savedOrder = await runTransaction(db, async (tx) => {
        const counterRef = doc(db, 'meta', 'orderCounter');
        const counterSnap = await tx.get(counterRef);

        const productReads: {
          pid: string;
          prodRef: ReturnType<typeof doc>;
          prodData: Product | null;
          colorMap: Map<string, { colorName: string; productName: string; qty: number }>;
        }[] = [];

        for (const [pid, colorMap] of groupedDeductions.entries()) {
          const prodRef = doc(db, 'products', pid);
          const prodSnap = await tx.get(prodRef);
          productReads.push({
            pid,
            prodRef,
            prodData: prodSnap.exists() ? (prodSnap.data() as Product) : null,
            colorMap,
          });
        }

        const productUpdates: {
          prodRef: ReturnType<typeof doc>;
          patch: Record<string, unknown>;
        }[] = [];

        for (const { prodRef, prodData, colorMap } of productReads) {
          if (!prodData) continue;

          if (!prodData.inStock) {
            throw new StockValidationError(`${prodData.name} is currently out of stock.`);
          }

          const colors = Array.isArray(prodData.colors) ? prodData.colors : [];
          const normalizedCounts = colors.map((c) => getColorAvailableCount(prodData, c));
          const updatedColors = colors.map((c, cIdx) => ({
            ...c,
            stockCount: c.inStock
              ? normalizedCounts[cIdx]
              : typeof c.stockCount === 'number' && Number.isFinite(c.stockCount)
              ? Math.max(0, Math.round(c.stockCount))
              : 0,
          }));

          let totalUnitsDeducted = 0;
          for (const [colorId, req] of colorMap.entries()) {
            let targetIdx = updatedColors.findIndex((c) => c.id === colorId);
            if (targetIdx === -1) {
              targetIdx = updatedColors.findIndex(
                (c) => c.name.trim().toLowerCase() === req.colorName.trim().toLowerCase()
              );
            }
            if (targetIdx === -1) {
              throw new StockValidationError(
                `${req.colorName} colour is no longer available for ${prodData.name}.`
              );
            }

            const avail = normalizedCounts[targetIdx];
            if (avail <= 0) {
              throw new StockValidationError(
                `${prodData.name} (${updatedColors[targetIdx].name}) is currently out of stock.`
              );
            }
            if (req.qty > avail) {
              throw new StockValidationError(
                `Only ${avail} left for ${prodData.name} (${updatedColors[targetIdx].name}). Please reduce your cart quantity.`
              );
            }

            const nextCount = avail - req.qty;
            updatedColors[targetIdx] = {
              ...updatedColors[targetIdx],
              stockCount: nextCount,
              inStock: nextCount > 0,
            };
            totalUnitsDeducted += req.qty;
          }

          if (totalUnitsDeducted <= 0) continue;

          const existingStockCount =
            typeof prodData.stockCount === 'number' && Number.isFinite(prodData.stockCount)
              ? Math.max(0, Math.round(prodData.stockCount))
              : normalizedCounts.reduce((s, n) => s + n, 0);
          const colorSumAfter = updatedColors.reduce(
            (sum, c) => sum + (c.inStock && (c.stockCount || 0) > 0 ? c.stockCount || 0 : 0),
            0
          );
          const nextTotalStock = Math.min(
            colorSumAfter,
            Math.max(0, existingStockCount - totalUnitsDeducted)
          );
          const nextProductInStock =
            nextTotalStock > 0 && updatedColors.some((c) => c.inStock && (c.stockCount || 0) > 0);
          const stockDelta = Math.max(0, existingStockCount - nextTotalStock);
          const prevOrderCount =
            typeof prodData.orderCount === 'number' && Number.isFinite(prodData.orderCount)
              ? Math.max(0, Math.round(prodData.orderCount))
              : 0;

          productUpdates.push({
            prodRef,
            patch: {
              inStock: nextProductInStock,
              stockCount: nextTotalStock,
              colors: sanitizeColorsForFirestore(prodData, updatedColors),
              orderCount: prevOrderCount + stockDelta,
              updatedAt: serverTimestamp(),
            },
          });
        }

        const currentCounter = counterSnap.exists()
          ? Math.max(0, Math.round(Number(counterSnap.data()?.lastOrderNumber) || 0))
          : 0;
        const nextNum = currentCounter + 1;

        if (counterSnap.exists()) {
          tx.update(counterRef, {
            lastOrderNumber: nextNum,
            updatedAt: serverTimestamp(),
          });
        } else {
          tx.set(counterRef, {
            lastOrderNumber: 1,
            updatedAt: serverTimestamp(),
          });
        }

        for (const upd of productUpdates) {
          tx.update(upd.prodRef, upd.patch);
        }

        const cleanedOrderItems = Array.isArray(order.orderItems)
          ? order.orderItems.slice(0, 30).map((item) => {
              const cleaned: Record<string, unknown> = {
                productId: item.productId,
                productName: item.productName,
                colorId: item.colorId,
                colorName: item.colorName,
                quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
              };
              if (item.inkColorId) cleaned.inkColorId = item.inkColorId;
              if (item.inkColorName) cleaned.inkColorName = item.inkColorName;
              return cleaned;
            })
          : undefined;

        const orderDocPayload: Record<string, unknown> = {
          orderId: `#${nextNum}`,
          serialNumber: nextNum,
          userId: firebaseUser.uid,
          userEmail: firebaseUser.email,
          phone: cleanPhone,
          phoneSuffix,
          customerName: order.customerName.trim().slice(0, 100),
          city: order.city.trim().slice(0, 80),
          address: order.address.trim().slice(0, 400),
          paymentMethod: 'cod',
          totalBdt: Math.max(0, Number(order.totalBdt) || 0),
          itemsSummary: order.itemsSummary.trim().slice(0, 1000),
          placedAt,
          currentStageIndex: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (
          order.city === 'Al Amanah Academy' &&
          (order.academyClass === '5' || order.academyClass === '6' || order.academyClass === '7')
        ) {
          orderDocPayload.academyClass = order.academyClass;
        }
        if (cleanedOrderItems && cleanedOrderItems.length > 0) {
          orderDocPayload.orderItems = cleanedOrderItems;
        }

        const orderDocRef = doc(db, 'orders', `order-${nextNum}`);
        tx.set(orderDocRef, orderDocPayload);

        return {
          ...order,
          orderId: `#${nextNum}`,
          serialNumber: nextNum,
          userId: firebaseUser.uid,
          userEmail: firebaseUser.email || undefined,
          phone: cleanPhone,
          placedAt,
          currentStageIndex: 1,
          isDemoRecord: false,
        };
      });

      return savedOrder;
    } catch (err) {
      if (err instanceof StockValidationError) {
        throw err;
      }
      handleFirestoreError(err, OperationType.WRITE, 'orders');
    }
  };

  const updateOrderStage = async (orderId: string, stageIndex: number) => {
    if (!isFirebaseAdmin) {
      showToast('Connect Google Admin Sync to update order status');
      return;
    }
    const clamped = Math.max(0, Math.min(4, stageIndex));
    const target = cloudAdminOrders.find((o) => o.orderId === orderId);
    const serial = target?.serialNumber || parseSerialNumber(orderId);
    if (!serial) {
      showToast('Invalid order ID');
      return;
    }

    try {
      await updateDoc(doc(db, 'orders', `order-${serial}`), {
        currentStageIndex: clamped,
        updatedAt: serverTimestamp(),
      });
      showToast(`Order ${orderId} marked as ${STAGE_LABELS[clamped]}`);
    } catch (err) {
      showToast(formatLiveSyncError(err));
      handleFirestoreError(err, OperationType.UPDATE, `orders/order-${serial}`);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!isFirebaseAdmin) {
      showToast('Connect Google Admin Sync to delete orders');
      return;
    }
    const targetOrder = cloudAdminOrders.find((o) => o.orderId === orderId);
    const serial = targetOrder?.serialNumber || parseSerialNumber(orderId);
    if (!serial) return;

    const orderDocRef = doc(db, 'orders', `order-${serial}`);

    try {
      const totalUnitsToRestore = await runTransaction(db, async (tx) => {
        const orderSnap = await tx.get(orderDocRef);
        if (!orderSnap.exists()) return 0;

        const orderData = orderSnap.data() as Record<string, unknown>;
        const restoreList: {
          productId: string;
          colorId?: string;
          colorName?: string;
          qty: number;
        }[] = [];

        if (Array.isArray(orderData.orderItems) && orderData.orderItems.length > 0) {
          for (const rawItem of orderData.orderItems as OrderLineItem[]) {
            const qty = Math.max(0, Math.round(Number(rawItem.quantity) || 0));
            if (rawItem.productId && qty > 0) {
              restoreList.push({
                productId: rawItem.productId,
                colorId: rawItem.colorId,
                colorName: rawItem.colorName,
                qty,
              });
            }
          }
        } else if (typeof orderData.itemsSummary === 'string' && orderData.itemsSummary) {
          const parsedLegacy = parseOrderSummaryItems(orderData.itemsSummary, products);
          for (const parsed of parsedLegacy) {
            const qty = Math.max(0, Math.round(Number.parseInt(parsed.quantity, 10) || 0));
            if (parsed.productId && qty > 0) {
              restoreList.push({
                productId: parsed.productId,
                colorId: parsed.colorId,
                colorName: parsed.bodyColorName,
                qty,
              });
            }
          }
        }

        const groupedRestores = new Map<
          string,
          { colorId?: string; colorName?: string; qty: number }[]
        >();
        let totalUnits = 0;
        for (const item of restoreList) {
          const list = groupedRestores.get(item.productId) || [];
          list.push(item);
          groupedRestores.set(item.productId, list);
          totalUnits += item.qty;
        }

        const readProducts: {
          prodRef: ReturnType<typeof doc>;
          prodData: Product | null;
          entries: { colorId?: string; colorName?: string; qty: number }[];
        }[] = [];

        for (const [pid, entries] of groupedRestores.entries()) {
          const prodRef = doc(db, 'products', pid);
          const prodSnap = await tx.get(prodRef);
          readProducts.push({
            prodRef,
            prodData: prodSnap.exists() ? (prodSnap.data() as Product) : null,
            entries,
          });
        }

        for (const { prodRef, prodData, entries } of readProducts) {
          if (!prodData || !Array.isArray(prodData.colors) || prodData.colors.length === 0) {
            continue;
          }

          const updatedColors = prodData.colors.map((c) => {
            const avail = getColorAvailableCount(prodData, c);
            return {
              ...c,
              inStock: c.inStock && avail > 0,
              stockCount: c.inStock ? avail : 0,
            };
          });

          for (const entry of entries) {
            let targetIdx = entry.colorId
              ? updatedColors.findIndex((c) => c.id === entry.colorId)
              : -1;
            if (targetIdx === -1 && entry.colorName) {
              const lowerColor = entry.colorName.trim().toLowerCase();
              targetIdx = updatedColors.findIndex(
                (c) => c.name.trim().toLowerCase() === lowerColor
              );
            }
            if (targetIdx === -1 && updatedColors.length === 1) {
              targetIdx = 0;
            }
            if (targetIdx !== -1) {
              const prevQty = Math.max(0, Math.round(updatedColors[targetIdx].stockCount || 0));
              const nextQty = prevQty + entry.qty;
              updatedColors[targetIdx] = {
                ...updatedColors[targetIdx],
                stockCount: nextQty,
                inStock: nextQty > 0,
              };
            }
          }

          const nextTotalStock = updatedColors.reduce(
            (sum, c) => sum + (c.inStock && (c.stockCount || 0) > 0 ? c.stockCount || 0 : 0),
            0
          );
          const nextInStock =
            updatedColors.some((c) => c.inStock && (c.stockCount || 0) > 0) && nextTotalStock > 0;
          const restoredForProduct = entries.reduce((sum, e) => sum + e.qty, 0);
          const prevOrderCount =
            typeof prodData.orderCount === 'number' && Number.isFinite(prodData.orderCount)
              ? Math.max(0, Math.round(prodData.orderCount))
              : 0;

          tx.update(prodRef, {
            colors: sanitizeColorsForFirestore(prodData, updatedColors),
            stockCount: nextTotalStock,
            inStock: nextInStock,
            orderCount: Math.max(0, prevOrderCount - restoredForProduct),
            updatedAt: serverTimestamp(),
          });
        }

        tx.delete(orderDocRef);
        return totalUnits;
      });

      showToast(
        totalUnitsToRestore > 0
          ? `Order ${orderId} deleted · restored ${totalUnitsToRestore} item${
              totalUnitsToRestore === 1 ? '' : 's'
            } to stock`
          : `Order ${orderId} deleted`
      );
    } catch (err) {
      showToast(formatLiveSyncError(err));
      handleFirestoreError(err, OperationType.DELETE, `orders/order-${serial}`);
    }
  };

  const addAdminProduct = async (input: NewProductInput) => {
    if (!isAdmin) {
      return { ok: false, error: 'Admin sign-in required.' };
    }
    const trimmedName = input.name.trim();
    const trimmedBrand = (input.brand || '').trim() || 'Arefin Mart';
    const isOther = input.category === 'other-products';
    if (trimmedName.length < 2) {
      return { ok: false, error: 'Please enter a valid product name.' };
    }
    if (!Number.isFinite(input.priceBdt) || input.priceBdt <= 0) {
      return { ok: false, error: 'Please enter a valid price in ৳ BDT.' };
    }
    const fallbackPerColor = Math.max(
      1,
      Math.round(
        (Number.isFinite(input.stockCount) ? input.stockCount : 50) / Math.max(1, input.colors.length)
      )
    );
    const validColors = input.colors
      .map((c) => {
        const hasExplicitCount =
          typeof c.stockCount === 'number' && Number.isFinite(c.stockCount);
        const rawCount = hasExplicitCount
          ? Math.max(0, Math.round(c.stockCount!))
          : fallbackPerColor;
        const colorInStock = c.inStock !== false && rawCount > 0;
        return {
          id: c.id,
          name: c.name.trim(),
          hex: c.hex.trim() || '#FF1428',
          inStock: colorInStock,
          stockCount: colorInStock ? Math.max(1, rawCount) : 0,
          image: c.image?.trim() || undefined,
          inkColors:
            !isOther && Array.isArray(c.inkColors) && c.inkColors.length > 0
              ? normalizeInkColorsList(c.inkColors)
              : undefined,
        };
      })
      .filter((c) => c.name.length > 0);

    if (validColors.length === 0) {
      return { ok: false, error: 'Please add at least one colour option.' };
    }

    const catMeta = CATALOGUE_CATEGORIES.find((c) => c.id === input.category);
    const categoryLabel =
      input.categoryLabel?.trim() || catMeta?.label || (isOther ? 'Other Products' : 'Gel Pens');
    const baseSlug = slugifyProductName(trimmedName);
    const slugTaken = products.some((p) => p.slug === baseSlug || p.id === baseSlug);
    const uniqueSlug = slugTaken ? `${baseSlug}-${String(Date.now()).slice(-4)}` : baseSlug;

    const colorImages = validColors.map((c) => c.image).filter((x): x is string => Boolean(x));
    const mergedImages = Array.from(new Set([...input.images.filter(Boolean), ...colorImages]));

    const variantInksFlat = isOther ? [] : validColors.flatMap((c) => c.inkColors || []);
    const normalizedInks = isOther
      ? []
      : normalizeInkColorsList(
          [...(input.inkColors || []), ...variantInksFlat],
          input.inkColor,
          input.inkColorHex
        );

    const totalColorStock = validColors.reduce(
      (sum, c) => sum + (c.inStock ? c.stockCount : 0),
      0
    );
    const hasAnyColorInStock = validColors.some((c) => c.inStock) && totalColorStock > 0;

    const newProduct: Product = {
      id: uniqueSlug,
      slug: uniqueSlug,
      name: trimmedName,
      brand: trimmedBrand,
      category: input.category,
      categoryLabel,
      shortDescription:
        input.shortDescription.trim() ||
        `${trimmedName} (${validColors.map((c) => c.name).join(', ')}) from ${categoryLabel}.`,
      description:
        input.description?.trim() ||
        input.shortDescription.trim() ||
        `${trimmedName} in ${categoryLabel}, available in ${validColors
          .map((c) => c.name)
          .join(', ')}.`,
      priceBdt: Math.round(input.priceBdt),
      originalPriceBdt:
        input.originalPriceBdt && input.originalPriceBdt > input.priceBdt
          ? Math.round(input.originalPriceBdt)
          : undefined,
      rating: 4.9,
      reviewCount: 1,
      popularityScore: 95,
      orderCount: 0,
      createdAtMs: Date.now(),
      featured: Boolean(input.featured),
      isNew: true,
      inStock: !input.outOfStock && hasAnyColorInStock,
      stockCount: input.outOfStock ? 0 : totalColorStock,
      images: mergedImages,
      colors: validColors.map((c, idx) => {
        const entry: Product['colors'][number] = {
          id: c.id || `${slugifyProductName(c.name)}-${idx + 1}`,
          name: c.name,
          hex: c.hex,
          inStock: c.inStock,
          stockCount: c.stockCount,
          image: c.image || mergedImages[0],
        };
        if (!isOther) {
          entry.inkColors = c.inkColors && c.inkColors.length > 0 ? c.inkColors : normalizedInks;
        }
        return entry;
      }),
      specs: isOther
        ? {
            tipSize: input.tipSize?.trim() || 'Standard',
            inkType: input.inkType?.trim() || 'N/A',
            bodyMaterial: input.bodyMaterial?.trim() || 'Standard',
            weight: 'Standard',
            origin: trimmedBrand,
          }
        : {
            tipSize: input.tipSize?.trim() || '0.5 mm Fine Point',
            inkType: input.inkType?.trim() || 'Smooth Writing Ink',
            inkColor: normalizedInks.map((i) => i.name).join(', '),
            inkColorHex: normalizedInks[0].hex,
            inkColors: normalizedInks,
            bodyMaterial: input.bodyMaterial?.trim() || 'Ergonomic Studio Barrel',
            weight: '12 g',
            origin: trimmedBrand,
          },
      sampleReviews: [],
    };

    if (isFirebaseAdmin) {
      try {
        await ensureCatalogSeeded();
        await setDoc(
          doc(db, 'products', newProduct.id),
          serializeProductForFirestore(newProduct, true)
        );
        showToast(`Saved ${newProduct.name} to live cloud catalog`);
        return { ok: true, product: newProduct };
      } catch (err) {
        return { ok: false, error: formatLiveSyncError(err) };
      }
    }

    setDeletedProductIds((prev) => prev.filter((id) => id !== newProduct.id));
    setCustomProducts((prev) => [newProduct, ...prev]);
    setCatalogDraftAt(new Date().toISOString());
    showToast(`Added ${newProduct.name} locally (connect Google Sync to publish live)`);
    return { ok: true, product: newProduct };
  };

  const updateAdminProduct = async (productId: string, input: NewProductInput) => {
    if (!isAdmin) {
      return { ok: false, error: 'Admin sign-in required.' };
    }
    const existing = products.find((p) => p.id === productId);
    if (!existing) {
      return { ok: false, error: 'Product not found.' };
    }
    const trimmedName = input.name.trim();
    const trimmedBrand = (input.brand || existing.brand || '').trim() || 'Arefin Mart';
    const isOther = input.category === 'other-products';
    if (trimmedName.length < 2) {
      return { ok: false, error: 'Please enter a valid product name.' };
    }
    if (!Number.isFinite(input.priceBdt) || input.priceBdt <= 0) {
      return { ok: false, error: 'Please enter a valid price in ৳ BDT.' };
    }
    const fallbackPerColor = Math.max(
      1,
      Math.round(
        (Number.isFinite(input.stockCount) ? input.stockCount : existing.stockCount || 50) /
          Math.max(1, input.colors.length)
      )
    );
    const validColors = input.colors
      .map((c) => {
        const hasExplicitCount =
          typeof c.stockCount === 'number' && Number.isFinite(c.stockCount);
        const rawCount = hasExplicitCount
          ? Math.max(0, Math.round(c.stockCount!))
          : fallbackPerColor;
        const colorInStock = c.inStock !== false && rawCount > 0;
        return {
          id: c.id,
          name: c.name.trim(),
          hex: c.hex.trim() || '#FF1428',
          inStock: colorInStock,
          stockCount: colorInStock ? Math.max(1, rawCount) : 0,
          image: c.image?.trim() || undefined,
          inkColors:
            !isOther && Array.isArray(c.inkColors) && c.inkColors.length > 0
              ? normalizeInkColorsList(c.inkColors)
              : undefined,
        };
      })
      .filter((c) => c.name.length > 0);

    if (validColors.length === 0) {
      return { ok: false, error: 'Please keep at least one colour option.' };
    }

    const catMeta = CATALOGUE_CATEGORIES.find((c) => c.id === input.category);
    const categoryLabel = input.categoryLabel?.trim() || catMeta?.label || existing.categoryLabel;
    const colorImages = validColors.map((c) => c.image).filter((x): x is string => Boolean(x));
    const mergedImages = Array.from(
      new Set([...input.images.filter(Boolean), ...colorImages, ...existing.images].filter(Boolean))
    );

    const totalColorStock = validColors.reduce(
      (sum, c) => sum + (c.inStock ? c.stockCount : 0),
      0
    );
    const hasAnyColorInStock = validColors.some((c) => c.inStock) && totalColorStock > 0;
    const nextInStock = !input.outOfStock && hasAnyColorInStock;

    const variantInksFlat = isOther ? [] : validColors.flatMap((c) => c.inkColors || []);
    const normalizedInks = isOther
      ? []
      : normalizeInkColorsList(
          [...(input.inkColors || []), ...variantInksFlat],
          input.inkColor || existing.specs.inkColor,
          input.inkColorHex || existing.specs.inkColorHex
        );

    const updatedProduct: Product = {
      ...existing,
      name: trimmedName,
      brand: trimmedBrand,
      category: input.category,
      categoryLabel,
      shortDescription:
        input.shortDescription.trim() ||
        `${trimmedName} (${validColors.map((c) => c.name).join(', ')}) from ${categoryLabel}.`,
      description:
        input.description?.trim() ||
        input.shortDescription.trim() ||
        existing.description,
      priceBdt: Math.round(input.priceBdt),
      originalPriceBdt:
        input.originalPriceBdt && input.originalPriceBdt > input.priceBdt
          ? Math.round(input.originalPriceBdt)
          : undefined,
      featured: Boolean(input.featured),
      inStock: nextInStock,
      stockCount: totalColorStock,
      images: mergedImages.length > 0 ? mergedImages : existing.images,
      colors: validColors.map((c, idx) => {
        const entry: Product['colors'][number] = {
          id: c.id || `${slugifyProductName(c.name)}-${idx + 1}`,
          name: c.name,
          hex: c.hex,
          inStock: c.inStock,
          stockCount: c.stockCount,
          image: c.image || mergedImages[0] || existing.images[0],
        };
        if (!isOther) {
          entry.inkColors = c.inkColors && c.inkColors.length > 0 ? c.inkColors : normalizedInks;
        }
        return entry;
      }),
      specs: isOther
        ? {
            tipSize: input.tipSize?.trim() || 'Standard',
            inkType: input.inkType?.trim() || 'N/A',
            bodyMaterial: input.bodyMaterial?.trim() || existing.specs.bodyMaterial || 'Standard',
            weight: existing.specs.weight || 'Standard',
            origin: trimmedBrand,
          }
        : {
            ...existing.specs,
            tipSize: input.tipSize?.trim() || existing.specs.tipSize,
            inkType: input.inkType?.trim() || existing.specs.inkType,
            inkColor: normalizedInks.map((i) => i.name).join(', '),
            inkColorHex: normalizedInks[0].hex,
            inkColors: normalizedInks,
            bodyMaterial: input.bodyMaterial?.trim() || existing.specs.bodyMaterial,
            origin: trimmedBrand,
          },
    };

    if (isFirebaseAdmin) {
      try {
        await ensureCatalogSeeded();
        const prodRef = doc(db, 'products', productId);
        const snap = await getDoc(prodRef);
        if (snap.exists()) {
          await setDoc(
            prodRef,
            serializeProductForFirestore(updatedProduct, false, snap.data().createdAt)
          );
        } else {
          await setDoc(prodRef, serializeProductForFirestore(updatedProduct, true));
        }
        showToast(`Updated ${updatedProduct.name} in live cloud catalog`);
        return { ok: true, product: updatedProduct };
      } catch (err) {
        return { ok: false, error: formatLiveSyncError(err) };
      }
    }

    persistLocalProductFallback(updatedProduct);
    setCatalogDraftAt(new Date().toISOString());
    showToast(`Updated ${updatedProduct.name} locally`);
    return { ok: true, product: updatedProduct };
  };

  const toggleProductOutOfStock = async (productId: string) => {
    if (!isAdmin) return;
    const existing = products.find((p) => p.id === productId);
    if (!existing) return;

    const nextInStock = !existing.inStock;
    const anyExistingColorInStock = existing.colors.some((c) => c.inStock);
    const nextColors = existing.colors.map((c) => {
      const currentCount =
        typeof c.stockCount === 'number' && Number.isFinite(c.stockCount)
          ? Math.max(0, Math.round(c.stockCount))
          : getColorAvailableCount(existing, c);
      if (nextInStock && !anyExistingColorInStock) {
        return {
          ...c,
          inStock: true,
          stockCount: Math.max(1, currentCount || 25),
        };
      }
      if (nextInStock && c.inStock && currentCount <= 0) {
        return {
          ...c,
          stockCount: 25,
        };
      }
      return {
        ...c,
        stockCount: currentCount,
      };
    });
    const nextStockCount = nextInStock
      ? nextColors.reduce((sum, c) => sum + (c.inStock ? c.stockCount || 0 : 0), 0)
      : existing.stockCount;

    const nextProduct: Product = {
      ...existing,
      inStock: nextInStock,
      stockCount: nextStockCount,
      colors: nextColors,
    };

    if (isFirebaseAdmin) {
      try {
        await ensureCatalogSeeded();
        const prodRef = doc(db, 'products', productId);
        const snap = await getDoc(prodRef);
        if (snap.exists()) {
          await updateDoc(prodRef, {
            inStock: nextInStock,
            stockCount: nextStockCount,
            colors: sanitizeColorsForFirestore(nextProduct, nextColors),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(prodRef, serializeProductForFirestore(nextProduct, true));
        }
        showToast(
          nextInStock
            ? `${existing.name} is back In Stock`
            : `${existing.name} marked Out of Stock`
        );
      } catch (err) {
        showToast(formatLiveSyncError(err));
      }
      return;
    }

    persistLocalProductFallback(nextProduct);
    setCatalogDraftAt(new Date().toISOString());
    showToast(
      nextInStock
        ? `${existing.name} is back In Stock (local)`
        : `${existing.name} marked Out of Stock (local)`
    );
  };

  const toggleProductColorStock = async (productId: string, colorId: string) => {
    if (!isAdmin) return;
    const existing = products.find((p) => p.id === productId);
    if (!existing) return;

    const targetColor = existing.colors.find((c) => c.id === colorId);
    if (!targetColor) return;

    const nextColorInStock = !targetColor.inStock;
    const updatedColors = existing.colors.map((c) => {
      const prevCount =
        typeof c.stockCount === 'number' && Number.isFinite(c.stockCount)
          ? Math.max(0, Math.round(c.stockCount))
          : getColorAvailableCount(existing, c);
      if (c.id === colorId) {
        return {
          ...c,
          inStock: nextColorInStock,
          stockCount: nextColorInStock ? Math.max(1, prevCount || 25) : prevCount,
        };
      }
      return {
        ...c,
        stockCount: prevCount,
      };
    });
    const hasAnyColorInStock = updatedColors.some((c) => c.inStock);
    const totalColorStock = updatedColors.reduce(
      (sum, c) => sum + (c.inStock ? Math.max(0, c.stockCount || 0) : 0),
      0
    );
    const nextProductInStock =
      hasAnyColorInStock && totalColorStock > 0
        ? nextColorInStock
          ? true
          : existing.inStock
        : false;
    const nextStockCount = totalColorStock;

    const nextProduct: Product = {
      ...existing,
      inStock: nextProductInStock,
      stockCount: nextStockCount,
      colors: updatedColors,
    };

    if (isFirebaseAdmin) {
      try {
        await ensureCatalogSeeded();
        const prodRef = doc(db, 'products', productId);
        const snap = await getDoc(prodRef);
        if (snap.exists()) {
          await updateDoc(prodRef, {
            inStock: nextProductInStock,
            stockCount: nextStockCount,
            colors: sanitizeColorsForFirestore(nextProduct, updatedColors),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(prodRef, serializeProductForFirestore(nextProduct, true));
        }
        showToast(
          nextColorInStock
            ? `${existing.name} (${targetColor.name}) is back In Stock`
            : `${existing.name} (${targetColor.name}) marked Out of Stock`
        );
      } catch (err) {
        showToast(formatLiveSyncError(err));
      }
      return;
    }

    persistLocalProductFallback(nextProduct);
    setCatalogDraftAt(new Date().toISOString());
    showToast(
      nextColorInStock
        ? `${existing.name} (${targetColor.name}) is back In Stock (local)`
        : `${existing.name} (${targetColor.name}) marked Out of Stock (local)`
    );
  };

  const deleteAdminProduct = async (productId: string) => {
    if (!isAdmin) return;

    if (isFirebaseAdmin) {
      try {
        await ensureCatalogSeeded();
        await deleteDoc(doc(db, 'products', productId));
        showToast('Product deleted from live cloud catalog');
      } catch (err) {
        showToast(formatLiveSyncError(err));
      }
      return;
    }

    setCustomProducts((prev) => prev.filter((p) => p.id !== productId));
    setProductOverrides((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setDeletedProductIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    setCatalogDraftAt(new Date().toISOString());
    showToast('Product deleted locally');
  };

  const loginCustomerWithGoogle = async (phone?: string) => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user && phone && phone.trim().length >= 8) {
        const cleanPhone = phone.trim();
        setSavedPhonesByUid((prev) => ({
          ...prev,
          [cred.user.uid]: cleanPhone,
        }));
      }
      setIsAuthModalOpen(false);
      showToast(`Signed in as ${cred.user.displayName || cred.user.email}`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: formatLiveSyncError(err, 'Google sign-in failed.') };
    }
  };

  const loginDemoUser = async (_name: string, _email: string, phone: string) => {
    return loginCustomerWithGoogle(phone);
  };

  const logoutDemoUser = async () => {
    try {
      await signOut(auth);
      setIsLocalAdmin(false);
      showToast('Signed out');
    } catch (err) {
      showToast(formatLiveSyncError(err, 'Could not sign out right now.'));
    }
  };

  const loginAdmin = (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== ADMIN_ACCOUNT.email || password !== ADMIN_ACCOUNT.password) {
      return { ok: false, error: 'Invalid admin Gmail or password.' };
    }
    setIsLocalAdmin(true);
    showToast('Admin signed in');
    return { ok: true };
  };

  const loginAdminWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (!user || !user.emailVerified) {
        await signOut(auth);
        return { ok: false, error: 'A verified Google account is required for Admin Sync.' };
      }
      let allowed = isAuthorizedAdminEmail(user.email);
      if (!allowed) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', user.uid));
          allowed = adminSnap.exists();
        } catch {
          allowed = false;
        }
      }
      if (!allowed) {
        return {
          ok: false,
          error: 'This Google account is not authorized as a store admin.',
        };
      }
      setCloudAdminAllowed(true);
      setIsLocalAdmin(true);
      showToast('Live Cloud Admin Sync connected');
      return { ok: true };
    } catch (err) {
      return { ok: false, error: formatLiveSyncError(err) };
    }
  };

  const logoutAdmin = async () => {
    setIsLocalAdmin(false);
    setCloudAdminAllowed(false);
    if (firebaseUser) {
      try {
        await signOut(auth);
      } catch {
        // Ignore signOut errors cleanly
      }
    }
    showToast('Admin signed out');
  };

  const findOrder = async (
    orderId: string,
    phone: string
  ): Promise<TrackedOrder | undefined> => {
    if (!isCustomerSignedIn) return undefined;
    const cleanId = orderId.trim().replace(/^#+/, '').toUpperCase();
    const cleanPhone = phone.replace(/[\s-]/g, '').trim();

    const localMatch = orders.find((o) => {
      const idMatch = o.orderId.trim().replace(/^#+/, '').toUpperCase() === cleanId;
      if (!idMatch) return false;
      if (!cleanPhone) return true;
      return o.phone.replace(/[\s-]/g, '').endsWith(cleanPhone.slice(-8));
    });
    if (localMatch) return localMatch;

    const serial = parseSerialNumber(orderId);
    if (!serial) return undefined;

    try {
      const snap = await getDoc(doc(db, 'orders', `order-${serial}`));
      if (!snap.exists()) return undefined;
      const ord = normalizeTrackedOrderFromFirestore(
        snap.data() as Record<string, unknown>,
        snap.id
      );
      if (cleanPhone && !ord.phone.replace(/[\s-]/g, '').endsWith(cleanPhone.slice(-8))) {
        return undefined;
      }
      return ord;
    } catch {
      return undefined;
    }
  };

  return (
    <StoreContext.Provider
      value={{
        route,
        selectedCategory,
        selectedProductSlug,
        infoTopic,
        searchQuery,
        setSearchQuery,
        navigate,
        cart,
        cartCount,
        cartSubtotal,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        addToCart,
        updateCartQuantity,
        updateCartItemVariant,
        removeFromCart,
        clearCart,
        wishlist,
        toggleWishlist,
        isWishlisted,
        preferences,
        toggleTheme,
        updatePreferences,
        isSettingsOpen,
        setIsSettingsOpen,
        products,
        isCloudSynced: isCloudCatalogActive,
        hasUnpublishedProductChanges,
        exportLiveProductsJson,
        syncWithLiveCatalog,
        addAdminProduct,
        updateAdminProduct,
        toggleProductOutOfStock,
        toggleProductColorStock,
        deleteAdminProduct,
        orders,
        adminOrders,
        nextOrderId,
        createOrder,
        findOrder,
        updateOrderStage,
        deleteOrder,
        demoUser,
        isCustomerSignedIn,
        authLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        loginDemoUser,
        loginCustomerWithGoogle,
        logoutDemoUser,
        isAdmin,
        isFirebaseAdmin,
        adminEmail: isFirebaseAdmin
          ? firebaseUser?.email || ADMIN_ACCOUNT.email
          : isAdmin
          ? ADMIN_ACCOUNT.email
          : null,
        isAdminModalOpen,
        setIsAdminModalOpen,
        loginAdmin,
        loginAdminWithGoogle,
        logoutAdmin,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
