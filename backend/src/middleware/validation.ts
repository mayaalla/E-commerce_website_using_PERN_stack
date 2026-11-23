import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { ZodSchema } from "zod";
import {
  clothingSizes,
  hexColorSchema,
  productColorSchema,
  stockEntrySchema,
  refineVariants,
  productQuerySchema,
  productStockQuerySchema,
} from "../schema/product.schema.js";
import {
  orderQuerySchema,
  updateOrderInformationSchema,
} from "../schema/order.schema.js";

// ─────────────────────────────────────────────────────────────
// REUSABLE HELPER SCHEMAS
// These are small building blocks we reuse across many validators.
// ─────────────────────────────────────────────────────────────

// A valid Algerian phone number – must be exactly 10 digits and start with 0.
const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^0[0-9]{9}$/, "Phone number must be 10 digits and start with 0");

// A monetary value: a non-negative number with at most 2 decimal places.
// We accept either a number or a numeric string (Drizzle stores numerics as strings).
// Values are normalised before the regex check so round-tripped DB strings such as
// "1500.00" or "29.900" pass cleanly without requiring the caller to strip zeros.
const moneySchema = z
  .union([z.number(), z.string()])
  .transform((v) => {
    const n = parseFloat(String(v));
    if (isNaN(n)) return String(v); // pass through; the regex pipe will reject it
    // Canonical form: strip trailing decimal zeros → "1500.00" → "1500", "29.90" → "29.9"
    return n.toFixed(2).replace(/\.?0+$/, "");
  })
  .pipe(
    z
      .string()
      .regex(
        /^\d+(\.\d{1,2})?$/,
        "Must be a non-negative number with at most 2 decimal places"
      )
  );

// NOTE: `clothingSizes` and the hex-colour schema now live in
// schema/product.schema.ts (single source of truth) and are imported above.
// `hexColorSchema` accepts "FF0000", "ff0000" or "#FF0000" and always outputs
// bare uppercase ("FF0000"), which is exactly how the DB stores it.

// CHANGED: Admin permission values. Must match the `admin_permission` DB enum
// exactly (schema.ts → adminPermission), otherwise admins created through the
// API would get permissions that authorize("order_read") etc. never match.
const adminPermissions = [
  "product_read",
  "product_delete",
  "product_add",
  "product_update",
  "category_read",
  "category_delete",
  "category_add",
  "category_update",
  "commune_read",
  "commune_delete",
  "commune_add",
  "commune_update",
  "order_read",
  "order_delete",
  "order_add",
  "order_update",
  "coupon_read",
  "coupon_delete",
  "coupon_add",
  "coupon_update",
  "shipping_read",
  "shipping_delete",
  "shipping_add",
  "shipping_update",
  "shipping_company_read",
  "shipping_company_delete",
  "shipping_company_add",
  "shipping_company_update",
  "wilaya_read",
  "wilaya_delete",
  "wilaya_add",
  "wilaya_update",
  "full_access",
] as const;

// Admin type values that exist in the database enum.
const adminTypes = ["super_admin", "regular_admin"] as const;

// Order status values that exist in the database enum.
const orderStatuses = [
  "confirmed",
  "pending",
  "canceled",
  "returned",
  "delivered",
] as const;

// Coupon status values that exist in the database enum.
const couponStatuses = ["active", "inactive", "expired"] as const;

// ─────────────────────────────────────────────────────────────
// GENERIC MIDDLEWARE FACTORY
// Call validate(schema) and pass the result directly as middleware.
// It checks req.body against the Zod schema.
// On success  → calls next() and replaces req.body with the parsed value.
// On failure  → responds 400 with a list of human-readable error messages.
// ─────────────────────────────────────────────────────────────
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Turn Zod's issues into simple "field: message" strings.
      // Zod v4 uses .issues instead of .errors.
      const errors = result.error.issues.map(
        (e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`
      );
      res.status(400).json({ success: false, errors });
      return;
    }

    // Replace body with the cleaned / transformed data.
    req.body = result.data;
    next();
  };

// ─────────────────────────────────────────────────────────────
// GENERIC QUERY-STRING VALIDATOR FACTORY
// Same idea as validate() but reads req.query and stores the parsed result
// in res.locals[localsKey] so the controller can read a typed object.
// ─────────────────────────────────────────────────────────────
const validateQuery =
  (schema: ZodSchema, localsKey: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map(
        (e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`
      );
      res.status(400).json({ success: false, errors });
      return;
    }

    res.locals[localsKey] = result.data;
    next();
  };

