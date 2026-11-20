import { eq, isNull, and, ilike, gte, lte, isNotNull, asc, desc, or, sql } from "drizzle-orm";
import type { ProductQuery } from "../schema/product.schema.js";

import { db } from "../db/db.js";
import { products, categories, productStock } from "../db/schema.js";
import { verifyAndConsumeToken, MAX_IMAGES_PER_PRODUCT } from "../utils/upload.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single product row as stored in the database. */
export type Product = typeof products.$inferSelect;

/** A single product_stock row as stored in the database. */
export type ProductStock = typeof productStock.$inferSelect;

/**
 * One entry in the stock array: which colour + size and how many units.
 * colorHex is the 6-digit hex string WITHOUT the leading "#" (e.g. "FF0000").
 */
export type StockEntry = {
  colorHex: string;
  size: (typeof productStock.$inferSelect)["size"];
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
  /**
   * Optional initial stock entries.
   * Each entry defines the stock level for a specific (colorHex, size) pair.
   */
  stockEntries?: StockEntry[];
};

/** Payload accepted when updating an existing product.
 *  Every field is optional so callers can do partial updates. */
export type UpdateProductPayload = Partial<
  Omit<CreateProductPayload, "adminId" | "imageUploads">
> & {
  adminId: number;
  imageUploads?: ImageUploadConfirmation[];
  imageRemovals?: string[];
};

