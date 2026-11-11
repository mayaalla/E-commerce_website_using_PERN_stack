import { eq, isNull, and } from "drizzle-orm";

import { db } from "../db/db.js";
import { products, categories } from "../db/schema.js";
import { verifyAndConsumeToken, MAX_IMAGES_PER_PRODUCT } from "../utils/upload.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single product row as stored in the database. */
export type Product = typeof products.$inferSelect;

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
  colors?: string[];
  sizes?: (typeof products.$inferSelect)["sizes"];
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
};

/** Payload accepted when updating an existing product.
 *  Every field is optional so callers can do partial updates. */
export type UpdateProductPayload = Partial<CreateProductPayload>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies that the referenced category exists AND has not been soft-deleted
 * before we insert or update a product.  This gives a clear error message
 * instead of a raw FK violation, and prevents products being filed under a
 * deleted category.
 */
async function assertCategoryExists(categoryId: number): Promise<void> {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  if (!category || category.deletedAt) {
    throw new Error(`Category with id ${categoryId} not found`);
  }
}

/**
 * Guards against a promo price that is higher than the regular price.
 * The DB enforces the same invariant via a CHECK constraint, but catching it
 * here produces a friendlier error message.
 */
function assertPromoValid(price: string, promo: string): void {
  if (parseFloat(promo) > parseFloat(price)) {
    throw new Error("Promo price must be less than or equal to the regular price");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// Validate business rules, insert the product, return the new record.
// ─────────────────────────────────────────────────────────────────────────────

export async function createProductService(
  payload: CreateProductPayload
): Promise<Product> {
  const {
    title,
    description,
    price,
    colors = [],
    sizes = [],
    promo,
    categoryId,
    imageUploads,
    adminId,
  } = payload;

  await assertCategoryExists(categoryId);

  if (promo !== undefined) {
    assertPromoValid(price, promo);
  }

  // Guard: never store more than MAX_IMAGES_PER_PRODUCT URLs on a product.
  if (imageUploads && imageUploads.length > MAX_IMAGES_PER_PRODUCT) {
    throw new Error(
      `Too many images: a product may have at most ${MAX_IMAGES_PER_PRODUCT} images`
    );
  }

  // Verify and consume each upload token → build secure_urls.
  // verifyAndConsumeToken checks:
  //   1. Token exists in Redis (was issued by us, hasn't expired or been used).
  //   2. Token was issued to THIS admin (prevents cross-admin token theft).
  //   3. Cloudinary response signature matches (proves the file was genuinely uploaded).
  //   4. Deletes the token from Redis (one-time use, replay-proof).
  let images: string[] = [];
  if (imageUploads && imageUploads.length > 0) {
    images = await Promise.all(
      imageUploads.map(({ publicId, version, signature }) =>
        verifyAndConsumeToken(publicId, version, signature, adminId)
      )
    );
  }

  const [newProduct] = await db
    .insert(products)
    .values({
      title,
      description,
      price,
      colors,
      sizes,
      promo: promo ?? null,
      categoryId,
      images,
    })
    .returning();

  return newProduct;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read one
// Fetch a single product by primary key.
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductByIdService(id: number): Promise<Product> {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product || product.deletedAt) {
    throw new Error(`Product with id ${id} not found`);
  }

  return product;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read all
// Return every product row; returns an empty array when the table is empty.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllProductsService(): Promise<Product[]> {
  return db.select().from(products).where(isNull(products.deletedAt));
}

// ─────────────────────────────────────────────────────────────────────────────
// Read by category
// Return all products that belong to a given category id.
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductsByCategoryService(
  categoryId: number
): Promise<Product[]> {
  await assertCategoryExists(categoryId);

  return db
    .select({
      id: products.id,
      title: products.title,
      description: products.description,
      price: products.price,
      images: products.images,
      colors: products.colors,
      sizes: products.sizes,
      promo: products.promo,
      categoryId: products.categoryId,
      deletedAt: products.deletedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    // Return only non-deleted products whose category is also not deleted.
    .where(
      and(
        isNull(products.deletedAt),
        eq(products.categoryId, categoryId),
        isNull(categories.deletedAt),
      )
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// Verify the product exists; re-validate business rules that may be affected
// by the patch; apply it; return the updated record.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProductByIdService(
  id: number,
  payload: UpdateProductPayload
): Promise<Product> {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing || existing.deletedAt) {
    throw new Error(`Product with id ${id} not found`);
  }

  // Only validate the category when the caller is actually changing it.
  if (payload.categoryId !== undefined) {
    await assertCategoryExists(payload.categoryId);
  }

  // Re-validate promo using the effective price after the patch.
  // The caller may update only the promo, only the price, or both.
  const effectivePrice = payload.price ?? existing.price;
  const effectivePromo =
    "promo" in payload ? payload.promo : existing.promo ?? undefined;

  if (effectivePromo !== undefined && effectivePromo !== null) {
    assertPromoValid(effectivePrice, effectivePromo);
  }

  // Build the SET clause.  We allow the caller to explicitly clear the promo
  // by passing `promo: undefined`; map that to null for the DB column.
  const updates: Partial<typeof products.$inferInsert> = { ...payload };

  if ("promo" in payload) {
    updates.promo = payload.promo ?? null;
  }

  const [updated] = await db
    .update(products)
    .set(updates)
    .where(eq(products.id, id))
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// Verify the record exists, remove it, and return its last snapshot.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteProductByIdService(id: number): Promise<Product> {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing || existing.deletedAt) {
    throw new Error(`Product with id ${id} not found`);
  }

  await db.update(products)
    .set({ deletedAt: new Date().toISOString().slice(0, 10) })
    .where(eq(products.id, id));


  return existing;
}