// ─────────────────────────────────────────────────────────────
// GENERIC PARAM VALIDATOR FACTORY
// Same idea as validate() but reads a single URL parameter (default: "id")
// and checks that it is a positive integer.
// Example usage: router.get("/:id", validateId(), handler)
// ─────────────────────────────────────────────────────────────
export const validateId =
  (paramName = "id") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.params[paramName];

    // Check that the parameter is a whole positive number.
    const parsed = z
      .string()
      .regex(/^[1-9][0-9]*$/, `${paramName} must be a positive integer`)
      .transform(Number)
      .safeParse(raw);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        errors: [`${paramName}: must be a positive integer`],
      });
      return;
    }

    // Store the parsed number back so handlers can read req.params directly.
    (req.params as Record<string, string | number>)[paramName] = parsed.data;
    next();
  };

// ─────────────────────────────────────────────────────────────
// WILAYA CODE PARAM VALIDATOR
// Validates that a URL parameter is a 2-digit string (e.g. "01", "48").
// Example usage: router.get("/:code", validateWilayaCode(), handler)
// ─────────────────────────────────────────────────────────────
export const validateWilayaCode =
  (paramName = "code") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.params[paramName];

    const parsed = z
      .string()
      .regex(/^\d{2}$/, `${paramName} must be exactly 2 digits (e.g. '01')`)
      .safeParse(raw);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        errors: [`${paramName}: must be exactly 2 digits (e.g. '01')`],
      });
      return;
    }

    next();
  };

// ═════════════════════════════════════════════════════════════
// ███  ADMIN VALIDATORS
// ═════════════════════════════════════════════════════════════

// Fields WITHOUT defaults. Defaults are added only for "create" below,
// so that "update" (a .partial()) never injects values the caller did not send.
const adminFieldsSchema = z.object({
  // Username must be at least 3 characters, no spaces allowed.
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^\S+$/, "Username must not contain spaces"),

  // Password must be strong: at least 8 chars, one uppercase, one digit.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),

  phoneNumber: phoneNumberSchema,

  // Permissions is an array; each item must be a known permission value.
  permissions: z.array(z.enum(adminPermissions)),

  // Admin type.
  type: z.enum(adminTypes),
});

// Schema for creating a new admin account.
const createAdminSchema = adminFieldsSchema.extend({
  permissions: z.array(z.enum(adminPermissions)).default([]),
  type: z.enum(adminTypes).default("regular_admin"),
});

// Schema for updating an existing admin (all fields optional, NO defaults).
const updateAdminSchema = adminFieldsSchema.partial();

// Schema for admin login.
const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const validateCreateAdmin = validate(createAdminSchema);
export const validateUpdateAdmin = validate(updateAdminSchema);
export const validateAdminLogin = validate(adminLoginSchema);

// ═════════════════════════════════════════════════════════════
// ███  CATEGORY VALIDATORS
// ═════════════════════════════════════════════════════════════

// Schema for creating or updating a category.
const categorySchema = z.object({
  // Name must not be an empty or whitespace-only string.
  name: z.string().trim().min(1, "Category name is required"),
});

export const validateCategory = validate(categorySchema);

// ═════════════════════════════════════════════════════════════
// ███  PRODUCT VALIDATORS
// ═════════════════════════════════════════════════════════════

const productImageUploadSchema = z.object({
  publicId: z.string().min(1, "publicId is required"),
  version: z
    .number()
    .int("version must be a whole number")
    .positive("version must be positive"),
  signature: z.string().min(1, "signature is required"),
  // When present, this upload replaces that existing product image.
  replaceImage: z.string().trim().min(1).optional(),
});

