import { apiClient } from "@/lib/api-client";
import type {
  Order,
  OrderStats,
  Product,
  Category,
  Wilaya,
  ShippingCompany,
  // TODO: shipping prices — endpoint GET /api/shipping/prices not yet implemented on the backend
  // ShippingPrice,
  Coupon,
  AdminUser,
  ApiListResponse,
  ApiPaginatedOrdersResponse,
  ApiPaginatedProductsResponse,
  ApiResponse,
} from "../types";

/**
 * Fetch orders for dashboard analytics.
 *
 * GET /orders now returns a paginated response: { data, pagination }.
 * We request a large page (limit=100) so the dashboard gets enough orders
 * for meaningful KPIs, charts, and the recent-orders table.
 * The response is normalised into the flat ApiListResponse<Order> shape
 * expected by useDashboardData.
 */
export const fetchOrders = async (): Promise<ApiListResponse<Order>> => {
  const r = await apiClient.get<ApiPaginatedOrdersResponse>("/orders", {
    params: { limit: 100, sortBy: "id", sortOrder: "desc" },
  });
  // Normalise paginated envelope → flat list so the rest of the dashboard
  // code is unaffected.
  return { success: r.data.success, data: r.data.data };
};

/**
 * Fetch store-wide order statistics from GET /orders/stats.
 *
 * Returns:
 *  - totalRevenue      – confirmed + delivered totals (soft-deleted orders included)
 *  - activeOrderCount  – orders visible in the dashboard (not soft-deleted)
 *  - allTimeOrderCount – every order ever placed (including soft-deleted)
 *
 * Use this endpoint (not the orders list) for revenue and count KPIs on the
 * dashboard, because soft-deleted orders are excluded from GET /orders but
 * their revenue must still be reported.
 */
export const fetchOrderStats = (): Promise<ApiResponse<OrderStats>> =>
  apiClient.get<ApiResponse<OrderStats>>("/orders/stats").then((r) => r.data);

/**
 * Fetch products for dashboard analytics.
 *
 * GET /products now returns a paginated response: { data, total, page, limit, totalPages }.
 * We request a large page (limit=100) for the Store Snapshot and product breakdowns.
 * The response is normalised into the flat ApiListResponse<Product> shape.
 */
export const fetchProducts = async (): Promise<ApiListResponse<Product>> => {
  const r = await apiClient.get<ApiPaginatedProductsResponse>("/products", {
    params: { limit: 100, sortBy: "id", sortOrder: "desc" },
  });
  return { success: r.data.success, data: r.data.data };
};

export const fetchCategories = (): Promise<ApiListResponse<Category>> =>
  apiClient.get<ApiListResponse<Category>>("/categories").then((r) => r.data);

export const fetchWilayas = (): Promise<ApiListResponse<Wilaya>> =>
  apiClient.get<ApiListResponse<Wilaya>>("/wilayas").then((r) => r.data);

export const fetchShippingCompanies = (): Promise<ApiListResponse<ShippingCompany>> =>
  apiClient.get<ApiListResponse<ShippingCompany>>("/shipping/companies").then((r) => r.data);

// TODO: shipping prices — endpoint GET /api/shipping/prices not yet implemented on the backend
// export const fetchShippingPrices = (): Promise<ApiListResponse<ShippingPrice>> =>
//   apiClient.get<ApiListResponse<ShippingPrice>>("/shipping/prices").then((r) => r.data);

export const fetchCoupons = (): Promise<ApiListResponse<Coupon>> =>
  apiClient.get<ApiListResponse<Coupon>>("/coupons").then((r) => r.data);

export const fetchMe = (): Promise<ApiResponse<AdminUser>> =>
  apiClient.get<ApiResponse<AdminUser>>("/auth/me").then((r) => r.data);

export const patchOrderStatus = (id: string | number, status: string): Promise<unknown> =>
  apiClient.patch(`/orders/${id}/status`, { status }).then((r) => r.data);
