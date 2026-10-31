import type { Request, Response, NextFunction } from "express";
import {
  createCategoryService,
  getCategoryByIdService,
  getAllCategoriesService,
  updateCategoryByIdService,
  deleteCategoryByIdService,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from "../service/category.service.js";

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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/categories
// Body already validated by validateCategory middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new product category.
 * Returns 201 + the new category record on success.
 */
export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as CreateCategoryPayload;
    const category = await createCategoryService(payload);

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all categories.
 */
export async function getAllCategories(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await getAllCategoriesService();

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories/:id
// Param already validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single category by id.
 * Returns 404 if no category exists with the given id.
 */
export async function getCategoryById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const category = await getCategoryByIdService(id);

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/categories/:id
// Param validated by validateId(), body validated by validateCategory.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partially updates a category.
 * Returns 200 + the updated record on success.
 * Returns 404 if no category exists with the given id.
 */
export async function updateCategoryById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const payload = req.body as UpdateCategoryPayload;
    const category = await updateCategoryByIdService(id, payload);

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/categories/:id
// Param validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes a category and returns its last snapshot.
 * Returns 200 + the deleted record on success.
 * Returns 404 if no category exists with the given id.
 * Returns 409 if the category still has products attached (FK constraint).
 */
export async function deleteCategoryById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const category = await deleteCategoryByIdService(id);

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    // Postgres FK violation (23503) – the category still owns products.
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("foreign key")
    ) {
      return next(
        createHttpError(409, "Cannot delete a category that still has products")
      );
    }
    next(error);
  }
}
