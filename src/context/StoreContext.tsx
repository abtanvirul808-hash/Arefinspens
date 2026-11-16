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
} from 'firebase/firestore';
import {
  CartItem,
  CategoryId,
  DemoUser,
  InfoTopic,
  PageRoute,
  Product,
  StorePreferences,
  TrackedOrder,
} from '../types';
import { DEMO_TRACKING_ORDERS } from '../data/storeConfig';
import { CATALOGUE_CATEGORIES, PRODUCTS } from '../data/products';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isAuthorizedAdminEmail,
  OperationType,
} from '../firebase';

interface ToastState {
  id: number;
  message: string;
}

export interface NewProductColorInput {
  id?: string;
  name: string;
  hex: string;
  image?: string;
}

export interface NewProductInput {
  name: string;
  brand: string;
  category: Exclude<CategoryId, 'all'>;
  priceBdt: number;
  originalPriceBdt?: number;
  stockCount: number;
  outOfStock?: boolean;
  shortDescription: string;
  description?: string;
  tipSize?: string;
  inkType?: string;
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
  addToCart: (product: Product, colorId?: string, quantity?: number, openDrawer?: boolean) => void;
  updateCartQuantity: (key: string, quantity: number) => void;
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
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  loginDemoUser: (user: DemoUser) => void;
  logoutDemoUser: () => void;

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
  deleteAdminProduct: (productId: string) => Promise<void>;

