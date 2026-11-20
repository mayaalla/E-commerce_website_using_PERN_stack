import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Order Query Schema
// Validates all query-string parameters accepted by GET /api/orders
// ─────────────────────────────────────────────────────────────────────────────

const orderStatuses = [
  "confirmed",
  "pending",
  "canceled",
  "returned",
  "delivered",
] as const;

/** Columns that the client is allowed to sort by. */
const sortableColumns = [
  "id",
  "name",
  "phoneNumber",
  "wilayaCode",
  "total",
  "date",
  "status",
] as const;

export const orderQuerySchema = z.object({
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

  // ── Global search (single input: name | phone | orderId | wilaya name) ───
  /**
   * Free-text search term.
   * Matched against: customer name, phone number, order id, wilaya name.
   */
  search: z.string().trim().min(1).max(100).optional(),

  // ── Discrete filters ──────────────────────────────────────────────────────
  /** Filter by exact order status. */
  status: z.enum(orderStatuses).optional(),

  /** Filter by wilaya code (2-digit string, e.g. "16"). */
  wilayaCode: z
    .string()
    .trim()
    .regex(/^\d{2}$/, "wilayaCode must be exactly 2 digits")
    .optional(),

  /** Filter orders on or after this date (YYYY-MM-DD). */
  dateFrom: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateFrom must be YYYY-MM-DD")
    .refine((d) => !isNaN(Date.parse(d)), "dateFrom must be a valid date")
    .optional(),

  /** Filter orders on or before this date (YYYY-MM-DD). */
  dateTo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateTo must be YYYY-MM-DD")
    .refine((d) => !isNaN(Date.parse(d)), "dateTo must be a valid date")
    .optional(),

  /** Filter orders with a total >= this value. */
  totalMin: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseFloat(v) : undefined))
    .pipe(z.number().min(0, "totalMin must be non-negative").optional()),

  /** Filter orders with a total <= this value. */
  totalMax: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseFloat(v) : undefined))
    .pipe(z.number().min(0, "totalMax must be non-negative").optional()),

  // ── Sorting ───────────────────────────────────────────────────────────────
  /** Column to sort by. Defaults to "id". */
  sortBy: z.enum(sortableColumns).optional().default("id"),

  /** Sort direction. Defaults to "desc" (newest first). */
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type OrderQuery = z.infer<typeof orderQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Order information update schema
// Only customer contact and delivery location fields may be changed.
// ─────────────────────────────────────────────────────────────────────────────

export const updateOrderInformationSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^0[0-9]{9}$/, "Phone number must be 10 digits and start with 0"),
    wilayaCode: z
      .string()
      .trim()
      .regex(/^\d{2}$/, "Wilaya code must be exactly 2 digits"),
    communeId: z
      .number()
      .int("Commune ID must be a whole number")
      .positive("Commune ID must be positive"),
  })
  .strict()
  .partial()
  .refine((information) => Object.keys(information).length > 0, {
    message: "At least one order information field must be provided",
  });

export type UpdateOrderInformation = z.infer<
  typeof updateOrderInformationSchema
>;
