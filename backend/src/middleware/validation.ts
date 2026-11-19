import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { ZodSchema } from "zod";

// ─────────────────────────────────────────────────────────────
// REUSABLE HELPER SCHEMAS
// These are small building blocks we reuse across many validators.
// ─────────────────────────────────────────────────────────────

// A valid Algerian phone number – must be exactly 10 digits and start with 0.
const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^0[0-9]{9}$/, "Phone number must be 10 digits and start with 0");

// A monetary value: a positive number with at most 2 decimal places.
// We accept either a number or a numeric string (Drizzle stores numerics as strings).
const moneySchema = z
  .union([z.number(), z.string()])
  .transform((v) => String(v))
  .pipe(
    z
      .string()
      .regex(
        /^\d+(\.\d{1,2})?$/,
        "Must be a non-negative number with at most 2 decimal places"
      )
  );

// Clothing sizes that exist in the database enum.
const clothingSizes = ["34", "36", "38", "40", "42", "44", "46", "48"] as const;

// A valid 6-digit hex colour WITHOUT the leading "#" (case-insensitive input;
// the service normalises to uppercase before persisting).
const colorHexSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9A-Fa-f]{6}$/,
    "colorHex must be exactly 6 hex digits without the '#' prefix (e.g. 'FF0000')"
  );

// Admin permission values that exist in the database enum.
const adminPermissions = [
  "product_management",
  "order_management",
  "coupon_management",
  "shipping_management",
  "commune_read",
  "commune_delete",
  "commune_add",
  "commune_update",
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
  "shipped",
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

// Schema for creating a new admin account.
// All fields are required.
const createAdminSchema = z.object({
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
  permissions: z.array(z.enum(adminPermissions)).default([]),

  // Type defaults to "regular_admin" if not provided.
  type: z.enum(adminTypes).default("regular_admin"),
});

// Schema for updating an existing admin (all fields optional).
const updateAdminSchema = createAdminSchema.partial();

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

// Schema for creating a new product.
const createProductSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),

  description: z.string().trim().min(1, "Description is required"),

  // Price must be a non-negative monetary value.
  price: moneySchema,

  // Colors is a list of strings (e.g. ["red", "blue"]). Can be empty.
  colors: z.array(z.string().trim().min(1)).default([]),

  // Sizes must be valid clothing sizes from the enum.
  sizes: z.array(z.enum(clothingSizes)).default([]),

  // Promo is optional. When provided it must be <= price (the DB also checks this).
  promo: moneySchema.optional(),

  // The category this product belongs to.
  categoryId: z
    .number()
    .int("Category ID must be a whole number")
    .positive("Category ID must be positive"),

  // Optional Cloudinary upload confirmations.
  // Each entry is verified server-side before the product is inserted.
  imageUploads: z
    .array(
      z.object({
        publicId: z.string().min(1, "publicId is required"),
        version: z
          .number()
          .int("version must be a whole number")
          .positive("version must be positive"),
        signature: z.string().min(1, "signature is required"),
      })
    )
    .min(0)
    .max(8, "At most 8 images are allowed per product")
    .optional(),

  // Stock entries: each defines the available units for a (colorHex, size) pair.
  // colorHex is 6 hex digits without "#" (e.g. "FF0000").
  stockEntries: z
    .array(
      z.object({
        colorHex: colorHexSchema,
        size: z.enum(clothingSizes, {
          error: `Size must be one of: ${clothingSizes.join(", ")}`,
        }),
        stock: z
          .number()
          .int("Stock must be a whole number")
          .min(0, "Stock must be a non-negative number"),
      })
    )
    .optional(),
});

// Schema for updating a product.
// All fields are optional (patch semantics).
// `promo` can additionally be null to explicitly clear an existing promo price.
// When `stockEntries` is provided, it replaces the entire stock grid atomically.
const updateProductSchema = createProductSchema.partial().extend({
  promo: z.union([moneySchema, z.null()]).optional(),
});

export const validateCreateProduct = validate(createProductSchema);
export const validateUpdateProduct = validate(updateProductSchema);

// ═════════════════════════════════════════════════════════════
// ███  SHIPPING COMPANY VALIDATORS
// ═════════════════════════════════════════════════════════════

const createShippingCompanySchema = z.object({
  name: z.string().trim().min(1, "Shipping company name is required"),

  // The raw API key before hashing – at least 16 characters for security.
  apiKey: z
    .string()
    .min(16, "API key must be at least 16 characters"),
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

const createCouponSchema = z.object({
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

  // Status defaults to "active" when not provided.
  status: z.enum(couponStatuses).default("active"),
});

const updateCouponSchema = createCouponSchema.partial();

export const validateCreateCoupon = validate(createCouponSchema);
export const validateUpdateCoupon = validate(updateCouponSchema);

// ═════════════════════════════════════════════════════════════
// ███  ORDER VALIDATORS
// ═════════════════════════════════════════════════════════════

// Each item inside an order's products array must match this shape.
// The client sends only the selection fields; the server resolves title & price
// from live product rows — this prevents price-manipulation attacks.
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

  // Color and size are optional – not every product has them.
  color: z.string().trim().min(1).optional(),
  size: z.string().trim().min(1).optional(),
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

// Schema for updating an order's status only (e.g. from "pending" to "shipped").
// In Zod v4 the custom error param is "error", not "errorMap".
const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatuses, {
    error: `Status must be one of: ${orderStatuses.join(", ")}`,
  }),
});

export const validateCreateOrder = validate(createOrderSchema);
export const validateUpdateOrderStatus = validate(updateOrderStatusSchema);

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

