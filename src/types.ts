export type CategoryId =
  | 'all'
  | 'all-pens'
  | 'gel-pens'
  | 'ballpoint-pens'
  | 'fountain-pens'
  | 'marker-pens'
  | 'mechanical-pencils'
  | 'highlighters'
  | 'other-products';

export type SortOption =
  | 'popularity'
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'rating';

export type PageRoute =
  | 'home'
  | 'shop'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'track-order'
  | 'about'
  | 'contact'
  | 'info';

export type InfoTopic =
  | 'shipping'
  | 'returns'
  | 'privacy'
  | 'terms';

export interface ProductColorVariant {
  id: string;
  name: string;
  hex: string;
  inStock: boolean;
  stockCount?: number;
  image?: string;
  inkColors?: InkColorOption[];
}

export interface InkColorOption {
  id: string;
  name: string;
  hex: string;
}

export interface ProductSpecs {
  tipSize: string;
  inkType: string;
  inkColor?: string;
  inkColorHex?: string;
  inkColors?: InkColorOption[];
  bodyMaterial: string;
  weight: string;
  origin: string;
}

export interface ProductReviewSample {
  id: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: Exclude<CategoryId, 'all' | 'all-pens'>;
  categoryLabel: string;
  shortDescription: string;
  description: string;
  priceBdt: number;
  originalPriceBdt?: number;
  rating: number;
  reviewCount: number;
  popularityScore: number;
  orderCount?: number;
  createdAtMs?: number;
  isNew?: boolean;
  featured?: boolean;
  featuredUntilMs?: number;
  featuredOrder?: number;
  inStock: boolean;
  stockCount: number;
  images: string[];
  colors: ProductColorVariant[];
  specs: ProductSpecs;
  sampleReviews: ProductReviewSample[];
}

export interface CartItem {
  key: string; // `${productId}__${colorId}__${inkColorId}`
  productId: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  inkColorId?: string;
  inkColorName?: string;
  inkColorHex?: string;
  quantity: number;
}

export type OrderStageStatus = 'completed' | 'current' | 'pending';

export interface OrderTimelineStep {
  title: string;
  description: string;
  timestamp?: string;
  status: OrderStageStatus;
}

export interface OrderLineItem {
  productId: string;
  productName: string;
  colorId: string;
  colorName: string;
  inkColorId?: string;
  inkColorName?: string;
  quantity: number;
}

export interface TrackedOrder {
  orderId: string;
  serialNumber?: number;
  userId?: string;
  userEmail?: string;
  phone: string;
  customerName: string;
  city: string;
  academyClass?: '5' | '6' | '7';
  address: string;
  paymentMethod: 'cod';
  totalBdt: number;
  itemsSummary: string;
  orderItems?: OrderLineItem[];
  placedAt: string;
  currentStageIndex: number; // 0..4
  isDemoRecord?: boolean;
}

export type AccentThemeColor =
  | 'red'
  | 'purple'
  | 'yellow'
  | 'green'
  | 'sky-blue'
  | 'monochrome';

export interface StorePreferences {
  theme: 'dark' | 'light';
  accentColor: AccentThemeColor;
  reducedMotion: boolean;
  textSize: 'compact' | 'standard' | 'comfortable';
}

export interface DemoUser {
  uid?: string;
  name: string;
  email: string;
  phone: string;
}