// Reusable list schemas (no defaults here).
const sizesSchema = z
  .array(z.enum(clothingSizes))
  .max(clothingSizes.length, "Too many sizes")
  .refine((s) => new Set(s).size === s.length, "Duplicate sizes are not allowed");

const colorsSchema = z
  .array(productColorSchema)
  .max(20, "At most 20 colors are allowed per product");

const stockEntriesSchema = z
  .array(stockEntrySchema)
  .max(200, "At most 200 stock entries are allowed per product");

// Base shape WITHOUT defaults and WITHOUT refinements.
//  - no defaults    → .partial() for update can never inject "[]" and wipe data
//  - no refinements → Zod v4 refuses to .extend() / .partial() refined schemas,
//                     so superRefine is applied last, on the final schema.
const productBaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),

  // Price must be a non-negative monetary value.
  price: moneySchema,

  // Promo is optional. When provided it must be <= price (the DB also checks this).
  promo: moneySchema.optional(),

  // The category this product belongs to.
  categoryId: z
    .number()
    .int("Category ID must be a whole number")
    .positive("Category ID must be positive"),

  // Sizes must be valid clothing sizes from the enum.
  sizes: sizesSchema,

  // Colors are { name, hex } pairs stored in the product_colors table.
  // hex is the identity (normalised to bare uppercase), name is only a label.
  colors: colorsSchema,

  // Stock entries: one per (colorHex, size) pair. Every colorHex must exist in
  // `colors` and every size in `sizes` (checked by refineVariants + the service).
  stockEntries: stockEntriesSchema,

  // Optional Cloudinary upload confirmations (create: no replaceImage).
  imageUploads: z
    .array(productImageUploadSchema.omit({ replaceImage: true }))
    .max(8, "At most 8 images are allowed per product")
    .optional(),
});

// CREATE: defaults make every list present, so the cross-checks always run.
const createProductSchema = productBaseSchema
  .extend({
    sizes: sizesSchema.default([]),
    colors: colorsSchema.default([]),
    stockEntries: stockEntriesSchema.default([]),
  })
  .superRefine(refineVariants);

// UPDATE (patch semantics): NO defaults.
//   undefined → "leave untouched"
//   []        → "remove all"
// `promo` can additionally be null to explicitly clear an existing promo price.
// When `stockEntries` is provided, it replaces the entire stock grid atomically.
const updateProductSchema = productBaseSchema
  .partial()
  .extend({
    promo: z.union([moneySchema, z.null()]).optional(),
    imageUploads: z
      .array(productImageUploadSchema)
      .max(8, "At most 8 images are allowed per product")
      .optional(),
    imageRemovals: z
      .array(z.string().trim().min(1, "Image URL is required"))
      .max(8, "At most 8 images can be removed at once")
      .refine((images) => new Set(images).size === images.length, {
        message: "An image can only be removed once",
      })
      .optional(),
  })
  .superRefine(refineVariants);

export const validateCreateProduct = validate(createProductSchema);
export const validateUpdateProduct = validate(updateProductSchema);

// ═════════════════════════════════════════════════════════════
// ███  SHIPPING COMPANY VALIDATORS
// ═════════════════════════════════════════════════════════════

const createShippingCompanySchema = z.object({
  name: z.string().trim().min(1, "Shipping company name is required"),

  // The raw API key before hashing – at least 16 characters for security.
  apiKey: z.string().min(16, "API key must be at least 16 characters"),
});

const updateShippingCompanySchema = createShippingCompanySchema.partial();

export const validateCreateShippingCompany = validate(
  createShippingCompanySchema
);
export const validateUpdateShippingCompany = validate(
  updateShippingCompanySchema
);

// ═════════════════════════════════════════════════════════════
// ███  WILAYA VALIDATORS
// ═════════════════════════════════════════════════════════════

