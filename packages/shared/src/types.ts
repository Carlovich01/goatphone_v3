import { SpecCategory } from './specs';

export type Role = 'admin' | 'client';

export interface PhoneSpecs {
  pos: number | null;
  brand: string;
  model: string;
  price: number | null; // INR reference price from dataset
  rating: number | null;
  dualSim: boolean;
  has3g: boolean;
  has4g: boolean;
  has5g: boolean;
  volte: boolean;
  vo5g: boolean;
  wifi: boolean;
  nfc: boolean;
  irBlaster: boolean;
  processorCore: number | null;
  processorSpeedGhz: number | null;
  ram: number | null;
  storage: number | null;
  batteryCapacity: number | null;
  isFastCharging: boolean;
  fastChargingCapacity: number | null;
  displaySize: number | null;
  displayRefreshRate: number | null;
  cameraNotchType: string | null;
  pixelWidth: number | null;
  pixelHeight: number | null;
  displayPpi: number | null;
  os: string | null;
  isMemoryCardSupported: boolean;
  maxCardGb: number | null;
  primaryRearMp: number | null;
  primaryFrontMp: number | null;
  numRearCameras: number | null;
  numFrontCameras: number | null;
  processorBrand: string | null;
  processorModel: string | null;
}

export interface DatasetPhone extends PhoneSpecs {
  id: number;
}

export interface Product {
  id: number;
  datasetPhoneId: number;
  brand: string;
  model: string;
  priceArs: number;
  stock: number;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
  specs: PhoneSpecs;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummary {
  id: number;
  brand: string;
  model: string;
  priceArs: number;
  stock: number;
  imageUrl: string | null;
  score: number;
  /** RAM in GB (for the catalog card). */
  ram: number | null;
  /** Internal storage in GB (for the catalog card). */
  storage: number | null;
}

// ---- Scoring ----
export interface CategoryScore {
  category: SpecCategory;
  score: number; // 0-100
}

export interface PhoneScore {
  productId: number;
  global: number; // 0-100
  categories: CategoryScore[];
}

// ---- Spec distribution (for charts) ----
/** A catalog phone that falls into a given histogram bucket / category. */
export interface CatalogPhoneRef {
  id: number;
  brand: string;
  model: string;
  imageUrl: string | null;
  priceArs: number;
  value: number | string | boolean | null;
}

export interface HistogramBucket {
  rangeStart: number;
  rangeEnd: number;
  count: number;
  label: string;
  phones?: CatalogPhoneRef[]; // catalog phones in this bucket
}

export interface CategoryCount {
  category: string;
  count: number;
  phones?: CatalogPhoneRef[]; // catalog phones in this category
}

export interface ComparedPhoneMarker {
  productId: number;
  label: string; // brand + model
  value: number | string | boolean | null;
  percentile?: number; // 0-100 vs the catalog (quantitative only)
}

export interface SpecDistribution {
  specKey: string;
  label: string;
  type: 'quantitative' | 'categorical' | 'boolean';
  unit?: string;
  /** Number of catalog phones the statistics are computed over. */
  total: number;
  // quantitative
  histogram?: HistogramBucket[];
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  higherIsBetter?: boolean;
  // categorical / boolean
  categories?: CategoryCount[];
  // the phones currently being compared
  markers: ComparedPhoneMarker[];
}

// ---- Comparison response ----
export interface ComparisonResult {
  products: Product[];
  scores: PhoneScore[];
  winnerProductId: number;
}

// ---- AI ----
export interface AiSummary {
  summary: string;
  /** Absent for a single-device summary (nothing to win against). */
  winnerProductId?: number;
  winnerReason?: string;
  cached: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---- Orders ----
export type OrderStatus = 'pending' | 'paid' | 'failed';

export interface OrderItem {
  productId: number;
  brand: string;
  model: string;
  quantity: number;
  unitPriceArs: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  totalArs: number;
  items: OrderItem[];
  mpPreferenceId: string | null;
  initPoint: string | null;
  createdAt: string;
}

// ---- Auth ----
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
