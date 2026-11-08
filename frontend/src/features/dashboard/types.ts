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
}

export interface Product {
  id: string | number;
  title: string;
  price: string | number;
  promo?: string | number | null;
  image?: string;
  categoryId?: string | number;
  stock?: number;
}

export interface Category {
  id: string | number;
  name: string;
}

export interface Wilaya {
  code: string | number;
  name: string;
}

export interface ShippingCompany {
  id: string | number;
  name: string;
  status: "active" | "inactive" | string;
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
  permission: string[];
  type: string;
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

// ─── Dashboard computed data ──────────────────────────────────────────────────

export type DateRange = "today" | "7days" | "30days" | "all";

export interface KpiData {
  netSales: number;
  netSalesPrev: number;
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
