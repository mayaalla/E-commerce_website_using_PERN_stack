import { z } from "zod";

/** Normalize a validated hex color to the database representation. */
const normalizeHex = (value: string): string => value.replace(/^#/, "").toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────────────────────

/** Clothing sizes that exist in the database enum. */
export const clothingSizes = ["34", "36", "38", "40", "42", "44", "46", "48"] as const;

/** Columns that the client is allowed to sort by. */
const sortableColumns = ["id", "title", "price", "promo", "categoryId"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Color building blocks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accepts "FF0000", "ff0000", "#FF0000" or "#ff0000".
 * Always outputs bare uppercase ("FF0000"), which is exactly how the DB stores it.
 */
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#?[0-9A-Fa-f]{6}$/, "must be a 6-digit hex color (FF0000 or #FF0000)")
  .transform(normalizeHex);

/** One product color: a display name plus its hex identity. */
export const productColorSchema = z.object({
  name: z.string().trim().min(1, "color name is required").max(50),
  hex: hexColorSchema,
});

/** Stock level for one (color, size) combination. */
export const stockEntrySchema = z.object({
  colorHex: hexColorSchema,
  size: z.enum(clothingSizes),
  stock: z.number().int().min(0, "stock must be non-negative").max(1_000_000),
});

export type ProductColorInput = z.infer<typeof productColorSchema>;
export type StockEntryInput = z.infer<typeof stockEntrySchema>;

/**
 * Cross-field rules shared by create and update:
 *  1. no duplicate color hex / color name
 *  2. no duplicate (colorHex, size) stock rows
 *  3. every stock row must point at a declared color and a declared size
 *
 * Rule 3 only runs when the matching list is present in the same body.
 * On update, the service completes the check against the DB state.
 */
export function refineVariants(
  data: {
    colors?: { name: string; hex: string }[];
    sizes?: string[];
    stockEntries?: { colorHex: string; size: string }[];
  },
  ctx: z.RefinementCtx,
) {
  const { colors, sizes, stockEntries } = data;

  if (colors) {
    const hexes = new Set<string>();
    const names = new Set<string>();
    colors.forEach((c, i) => {
      if (hexes.has(c.hex)) {
        ctx.addIssue({ code: "custom", path: ["colors", i, "hex"], message: `Duplicate color ${c.hex}` });
      }
      const nameKey = c.name.toLowerCase();
      if (names.has(nameKey)) {
        ctx.addIssue({ code: "custom", path: ["colors", i, "name"], message: `Duplicate color name "${c.name}"` });
      }
      hexes.add(c.hex);
      names.add(nameKey);
    });
  }

  if (stockEntries) {
    const seen = new Set<string>();
    stockEntries.forEach((e, i) => {
      const key = `${e.colorHex}|${e.size}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path: ["stockEntries", i], message: `Duplicate stock entry ${key}` });
      }
      seen.add(key);

      if (colors && !colors.some((c) => c.hex === e.colorHex)) {
        ctx.addIssue({
          code: "custom",
          path: ["stockEntries", i, "colorHex"],
          message: `Color ${e.colorHex} is not defined in "colors"`,
        });
      }
      if (sizes && !sizes.includes(e.size)) {
        ctx.addIssue({
          code: "custom",
          path: ["stockEntries", i, "size"],
          message: `Size ${e.size} is not defined in "sizes"`,
        });
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Query Schema
// Validates all query-string parameters accepted by GET /api/products
// ─────────────────────────────────────────────────────────────────────────────

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
        .max(100, "limit must be at most 100"),
    ),

  // ── Global search ─────────────────────────────────────────────────────────
  /** Free-text search on title and description (case-insensitive ILIKE). */
  search: z.string().trim().min(1).max(200).optional(),

  // ── Discrete filters ──────────────────────────────────────────────────────
  /** Filter by exact category id. */
  categoryId: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().positive("categoryId must be a positive integer").optional()),

  /** Filter by clothing size. */
  size: z.enum(clothingSizes).optional(),

  /** Filter by color NAME (case-insensitive, partial match) via product_colors.name. */
  color: z.string().trim().min(1).max(50).optional(),

  /**
   * Filter by exact color HEX via product_colors.hex.
   * Accepts "FF0000" or "#FF0000" (send "%23FF0000" in a URL) and normalizes to "FF0000".
   */
  colorHex: hexColorSchema.optional(),

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

  /** "true" → only promo products, "false" → only non-promo, omit → no filter. */
  hasPromo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),

  // ── Sorting ───────────────────────────────────────────────────────────────
  /** Column to sort by. Defaults to "id". */
  sortBy: z.enum(sortableColumns).optional().default("id"),

  /** Sort direction. Defaults to "desc" (newest first). */
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Product Stock Query Schema
// Validates GET /api/products/:id/stock?colorHex=&size=
// ─────────────────────────────────────────────────────────────────────────────

export const productStockQuerySchema = z.object({
  colorHex: hexColorSchema.optional(),
  size: z.enum(clothingSizes).optional(),
});

export type ProductStockQuery = z.infer<typeof productStockQuerySchema>;