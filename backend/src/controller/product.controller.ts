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
} from "../service/product.service.js";

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
    const product = await createProductService(payload);

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isBusinessRuleViolation(error)) {
      return next(createHttpError(422, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all products.
 */
export async function getAllProducts(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const products = await getAllProductsService();

    res.status(200).json({ success: true, data: products });
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
    const product = await updateProductByIdService(id, payload);

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isBusinessRuleViolation(error)) {
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