  orders: TrackedOrder[];
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
  adminSession: 'arefin_pen_admin_session_v2',
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

function getNextSerialOrderId(orders: TrackedOrder[], deletedIds: string[] = []): string {
  const allIds = [...orders.map((o) => o.orderId), ...deletedIds];
  const maxNum = allIds.reduce((max, id) => {
    const match = id.trim().match(/^#?(\d+)$/);
    if (!match) return max;
    const num = Number.parseInt(match[1], 10);
    return Number.isFinite(num) && num > max ? num : max;
  }, 0);
  return `#${maxNum + 1}`;
}

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

function sanitizeProductForFirestore(product: Product): Record<string, unknown> {
  const cleanColors = product.colors.slice(0, 12).map((c, idx) => {
    const entry: Record<string, unknown> = {
      id: c.id || `color-${idx + 1}`,
      name: c.name.trim().slice(0, 60) || `Colour ${idx + 1}`,
      hex: c.hex || '#FF1428',
      inStock: Boolean(c.inStock),
    };
    if (c.image && c.image.trim()) {
      entry.image = c.image.trim();
    }
    return entry;
  });

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
      bodyMaterial: product.specs?.bodyMaterial || 'Ergonomic Studio Barrel',
      weight: product.specs?.weight || '12 g',
      origin: product.specs?.origin || product.brand || "Arefin's Pen",
    },
    sampleReviews: Array.isArray(product.sampleReviews) ? product.sampleReviews.slice(0, 20) : [],
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
  const [demoUser, setDemoUser] = useState<DemoUser | null>(() =>
    readStorage(STORAGE_KEYS.user, null)
  );
  const [savedOrders, setSavedOrders] = useState<TrackedOrder[]>(() =>
    readStorage(STORAGE_KEYS.orders, [])
  );
  const [deletedOrderIds, setDeletedOrderIds] = useState<string[]>(() =>
    readStorage(STORAGE_KEYS.deletedOrders, [])
  );
  const [stageOverrides, setStageOverrides] = useState<Record<string, number>>(() =>
    readStorage(STORAGE_KEYS.orderStages, {})
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
  const [cloudAdminAllowed, setCloudAdminAllowed] = useState(false);
  const [cloudProducts, setCloudProducts] = useState<Product[] | null>(null);
  const [catalogSeeded, setCatalogSeeded] = useState(false);
  const [cloudOrders, setCloudOrders] = useState<(TrackedOrder & { serialNumber?: number })[] | null>(
    null
  );
  const [cloudLastOrderNumber, setCloudLastOrderNumber] = useState<number>(0);
  const autoSeedingRef = useRef(false);

  const [isLocalAdmin, setIsLocalAdmin] = useState<boolean>(() => {
    const stored = readStorage<{ verified?: boolean } | boolean>(STORAGE_KEYS.adminSession, false);
    if (typeof stored === 'boolean') return stored;
    return typeof stored === 'object' && stored !== null ? Boolean(stored.verified) : false;
  });

  const isFirebaseAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      (isAuthorizedAdminEmail(firebaseUser.email) || cloudAdminAllowed)
  );
  const isAdmin = isLocalAdmin || isFirebaseAdmin;

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
          return;
        }
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          setCloudAdminAllowed(adminDoc.exists());
        } catch {
          setCloudAdminAllowed(false);
        }
      } else {
        setCloudAdminAllowed(false);
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
          const data = d.data() as Product;
          return {
            ...data,
            id: data.id || d.id,
            slug: data.slug || d.id,
          };
        });
        list.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
        setCloudProducts(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'products');
      }
    );

    return () => {
      unsubMeta();
      unsubCounter();
      unsubProducts();
    };
  }, []);

  // Subscribe to live Firestore orders ONLY when authenticated as Firebase Admin
  useEffect(() => {
    if (!isFirebaseAdmin) {
      setCloudOrders(null);
      return;
    }

    const ordersQuery = query(collection(db, 'orders'), orderBy('serialNumber', 'desc'));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() as TrackedOrder & { serialNumber?: number };
          return {
            ...data,
            orderId: data.orderId,
          };
        });
        setCloudOrders(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => unsubOrders();
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
      if (demoUser) {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(demoUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.user);
      }
    } catch {
      // ignore
    }
  }, [demoUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(savedOrders));
    } catch {
      // ignore
    }
  }, [savedOrders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.deletedOrders, JSON.stringify(deletedOrderIds));
    } catch {
      // ignore
    }
  }, [deletedOrderIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.orderStages, JSON.stringify(stageOverrides));
    } catch {
      // ignore
    }
  }, [stageOverrides]);

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
        localStorage.setItem(STORAGE_KEYS.adminSession, JSON.stringify(true));
      } else {
        localStorage.removeItem(STORAGE_KEYS.adminSession);
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
      } else if (base === 'track-order') {
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
    openDrawer = true
  ) => {
    if (!product.inStock) {
      showToast(`${product.name} is currently out of stock`);
      return;
    }
    const availableColors = product.colors.filter((c) => c.inStock);
    const chosen =
      availableColors.find((c) => c.id === colorId) || availableColors[0] || product.colors[0];
    const key = `${product.id}__${chosen.id}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          colorId: chosen.id,
          colorName: chosen.name,
          colorHex: chosen.hex,
          quantity,
        },
      ];
    });

    showToast(`Added ${product.name} (${chosen.name}) to cart`);
    if (openDrawer) {
      setIsCartDrawerOpen(true);
    }
  };

  const updateCartQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(key);
      return;
    }
    setCart((prev) => prev.map((item) => (item.key === key ? { ...item, quantity } : item)));
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
    setDemoUser(user);
    setIsAuthModalOpen(false);
    showToast(`Signed in as ${user.name}`);
  };

  const logoutDemoUser = () => {
    setDemoUser(null);
    showToast('Signed out');
  };

  const orders = useMemo(() => {
    if (isFirebaseAdmin && cloudOrders !== null) {
      return cloudOrders;
    }
    const deletedSet = new Set(deletedOrderIds);
    return [...savedOrders, ...DEMO_TRACKING_ORDERS]
      .filter((o) => !deletedSet.has(o.orderId))
      .map((order) =>
        stageOverrides[order.orderId] !== undefined
          ? { ...order, currentStageIndex: stageOverrides[order.orderId] }
          : order
      );
  }, [isFirebaseAdmin, cloudOrders, savedOrders, deletedOrderIds, stageOverrides]);

  const nextOrderId = useMemo(() => {
    if (cloudLastOrderNumber > 0) {
      return `#${cloudLastOrderNumber + 1}`;
    }
    const localNext = getNextSerialOrderId(orders, deletedOrderIds);
    const localNum = parseSerialNumber(localNext);
    return `#${Math.max(1, localNum)}`;
  }, [cloudLastOrderNumber, orders, deletedOrderIds]);

  const createOrder = async (order: TrackedOrder): Promise<TrackedOrder> => {
    try {
      const counterRef = doc(db, 'meta', 'orderCounter');
      const assignedNum = await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const currentNum = counterSnap.exists()
          ? Number(counterSnap.data()?.lastOrderNumber || 0)
          : 0;
        const nextNum = currentNum + 1;
        const nextOrderIdStr = `#${nextNum}`;
        const docId = `order-${nextNum}`;
        const phoneSuffix = getPhoneSuffix(order.phone);
        const trackingKey = `${nextNum}_${phoneSuffix}`;

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

        const orderPayload = {
          orderId: nextOrderIdStr,
          serialNumber: nextNum,
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

        const trackingPayload = {
          orderId: nextOrderIdStr,
          customerName: orderPayload.customerName,
          city: orderPayload.city,
          totalBdt: orderPayload.totalBdt,
          itemsSummary: orderPayload.itemsSummary,
          placedAt: orderPayload.placedAt,
          currentStageIndex: 1,
          updatedAt: serverTimestamp(),
        };

        transaction.set(doc(db, 'orders', docId), orderPayload);
        transaction.set(doc(db, 'orderTracking', trackingKey), trackingPayload);

        return { nextNum, orderPayload };
      });

      const finalOrder: TrackedOrder = {
        ...order,
        orderId: assignedNum.orderPayload.orderId,
        placedAt: assignedNum.orderPayload.placedAt,
        currentStageIndex: 1,
        isDemoRecord: false,
      };
      setSavedOrders((prev) => [
        finalOrder,
        ...prev.filter((o) => o.orderId !== finalOrder.orderId),
      ]);
      return finalOrder;
    } catch (err) {
      console.error('Firestore createOrder error:', err);
      // Local fallback if offline
      setDeletedOrderIds((prev) =>
        prev.includes(order.orderId) ? prev.filter((id) => id !== order.orderId) : prev
      );
      setSavedOrders((prev) => [order, ...prev.filter((o) => o.orderId !== order.orderId)]);
      return order;
    }
  };

  const updateOrderStage = async (orderId: string, stageIndex: number) => {
    if (!isAdmin) return;
    const clamped = Math.max(0, Math.min(4, stageIndex));
    const target = orders.find((o) => o.orderId === orderId);
    const serialNumber = parseSerialNumber(orderId);

    if (isFirebaseAdmin && serialNumber > 0) {
      const docId = `order-${serialNumber}`;
      try {
        await updateDoc(doc(db, 'orders', docId), {
          currentStageIndex: clamped,
          updatedAt: serverTimestamp(),
        });
        if (target?.phone) {
          const trackingKey = `${serialNumber}_${getPhoneSuffix(target.phone)}`;
          await updateDoc(doc(db, 'orderTracking', trackingKey), {
            currentStageIndex: clamped,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
        showToast(`Order ${orderId} marked as ${STAGE_LABELS[clamped]}`);
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${docId}`);
      }
    }

    setStageOverrides((prev) => ({
      ...prev,
      [orderId]: clamped,
    }));
    showToast(`Order ${orderId} marked as ${STAGE_LABELS[clamped]}`);
  };

  const deleteOrder = async (orderId: string) => {
    if (!isAdmin) return;
    const target = orders.find((o) => o.orderId === orderId);
    const serialNumber = parseSerialNumber(orderId);

    if (isFirebaseAdmin && serialNumber > 0) {
      const docId = `order-${serialNumber}`;
      try {
        await deleteDoc(doc(db, 'orders', docId));
        if (target?.phone) {
          const trackingKey = `${serialNumber}_${getPhoneSuffix(target.phone)}`;
          await deleteDoc(doc(db, 'orderTracking', trackingKey)).catch(() => {});
        }
        showToast(`Order ${orderId} deleted`);
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `orders/${docId}`);
      }
    }

    setSavedOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    setDeletedOrderIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
    setStageOverrides((prev) => {
      if (prev[orderId] === undefined) return prev;
      const copy = { ...prev };
      delete copy[orderId];
      return copy;
    });
    showToast(`Order ${orderId} deleted`);
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
    const trimmedBrand = input.brand.trim() || "Arefin's Pen";
    if (trimmedName.length < 2) {
      return { ok: false, error: 'Please enter a valid product name.' };
    }
    if (!Number.isFinite(input.priceBdt) || input.priceBdt <= 0) {
      return { ok: false, error: 'Please enter a valid price in ৳ BDT.' };
    }
    const validColors = input.colors
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        hex: c.hex.trim() || '#FF1428',
        image: c.image?.trim() || undefined,
      }))
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
        `${trimmedName} by ${trimmedBrand} in ${categoryLabel}, available in ${validColors
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
      featured: Boolean(input.featured),
      isNew: true,
      inStock: input.outOfStock ? false : input.stockCount > 0,
      stockCount: Math.max(0, Math.round(input.stockCount || 50)),
      images: mergedImages,
      colors: validColors.map((c, idx) => ({
        id: c.id || `${slugifyProductName(c.name)}-${idx + 1}`,
        name: c.name,
        hex: c.hex,
        inStock: true,
        image: c.image || mergedImages[0],
      })),
      specs: {
        tipSize: input.tipSize?.trim() || '0.5 mm Fine Point',
        inkType: input.inkType?.trim() || 'Smooth Writing Ink',
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
      handleFirestoreError(err, OperationType.CREATE, `products/${newProduct.id}`);
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
    const trimmedBrand = input.brand.trim() || "Arefin's Pen";
    if (trimmedName.length < 2) {
      return { ok: false, error: 'Please enter a valid product name.' };
    }
    if (!Number.isFinite(input.priceBdt) || input.priceBdt <= 0) {
      return { ok: false, error: 'Please enter a valid price in ৳ BDT.' };
    }
    const validColors = input.colors
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        hex: c.hex.trim() || '#FF1428',
        image: c.image?.trim() || undefined,
      }))
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

    const parsedStock = Number.isFinite(input.stockCount)
      ? Math.max(0, Math.round(input.stockCount))
      : existing.stockCount;
    const nextInStock = input.outOfStock !== undefined ? !input.outOfStock : parsedStock > 0;

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
      stockCount: nextInStock ? Math.max(1, parsedStock) : parsedStock,
      images: mergedImages.length > 0 ? mergedImages : existing.images,
      colors: validColors.map((c, idx) => ({
        id: c.id || `${slugifyProductName(c.name)}-${idx + 1}`,
        name: c.name,
        hex: c.hex,
        inStock: true,
        image: c.image || mergedImages[0] || existing.images[0],
      })),
      specs: {
        ...existing.specs,
        tipSize: input.tipSize?.trim() || existing.specs.tipSize,
        inkType: input.inkType?.trim() || existing.specs.inkType,
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
      handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
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
    const nextStockCount = nextInStock
      ? Math.max(1, existing.stockCount || 25)
      : existing.stockCount;

    try {
      await ensureCatalogSeeded(productId);
      const existsInCloud = cloudProducts?.some((p) => p.id === productId);
      if (existsInCloud) {
        await updateDoc(doc(db, 'products', productId), {
          inStock: nextInStock,
          stockCount: nextStockCount,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'products', productId), {
          ...sanitizeProductForFirestore({
            ...existing,
            inStock: nextInStock,
            stockCount: nextStockCount,
          }),
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
      handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
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
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
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
          error: `Please sign in with your authorized admin Google account (${ADMIN_ACCOUNT.email} or a.b.tanvirul808@gmail.com).`,
        };
      }
      setCloudAdminAllowed(true);
      setIsLocalAdmin(true);
      showToast('Live Cloud Admin connected across all devices');
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/unauthorized-domain')) {
        return {
          ok: false,
          error:
            'Add this domain (e.g. your Netlify URL) in Firebase Console → Authentication → Settings → Authorized domains.',
        };
      }
      if (msg.includes('auth/popup-closed-by-user')) {
        return { ok: false, error: 'Google sign-in popup was closed.' };
      }
      return { ok: false, error: 'Could not sign in with Google. Please try again.' };
    }
  };

  const logoutAdmin = async () => {
    setIsLocalAdmin(false);
    setCloudAdminAllowed(false);
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
    showToast('Admin signed out');
  };

  const findOrder = async (
    orderId: string,
    phone: string
  ): Promise<TrackedOrder | undefined> => {
    const cleanId = orderId.trim().replace(/^#+/, '').toUpperCase();
    const cleanPhone = phone.replace(/[\s-]/g, '').trim();
    const localMatch = orders.find(
      (o) =>
        o.orderId.trim().replace(/^#+/, '').toUpperCase() === cleanId &&
        o.phone.replace(/[\s-]/g, '').endsWith(cleanPhone.slice(-8))
    );
    if (localMatch) return localMatch;

    const phoneSuffix = getPhoneSuffix(phone);
    if (!cleanId || !phoneSuffix) return undefined;
    try {
      const trackingKey = `${cleanId}_${phoneSuffix}`;
      const snap = await getDoc(doc(db, 'orderTracking', trackingKey));
      if (!snap.exists()) return undefined;
      const data = snap.data();
      return {
        orderId: String(data.orderId || `#${cleanId}`),
        phone,
        customerName: String(data.customerName || 'Customer'),
        city: String(data.city || ''),
        address: String(data.city || ''),
        paymentMethod: 'cod',
        totalBdt: Number(data.totalBdt || 0),
        itemsSummary: String(data.itemsSummary || ''),
        placedAt: String(data.placedAt || ''),
        currentStageIndex: Number(data.currentStageIndex ?? 1),
      };
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
        isAuthModalOpen,
        setIsAuthModalOpen,
        loginDemoUser,
        logoutDemoUser,
        products,
        isCloudSynced: isCloudCatalogActive,
        hasUnpublishedProductChanges,
        exportLiveProductsJson,
        syncWithLiveCatalog,
        addAdminProduct,
        updateAdminProduct,
        toggleProductOutOfStock,
        deleteAdminProduct,
        orders,
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
