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
  /** Temporary sale price (null = no offer). */
  offerPriceArs: number | null;
  /** ISO date when the temporary offer expires (null = no offer). */
  offerEndsAt: string | null;
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
  offerPriceArs: number | null;
  offerEndsAt: string | null;
  stock: number;
  imageUrl: string | null;
  score: number;
  /** RAM in GB (for the catalog card). */
  ram: number | null;
  /** Internal storage in GB (for the catalog card). */
  storage: number | null;
}

/** Minimal shape needed to evaluate an offer. */
export interface OfferLike {
  priceArs: number;
  offerPriceArs: number | null;
  offerEndsAt: string | null;
}

/** True if the product currently has an active (not expired) temporary offer. */
export function isOfferActive(p: OfferLike, now: number = Date.now()): boolean {
  return (
    p.offerPriceArs != null &&
    p.offerEndsAt != null &&
    new Date(p.offerEndsAt).getTime() > now
  );
}

/** The price the customer actually pays (offer price if active, else base price). */
export function effectivePrice(p: OfferLike): number {
  return isOfferActive(p) ? (p.offerPriceArs as number) : p.priceArs;
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
export type OrderStatus =
  | 'pending' // esperando pago
  | 'failed' // pago rechazado
  | 'paid' // pago recibido
  | 'ready_pickup' // listo para retirar en local (retiro)
  | 'preparing' // preparando para el envio (envio)
  | 'shipped' // en manos del cartero (envio)
  | 'delivered'; // entregado

export type DeliveryMethod = 'pickup' | 'shipping';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente de pago',
  failed: 'Pago rechazado',
  paid: 'Pago recibido',
  ready_pickup: 'Listo para retirar',
  preparing: 'Preparando para el envío',
  shipped: 'En manos del cartero',
  delivered: 'Entregado',
};

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  pickup: 'Retiro en local',
  shipping: 'Envío a domicilio',
};

/** Ordered fulfillment steps shown as a progress timeline, per delivery method. */
export const FULFILLMENT_STEPS: Record<DeliveryMethod, OrderStatus[]> = {
  pickup: ['paid', 'ready_pickup', 'delivered'],
  shipping: ['paid', 'preparing', 'shipped', 'delivered'],
};

/** Next fulfillment status the admin can advance an order to (null if final). */
export function nextOrderStatus(
  status: OrderStatus,
  method: DeliveryMethod,
): OrderStatus | null {
  const steps = FULFILLMENT_STEPS[method];
  const i = steps.indexOf(status);
  if (i === -1 || i >= steps.length - 1) return null;
  return steps[i + 1];
}

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
  deliveryMethod: DeliveryMethod;
  // customer snapshot / contact data
  customerName: string | null;
  customerEmail: string | null;
  dni: string | null;
  phone: string | null;
  address: string | null;
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

/** Full profile (incl. shipping/pickup data) read from the DB, not the token. */
export interface UserProfile extends AuthUser {
  dni: string | null;
  phone: string | null;
  address: string | null;
}