const createWilayaSchema = z.object({
  // Wilaya code is a 2-digit text string (e.g. "01", "48").
  // We store it as text so the leading zero is preserved.
  code: z
    .string()
    .trim()
    .regex(/^\d{2}$/, "Wilaya code must be exactly 2 digits (e.g. '01')"),

  name: z.string().trim().min(1, "Wilaya name is required"),
});

const updateWilayaSchema = createWilayaSchema.partial();

export const validateCreateWilaya = validate(createWilayaSchema);
export const validateUpdateWilaya = validate(updateWilayaSchema);

// ═════════════════════════════════════════════════════════════
// ███  COMMUNE VALIDATORS
// ═════════════════════════════════════════════════════════════

const createCommuneSchema = z.object({
  name: z.string().trim().min(1, "Commune name is required"),

  // wilayaId stores the wilaya code text (e.g. "16").
  wilayaId: z
    .string()
    .trim()
    .regex(/^\d{2}$/, "Wilaya code must be exactly 2 digits"),
});

const updateCommuneSchema = createCommuneSchema.partial();

export const validateCreateCommune = validate(createCommuneSchema);
export const validateUpdateCommune = validate(updateCommuneSchema);

// ═════════════════════════════════════════════════════════════
// ███  SHIPPING PRICE VALIDATORS
// ═════════════════════════════════════════════════════════════

const createShippingPriceSchema = z.object({
  price: moneySchema,

  // Reference to an existing wilaya by its text code.
  wilayaCode: z
    .string()
    .trim()
    .regex(/^\d{2}$/, "Wilaya code must be exactly 2 digits"),

  // Reference to an existing shipping company by its numeric ID.
  shippingCompanyId: z
    .number()
    .int("Shipping company ID must be a whole number")
    .positive("Shipping company ID must be positive"),
});

const updateShippingPriceSchema = createShippingPriceSchema.partial();

export const validateCreateShippingPrice = validate(createShippingPriceSchema);
export const validateUpdateShippingPrice = validate(updateShippingPriceSchema);

// ═════════════════════════════════════════════════════════════
// ███  COUPON VALIDATORS
// ═════════════════════════════════════════════════════════════

// Fields WITHOUT defaults (see the admin section for why).
const couponFieldsSchema = z.object({
  // Coupon code: uppercase letters and digits only, 4–20 characters.
  code: z
    .string()
    .trim()
    .min(4, "Coupon code must be at least 4 characters")
    .max(20, "Coupon code must be at most 20 characters")
    .regex(
      /^[A-Z0-9]+$/,
      "Coupon code must contain only uppercase letters and digits"
    ),

  // Expire date in YYYY-MM-DD format.
  expireDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expire date must be in YYYY-MM-DD format")
    .refine((d) => !isNaN(Date.parse(d)), "Expire date must be a valid date")
    .refine(
      (d) => new Date(d) > new Date(),
      "Expire date must be in the future"
    ),

  // Discount percentage: integer between 1 and 100.
  discountPercentage: z
    .number()
    .int("discountPercentage must be an integer")
    .min(1, "discountPercentage must be at least 1")
    .max(100, "discountPercentage must be at most 100"),

  status: z.enum(couponStatuses),
});

// Status defaults to "active" on create only.
const createCouponSchema = couponFieldsSchema.extend({
  status: z.enum(couponStatuses).default("active"),
});

const updateCouponSchema = couponFieldsSchema.partial();

export const validateCreateCoupon = validate(createCouponSchema);
export const validateUpdateCoupon = validate(updateCouponSchema);

// ═════════════════════════════════════════════════════════════
// ███  ORDER VALIDATORS
// ═════════════════════════════════════════════════════════════

