import type { Request, Response, NextFunction } from "express";
import {
  createCommuneService,
  getCommuneByIdService,
  getAllCommunesService,
  getCommunesByWilayaService,
  updateCommuneByIdService,
  deleteCommuneByIdService,
  type CreateCommunePayload,
  type UpdateCommunePayload,
} from "../service/commune.service.js";

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
// POST /api/communes
// Body already validated by validateCreateCommune middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new commune.
 * Returns 201 + the new commune record on success.
 * Returns 404 if the referenced wilaya does not exist.
 */
export async function createCommune(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as CreateCommunePayload;
    const commune = await createCommuneService(payload);

    res.status(201).json({ success: true, data: commune });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/communes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all communes.
 */
export async function getAllCommunes(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const communes = await getAllCommunesService();

    res.status(200).json({ success: true, data: communes });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/communes/by-wilaya/:code
// Param validated by validateWilayaCode middleware.
// Must be registered BEFORE /:id to avoid Express treating "by-wilaya" as an id.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all communes that belong to the given wilaya code.
 * Returns 404 if the wilaya does not exist.
 */
export async function getCommunesByWilaya(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const communes = await getCommunesByWilayaService(code as string);

    res.status(200).json({ success: true, data: communes });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/communes/:id
// Param already validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single commune by id.
 * Returns 404 if no commune exists with the given id.
 */
export async function getCommuneById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const commune = await getCommuneByIdService(id);

    res.status(200).json({ success: true, data: commune });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/communes/:id
// Param validated by validateId(), body validated by validateUpdateCommune.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partially updates a commune.
 * Returns 200 + the updated record on success.
 * Returns 404 if the commune or the new wilaya does not exist.
 */
export async function updateCommuneById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const payload = req.body as UpdateCommunePayload;
    const commune = await updateCommuneByIdService(id, payload);

    res.status(200).json({ success: true, data: commune });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/communes/:id
// Param validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes a commune and returns its last snapshot.
 * Returns 200 + the deleted record on success.
 * Returns 404 if no commune exists with the given id.
 * Returns 409 if orders still reference this commune (FK constraint).
 */
export async function deleteCommuneById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const commune = await deleteCommuneByIdService(id);

    res.status(200).json({ success: true, data: commune });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    // Postgres FK violation (23503) – orders reference this commune.
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("foreign key")
    ) {
      return next(
        createHttpError(409, "Cannot delete a commune that is referenced by existing orders")
      );
    }
    next(error);
  }
}
