import type { z } from "zod";
import type {
  createOrderRequestSchema,
  createOrderResponseSchema,
  deleteOrderResponseSchema,
  getOrderResponseSchema,
  getOrdersResponseSchema,
  getOrderStatsResponseSchema,
  orderItemSchema,
  orderPricingSchema,
  orderSchema,
  orderStatsSchema,
  orderStatusSchema,
  updateOrderInfoRequestSchema,
  updateOrderInfoResponseSchema,
  updateOrderStatusRequestSchema,
  updateOrderStatusResponseSchema,
} from "./schemas";

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderPricing = z.infer<typeof orderPricingSchema>;
export type OrderStats = z.infer<typeof orderStatsSchema>;

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusRequestSchema>;
export type UpdateOrderInfoRequest = z.infer<typeof updateOrderInfoRequestSchema>;

export type CreateOrderResponse = z.infer<typeof createOrderResponseSchema>;
export type GetOrdersResponse = z.infer<typeof getOrdersResponseSchema>;
export type GetOrderResponse = z.infer<typeof getOrderResponseSchema>;
export type GetOrderStatsResponse = z.infer<typeof getOrderStatsResponseSchema>;
export type UpdateOrderStatusResponse = z.infer<typeof updateOrderStatusResponseSchema>;
export type UpdateOrderInfoResponse = z.infer<typeof updateOrderInfoResponseSchema>;
export type DeleteOrderResponse = z.infer<typeof deleteOrderResponseSchema>;

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
