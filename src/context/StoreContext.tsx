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
  getProductInkColors,
  getVariantInkColors,
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
  category: Exclude<CategoryId, 'all'>;
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

  demoUser: DemoUser | null;
  isCustomerSignedIn: boolean;
  authLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  loginDemoUser: (user: DemoUser) => void;
  loginCustomerWithGoogle: (phone?: string) => Promise<{ ok: boolean; error?: string }>;
  logoutDemoUser: () => Promise<void>;

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

function getPhoneSuffix(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-8) || '00000000';
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

function sanitizeColorListForFirestore(
  colors: Product['colors']
): Record<string, unknown>[] {
  return colors.slice(0, 12).map((c, idx) => {
    const stock =
      typeof c.stockCount === 'number' && Number.isFinite(c.stockCount)
        ? Math.max(0, Math.round(c.stockCount))
        : c.inStock
        ? 1
        : 0;
    const entry: Record<string, unknown> = {
      id: c.id || `color-${idx + 1}`,
      name: (c.name || '').trim().slice(0, 60) || `Colour ${idx + 1}`,
      hex: c.hex || '#FF1428',
      inStock: Boolean(c.inStock) && stock > 0,
      stockCount: stock,
    };
    if (c.image && c.image.trim()) {
      entry.image = c.image.trim();
    }
    if (Array.isArray(c.inkColors) && c.inkColors.length > 0) {
      entry.inkColors = normalizeInkColorsList(c.inkColors);
    }
    return entry;
  });
}

function sanitizeOrderItemsForFirestore(
  items?: OrderLineItem[]
): Record<string, unknown>[] | undefined {
  if (!Array.isArray(items) || items.length === 0) return undefined;
  const cleaned: Record<string, unknown>[] = [];
  for (const item of items.slice(0, 30)) {
    const productId = (item.productId || '').trim().slice(0, 128);
    const colorId = (item.colorId || '').trim().slice(0, 128);
    const quantity = Math.max(0, Math.round(Number(item.quantity) || 0));
    if (!productId || !colorId || quantity <= 0) continue;
    const entry: Record<string, unknown> = {
      productId,
      productName: (item.productName || productId).trim().slice(0, 120),
      colorId,
      colorName: (item.colorName || colorId).trim().slice(0, 80),
      quantity: Math.min(10000, quantity),
    };
    const inkId = item.inkColorId?.trim().slice(0, 128);
    const inkName = item.inkColorName?.trim().slice(0, 60);
    if (inkId && /^[a-zA-Z0-9_\-]+$/.test(inkId)) {
      entry.inkColorId = inkId;
    }
    if (inkName) {
      entry.inkColorName = inkName;
    }
    cleaned.push(entry);
  }
  return cleaned.length > 0 ? cleaned : undefined;
}

