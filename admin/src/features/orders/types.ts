// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "delivered"
  | "canceled"
  | "returned";

// ─── Order item (a single product line inside an order) ───────────────────────

export type OrderItem = {
  productId: number;
  title: string;
  quantity: number;
  /** Numeric string, e.g. "299.99" */
  price: string;
  color: string | null;
  size: string | null;
};

// ─── Order entity ─────────────────────────────────────────────────────────────

export type Order = {
  id: number;
  name: string;
  phoneNumber: string;
  /** 2-digit wilaya code, e.g. "16" */
  wilayaCode: string;
  communeId: number;
  shippingCompanyId: number;
  /** Server-computed total — numeric string, e.g. "1049.99" */
  total: string;
  products: OrderItem[];
  /** ISO date string, e.g. "2026-11-08" */
  date: string;
  /** Time string, e.g. "19:34:00" */
  hour: string;
  status: OrderStatus;
  /** null = active; date string = soft-deleted, e.g. "2026-11-09" */
  deletedAt: string | null;
};

// ─── Pricing breakdown (returned only on order creation) ─────────────────────

export type OrderPricing = {
  /** Numeric string */
  subtotal: string;
  /** 0 when no coupon applied */
  discountPercentage: number;
  /** Numeric string; "0.00" when no coupon applied */
  discountAmount: string;
  /** Numeric string */
  shippingCost: string;
  /** Numeric string */
  total: string;
  /** null when no coupon applied */
  couponCode: string | null;
};

// ─── Order stats (admin dashboard) ───────────────────────────────────────────

export type OrderStats = {
  /**
   * Sum of all confirmed + delivered orders (all-time).
   * Deliberately includes soft-deleted orders — the payment was already collected.
   * Numeric string, e.g. "158420.50"
   */
  totalRevenue: string;
  /** Active (non-soft-deleted) orders only */
  activeOrderCount: number;
  /** Every order ever placed, including soft-deleted */
  allTimeOrderCount: number;
};

// ─── Request bodies ───────────────────────────────────────────────────────────

export interface CreateOrderRequest {
  name: string;
  /** 10 digits, starts with 0 */
  phoneNumber: string;
  /** 2-digit wilaya code, e.g. "16" */
  wilayaCode: string;
  communeId: number;
  shippingCompanyId: number;
  /** At least 1 item required. color and size are optional per item. */
  products: {
    productId: number;
    quantity: number;
    color?: string;
    size?: string;
  }[];
  /** Optional. Discount applies to subtotal only, not shipping. */
  couponCode?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface UpdateOrderInfoRequest {
  name?: string;
  phoneNumber?: string;
  wilayaCode?: string;
  communeId?: number;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface CreateOrderResponse {
  success: boolean;
  data: {
    order: Order;
    pricing: OrderPricing;
  };
}

// ─── Orders query params ──────────────────────────────────────────────────────

export interface OrdersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  wilayaCode?: string;
  dateFrom?: string;
  dateTo?: string;
  totalMin?: number;
  totalMax?: number;
  sortBy?: "id" | "name" | "phoneNumber" | "wilayaCode" | "total" | "date" | "status";
  sortOrder?: "asc" | "desc";
}

export interface GetOrdersResponse {
  success: boolean;
  data: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetOrderResponse {
  success: boolean;
  data: Order;
}

export interface GetOrderStatsResponse {
  success: boolean;
  data: OrderStats;
}

export interface UpdateOrderStatusResponse {
  success: boolean;
  data: Order;
}

export interface UpdateOrderInfoResponse {
  success: boolean;
  data: Order;
}

export interface DeleteOrderResponse {
  success: boolean;
  data: Order;
}
