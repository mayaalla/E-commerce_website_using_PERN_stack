import { apiClient } from "@/lib/api-client";
import type {
  Order,
  Product,
  Category,
  Wilaya,
  ShippingCompany,
  // TODO: shipping prices — endpoint GET /api/shipping/prices not yet implemented on the backend
  // ShippingPrice,
  Coupon,
  AdminUser,
  ApiListResponse,
  ApiResponse,
} from "./types";

export const fetchOrders = (): Promise<ApiListResponse<Order>> =>
  apiClient.get<ApiListResponse<Order>>("/orders").then((r) => r.data);

export const fetchProducts = (): Promise<ApiListResponse<Product>> =>
  apiClient.get<ApiListResponse<Product>>("/products").then((r) => r.data);

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