function sanitizeProductForFirestore(product: Product): Record<string, unknown> {
  const cleanColors = product.colors.slice(0, 12).map((c, idx) => {
    const resolvedStock =
      typeof c.stockCount === 'number' && Number.isFinite(c.stockCount)
        ? Math.max(0, Math.round(c.stockCount))
        : c.inStock
        ? Math.max(1, getColorAvailableCount(product, c) || 25)
        : 0;
    const entry: Record<string, unknown> = {
      id: c.id || `color-${idx + 1}`,
      name: c.name.trim().slice(0, 60) || `Colour ${idx + 1}`,
      hex: c.hex || '#FF1428',
      inStock: Boolean(c.inStock),
      stockCount: resolvedStock,
    };
    if (c.image && c.image.trim()) {
      entry.image = c.image.trim();
    }
    if (Array.isArray(c.inkColors) && c.inkColors.length > 0) {
      entry.inkColors = normalizeInkColorsList(c.inkColors);
    }
    return entry;
  });

  const variantInksFlat = product.colors.flatMap((c) =>
    Array.isArray(c.inkColors) ? c.inkColors : []
  );
  const normalizedInks = normalizeInkColorsList(
    [...(product.specs?.inkColors || []), ...variantInksFlat],
    product.specs?.inkColor,
    product.specs?.inkColorHex
  );

  const payload: Record<string, unknown> = {
    id: product.id,
    slug: product.slug,
    name: product.name.trim().slice(0, 120),
    brand: product.brand.trim().slice(0, 80) || "Arefin's Pen",
    category: product.category,
    categoryLabel: product.categoryLabel.trim().slice(0, 80),
    shortDescription: product.shortDescription.trim().slice(0, 400),
    description: product.description.trim().slice(0, 2000),
    priceBdt: Math.max(1, Math.round(product.priceBdt)),
    rating: Number(product.rating || 4.9),
    reviewCount: Math.max(0, Math.round(product.reviewCount || 0)),
    popularityScore: Math.max(0, Math.min(1000, Math.round(product.popularityScore || 95))),
    featured: Boolean(product.featured),
    isNew: Boolean(product.isNew),
    inStock: Boolean(product.inStock),
    stockCount: Math.max(0, Math.round(product.stockCount || 0)),
    images: product.images.filter(Boolean).slice(0, 12),
    colors: cleanColors,
    specs: {
      tipSize: product.specs?.tipSize || '0.5 mm Fine Point',
      inkType: product.specs?.inkType || 'Smooth Writing Ink',
      inkColor: normalizedInks.map((i) => i.name).join(', '),
      inkColorHex: normalizedInks[0].hex,
      inkColors: normalizedInks,
      bodyMaterial: product.specs?.bodyMaterial || 'Ergonomic Studio Barrel',
      weight: product.specs?.weight || '12 g',
      origin: product.specs?.origin || product.brand || "Arefin's Pen",
    },
    sampleReviews: Array.isArray(product.sampleReviews) ? product.sampleReviews.slice(0, 20) : [],
  };

  if (
    typeof product.orderCount === 'number' &&
    Number.isFinite(product.orderCount)
  ) {
    payload.orderCount = Math.max(0, Math.min(10000000, Math.round(product.orderCount)));
  }

  if (
    typeof product.originalPriceBdt === 'number' &&
    Number.isFinite(product.originalPriceBdt) &&
    product.originalPriceBdt > product.priceBdt
  ) {
    payload.originalPriceBdt = Math.round(product.originalPriceBdt);
  }

  return payload;
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>(PRODUCTS[0]?.slug ?? '');
  const [infoTopic, setInfoTopic] = useState<InfoTopic>('shipping');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [cart, setCart] = useState<CartItem[]>(() => readStorage(STORAGE_KEYS.cart, []));
  const [wishlist, setWishlist] = useState<string[]>(() => readStorage(STORAGE_KEYS.wishlist, []));
  const [preferences, setPreferences] = useState<StorePreferences>(() => ({
    ...DEFAULT_PREFS,
    ...readStorage<Partial<StorePreferences>>(STORAGE_KEYS.prefs, DEFAULT_PREFS),
  }));
  const [savedPhonesByUid, setSavedPhonesByUid] = useState<Record<string, string>>(() =>
    readStorage('arefin_pen_user_phones_v1', {})
  );
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

  // Firebase Auth & Real-Time Firestore State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudAdminAllowed, setCloudAdminAllowed] = useState(false);
  const [cloudProducts, setCloudProducts] = useState<Product[] | null>(null);
  const [catalogSeeded, setCatalogSeeded] = useState(false);
  const [cloudOrders, setCloudOrders] = useState<(TrackedOrder & { serialNumber?: number })[]>([]);
  const [cloudAdminOrders, setCloudAdminOrders] = useState<
    (TrackedOrder & { serialNumber?: number })[]
  >([]);
  const [adminOrdersLoaded, setAdminOrdersLoaded] = useState(false);
  const [cloudLastOrderNumber, setCloudLastOrderNumber] = useState<number>(0);
  const autoSeedingRef = useRef(false);
  const backfilledOrderCountIdsRef = useRef<Set<string>>(new Set());

  const [isLocalAdmin, setIsLocalAdmin] = useState<boolean>(() => {
    const stored = readStorage<{ verified?: boolean } | boolean>(
      'arefin_pen_admin_session_v2',
      false
    );
    if (typeof stored === 'boolean') return stored;
    return typeof stored === 'object' && stored !== null ? Boolean(stored.verified) : false;
  });

  const isCustomerSignedIn = Boolean(firebaseUser && firebaseUser.emailVerified);
  const isFirebaseAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      (isAuthorizedAdminEmail(firebaseUser.email) || cloudAdminAllowed)
  );
  const isAdmin = isLocalAdmin || isFirebaseAdmin;

  const demoUser: DemoUser | null = useMemo(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return null;
    const email = firebaseUser.email || '';
    return {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || email.split('@')[0] || 'Customer',
      email,
      phone: savedPhonesByUid[firebaseUser.uid] || '',
    };
  }, [firebaseUser, savedPhonesByUid]);

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        if (isAuthorizedAdminEmail(user.email)) {
          setCloudAdminAllowed(true);
          setAuthLoading(false);
          return;
        }
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          setCloudAdminAllowed(adminDoc.exists());
        } catch {
          setCloudAdminAllowed(false);
        } finally {
          setAuthLoading(false);
        }
      } else {
        setCloudAdminAllowed(false);
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to live Firestore products & store metadata for ALL devices
  useEffect(() => {
    const unsubMeta = onSnapshot(
      doc(db, 'meta', 'catalogMeta'),
      (snap) => {
        setCatalogSeeded(Boolean(snap.data()?.seeded));
      },
      (error) => {
        console.warn('Catalog meta listener warning:', error.message);
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
      (error) => {
        console.warn('Order counter listener warning:', error.message);
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
          // Handled safely without leaking credentials
        }
      }
    );

    return () => {
      unsubMeta();
      unsubCounter();
      unsubProducts();
    };
  }, []);

  // Subscribe to live Firestore orders for the signed-in user ONLY (matched by uid or sign-in email)
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      setCloudOrders([]);
      return;
    }

    let uidOrders: (TrackedOrder & { serialNumber?: number })[] = [];
    let emailOrders: (TrackedOrder & { serialNumber?: number })[] = [];

    const syncMergedOrders = () => {
      const mergedMap = new Map<string, TrackedOrder & { serialNumber?: number }>();
      for (const ord of [...uidOrders, ...emailOrders]) {
        if (ord.orderId) {
          mergedMap.set(ord.orderId, ord);
        }
      }
      const merged = Array.from(mergedMap.values());
      merged.sort((a, b) => (b.serialNumber || 0) - (a.serialNumber || 0));
      setCloudOrders(merged);
    };

    const uidQuery = query(collection(db, 'orders'), where('userId', '==', firebaseUser.uid));
    const unsubUidOrders = onSnapshot(
      uidQuery,
      (snapshot) => {
        uidOrders = snapshot.docs.map((d) => {
          const data = d.data() as TrackedOrder & { serialNumber?: number };
          return {
            ...data,
            orderId: data.orderId,
          };
        });
        syncMergedOrders();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    let unsubEmailOrders: (() => void) | null = null;
    if (firebaseUser.email) {
      const emailQuery = query(
        collection(db, 'orders'),
        where('userEmail', '==', firebaseUser.email)
      );
      unsubEmailOrders = onSnapshot(
        emailQuery,
        (snapshot) => {
          emailOrders = snapshot.docs.map((d) => {
            const data = d.data() as TrackedOrder & { serialNumber?: number };
            return {
              ...data,
              orderId: data.orderId,
            };
          });
          syncMergedOrders();
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        }
      );
    }

    return () => {
      unsubUidOrders();
      if (unsubEmailOrders) unsubEmailOrders();
    };
  }, [firebaseUser]);

  // Subscribe to ALL customer orders exclusively for verified Admins inside the Admin Panel
  useEffect(() => {
    if (!isFirebaseAdmin) {
      setCloudAdminOrders([]);
      setAdminOrdersLoaded(false);
      return;
    }

    const adminQuery = query(collection(db, 'orders'), orderBy('serialNumber', 'desc'));
    const unsubAdminOrders = onSnapshot(
      adminQuery,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() as TrackedOrder & { serialNumber?: number };
          return {
            ...data,
            orderId: data.orderId,
          };
        });
        list.sort((a, b) => (b.serialNumber || 0) - (a.serialNumber || 0));
        setCloudAdminOrders(list);
        setAdminOrdersLoaded(true);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        } catch {
          // Handled safely without leaking credentials
        }
      }
    );

    return () => unsubAdminOrders();
  }, [isFirebaseAdmin]);

  // Auto-seed initial catalogue (Neucose B) to Firestore the first time Firebase Admin connects
  useEffect(() => {
    if (
      !isFirebaseAdmin ||
      cloudProducts === null ||
      catalogSeeded ||
      cloudProducts.length > 0 ||
      autoSeedingRef.current
    ) {
      return;
    }
    autoSeedingRef.current = true;

    const seedInitialCatalog = async () => {
      try {
        const seedSource = liveCatalog?.products?.length ? liveCatalog.products : PRODUCTS;
        for (const item of seedSource) {
          const payload = {
            ...sanitizeProductForFirestore(item),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'products', item.id), payload);
        }
        await setDoc(doc(db, 'meta', 'catalogMeta'), {
          seeded: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Initial catalog seed error:', err);
      } finally {
        autoSeedingRef.current = false;
      }
    };

    void seedInitialCatalog();
  }, [isFirebaseAdmin, cloudProducts, catalogSeeded, liveCatalog]);

  // Backfill historical orderCount onto products that do not yet have an orderCount field
  useEffect(() => {
    if (
      !isFirebaseAdmin ||
      !adminOrdersLoaded ||
      !cloudProducts ||
      cloudProducts.length === 0
    ) {
      return;
    }

    const pendingProducts = cloudProducts.filter(
      (p) => typeof p.orderCount !== 'number' && !backfilledOrderCountIdsRef.current.has(p.id)
    );
    if (pendingProducts.length === 0) return;

    const orderedCountsByProductId = new Map<string, number>();
    for (const ord of cloudAdminOrders) {
      if (Array.isArray(ord.orderItems) && ord.orderItems.length > 0) {
        for (const item of ord.orderItems) {
          const qty = Math.max(0, Math.round(Number(item.quantity) || 0));
          if (item.productId && qty > 0) {
            orderedCountsByProductId.set(
              item.productId,
              (orderedCountsByProductId.get(item.productId) || 0) + qty
            );
          }
        }
      } else if (ord.itemsSummary) {
        const parsed = parseOrderSummaryItems(ord.itemsSummary, cloudProducts);
        for (const item of parsed) {
          const qty = Math.max(0, Math.round(Number.parseInt(item.quantity, 10) || 0));
          if (item.productId && qty > 0) {
            orderedCountsByProductId.set(
              item.productId,
              (orderedCountsByProductId.get(item.productId) || 0) + qty
            );
          }
        }
      }
    }

    const backfill = async () => {
      for (const prod of pendingProducts) {
        backfilledOrderCountIdsRef.current.add(prod.id);
        const count = orderedCountsByProductId.get(prod.id) || 0;
        try {
          await updateDoc(doc(db, 'products', prod.id), {
            orderCount: count,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn(`Order count backfill skipped for ${prod.id}:`, err);
        }
      }
    };

    void backfill();
  }, [isFirebaseAdmin, adminOrdersLoaded, cloudProducts, cloudAdminOrders]);

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
      localStorage.setItem('arefin_pen_user_phones_v1', JSON.stringify(savedPhonesByUid));
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

  // Fetch fallback /data/products.json (only used if Firestore catalog has not been seeded yet)
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
        if (cat) setSelectedCategory(cat);
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

    const availableInks = getVariantInkColors(liveProduct, liveChosen);
    const chosenInk =
      availableInks.find((i) => i.id === inkColorId) || availableInks[0];
    const key = `${liveProduct.id}__${liveChosen.id}__${chosenInk.id}`;

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
      return [
        ...prev,
        {
          key,
          productId: liveProduct.id,
          colorId: liveChosen.id,
          colorName: liveChosen.name,
          colorHex: liveChosen.hex,
          inkColorId: chosenInk.id,
          inkColorName: chosenInk.name,
          inkColorHex: chosenInk.hex,
          quantity: safeAdd,
        },
      ];
    });

    if (wasCapped) {
      showToast(
        `Added ${addedQty} ${liveProduct.name} (${liveChosen.name}) — capped at ${colorAvailable} available`
      );
    } else {
      showToast(
        `Added ${liveProduct.name} (${liveChosen.name}${availableInks.length > 1 ? ` · ${chosenInk.name} Ink` : ''}) to cart`
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

    const availableInks = getVariantInkColors(product, chosen);
    const chosenInk =
      availableInks.find((i) => i.id === nextInkColorId) || availableInks[0];
    if (!chosenInk) return;

    const nextKey = `${product.id}__${chosen.id}__${chosenInk.id}`;
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
                inkColorId: chosenInk.id,
                inkColorName: chosenInk.name,
                inkColorHex: chosenInk.hex,
                quantity: safeQty,
              }
            : item
        )
      );
      showToast(`Updated ${product.name} (${chosen.name} · ${chosenInk.name} Ink)`);
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
          ? `Updated ${product.name} (${chosen.name} · ${chosenInk.name} Ink) — capped at ${colorAvailable} available`
          : `Updated ${product.name} (${chosen.name} · ${chosenInk.name} Ink)`
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
              inkColorId: chosenInk.id,
              inkColorName: chosenInk.name,
              inkColorHex: chosenInk.hex,
              quantity: cappedQty,
            }
          : item
      )
    );

    showToast(
      wasCapped
        ? `Updated ${product.name} (${chosen.name} · ${chosenInk.name} Ink) — capped at ${cappedQty} available`
        : `Updated ${product.name} (${chosen.name} · ${chosenInk.name} Ink)`
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

  // Use live Firestore products across all devices once seeded or populated
  const isCloudCatalogActive = Boolean(
    cloudProducts !== null && (cloudProducts.length > 0 || catalogSeeded)
  );

  const products = useMemo(() => {
    if (isCloudCatalogActive && cloudProducts !== null) {
      return cloudProducts;
    }
    const baseProducts = liveCatalog?.products ?? PRODUCTS;
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
      showToast('Synced with live Netlify catalogue');
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

  const loginDemoUser = (user: DemoUser) => {
    if (firebaseUser?.uid && user.phone.trim()) {
      setSavedPhonesByUid((prev) => ({ ...prev, [firebaseUser.uid]: user.phone.trim() }));
    }
    setIsAuthModalOpen(false);
    showToast(`Signed in as ${user.name}`);
  };

  const loginCustomerWithGoogle = async (phone?: string) => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (!cred.user.emailVerified) {
        await signOut(auth);
        return {
          ok: false,
          error: 'Please use a verified Google account to place and track orders.',
        };
      }
      if (phone && phone.trim()) {
        setSavedPhonesByUid((prev) => ({ ...prev, [cred.user.uid]: phone.trim() }));
      }
      setIsAuthModalOpen(false);
      showToast(`Signed in as ${cred.user.displayName || cred.user.email || 'Customer'}`);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/unauthorized-domain')) {
        return {
          ok: false,
          error:
            'Add this site domain in Firebase Console → Authentication → Settings → Authorized domains.',
        };
      }
      if (msg.includes('auth/popup-closed-by-user')) {
        return { ok: false, error: 'Google sign-in window was closed.' };
      }
      return { ok: false, error: 'Could not sign in with Google. Please try again.' };
    }
  };

  const logoutDemoUser = async () => {
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
    setCloudOrders([]);
    setCloudAdminOrders([]);
    showToast('Signed out');
  };

  const orders = useMemo(() => {
    if (!isCustomerSignedIn) return [];
    return cloudOrders;
  }, [isCustomerSignedIn, cloudOrders]);

  const adminOrders = useMemo(() => {
    if (!isFirebaseAdmin) return [];
    return cloudAdminOrders;
  }, [isFirebaseAdmin, cloudAdminOrders]);

  const nextOrderId = useMemo(() => {
    return `#${Math.max(0, cloudLastOrderNumber) + 1}`;
  }, [cloudLastOrderNumber]);

  const createOrder = async (order: TrackedOrder): Promise<TrackedOrder> => {
    if (!firebaseUser || !firebaseUser.emailVerified || !firebaseUser.email) {
      throw new Error('Please sign in or create your account first before placing an order.');
    }

    const verifiedUid = firebaseUser.uid;
    const verifiedEmail = firebaseUser.email;

    if (order.phone.trim()) {
      setSavedPhonesByUid((prev) => ({ ...prev, [verifiedUid]: order.phone.trim() }));
    }

    try {
      const counterRef = doc(db, 'meta', 'orderCounter');
      const sanitizedOrderItems = sanitizeOrderItemsForFirestore(order.orderItems);

      // Group requested quantities per (productId, colorId) across ink combos
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

      const assigned = await runTransaction(db, async (transaction) => {
        // 1. ALL READS FIRST: order counter + every ordered product document
        const counterSnap = await transaction.get(counterRef);
        const productIds = Array.from(groupedDeductions.keys());
        const productRefs = productIds.map((pid) => doc(db, 'products', pid));
        const productSnaps = await Promise.all(
          productRefs.map((ref) => transaction.get(ref))
        );

        // 2. VALIDATE STOCK & PREPARE PRODUCT UPDATES
        const productUpdates: {
          ref: ReturnType<typeof doc>;
          colors: Record<string, unknown>[];
          stockCount: number;
          inStock: boolean;
          orderCount: number;
        }[] = [];

        productIds.forEach((pid, idx) => {
          const prodSnap = productSnaps[idx];
          const colorMap = groupedDeductions.get(pid);
          if (!colorMap || !prodSnap.exists()) return;

          const prodData = prodSnap.data() as Product;
          const colors = Array.isArray(prodData.colors) ? prodData.colors : [];

          if (!prodData.inStock) {
            throw new StockValidationError(`${prodData.name} is currently out of stock.`);
          }

          // Track remaining count per colour index so multiple requested colours update cleanly
          const normalizedCounts = colors.map((c) => getColorAvailableCount(prodData, c));
          const updatedColors = colors.map((c, cIdx) => ({
            ...c,
            stockCount: c.inStock
              ? normalizedCounts[cIdx]
              : typeof c.stockCount === 'number' && Number.isFinite(c.stockCount)
              ? Math.max(0, Math.round(c.stockCount))
              : 0,
          }));

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
          }

          const nextTotalStock = updatedColors.reduce(
            (sum, c) => sum + (c.inStock && (c.stockCount || 0) > 0 ? c.stockCount || 0 : 0),
            0
          );
          const nextProductInStock =
            updatedColors.some((c) => c.inStock && (c.stockCount || 0) > 0) && nextTotalStock > 0;
          const prevStockCount =
            typeof prodData.stockCount === 'number' && Number.isFinite(prodData.stockCount)
              ? Math.max(0, Math.round(prodData.stockCount))
              : nextTotalStock;
          const stockDelta = Math.max(0, prevStockCount - nextTotalStock);
          const prevOrderCount =
            typeof prodData.orderCount === 'number' && Number.isFinite(prodData.orderCount)
              ? Math.max(0, Math.round(prodData.orderCount))
              : 0;

          productUpdates.push({
            ref: productRefs[idx],
            colors: sanitizeColorListForFirestore(updatedColors),
            stockCount: nextTotalStock,
            inStock: nextProductInStock,
            orderCount: prevOrderCount + stockDelta,
          });
        });

        // 3. ALL WRITES: increment counter, deduct stock on products, save order
        const currentNum = counterSnap.exists()
          ? Number(counterSnap.data()?.lastOrderNumber || 0)
          : 0;
        const nextNum = currentNum + 1;
        const nextOrderIdStr = `#${nextNum}`;
        const docId = `order-${nextNum}`;
        const phoneSuffix = getPhoneSuffix(order.phone);

        if (counterSnap.exists()) {
          transaction.update(counterRef, {
            lastOrderNumber: nextNum,
            updatedAt: serverTimestamp(),
          });
        } else {
          transaction.set(counterRef, {
            lastOrderNumber: nextNum,
            updatedAt: serverTimestamp(),
          });
        }

        for (const upd of productUpdates) {
          transaction.update(upd.ref, {
            colors: upd.colors,
            stockCount: upd.stockCount,
            inStock: upd.inStock,
            orderCount: upd.orderCount,
            updatedAt: serverTimestamp(),
          });
        }

        const orderPayload: Record<string, unknown> = {
          orderId: nextOrderIdStr,
          serialNumber: nextNum,
          userId: verifiedUid,
          userEmail: verifiedEmail.slice(0, 200),
          phone: order.phone.trim().slice(0, 20),
          phoneSuffix,
          customerName: order.customerName.trim().slice(0, 100),
          city: order.city.trim().slice(0, 80),
          address: order.address.trim().slice(0, 400),
          paymentMethod: 'cod',
          totalBdt: Math.max(0, Math.round(order.totalBdt)),
          itemsSummary: order.itemsSummary.trim().slice(0, 1000),
          placedAt: new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
          currentStageIndex: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (sanitizedOrderItems) {
          orderPayload.orderItems = sanitizedOrderItems;
        }
        if (order.city === 'Al Amanah Academy' && order.academyClass) {
          orderPayload.academyClass = order.academyClass;
        }

        transaction.set(doc(db, 'orders', docId), orderPayload);

        return { nextNum, orderPayload };
      });

      const finalOrder: TrackedOrder = {
        ...order,
        orderId: String(assigned.orderPayload.orderId),
        serialNumber: assigned.nextNum,
        userId: verifiedUid,
        userEmail: verifiedEmail,
        placedAt: String(assigned.orderPayload.placedAt),
        currentStageIndex: 1,
        isDemoRecord: false,
      };
      return finalOrder;
    } catch (err) {
      if (err instanceof StockValidationError) {
        throw err;
      }
      handleFirestoreError(err, OperationType.CREATE, `orders/${order.orderId}`);
    }
  };

  const updateOrderStage = async (orderId: string, stageIndex: number) => {
    if (!isAdmin) return;
    const clamped = Math.max(0, Math.min(4, stageIndex));
    const serialNumber = parseSerialNumber(orderId);

    if (!isFirebaseAdmin || serialNumber <= 0) {
      showToast('Connect your Google Admin account to update orders live');
      return;
    }

    const docId = `order-${serialNumber}`;
    try {
      await updateDoc(doc(db, 'orders', docId), {
        currentStageIndex: clamped,
        updatedAt: serverTimestamp(),
      });
      showToast(`Order ${orderId} marked as ${STAGE_LABELS[clamped]}`);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${docId}`);
      } catch {
        // Redacted error logged cleanly
      }
      showToast(formatLiveSyncError(err, 'Could not update order status in Live Sync.'));
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!isAdmin) return;
    const serialNumber = parseSerialNumber(orderId);

    if (!isFirebaseAdmin || serialNumber <= 0) {
      showToast('Connect your Google Admin account to delete orders live');
      return;
    }

    const docId = `order-${serialNumber}`;
    try {
      const result = await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', docId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          return { deleted: false, restoredUnits: 0 };
        }

        const orderData = orderSnap.data() as TrackedOrder & { orderItems?: OrderLineItem[] };

        // Resolve line items from structured snapshot or legacy summary fallback
        const restoreList: {
          productId: string;
          colorId?: string;
          colorName?: string;
          qty: number;
        }[] = [];

        if (Array.isArray(orderData.orderItems) && orderData.orderItems.length > 0) {
          for (const item of orderData.orderItems) {
            const qty = Math.max(0, Math.round(Number(item.quantity) || 0));
            if (item.productId && qty > 0) {
              restoreList.push({
                productId: item.productId,
                colorId: item.colorId,
                colorName: item.colorName,
                qty,
              });
            }
          }
        } else if (orderData.itemsSummary) {
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
        let totalUnitsToRestore = 0;
        for (const item of restoreList) {
          const list = groupedRestores.get(item.productId) || [];
          list.push(item);
          groupedRestores.set(item.productId, list);
          totalUnitsToRestore += item.qty;
        }

        const productIds = Array.from(groupedRestores.keys());
        const productRefs = productIds.map((pid) => doc(db, 'products', pid));
        const productSnaps = await Promise.all(
          productRefs.map((ref) => transaction.get(ref))
        );

        productIds.forEach((pid, idx) => {
          const prodSnap = productSnaps[idx];
          const entries = groupedRestores.get(pid);
          if (!prodSnap.exists() || !entries || entries.length === 0) return;

          const prodData = prodSnap.data() as Product;
          const colors = Array.isArray(prodData.colors) ? prodData.colors : [];
          if (colors.length === 0) return;

          const updatedColors = colors.map((c) => {
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
          const nextOrderCount = Math.max(0, prevOrderCount - restoredForProduct);

          transaction.update(productRefs[idx], {
            colors: sanitizeColorListForFirestore(updatedColors),
            stockCount: nextTotalStock,
            inStock: nextInStock,
            orderCount: nextOrderCount,
            updatedAt: serverTimestamp(),
          });
        });

        transaction.delete(orderRef);
        return { deleted: true, restoredUnits: totalUnitsToRestore };
      });

      if (result.deleted) {
        showToast(
          result.restoredUnits > 0
            ? `Order ${orderId} deleted · restored ${result.restoredUnits} pen${
                result.restoredUnits === 1 ? '' : 's'
              } to stock`
            : `Order ${orderId} deleted`
        );
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `orders/${docId}`);
      } catch {
        // Redacted error logged cleanly
      }
      showToast(formatLiveSyncError(err, 'Could not delete order in Live Sync.'));
    }
  };

  const ensureCatalogSeeded = async (skipId?: string) => {
    if (catalogSeeded) return;
    const seedSource = liveCatalog?.products?.length ? liveCatalog.products : PRODUCTS;
    for (const item of seedSource) {
      if (item.id === skipId) continue;
      const existsInCloud = cloudProducts?.some((p) => p.id === item.id);
      if (!existsInCloud) {
        await setDoc(doc(db, 'products', item.id), {
          ...sanitizeProductForFirestore(item),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    await setDoc(doc(db, 'meta', 'catalogMeta'), {
      seeded: true,
      updatedAt: serverTimestamp(),
    });
  };

  const addAdminProduct = async (input: NewProductInput) => {
    if (!isAdmin) {
      return { ok: false, error: 'Admin sign-in required.' };
    }
    const trimmedName = input.name.trim();
    const trimmedBrand = (input.brand || '').trim() || "Arefin's Pen";
    if (trimmedName.length < 2) {
      return { ok: false, error: 'Please enter a valid product name.' };
    }
    if (!Number.isFinite(input.priceBdt) || input.priceBdt <= 0) {
      return { ok: false, error: 'Please enter a valid price in ৳ BDT.' };
    }
    const fallbackPerColor = Math.max(
      1,
      Math.round((Number.isFinite(input.stockCount) ? input.stockCount : 50) / Math.max(1, input.colors.length))
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
            Array.isArray(c.inkColors) && c.inkColors.length > 0
              ? normalizeInkColorsList(c.inkColors)
              : undefined,
        };
      })
      .filter((c) => c.name.length > 0);

    if (validColors.length === 0) {
      return { ok: false, error: 'Please add at least one colour option.' };
    }

    if (!isFirebaseAdmin) {
      return {
        ok: false,
        error:
          'Click "Connect Google Account" above so your new product syncs live across all devices.',
      };
    }

    const catMeta = CATALOGUE_CATEGORIES.find((c) => c.id === input.category);
    const categoryLabel = catMeta?.label || 'Gel Pens';
    const baseSlug = slugifyProductName(trimmedName);
    const slugTaken = products.some((p) => p.slug === baseSlug || p.id === baseSlug);
    const uniqueSlug = slugTaken ? `${baseSlug}-${String(Date.now()).slice(-4)}` : baseSlug;

    const colorImages = validColors.map((c) => c.image).filter((x): x is string => Boolean(x));
    const mergedImages = Array.from(new Set([...input.images.filter(Boolean), ...colorImages]));

    const variantInksFlat = validColors.flatMap((c) => c.inkColors || []);
    const normalizedInks = normalizeInkColorsList(
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
      colors: validColors.map((c, idx) => ({
        id: c.id || `${slugifyProductName(c.name)}-${idx + 1}`,
        name: c.name,
        hex: c.hex,
        inStock: c.inStock,
        stockCount: c.stockCount,
        image: c.image || mergedImages[0],
        inkColors: c.inkColors && c.inkColors.length > 0 ? c.inkColors : normalizedInks,
      })),
      specs: {
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

    try {
      await ensureCatalogSeeded();
      await setDoc(doc(db, 'products', newProduct.id), {
        ...sanitizeProductForFirestore(newProduct),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Added ${newProduct.name} live across all devices`);
      return { ok: true, product: newProduct };
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `products/${newProduct.id}`);
      } catch {
        // Redacted error logged cleanly
      }
      return {
        ok: false,
        error: formatLiveSyncError(err, 'Could not save product to Live Sync.'),
      };
    }
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
    const trimmedBrand = (input.brand || existing.brand || '').trim() || "Arefin's Pen";
    if (trimmedName.length < 2) {
      return { ok: false, error: 'Please enter a valid product name.' };
    }
    if (!Number.isFinite(input.priceBdt) || input.priceBdt <= 0) {
      return { ok: false, error: 'Please enter a valid price in ৳ BDT.' };
    }
    const fallbackPerColor = Math.max(
      1,
      Math.round((Number.isFinite(input.stockCount) ? input.stockCount : existing.stockCount || 50) / Math.max(1, input.colors.length))
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
            Array.isArray(c.inkColors) && c.inkColors.length > 0
              ? normalizeInkColorsList(c.inkColors)
              : undefined,
        };
      })
      .filter((c) => c.name.length > 0);

    if (validColors.length === 0) {
      return { ok: false, error: 'Please keep at least one colour option.' };
    }

    if (!isFirebaseAdmin) {
      return {
        ok: false,
        error:
          'Click "Connect Google Account" above so your product edits sync live across all devices.',
      };
    }

    const catMeta = CATALOGUE_CATEGORIES.find((c) => c.id === input.category);
    const categoryLabel = catMeta?.label || existing.categoryLabel;
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

    const variantInksFlat = validColors.flatMap((c) => c.inkColors || []);
    const normalizedInks = normalizeInkColorsList(
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
      colors: validColors.map((c, idx) => ({
        id: c.id || `${slugifyProductName(c.name)}-${idx + 1}`,
        name: c.name,
        hex: c.hex,
        inStock: c.inStock,
        stockCount: c.stockCount,
        image: c.image || mergedImages[0] || existing.images[0],
        inkColors: c.inkColors && c.inkColors.length > 0 ? c.inkColors : normalizedInks,
      })),
      specs: {
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

    try {
      await ensureCatalogSeeded(productId);
      const existsInCloud = cloudProducts?.some((p) => p.id === productId);
      const sanitized = sanitizeProductForFirestore(updatedProduct);
      if (existsInCloud) {
        await updateDoc(doc(db, 'products', productId), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'products', productId), {
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      showToast(`Updated ${updatedProduct.name} live across all devices`);
      return { ok: true, product: updatedProduct };
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
      } catch {
        // Redacted error logged cleanly
      }
      return {
        ok: false,
        error: formatLiveSyncError(err, 'Could not update product in Live Sync.'),
      };
    }
  };

  const toggleProductOutOfStock = async (productId: string) => {
    if (!isAdmin) return;
    const existing = products.find((p) => p.id === productId);
    if (!existing) return;

    if (!isFirebaseAdmin) {
      showToast('Click "Connect Google Account" above to sync stock status live');
      return;
    }

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

    try {
      await ensureCatalogSeeded(productId);
      const existsInCloud = cloudProducts?.some((p) => p.id === productId);
      const sanitized = sanitizeProductForFirestore({
        ...existing,
        inStock: nextInStock,
        stockCount: nextStockCount,
        colors: nextColors,
      });
      if (existsInCloud) {
        await updateDoc(doc(db, 'products', productId), {
          inStock: sanitized.inStock,
          stockCount: sanitized.stockCount,
          colors: sanitized.colors,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'products', productId), {
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      showToast(
        nextInStock
          ? `${existing.name} is back In Stock (Live)`
          : `${existing.name} marked Out of Stock (Live)`
      );
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
      } catch {
        // Redacted error logged cleanly
      }
      showToast(formatLiveSyncError(err, 'Could not update stock status in Live Sync.'));
    }
  };

  const toggleProductColorStock = async (productId: string, colorId: string) => {
    if (!isAdmin) return;
    const existing = products.find((p) => p.id === productId);
    if (!existing) return;

    const targetColor = existing.colors.find((c) => c.id === colorId);
    if (!targetColor) return;

    if (!isFirebaseAdmin) {
      showToast('Click "Connect Google Account" above to sync colour stock live');
      return;
    }

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

    try {
      await ensureCatalogSeeded(productId);
      const existsInCloud = cloudProducts?.some((p) => p.id === productId);
      const updatedProduct: Product = {
        ...existing,
        inStock: nextProductInStock,
        stockCount: nextStockCount,
        colors: updatedColors,
      };
      const sanitized = sanitizeProductForFirestore(updatedProduct);
      if (existsInCloud) {
        await updateDoc(doc(db, 'products', productId), {
          colors: sanitized.colors,
          inStock: sanitized.inStock,
          stockCount: sanitized.stockCount,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'products', productId), {
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      showToast(
        nextColorInStock
          ? `${existing.name} (${targetColor.name}) is back In Stock`
          : `${existing.name} (${targetColor.name}) marked Out of Stock`
      );
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
      } catch {
        // Redacted error logged cleanly
      }
      showToast(formatLiveSyncError(err, 'Could not update colour stock status in Live Sync.'));
    }
  };

  const deleteAdminProduct = async (productId: string) => {
    if (!isAdmin) return;
    if (!isFirebaseAdmin) {
      showToast('Click "Connect Google Account" above to delete live across devices');
      return;
    }

    try {
      await ensureCatalogSeeded(productId);
      await deleteDoc(doc(db, 'products', productId));
      showToast('Product deleted live across all devices');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
      } catch {
        // Redacted error logged cleanly
      }
      showToast(formatLiveSyncError(err, 'Could not delete product in Live Sync.'));
    }
  };

  const loginAdmin = (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== ADMIN_ACCOUNT.email || password !== ADMIN_ACCOUNT.password) {
      return { ok: false, error: 'Invalid admin Gmail or password.' };
    }
    setIsLocalAdmin(true);
    showToast(
      isFirebaseAdmin
        ? 'Signed in as Live Cloud Admin'
        : 'Admin unlocked — connect Google Account for live sync'
    );
    return { ok: true };
  };

  const loginAdminWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const email = cred.user.email?.trim().toLowerCase() || '';
      let allowed = isAuthorizedAdminEmail(email);
      if (!allowed) {
        const adminSnap = await getDoc(doc(db, 'admins', cred.user.uid)).catch(() => null);
        allowed = Boolean(adminSnap?.exists());
      }
      if (!allowed || !cred.user.emailVerified) {
        await signOut(auth);
        return {
          ok: false,
          error: 'Wrong Google account. Please sign in with an authorized admin Google account.',
        };
      }
      setCloudAdminAllowed(true);
      setIsLocalAdmin(true);
      showToast('Live Cloud Admin connected across all devices');
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: formatLiveSyncError(
          err,
          'Could not sign in with Google. Please try again with an authorized admin account.'
        ),
      };
    }
  };

  const logoutAdmin = async () => {
    setIsLocalAdmin(false);
    setCloudAdminAllowed(false);
    setCloudAdminOrders([]);
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
    showToast('Admin signed out');
  };

  const findOrder = async (
    orderId: string,
    phone: string
  ): Promise<TrackedOrder | undefined> => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      return undefined;
    }
    const cleanId = orderId.trim().replace(/^#+/, '').toUpperCase();
    const cleanPhone = phone.replace(/[\s-]/g, '').trim();
    const localMatch = orders.find((o) => {
      const idMatch = o.orderId.trim().replace(/^#+/, '').toUpperCase() === cleanId;
      if (!idMatch) return false;
      if (!cleanPhone) return true;
      return o.phone.replace(/[\s-]/g, '').endsWith(cleanPhone.slice(-8));
    });
    return localMatch;
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
        demoUser,
        isCustomerSignedIn,
        authLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        loginDemoUser,
        loginCustomerWithGoogle,
        logoutDemoUser,
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
        isAdmin,
        isFirebaseAdmin,
        adminEmail: isAdmin ? firebaseUser?.email || ADMIN_ACCOUNT.email : null,
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
