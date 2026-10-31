import type { Request, Response, NextFunction } from "express";
import {
  createWilayaService,
  getWilayaByCodeService,
  getAllWilayasService,
  updateWilayaByCodeService,
  deleteWilayaByCodeService,
  type CreateWilayaPayload,
  type UpdateWilayaPayload,
} from "../service/wilaya.service.js";

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
// POST /api/wilayas
// Body already validated by validateCreateWilaya middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new wilaya.
 * Returns 201 + the new wilaya record on success.
 * Returns 409 if the code is already taken (unique PK constraint).
 */
export async function createWilaya(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as CreateWilayaPayload;
    const wilaya = await createWilayaService(payload);

    res.status(201).json({ success: true, data: wilaya });
  } catch (error) {
    // PK or unique violation – the code already exists.
    if (
      error instanceof Error &&
      (error.message.toLowerCase().includes("unique") ||
        error.message.toLowerCase().includes("duplicate"))
    ) {
      return next(
        createHttpError(409, `Wilaya with code ${req.body.code} already exists`)
      );
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wilayas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all wilayas.
 */
export async function getAllWilayas(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const wilayas = await getAllWilayasService();

    res.status(200).json({ success: true, data: wilayas });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wilayas/:code
// Param already validated by validateWilayaCode middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single wilaya by its 2-digit code.
 * Returns 404 if no wilaya exists with the given code.
 */
export async function getWilayaByCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const wilaya = await getWilayaByCodeService(code as string);

    res.status(200).json({ success: true, data: wilaya });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/wilayas/:code
// Param validated by validateWilayaCode, body validated by validateUpdateWilaya.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partially updates a wilaya.
 * Returns 200 + the updated record on success.
 * Returns 404 if no wilaya exists with the given code.
 */
export async function updateWilayaByCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const payload = req.body as UpdateWilayaPayload;
    const wilaya = await updateWilayaByCodeService(code as string, payload);

    res.status(200).json({ success: true, data: wilaya });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/wilayas/:code
// Param validated by validateWilayaCode middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes a wilaya and returns its last snapshot.
 * Returns 200 + the deleted record on success.
 * Returns 404 if no wilaya exists with the given code.
 * Returns 409 if child rows (communes, orders, shipping prices) still reference it.
 */
export async function deleteWilayaByCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const wilaya = await deleteWilayaByCodeService(code as string);

    res.status(200).json({ success: true, data: wilaya });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    // Postgres FK violation (23503) – child rows exist.
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("foreign key")
    ) {
      return next(
        createHttpError(
          409,
          "Cannot delete a wilaya that still has communes, orders, or shipping prices"
        )
      );
    }
    next(error);
  }
}
