import type { Request, Response, NextFunction } from "express";
import {
  createCouponService,
  getCouponByIdService,
  getAllCouponsService,
  updateCouponByIdService,
  deleteCouponByIdService,
  validateCouponCodeService,
  type CreateCouponPayload,
  type UpdateCouponPayload,
} from "../service/coupon.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createHttpError(
  status: number,
  message: string
): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

const isNotFound = (err: unknown): boolean =>
  err instanceof Error && /not found/i.test(err.message);

const isDuplicateCode = (err: unknown): boolean =>
  err instanceof Error &&
  "code" in err &&
  (err as NodeJS.ErrnoException).code === "DUPLICATE_COUPON_CODE";

const isCouponUnavailable = (err: unknown): boolean =>
  err instanceof Error &&
  "code" in err &&
  (err as NodeJS.ErrnoException).code === "COUPON_UNAVAILABLE";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/coupons
// Body already validated by validateCreateCoupon middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new coupon.
 * Returns 201 + the new coupon record on success.
 * Returns 409 if a coupon with the same code already exists.
 */
export async function createCoupon(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as CreateCouponPayload;
    const coupon = await createCouponService(payload);

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    if (isDuplicateCode(error)) {
      return next(createHttpError(409, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all coupons.
 */
export async function getAllCoupons(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const allCoupons = await getAllCouponsService();

    res.status(200).json({ success: true, data: allCoupons });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons/:id
// Param already validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single coupon by id.
 * Returns 404 if no coupon exists with the given id.
 */
export async function getCouponById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const coupon = await getCouponByIdService(id);

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons/validate/:code
// Validates whether a coupon code is currently active and usable at checkout.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a coupon code for use at checkout.
 * Returns 200 + the coupon when it is active.
 * Returns 404 if the code does not exist.
 * Returns 422 if the coupon is inactive or expired.
 */
export async function validateCouponCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const code = String(req.query.code ?? "").trim().toUpperCase();

    if (!code) {
      return next(createHttpError(400, "Missing required query parameter: code"));
    }
    const coupon = await validateCouponCodeService(code);

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isCouponUnavailable(error)) {
      // 422 Unprocessable Entity – the code exists but cannot be applied.
      return next(createHttpError(422, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/coupons/:id
// Param validated by validateId(), body validated by validateUpdateCoupon.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partially updates a coupon.
 * Returns 200 + the updated record on success.
 * Returns 404 if no coupon exists with the given id.
 * Returns 409 if the new code conflicts with an existing coupon.
 */
export async function updateCouponById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const payload = req.body as UpdateCouponPayload;
    const coupon = await updateCouponByIdService(id, payload);

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isDuplicateCode(error)) {
      return next(createHttpError(409, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/coupons/:id
// Param validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes a coupon and returns its last snapshot.
 * Returns 200 + the deleted record on success.
 * Returns 404 if no coupon exists with the given id.
 */
export async function deleteCouponById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const coupon = await deleteCouponByIdService(id);

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