// Each item inside an order's products array must match this shape.
// The client sends only the selection fields; the server resolves title, price
// and the colour NAME from live product rows — this prevents manipulation.
const orderProductSchema = z.object({
  // The ID of the product as it exists in the products table.
  productId: z
    .number()
    .int("Product ID must be a whole number")
    .positive("Product ID must be positive"),

  // How many units the customer is buying.
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),

  /**
   * Hex of the chosen colour variant. Accepts "FF0000" or "#FF0000",
   * normalised to bare uppercase. This is the colour's identity: the order
   * service checks it against product_colors for this product, reads the
   * colour name from there, and uses it for the stock look-up.
   * Required by the service when the product has colours.
   */
  colorHex: hexColorSchema.optional(),

  /**
   * CHANGED (deprecated): the service ignores this value and always uses
   * product_colors.name (matched by hex). Kept optional so existing clients
   * that still send it do not break.
   */
  color: z.string().trim().min(1).max(50).optional(),

  // Same enum as products and product_stock, so stock look-ups can never miss.
  // Required by the service when the product has sizes.
  size: z.enum(clothingSizes).optional(),
});

// Schema for placing a new order.
// NOTE: `total` is intentionally absent — the server recomputes it from live
// product prices so the client can never manipulate the final charge.
const createOrderSchema = z.object({
  // Customer's full name.
  name: z.string().trim().min(1, "Name is required"),

  phoneNumber: phoneNumberSchema,

  // Code of the wilaya where the order will be delivered.
  wilayaCode: z
    .string()
    .trim()
    .regex(/^\d{2}$/, "Wilaya code must be exactly 2 digits"),

  // ID of the commune (city/district) inside that wilaya.
  communeId: z
    .number()
    .int("Commune ID must be a whole number")
    .positive("Commune ID must be positive"),

  // Which shipping company will handle delivery.
  shippingCompanyId: z
    .number()
    .int("Shipping company ID must be a whole number")
    .positive("Shipping company ID must be positive"),

  // The cart: at least one product must be present.
  products: z
    .array(orderProductSchema)
    .min(1, "Order must contain at least one product"),

  // Optional coupon code applied at checkout.
  couponCode: z.string().trim().optional(),
});

// Schema for updating an order's status only (e.g. from "pending" to "delivered").
// In Zod v4 the custom error param is "error", not "errorMap".
const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatuses, {
    error: `Status must be one of: ${orderStatuses.join(", ")}`,
  }),
});

export const validateCreateOrder = validate(createOrderSchema);
export const validateUpdateOrderStatus = validate(updateOrderStatusSchema);
export const validateUpdateOrderInformation = validate(
  updateOrderInformationSchema
);

// ─────────────────────────────────────────────────────────────────────────────
// QUERY-STRING VALIDATORS (read req.query, store the parsed result in res.locals)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/orders → res.locals.orderQuery
export const validateOrderQuery = validateQuery(orderQuerySchema, "orderQuery");

// GET /api/products → res.locals.productQuery
export const validateProductQuery = validateQuery(
  productQuerySchema,
  "productQuery"
);

// GET /api/products/:id/stock → res.locals.productStockQuery
export const validateProductStockQuery = validateQuery(
  productStockQuerySchema,
  "productStockQuery"
);

// ═════════════════════════════════════════════════════════════
// ███  IMAGE UPLOAD VALIDATORS
// ═════════════════════════════════════════════════════════════

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const MAX_FILE_SIZE_BYTES = 5_242_880; // 5 MB
const MAX_FILES = 8;

// Schema for requesting upload tokens.
// The client sends metadata about each file it wants to upload.
const requestUploadTokensSchema = z.object({
  files: z
    .array(
      z.object({
        fileName: z
          .string()
          .trim()
          .min(1, "File name is required")
          .max(255, "File name must be at most 255 characters"),
        mimeType: z.enum(ALLOWED_MIME_TYPES, {
          error: `MIME type must be one of: ${ALLOWED_MIME_TYPES.join(", ")}`,
        }),
        size: z
          .number()
          .int("Size must be a whole number")
          .positive("Size must be positive")
          .max(MAX_FILE_SIZE_BYTES, "File size must not exceed 5 MB"),
      })
    )
    .min(1, "At least one file is required")
    .max(MAX_FILES, `At most ${MAX_FILES} files can be uploaded at once`),
});

export const validateRequestUploadTokens = validate(requestUploadTokensSchema);