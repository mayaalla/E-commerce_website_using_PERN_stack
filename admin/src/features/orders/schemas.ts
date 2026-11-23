import { z } from "zod";

import { clothingSizeSchema } from "../products/schemas";

export const orderStatusSchema = z.enum([
  "confirmed",
  "pending",
  "canceled",
  "returned",
  "delivered",
]);

export const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  title: z.string(),
  quantity: z.number().int().positive(),
  price: z.string(),
  // Optional and nullable to support snapshots created before colorHex was added.
  color: z.string().nullable().optional(),
  colorHex: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
});

export const orderSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  phoneNumber: z.string(),
  wilayaCode: z.string(),
  communeId: z.number().int().positive(),
  shippingCompanyId: z.number().int().positive(),
  total: z.string(),
  products: z.array(orderItemSchema),
  date: z.string(),
  hour: z.string(),
  status: orderStatusSchema,
  deletedAt: z.string().nullable(),
});

export const orderPricingSchema = z.object({
  subtotal: z.string(),
  discountPercentage: z.number(),
  discountAmount: z.string(),
  shippingCost: z.string(),
  total: z.string(),
  couponCode: z.string().nullable(),
});

export const orderStatsSchema = z.object({
  totalRevenue: z.string(),
  activeOrderCount: z.number().int().nonnegative(),
  allTimeOrderCount: z.number().int().nonnegative(),
});

export const createOrderRequestSchema = z.object({
  name: z.string().trim().min(1),
  phoneNumber: z.string().regex(/^0[0-9]{9}$/),
  wilayaCode: z.string().regex(/^\d{2}$/),
  communeId: z.number().int().positive(),
  shippingCompanyId: z.number().int().positive(),
  products: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1),
        colorHex: z.string().regex(/^[0-9A-F]{6}$/).optional(),
        size: clothingSizeSchema.optional(),
      }),
    )
    .min(1),
  couponCode: z.string().trim().optional(),
});

export const updateOrderStatusRequestSchema = z.object({
  status: orderStatusSchema,
});

export const updateOrderInfoRequestSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phoneNumber: z.string().regex(/^0[0-9]{9}$/).optional(),
    wilayaCode: z.string().regex(/^\d{2}$/).optional(),
    communeId: z.number().int().positive().optional(),
  })
  .strict()
  .refine((information) => Object.keys(information).length > 0);

export const createOrderResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    order: orderSchema,
    pricing: orderPricingSchema,
  }),
});

export const getOrdersResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(orderSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const getOrderResponseSchema = z.object({
  success: z.literal(true),
  data: orderSchema,
});

export const getOrderStatsResponseSchema = z.object({
  success: z.literal(true),
  data: orderStatsSchema,
});

export const updateOrderStatusResponseSchema = getOrderResponseSchema;
export const updateOrderInfoResponseSchema = getOrderResponseSchema;
export const deleteOrderResponseSchema = getOrderResponseSchema;
