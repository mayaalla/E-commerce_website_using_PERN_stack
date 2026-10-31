import type { Request, Response, NextFunction } from "express";
import {
  createAdminService,
  getAdminByIdService,
  getAllAdminsService,
  updateAdminByIdService,
  deleteAdminByIdService,
  type CreateAdminPayload,
  type UpdateAdminPayload,
} from "../service/admin.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps a known service error in an object that carries an HTTP status code
 * so the global error handler in app.ts can map it to the right response.
 */
function createHttpError(status: number, message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

/** Returns true when the service threw a "not found" error. */
const isNotFound = (err: unknown): boolean =>
  err instanceof Error && /not found/i.test(err.message);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admins
// Body already validated by validateCreateAdmin middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new admin account.
 *
 * Returns 201 + the public admin record on success.
 * Returns 409 when the username is already taken (unique constraint).
 */
export async function createAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as CreateAdminPayload;
    const admin = await createAdminService(payload);

    res.status(201).json({ success: true, data: admin });
  } catch (error) {
    // Drizzle surfaces unique-constraint violations as an error whose message
    // contains "unique" (PostgreSQL error code 23505).  Expose it as 409.
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      return next(createHttpError(409, "Username is already taken"));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admins/:id
// Param already validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the public profile of a single admin.
 * Returns 404 if no admin exists with the given id.
 */
export async function getAdminById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const admin = await getAdminByIdService(id);

    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admins
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the public profiles of all admins.
 */
export async function getAllAdmins(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const admins = await getAllAdminsService();

    res.status(200).json({ success: true, data: admins });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admins/:id
// Param validated by validateId(), body validated by validateUpdateAdmin.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partially updates an admin account.
 *
 * Returns 200 + the updated public admin record on success.
 * Returns 404 if no admin exists with the given id.
 * Returns 409 if the new username conflicts with an existing one.
 */
export async function updateAdminById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const payload = req.body as UpdateAdminPayload;
    const admin = await updateAdminByIdService(id, payload);

    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      return next(createHttpError(409, "Username is already taken"));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admins/:id
// Param validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes an admin account and returns its last public snapshot.
 *
 * Returns 200 + the deleted admin's public data on success.
 * Returns 404 if no admin exists with the given id.
 */
export async function deleteAdminById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const admin = await deleteAdminByIdService(id);

    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}
