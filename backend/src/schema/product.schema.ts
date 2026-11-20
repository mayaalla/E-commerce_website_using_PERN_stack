import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Product Query Schema
// Validates all query-string parameters accepted by GET /api/products
// ─────────────────────────────────────────────────────────────────────────────

/** Clothing sizes that exist in the database enum. */
const clothingSizes = ["34", "36", "38", "40", "42", "44", "46", "48"] as const;

/** Columns that the client is allowed to sort by. */
const sortableColumns = [
  "id",
  "title",
  "price",
  "promo",
  "categoryId",
] as const;

export const productQuerySchema = z.object({
  // ── Pagination ────────────────────────────────────────────────────────────
  /** Page number (1-based). Defaults to 1. */
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1, "page must be at least 1")),

  /** Number of rows per page. Defaults to 20, max 100. */
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(
      z
        .number()
        .int()
        .min(1, "limit must be at least 1")
        .max(100, "limit must be at most 100")
    ),

  // ── Global search ─────────────────────────────────────────────────────────
  /**
   * Free-text search term.
   * Matched against: product title and description (case-insensitive ILIKE).
   */
  search: z.string().trim().min(1).max(200).optional(),

  // ── Discrete filters ──────────────────────────────────────────────────────
  /** Filter by exact category id. */
  categoryId: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .pipe(
      z
        .number()
        .int()
        .positive("categoryId must be a positive integer")
        .optional()
    ),

  /** Filter by clothing size – must be a valid size from the enum. */
  size: z.enum(clothingSizes).optional(),

  /** Filter by color name (case-insensitive, partial match). */
  color: z.string().trim().min(1).max(50).optional(),

  /** Filter products with a price >= this value. */
  priceMin: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseFloat(v) : undefined))
    .pipe(z.number().min(0, "priceMin must be non-negative").optional()),

  /** Filter products with a price <= this value. */
  priceMax: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseFloat(v) : undefined))
    .pipe(z.number().min(0, "priceMax must be non-negative").optional()),

  /**
   * "true"  → only products that have a promo price.
   * "false" → only products with NO promo price.
   * Omit   → no filter applied.
   */
  hasPromo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined
    ),

  // ── Sorting ───────────────────────────────────────────────────────────────
  /** Column to sort by. Defaults to "id". */
  sortBy: z.enum(sortableColumns).optional().default("id"),

  /** Sort direction. Defaults to "desc" (newest first). */
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

