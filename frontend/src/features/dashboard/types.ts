// ─── Domain types ─────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "confirmed" | "shipped" | "canceled" | "returned";

export interface OrderProduct {
  productId: string | number;
  title: string;
  quantity: number;
  price: string | number;
  color?: string;
  size?: string;
}

export interface Order {
  id: string | number;
  name: string;
  phoneNumber: string;
  wilayaCode: string | number;
  communeId: string | number;
  shippingCompanyId: string | number;
  total: string;
  products: OrderProduct[];
  date: string;   // YYYY-MM-DD
  hour: string;   // HH:mm:ss
  status: OrderStatus;
  deletedAt: string | null; // soft-delete — null means active
}

export interface Product {
  id: string | number;
  title: string;
  price: string | number;
  promo?: string | number | null;
  image?: string;
  categoryId?: string | number;
  stock?: number;
  deletedAt: string | null; // soft-delete — null means active
}

export interface Category {
  id: string | number;
  name: string;
  deletedAt: string | null; // soft-delete — null means active
}

export interface Wilaya {
  code: string | number;
  name: string;
}

export interface ShippingCompany {
  id: string | number;
  name: string;
  status: "active" | "inactive" | string;
  deletedAt: string | null; // soft-delete — null means active
}

// TODO: shipping prices — endpoint GET /api/shipping/prices not yet implemented on the backend
// export interface ShippingPrice {
//   wilayaCode: string | number;
//   shippingCompanyId: string | number;
//   price: string | number;
//   status: string;
// }

export interface Coupon {
  code: string;
  expireDate: string; // ISO date string
  status: "active" | "inactive" | string;
}

export interface AdminUser {
  id: number;
  username: string;
  phoneNumber: string;
  permissions: string[];
  type: "super_admin" | "regular_admin";
}

// ─── API Response wrappers ────────────────────────────────────────────────────

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─── Order stats (from GET /orders/stats) ────────────────────────────────────

/**
 * Shape returned by GET /orders/stats.
 *
 * - totalRevenue      – sum of confirmed + shipped orders (soft-deleted included)
 * - activeOrderCount  – orders visible in the dashboard (not soft-deleted)
 * - allTimeOrderCount – every order ever placed (including soft-deleted)
 */
export interface OrderStats {
  totalRevenue: string;      // numeric string, e.g. "158420.50"
  activeOrderCount: number;
  allTimeOrderCount: number;
}

// ─── Dashboard computed data ──────────────────────────────────────────────────

export type DateRange = "today" | "7days" | "30days" | "all";

export interface KpiData {
  /** Total revenue from confirmed + shipped orders (all-time, soft-deleted included). */
  totalRevenue: number;
  netSales: number;
  netSalesPrev: number;
  /** Active order count from /orders/stats (excludes soft-deleted). */
  activeOrderCount: number;
  /** All-time order count from /orders/stats (includes soft-deleted). */
  allTimeOrderCount: number;
  orderCount: number;
  orderCountPrev: number;
  avgOrderValue: number;
  avgOrderValuePrev: number;
  pendingCount: number;
  cancelReturnRate: number;
  cancelReturnRatePrev: number;
}

export interface DailySalesPoint {
  date: string;
  current: number;
  previous: number;
}

export interface StatusBreakdown {
  pending: number;
  confirmed: number;
  shipped: number;
  canceled: number;
  returned: number;
}

export interface TopProduct {
  productId: string | number;
  title: string;
  image?: string;
  unitsSold: number;
  revenue: number;
}

export interface TopWilaya {
  code: string | number;
  name: string;
  orderCount: number;
  revenue: number;
}

export interface SizeCount {
  size: string;
  count: number;
}

export interface ColorCount {
  color: string;
  count: number;
}

export interface SetupWarning {
  // TODO: shipping prices — "missing_shipping_price" type removed until GET /api/shipping/prices is implemented on the backend
  // type: "missing_shipping_price" | "inactive_company" | "expiring_coupon" | "expired_coupon";
  type: "inactive_company" | "expiring_coupon" | "expired_coupon";
  label: string;
  detail: string;
}

export interface DashboardData {
  orders: Order[];
  orderStats: OrderStats | null;
  products: Product[];
  categories: Category[];
  wilayas: Wilaya[];
  shippingCompanies: ShippingCompany[];
  // TODO: shipping prices — endpoint GET /api/shipping/prices not yet implemented on the backend
  // shippingPrices: ShippingPrice[];
  shippingPrices: never[];
  coupons: Coupon[];
  admin: AdminUser | null;
  isLoading: boolean;
  isError: boolean;
}
