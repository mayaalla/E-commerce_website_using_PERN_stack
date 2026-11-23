import { z } from "zod";

export const clothingSizeSchema = z.enum(["34", "36", "38", "40", "42", "44", "46", "48"]);

export const productColorSchema = z.object({
  name: z.string().trim().min(1).max(50),
  hex: z.string().regex(/^[0-9A-F]{6}$/),
});

export const stockEntrySchema = z.object({
  colorHex: z.string().regex(/^[0-9A-F]{6}$/),
  size: clothingSizeSchema,
  stock: z.number().int().min(0),
});

export const productStockSchema = z.object({
  id: z.number().int().positive(),
  productId: z.number().int().positive(),
  colorHex: z.string().regex(/^[0-9A-F]{6}$/),
  size: clothingSizeSchema,
  stock: z.number().int().min(0),
});

export const productStockWithColorSchema = productStockSchema.extend({
  colorName: z.string().min(1),
});

export const productSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  price: z.string(),
  promo: z.string().nullable(),
  images: z.array(z.string()),
  colors: z.array(productColorSchema),
  sizes: z.array(clothingSizeSchema),
  categoryId: z.number().int().positive(),
  deletedAt: z.string().nullable(),
  stock: z.array(productStockSchema).optional(),
});

export const productResponseSchema = z.object({
  success: z.literal(true),
  data: productSchema,
});

export const getProductsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(productSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export const getProductsByCategoryResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(productSchema),
});

export const getProductStockResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(productStockWithColorSchema),
});

export const deleteProductResponseSchema = productResponseSchema;

export const uploadTokenSchema = z.object({
  publicId: z.string().min(1),
  signature: z.string().min(1),
  timestamp: z.number().int().positive(),
  apiKey: z.string().min(1),
  cloudName: z.string().min(1),
});

export const uploadResponseTokensSchema = z.object({
  success: z.literal(true),
  data: z.array(uploadTokenSchema),
});

export const cloudinaryUploadResponseSchema = z.object({
  public_id: z.string().min(1),
  version: z.number().int().positive(),
  signature: z.string().min(1),
});

const moneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/);
const createImageUploadSchema = z.object({
  publicId: z.string().min(1),
  version: z.number().int().positive(),
  signature: z.string().min(1),
});
const updateImageUploadSchema = createImageUploadSchema.extend({
  replaceImage: z.string().trim().min(1).optional(),
});

const productFieldsSchema = {
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: moneySchema,
  categoryId: z.number().int().positive(),
  colors: z.array(productColorSchema).max(20),
  sizes: z.array(clothingSizeSchema).max(8),
  stockEntries: z.array(stockEntrySchema).max(200).optional(),
};

export const createProductRequestSchema = z.object({
  ...productFieldsSchema,
  promo: moneySchema.optional(),
  imageUploads: z.array(createImageUploadSchema).max(8).optional(),
});

export const updateProductRequestSchema = z
  .object({
    ...productFieldsSchema,
    promo: moneySchema.nullable().optional(),
    imageUploads: z.array(updateImageUploadSchema).max(8).optional(),
    imageRemovals: z.array(z.string().trim().min(1)).max(8).optional(),
  })
  .partial()
  .extend({
    promo: moneySchema.nullable().optional(),
    imageUploads: z.array(updateImageUploadSchema).max(8).optional(),
    imageRemovals: z.array(z.string().trim().min(1)).max(8).optional(),
  });

export type ClothingSize = z.infer<typeof clothingSizeSchema>;
export type ProductColor = z.infer<typeof productColorSchema>;
export type StockEntry = z.infer<typeof stockEntrySchema>;
export type ProductStock = z.infer<typeof productStockSchema>;
export type ProductStockWithColor = z.infer<typeof productStockWithColorSchema>;
export type Product = z.infer<typeof productSchema>;
export type CreateProductResponse = z.infer<typeof productResponseSchema>;
export type GetProductResponse = z.infer<typeof productResponseSchema>;
export type GetProductsResponse = z.infer<typeof getProductsResponseSchema>;
export type GetProductsByCategoryResponse = z.infer<typeof getProductsByCategoryResponseSchema>;
export type GetProductStockResponse = z.infer<typeof getProductStockResponseSchema>;
export type UpdateProductResponse = z.infer<typeof productResponseSchema>;
export type DeleteProductResponse = z.infer<typeof deleteProductResponseSchema>;
export type UploadResponseTokens = z.infer<typeof uploadResponseTokensSchema>;
