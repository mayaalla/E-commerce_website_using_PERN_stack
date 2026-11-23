import {
  eq,
  isNull,
  and,
  ilike,
  gte,
  lte,
  isNotNull,
  asc,
  desc,
  or,
  sql,
  inArray,
  getTableColumns,
} from "drizzle-orm";
import type { ProductQuery } from "../schema/product.schema.js";

import { db } from "../db/db.js";
import { products, categories, productStock, productColors } from "../db/schema.js";
import { verifyAndConsumeToken, MAX_IMAGES_PER_PRODUCT } from "../utils/upload.js";


/** Service-layer error carrying the HTTP status expected by the error handler. */
class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const normalizeHex = (v: string) => v.trim().replace(/^#/, "").toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single product row as stored in the database (no colors: they live in product_colors). */
export type Product = typeof products.$inferSelect;

/** A single product_stock row as stored in the database. */
export type ProductStock = typeof productStock.$inferSelect;

/** One color of a product. `hex` is the identity (6 uppercase digits, no "#"), `name` is a label. */
export type ProductColor = Pick<typeof productColors.$inferSelect, "name" | "hex">;

/** A product together with its colors. */
export type ProductWithColors = Product & { colors: ProductColor[] };

/** A product together with its colors and its full stock grid. */
export type ProductDetail = ProductWithColors & { stock: ProductStock[] };

/** A stock row enriched with the color name, so the UI needs no second call. */
export type ProductStockWithColor = {
  id: number;
  productId: number;
  colorHex: string;
  colorName: string;
  size: ProductStock["size"];
  stock: number;
};

/**
 * One entry in the stock array: which colour + size and how many units.
 * colorHex is the 6-digit hex string WITHOUT the leading "#" (e.g. "FF0000").
 */
export type StockEntry = {
  colorHex: string;
  size: ProductStock["size"];
  stock: number;
};

type ImageUploadConfirmation = {
  publicId: string;
  version: number;
  signature: string;
  replaceImage?: string;
};

/**
 * Payload accepted when creating a new product.
 *
 * `price` and `promo` are numeric strings ("12.50") because Drizzle maps
 * PostgreSQL `numeric` columns to strings at runtime.
 */
export type CreateProductPayload = {
  title: string;
  description: string;
  /** Decimal string – must be >= 0. */
  price: string;
  /** Colors of the product. Every stock entry must reference one of these hex values. */
  colors?: ProductColor[];
  sizes?: Product["sizes"];
  /** Optional promotional price; must be >= 0 and <= price. */
  promo?: string;
  categoryId: number;
  /** Optional Cloudinary upload confirmations. Each entry is verified server-side. */
  imageUploads?: Array<{ publicId: string; version: number; signature: string }>;
  /**
   * The ID of the admin performing this action.
   * Used to verify that each imageUpload token was issued to the same admin
   * — preventing cross-admin token theft/reuse attacks.
   */
  adminId: number;
  /** Optional initial stock entries, one per (colorHex, size) pair. */
  stockEntries?: StockEntry[];
};

/**
 * Payload accepted when updating an existing product (patch semantics).
 *   undefined → leave untouched
 *   colors: [] / stockEntries: [] → remove all
 *   promo: null → clear the promo price
 */
export type UpdateProductPayload = Partial<
  Omit<CreateProductPayload, "adminId" | "imageUploads" | "promo">
> & {
  promo?: string | null;
  adminId: number;
  imageUploads?: ImageUploadConfirmation[];
  imageRemovals?: string[];
};

/** Paginated list response for products. */
export type PaginatedProducts = {
  data: ProductWithColors[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** Anything that can run a SELECT: the db itself or a transaction. */
type Executor = Pick<typeof db, "select">;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: normalisation
// ─────────────────────────────────────────────────────────────────────────────

// Zod already normalises hex values, but the service must not trust its caller.
const normalizeColors = (colors: ProductColor[]): ProductColor[] =>
  colors.map((c) => ({ name: c.name.trim(), hex: normalizeHex(c.hex) }));

const normalizeStock = (entries: StockEntry[]): StockEntry[] =>
  entries.map((e) => ({ ...e, colorHex: normalizeHex(e.colorHex) }));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: business rules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies that the referenced category exists AND has not been soft-deleted.
 * Gives a clear error instead of a raw FK violation.
 */
async function assertCategoryExists(categoryId: number): Promise<void> {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  if (!category || category.deletedAt) {
    throw new AppError(404, `Category with id ${categoryId} not found`);
  }
}

/**
 * Guards against a promo price that is higher than the regular price.
 * The DB enforces the same invariant via a CHECK constraint, but catching it
 * here produces a friendlier error message.
 */
function assertPromoValid(price: string, promo: string): void {
  if (parseFloat(promo) > parseFloat(price)) {
    throw new AppError(422, "Promo price must be less than or equal to the regular price");
  }
}

/**
 * THE core invariant: a stock row may only exist for a color and a size that
 * the product actually declares, and each (color, size) pair appears once.
 * The composite FK enforces it in the DB; checking here gives a clear 422.
 */
function assertStockMatchesVariants(
  entries: { colorHex: string; size: string }[],
  colors: ProductColor[],
  sizes: readonly string[]
): void {
  const hexes = new Set(colors.map((c) => c.hex));
  const sizeSet = new Set(sizes);
  const seen = new Set<string>();

  for (const e of entries) {
    if (!hexes.has(e.colorHex)) {
      throw new AppError(
        422,
        `Stock references color ${e.colorHex}, which is not defined on this product`
      );
    }
    if (!sizeSet.has(e.size)) {
      throw new AppError(
        422,
        `Stock references size ${e.size}, which is not defined on this product`
      );
    }
    const key = `${e.colorHex}|${e.size}`;
    if (seen.has(key)) {
      throw new AppError(422, `Duplicate stock entry for ${key}`);
    }
    seen.add(key);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: colors
// ─────────────────────────────────────────────────────────────────────────────

/** Loads the colors of several products with ONE query (no N+1). */
async function fetchColorsByProduct(
  executor: Executor,
  productIds: number[]
): Promise<Map<number, ProductColor[]>> {
  const byProduct = new Map<number, ProductColor[]>();
  if (productIds.length === 0) return byProduct;

  const rows = await executor
    .select({
      productId: productColors.productId,
      name: productColors.name,
      hex: productColors.hex,
    })
    .from(productColors)
    .where(inArray(productColors.productId, productIds))
    .orderBy(asc(productColors.id));

  for (const { productId, ...color } of rows) {
    const list = byProduct.get(productId);
    if (list) list.push(color);
    else byProduct.set(productId, [color]);
  }
  return byProduct;
}

/** Adds a `colors` array to every row. */
async function attachColors<T extends { id: number }>(
  rows: T[],
  executor: Executor = db
): Promise<Array<T & { colors: ProductColor[] }>> {
  const byProduct = await fetchColorsByProduct(
    executor,
    rows.map((r) => r.id)
  );
  return rows.map((r) => ({ ...r, colors: byProduct.get(r.id) ?? [] }));
}

/**
 * Makes product_colors match `desired`, keyed on hex (the identity).
 * Order: delete → rename → insert, so a name freed by a deletion can be reused.
 * A diff is used instead of "delete all + insert all" because product_stock
 * points at the hex: replacing everything would cascade-delete the stock of
 * colors that did not change.
 */
async function syncProductColors(
  tx: Tx,
  productId: number,
  desired: ProductColor[]
): Promise<boolean> {
  const current = await tx
    .select()
    .from(productColors)
    .where(eq(productColors.productId, productId));

  const currentByHex = new Map(current.map((c) => [c.hex, c]));
  const desiredHexes = new Set(desired.map((c) => c.hex));

  const toDelete = current.filter((c) => !desiredHexes.has(c.hex));
  const toRename = desired.filter((c) => {
    const found = currentByHex.get(c.hex);
    return found !== undefined && found.name !== c.name;
  });
  const toInsert = desired.filter((c) => !currentByHex.has(c.hex));

  if (toDelete.length > 0) {
    await tx
      .delete(productColors)
      .where(inArray(productColors.id, toDelete.map((c) => c.id)));
  }
  for (const c of toRename) {
    await tx
      .update(productColors)
      .set({ name: c.name })
      .where(and(eq(productColors.productId, productId), eq(productColors.hex, c.hex)));
  }
  if (toInsert.length > 0) {
    await tx
      .insert(productColors)
      .values(toInsert.map((c) => ({ productId, name: c.name, hex: c.hex })));
  }

  return toDelete.length + toRename.length + toInsert.length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: images and comparisons
// ─────────────────────────────────────────────────────────────────────────────

/** Validates removals / replacements / final count against the CURRENT image list. */
function assertImageOpsValid(
  currentImages: string[],
  removals: string[],
  uploads: ImageUploadConfirmation[]
): void {
  const removalSet = new Set(removals);
  if (removalSet.size !== removals.length) {
    throw new AppError(422, "Image update failed: an image can only be removed once");
  }

  const targets = uploads
    .map((u) => u.replaceImage)
    .filter((image): image is string => image !== undefined);
  if (new Set(targets).size !== targets.length) {
    throw new AppError(422, "Image update failed: an image can only be replaced once");
  }

  if (removals.some((image) => !currentImages.includes(image))) {
    throw new AppError(
      422,
      "Image update failed: a removed image does not belong to this product"
    );
  }
  if (targets.some((image) => !currentImages.includes(image) || removalSet.has(image))) {
    throw new AppError(
      422,
      "Image update failed: a replacement image does not belong to this product"
    );
  }

  const finalCount =
    currentImages.length -
    removalSet.size +
    uploads.filter((u) => u.replaceImage === undefined).length;
  if (finalCount > MAX_IMAGES_PER_PRODUCT) {
    throw new AppError(
      422,
      `Too many images: a product may have at most ${MAX_IMAGES_PER_PRODUCT} images`
    );
  }
}

/** Applies removals, then replacements in place, then appends new images. */
function applyImageOps(
  currentImages: string[],
  removals: string[],
  uploads: ImageUploadConfirmation[],
  uploadedUrls: string[]
): string[] {
  const removalSet = new Set(removals);
  const result = currentImages.filter((image) => !removalSet.has(image));

  uploads.forEach((upload, index) => {
    if (upload.replaceImage) {
      result[result.indexOf(upload.replaceImage)] = uploadedUrls[index];
    } else {
      result.push(uploadedUrls[index]);
    }
  });
  return result;
}

/** Field-aware equality: numeric strings by value, arrays by content. */
function sameValue(key: string, a: unknown, b: unknown): boolean {
  if (key === "price" || key === "promo") {
    return a == null || b == null ? a === b : Number(a) === Number(b);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

/** True when both stock grids contain exactly the same (color, size, stock) rows. */
function sameStock(current: StockEntry[], next: StockEntry[]): boolean {
  if (current.length !== next.length) return false;
  const currentMap = new Map(current.map((e) => [`${e.colorHex}|${e.size}`, e.stock]));
  return next.every((e) => currentMap.get(`${e.colorHex}|${e.size}`) === e.stock);
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// Validate business rules, verify uploads, then insert product → colors → stock
// in ONE transaction (colors must come before stock because of the FK).
// ─────────────────────────────────────────────────────────────────────────────

export async function createProductService(
  payload: CreateProductPayload
): Promise<ProductDetail> {
  const { title, description, price, sizes = [], promo, categoryId, imageUploads, adminId } =
    payload;
  const colors = normalizeColors(payload.colors ?? []);
  const stockEntries = normalizeStock(payload.stockEntries ?? []);

  await assertCategoryExists(categoryId);

  if (promo !== undefined) {
    assertPromoValid(price, promo);
  }

  // Fail fast, BEFORE any upload token is consumed.
  assertStockMatchesVariants(stockEntries, colors, sizes);

  // Guard: never store more than MAX_IMAGES_PER_PRODUCT URLs on a product.
  if (imageUploads && imageUploads.length > MAX_IMAGES_PER_PRODUCT) {
    throw new AppError(
      422,
      `Too many images: a product may have at most ${MAX_IMAGES_PER_PRODUCT} images`
    );
  }

  // Verify and consume each upload token → build secure_urls.
  let images: string[] = [];
  if (imageUploads && imageUploads.length > 0) {
    images = await Promise.all(
      imageUploads.map(({ publicId, version, signature }) =>
        verifyAndConsumeToken(publicId, version, signature, adminId)
      )
    );
  }

  return db.transaction(async (tx) => {
    const [newProduct] = await tx
      .insert(products)
      .values({
        title,
        description,
        price,
        sizes,
        promo: promo ?? null,
        categoryId,
        images,
      })
      .returning();

    if (colors.length > 0) {
      await tx
        .insert(productColors)
        .values(colors.map((c) => ({ productId: newProduct.id, name: c.name, hex: c.hex })));
    }

    let stock: ProductStock[] = [];
    if (stockEntries.length > 0) {
      stock = await tx
        .insert(productStock)
        .values(
          stockEntries.map((e) => ({
            productId: newProduct.id,
            colorHex: e.colorHex,
            size: e.size,
            stock: e.stock,
          }))
        )
        .returning();
    }

    return { ...newProduct, colors, stock };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Read one
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductByIdService(id: number): Promise<ProductWithColors> {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product || product.deletedAt) {
    throw new AppError(404, `Product with id ${id} not found`);
  }

  const [withColors] = await attachColors([product]);
  return withColors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read all  (with search, filters, sorting, pagination)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of products with optional search, filters and sorting.
 *
 * Query parameters:
 *  - search      : ILIKE match on title OR description
 *  - categoryId  : exact match on categoryId
 *  - size        : product must include this clothing size in its sizes array
 *  - color       : product must have a color whose NAME ILIKE-matches (product_colors.name)
 *  - colorHex    : product must have a color with exactly this HEX (product_colors.hex)
 *  - priceMin    : price >= priceMin
 *  - priceMax    : price <= priceMax
 *  - hasPromo    : true → only products with a promo; false → only without
 *  - sortBy      : id | title | price | promo | categoryId
 *  - sortOrder   : asc | desc
 *  - page / limit: pagination
 */
export async function getAllProductsService(
  query: ProductQuery
): Promise<PaginatedProducts> {
  const {
    page,
    limit,
    search,
    categoryId,
    size,
    color,
    colorHex,
    priceMin,
    priceMax,
    hasPromo,
    sortBy,
    sortOrder,
  } = query;

  // ── Build WHERE conditions ─────────────────────────────────────────────────
  const conditions = [isNull(products.deletedAt)];

  if (search) {
    conditions.push(
      or(
        ilike(products.title, `%${search}%`),
        ilike(products.description, `%${search}%`)
      )!
    );
  }

  if (categoryId !== undefined) {
    conditions.push(eq(products.categoryId, categoryId));
  }

  if (size) {
    // The sizes column is a PostgreSQL array; use the ANY operator.
    conditions.push(sql`${size} = ANY(${products.sizes})`);
  }

  if (color) {
    // Colors now live in product_colors: correlated EXISTS on the NAME.
    conditions.push(sql`EXISTS (
      SELECT 1 FROM ${productColors}
      WHERE ${productColors.productId} = ${products.id}
        AND ${productColors.name} ILIKE ${"%" + color + "%"}
    )`);
  }

  if (colorHex) {
    // Exact match on the HEX (already normalised to bare uppercase by zod).
    conditions.push(sql`EXISTS (
      SELECT 1 FROM ${productColors}
      WHERE ${productColors.productId} = ${products.id}
        AND ${productColors.hex} = ${colorHex}
    )`);
  }

  if (priceMin !== undefined) {
    conditions.push(gte(products.price, String(priceMin)));
  }

  if (priceMax !== undefined) {
    conditions.push(lte(products.price, String(priceMax)));
  }

  if (hasPromo === true) {
    conditions.push(isNotNull(products.promo));
  } else if (hasPromo === false) {
    conditions.push(isNull(products.promo));
  }

  const whereClause = and(...conditions);

  // ── Sort column ───────────────────────────────────────────────────────────
  const columnMap = {
    id: products.id,
    title: products.title,
    price: products.price,
    promo: products.promo,
    categoryId: products.categoryId,
  } as const;

  const orderCol = columnMap[sortBy as keyof typeof columnMap] ?? products.id;
  const orderFn = sortOrder === "asc" ? asc : desc;

  // ── Count total rows matching the filters ──────────────────────────────────
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(products)
    .where(whereClause);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  // ── Fetch the page, then attach colors with ONE extra query ────────────────
  const rows = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderFn(orderCol))
    .limit(limit)
    .offset(offset);

  const data = await attachColors(rows);

  return { data, total, page, limit, totalPages };
}

// ─────────────────────────────────────────────────────────────────────────────
// Read by category
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductsByCategoryService(
  categoryId: number
): Promise<ProductWithColors[]> {
  await assertCategoryExists(categoryId);

  const rows = await db
    .select(getTableColumns(products))
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    // Return only non-deleted products whose category is also not deleted.
    .where(
      and(
        isNull(products.deletedAt),
        eq(products.categoryId, categoryId),
        isNull(categories.deletedAt)
      )
    );

  return attachColors(rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update (patch semantics)
//  1. validate everything that can fail BEFORE consuming upload tokens
//  2. verify/consume tokens
//  3. in one transaction: lock row → sync colors → update product → replace stock
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProductByIdService(
  id: number,
  payload: UpdateProductPayload
): Promise<ProductDetail> {
  const {
    colors: rawColors,
    stockEntries: rawStock,
    adminId,
    imageUploads: _imageUploads,
    imageRemovals: _imageRemovals,
    ...productFields
  } = payload;

  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing || existing.deletedAt) {
    throw new AppError(404, `Product with id ${id} not found`);
  }

  // Only validate the category when it is actually changing. Keeping the same
  // categoryId is always allowed, even if that category was soft-deleted since.
  if (payload.categoryId !== undefined && payload.categoryId !== existing.categoryId) {
    await assertCategoryExists(payload.categoryId);
  }

  // Re-validate promo against the effective price after the patch.
  // payload.promo === null means "clear it", so there is nothing to validate.
  const effectivePrice = payload.price ?? existing.price;
  const effectivePromo = payload.promo === undefined ? existing.promo : payload.promo;
  if (effectivePromo !== null) {
    assertPromoValid(effectivePrice, effectivePromo);
  }

  // ── Variants: validate the state AFTER the patch ──────────────────────────
  const colors = rawColors === undefined ? undefined : normalizeColors(rawColors);
  const stockEntries = rawStock === undefined ? undefined : normalizeStock(rawStock);

  if (colors !== undefined || payload.sizes !== undefined || stockEntries !== undefined) {
    const nextColors =
      colors ?? (await fetchColorsByProduct(db, [id])).get(id) ?? [];
    const nextSizes = payload.sizes ?? existing.sizes;
    const nextStock =
      stockEntries ??
      (await db
        .select({ colorHex: productStock.colorHex, size: productStock.size })
        .from(productStock)
        .where(eq(productStock.productId, id)));

    // Removing a color/size that still has stock (and not sending a new
    // stockEntries) is rejected here instead of silently deleting stock.
    assertStockMatchesVariants(nextStock, nextColors, nextSizes);
  }

  // ── Images: validate against the current list ─────────────────────────────
  const imageUploads = payload.imageUploads ?? [];
  const imageRemovals = payload.imageRemovals ?? [];
  const hasImageChanges =
    payload.imageUploads !== undefined || payload.imageRemovals !== undefined;

  assertImageOpsValid(existing.images, imageRemovals, imageUploads);

  // Verify and consume each new upload token before storing its Cloudinary URL.
  const uploadedImageUrls = await Promise.all(
    imageUploads.map(({ publicId, version, signature }) =>
      verifyAndConsumeToken(publicId, version, signature, adminId)
    )
  );

  return db.transaction(async (tx) => {
    // Lock the row for the whole update: concurrent edits queue up instead of
    // overwriting each other with a stale image list or stale colors.
    const [current] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .for("update")
      .limit(1);

    if (!current) {
      throw new AppError(404, `Product with id ${id} not found`);
    }

    // ── 1. Colors ───────────────────────────────────────────────────────────
    let colorsChanged = false;
    if (colors !== undefined) {
      colorsChanged = await syncProductColors(tx, id, colors);
    }

    // ── 2. Product columns ──────────────────────────────────────────────────
    // Drop undefined keys so "not sent" is never mistaken for "set to undefined".
    const updates = Object.fromEntries(
      Object.entries(productFields).filter(([, value]) => value !== undefined)
    ) as Partial<typeof products.$inferInsert>;
    // `promo: null` stays in `updates` on purpose: it clears the promo price.

    if (hasImageChanges) {
      // Re-validate against the LOCKED image list, then apply.
      assertImageOpsValid(current.images, imageRemovals, imageUploads);
      updates.images = applyImageOps(
        current.images,
        imageRemovals,
        imageUploads,
        uploadedImageUrls
      );
    }

    const productFieldsChanged = Object.entries(updates).some(
      ([key, value]) =>
        !sameValue(key, value, (current as Record<string, unknown>)[key])
    );

    const updated = productFieldsChanged
      ? (await tx.update(products).set(updates).where(eq(products.id, id)).returning())[0]
      : current;

    // ── 3. Stock (read AFTER the color sync so the comparison is accurate) ──
    // Deleting a color cascades to its stock rows, so those are already gone here.
    const currentStock = await tx
      .select()
      .from(productStock)
      .where(eq(productStock.productId, id));

    let stock: ProductStock[] = currentStock;
    if (stockEntries !== undefined && !sameStock(currentStock, stockEntries)) {
      await tx.delete(productStock).where(eq(productStock.productId, id));
      stock =
        stockEntries.length > 0
          ? await tx
              .insert(productStock)
              .values(
                stockEntries.map((e) => ({
                  productId: id,
                  colorHex: e.colorHex,
                  size: e.size,
                  stock: e.stock,
                }))
              )
              .returning()
          : [];
    }

    // ── 4. Build the response from what is really in the DB ─────────────────
    const finalColors = colorsChanged
      ? ((await fetchColorsByProduct(tx, [id])).get(id) ?? [])
      : ((await fetchColorsByProduct(tx, [id])).get(id) ?? []);

    return { ...updated, colors: finalColors, stock };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete (soft)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteProductByIdService(id: number): Promise<ProductWithColors> {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing || existing.deletedAt) {
    throw new AppError(404, `Product with id ${id} not found`);
  }

  await db
    .update(products)
    .set({ deletedAt: new Date().toISOString().slice(0, 10) })
    .where(eq(products.id, id));

  const [withColors] = await attachColors([existing]);
  return withColors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock of one product (optionally filtered by color hex and/or size)
// Joins product_colors so the response carries the color NAME.
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductStockService(
  productId: number,
  colorHex?: string,
  size?: string
): Promise<ProductStockWithColor[]> {
  // A missing / deleted product must be a 404, not an empty list.
  const [product] = await db
    .select({ id: products.id, deletedAt: products.deletedAt })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product || product.deletedAt) {
    throw new AppError(404, `Product with id ${productId} not found`);
  }

  const conditions = [eq(productStock.productId, productId)];

  if (colorHex) {
    // Already normalised to bare uppercase by the validation layer.
    conditions.push(eq(productStock.colorHex, normalizeHex(colorHex)));
  }
  if (size) {
    conditions.push(eq(productStock.size, size as ProductStock["size"]));
  }

  return db
    .select({
      id: productStock.id,
      productId: productStock.productId,
      colorHex: productStock.colorHex,
      colorName: productColors.name,
      size: productStock.size,
      stock: productStock.stock,
    })
    .from(productStock)
    .innerJoin(
      productColors,
      and(
        eq(productColors.productId, productStock.productId),
        eq(productColors.hex, productStock.colorHex)
      )
    )
    .where(and(...conditions));
}