/** Paginated list response for products. */
export type PaginatedProducts = {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

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
): Promise<Product & { stock: ProductStock[] }> {
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
    stockEntries = [],
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
  let images: string[] = [];
  if (imageUploads && imageUploads.length > 0) {
    images = await Promise.all(
      imageUploads.map(({ publicId, version, signature }) =>
        verifyAndConsumeToken(publicId, version, signature, adminId)
      )
    );
  }

  // Insert product + stock entries atomically.
  return db.transaction(async (tx) => {
    const [newProduct] = await tx
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

    let stock: ProductStock[] = [];
    if (stockEntries.length > 0) {
      stock = await tx
        .insert(productStock)
        .values(
          stockEntries.map((e) => ({
            productId: newProduct.id,
            colorHex: e.colorHex.toUpperCase(),
            size: e.size,
            stock: e.stock,
          }))
        )
        .returning();
    }

    return { ...newProduct, stock };
  });
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
// Read all  (with search, filters, sorting, pagination)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of products with optional search, filters and sorting.
 *
 * Query parameters:
 *  - search      : ILIKE match on title OR description
 *  - categoryId  : exact match on categoryId
 *  - size        : product must include this clothing size in its sizes array
 *  - color       : product must include a color that ILIKE-matches this string
 *  - priceMin    : price >= priceMin
 *  - priceMax    : price <= priceMax
 *  - hasPromo    : true → only products with a promo; false → only without
 *  - sortBy      : column to order by (id | title | price | promo | categoryId)
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
    priceMin,
    priceMax,
    hasPromo,
    sortBy,
    sortOrder,
  } = query;

  // ── Build WHERE conditions ─────────────────────────────────────────────────
  const conditions = [isNull(products.deletedAt)];

  if (search) {
    // Match the term against title OR description (case-insensitive).
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
    // The colors column is a text array; check if any element ILIKE the query.
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM unnest(${products.colors}) AS c
        WHERE c ILIKE ${"%" + color + "%"}
      )`
    );
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

  // ── Fetch the page ─────────────────────────────────────────────────────────
  const data = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderFn(orderCol))
    .limit(limit)
    .offset(offset);

  return { data, total, page, limit, totalPages };
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
): Promise<Product & { stock: ProductStock[] }> {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing || existing.deletedAt) {
    throw new Error(`Product with id ${id} not found`);
  }

  // Only validate the category when the caller is actually changing it
  // to a *different* category. Keeping the same categoryId is always
  // allowed – even if that category has since been soft-deleted – so
  // that existing products are not locked out of edits unrelated to
  // their category.
  if (
    payload.categoryId !== undefined &&
    payload.categoryId !== existing.categoryId
  ) {
    await assertCategoryExists(payload.categoryId);
  }

  // Re-validate promo using the effective price after the patch.
  const effectivePrice = payload.price ?? existing.price;
  const effectivePromo =
    "promo" in payload ? payload.promo : existing.promo ?? undefined;

  if (effectivePromo !== undefined && effectivePromo !== null) {
    assertPromoValid(effectivePrice, effectivePromo);
  }

  const imageUploads = payload.imageUploads ?? [];
  const imageRemovals = payload.imageRemovals ?? [];
  const removalSet = new Set(imageRemovals);
  const replacementTargets = imageUploads
    .map(({ replaceImage }) => replaceImage)
    .filter((image): image is string => image !== undefined);
  const replacementSet = new Set(replacementTargets);
  const hasImageChanges =
    payload.imageUploads !== undefined || payload.imageRemovals !== undefined;

  if (removalSet.size !== imageRemovals.length) {
    throw new Error("Image update failed: an image can only be removed once");
  }
  if (replacementSet.size !== replacementTargets.length) {
    throw new Error("Image update failed: an image can only be replaced once");
  }
  if (imageRemovals.some((image) => !existing.images.includes(image))) {
    throw new Error(
      "Image update failed: a removed image does not belong to this product"
    );
  }
  if (replacementTargets.some(
    (image) => !existing.images.includes(image) || removalSet.has(image)
  )) {
    throw new Error(
      "Image update failed: a replacement image does not belong to this product"
    );
  }
  const finalImageCount =
    existing.images.length - removalSet.size +
    imageUploads.filter(({ replaceImage }) => replaceImage === undefined).length;
  if (finalImageCount > MAX_IMAGES_PER_PRODUCT) {
    throw new Error(
      `Too many images: a product may have at most ${MAX_IMAGES_PER_PRODUCT} images`
    );
  }

  // Verify and consume each new upload token before storing its Cloudinary URL.
  const uploadedImageUrls = await Promise.all(
    imageUploads.map(({ publicId, version, signature }) =>
      verifyAndConsumeToken(publicId, version, signature, payload.adminId)
    )
  );

  return db.transaction(async (tx) => {
    // Build the product SET clause (exclude non-product update fields).
    const {
      stockEntries,
      adminId,
      imageUploads: _imageUploads,
      imageRemovals: _imageRemovals,
      ...productFields
    } = payload;
    const updates: Partial<typeof products.$inferInsert> = { ...productFields };

    if (hasImageChanges) {
      // Lock the row while applying image operations so concurrent image edits
      // cannot overwrite one another using the same stale image list.
      const [currentProduct] = await tx
        .select({ images: products.images })
        .from(products)
        .where(and(eq(products.id, id), isNull(products.deletedAt)))
        .for("update")
        .limit(1);

      if (!currentProduct) {
        throw new Error(`Product with id ${id} not found`);
      }

      const currentImages = [...currentProduct.images];
      if (imageRemovals.some((image) => !currentImages.includes(image))) {
        throw new Error(
          "Image update failed: a removed image does not belong to this product"
        );
      }
      if (replacementTargets.some(
        (image) => !currentImages.includes(image) || removalSet.has(image)
      )) {
        throw new Error(
          "Image update failed: a replacement image does not belong to this product"
        );
      }

      const finalImages = currentImages.filter((image) => !removalSet.has(image));
      uploadedImageUrls.forEach((imageUrl, index) => {
        const replaceImage = imageUploads[index].replaceImage;
        if (replaceImage) {
          const replaceIndex = finalImages.indexOf(replaceImage);
          if (replaceIndex < 0) {
            throw new Error(
              "Image update failed: a replacement image does not belong to this product"
            );
          }
          finalImages[replaceIndex] = imageUrl;
        } else {
          finalImages.push(imageUrl);
        }
      });

      if (finalImages.length > MAX_IMAGES_PER_PRODUCT) {
        throw new Error(
          `Too many images: a product may have at most ${MAX_IMAGES_PER_PRODUCT} images`
        );
      }

      updates.images = finalImages;
    }

    if ("promo" in payload) {
      // Only nullify promo if the caller explicitly passes null/undefined AND
      // the existing product had no promo to begin with. If the product already
      // has a promo and the caller omits/nulls it without intent, preserve the
      // existing value.
      if (payload.promo !== undefined && payload.promo !== null) {
        updates.promo = payload.promo;
      } else if (existing.promo !== null) {
        // Caller did not supply a promo value but the product already has one —
        // keep the existing promo instead of wiping it.
        delete updates.promo;
      } else {
        // Product had no promo and caller is explicitly clearing it — keep null.
        updates.promo = null;
      }
    }

    // ── Skip the UPDATE if no product fields actually changed ────────────────
    const { images: updatesImages, ...scalarUpdates } = updates;
    const scalarKeys = Object.keys(scalarUpdates) as Array<keyof typeof scalarUpdates>;
    const scalarChanged = scalarKeys.some(
      (key) => (scalarUpdates as Record<string, unknown>)[key] !== (existing as Record<string, unknown>)[key]
    );
    const imagesChanged =
      updatesImages !== undefined &&
      JSON.stringify(updatesImages) !== JSON.stringify(existing.images);
    const productFieldsChanged = scalarChanged || imagesChanged;

    // ── Skip stock update if the entries are identical ───────────────────────
    const stockChanged = await (async () => {
      if (stockEntries === undefined) return false;
      const currentStock = await tx
        .select()
        .from(productStock)
        .where(eq(productStock.productId, id));

      if (currentStock.length !== stockEntries.length) return true;

      const normalize = (arr: Array<{ colorHex: string; size: string; stock: number }>) =>
        [...arr]
          .sort((a, b) => `${a.colorHex}|${a.size}`.localeCompare(`${b.colorHex}|${b.size}`))
          .map((e) => ({ colorHex: e.colorHex.toUpperCase(), size: e.size, stock: e.stock }));

      return (
        JSON.stringify(normalize(currentStock)) !==
        JSON.stringify(normalize(stockEntries.map((e) => ({ ...e, colorHex: e.colorHex.toUpperCase() }))))
      );
    })();

    // If truly nothing changed, return the existing product + stock unchanged.
    if (!productFieldsChanged && !stockChanged) {
      const unchangedStock = await tx
        .select()
        .from(productStock)
        .where(eq(productStock.productId, id));
      return { ...existing, stock: unchangedStock };
    }

    const [updated] = productFieldsChanged
      ? await tx.update(products).set(updates).where(eq(products.id, id)).returning()
      : [existing];

    // If stockEntries is provided and actually changed, replace the stock grid atomically.
    let stock: ProductStock[] = [];
    if (stockEntries !== undefined && stockChanged) {
      await tx.delete(productStock).where(eq(productStock.productId, id));

      if (stockEntries.length > 0) {
        stock = await tx
          .insert(productStock)
          .values(
            stockEntries.map((e) => ({
              productId: id,
              colorHex: e.colorHex.toUpperCase(),
              size: e.size,
              stock: e.stock,
            }))
          )
          .returning();
      }
    } else {
      // Return the existing stock unchanged.
      stock = await tx
        .select()
        .from(productStock)
        .where(eq(productStock.productId, id));
    }

    return { ...updated, stock };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// Verify the record exists, soft-delete it, and return its last snapshot.
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


export async function getProductStockService(
  productId: number, colorHex?: string, size?: string
): Promise<ProductStock[]> {

  const conditions = [eq(productStock.productId, productId)];

  if (colorHex) {
    conditions.push(eq(productStock.colorHex, colorHex.toUpperCase()));
  }

  if (size) {
    conditions.push(eq(productStock.size, size as ProductStock["size"]));
  }

  const stock = await db
    .select()
    .from(productStock)
    .where(and(...conditions));
  return stock;
}
