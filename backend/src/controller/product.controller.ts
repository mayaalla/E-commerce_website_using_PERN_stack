import type { Request, Response, NextFunction } from "express";
import {
  createProductService,
  getProductByIdService,
  getAllProductsService,
  getProductsByCategoryService,
  updateProductByIdService,
  deleteProductByIdService,
  type CreateProductPayload,
  type UpdateProductPayload,
  getProductStockService,
} from "../service/product.service.js";
import type { ProductQuery } from "../schema/product.schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createHttpError(status: number, message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

const isNotFound = (err: unknown): boolean =>
  err instanceof Error && /not found/i.test(err.message);

const isBusinessRuleViolation = (err: unknown): boolean =>
  err instanceof Error && /promo price/i.test(err.message);

const isUploadVerificationFailure = (err: unknown): boolean =>
  err instanceof Error &&
  (/verification failed/i.test(err.message) ||
    /token not found/i.test(err.message) ||
    /too many images/i.test(err.message) ||
    /image update failed/i.test(err.message));

const isStockConstraintViolation = (err: unknown): boolean =>
  err instanceof Error &&
  (/non.negative/i.test(err.message) ||
    /stock/i.test(err.message) && /negative/i.test(err.message) ||
    /color_hex/i.test(err.message));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products
// Body already validated by validateCreateProduct middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new product.
 * Returns 201 + the new product record on success.
 * Returns 404 if the referenced category does not exist.
 * Returns 422 if the promo price exceeds the regular price.
 */
export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as CreateProductPayload;
    // Inject the authenticated admin's id so the service can verify that each
    // upload token was issued to THIS admin (cross-admin token theft prevention).
    payload.adminId = req.admin!.id;
    const product = await createProductService(payload);

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isBusinessRuleViolation(error)) {
      return next(createHttpError(422, (error as Error).message));
    }
    if (isUploadVerificationFailure(error)) {
      return next(createHttpError(422, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products
// Query params validated by validateProductQuery middleware.
// Supports: search, categoryId, size, color, priceMin, priceMax, hasPromo,
//           sortBy, sortOrder, page, limit.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of products.
 * All filtering, searching and sorting is delegated to the service layer.
 */
export async function getAllProducts(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = res.locals.productQuery as ProductQuery;
    const result = await getAllProductsService(query);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/by-category/:categoryId
// Param validated by validateId("categoryId") middleware.
// Must be registered BEFORE /:id to avoid Express treating "by-category" as an id.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all products that belong to the given category.
 * Returns 404 if the category does not exist.
 */
export async function getProductsByCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categoryId = Number(req.params.categoryId);
    const products = await getProductsByCategoryService(categoryId);

    res.status(200).json({ success: true, data: products });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/:id
// Param already validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single product by id.
 * Returns 404 if no product exists with the given id.
 */
export async function getProductById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const product = await getProductByIdService(id);

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/products/:id
// Param validated by validateId(), body validated by validateUpdateProduct.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partially updates a product.
 * Returns 200 + the updated record on success.
 * Returns 404 if the product or the new category does not exist.
 * Returns 422 if the promo price exceeds the regular price.
 */
export async function updateProductById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const payload = req.body as UpdateProductPayload;
    // Bind upload confirmations to the authenticated admin, as in product creation.
    payload.adminId = req.admin!.id;
    const product = await updateProductByIdService(id, payload);

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isBusinessRuleViolation(error)) {
      return next(createHttpError(422, (error as Error).message));
    }
    if (isUploadVerificationFailure(error)) {
      return next(createHttpError(422, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/products/:id
// Param validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes a product and returns its last snapshot.
 * Returns 200 + the deleted record on success.
 * Returns 404 if no product exists with the given id.
 */
export async function deleteProductById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const product = await deleteProductByIdService(id);

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}


// export async function getProductStockService(
//   productId: number, colorHex?: string, size?: string
// ): Promise<ProductStock[]> {

//   const conditions = [eq(productStock.productId, productId)];

//   if (colorHex) {
//     conditions.push(eq(productStock.colorHex, colorHex.toUpperCase()));
//   }

//   if (size) {
//     conditions.push(eq(productStock.size, size as ProductStock["size"]));
//   }

//   const stock = await db
//     .select()
//     .from(productStock)
//     .where(and(...conditions));
//   return stock;
// }

export async function getProductStock(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const productId = Number(req.params.id);
    const { colorHex, size } = req.query as { colorHex?: string; size?: string };
    const stock: Awaited<ReturnType<typeof getProductStockService>> =
      await getProductStockService(productId, colorHex, size);

    res.status(200).json({ success: true, data: stock });
  } catch (error) {
    next(error);
  }
}
