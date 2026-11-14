import { Router } from "express";
import {
  createCoupon,
  getCouponById,
  getAllCoupons,
  updateCouponById,
  deleteCouponById,
  validateCouponCode,
} from "../controller/coupon.controller.js";
import {
  validateCreateCoupon,
  validateUpdateCoupon,
  validateId,
} from "../middleware/validation.js";
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authirization.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/coupons
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("coupon_add"),
  validateCreateCoupon,
  createCoupon
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", authenticate, authorize("coupon_read"), getAllCoupons);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons/validate/:code
// Must be declared BEFORE /:id so Express doesn't try to parse "validate"
// as a numeric id.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/validate/:code",
  authenticate,
  authorize("coupon_read"),
  validateCouponCode
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", authenticate, authorize("coupon_read"), validateId(), getCouponById);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/coupons/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id",
  authenticate,
  authorize("coupon_update"),
  validateId(),
  validateUpdateCoupon,
  updateCouponById
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/coupons/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", authenticate, authorize("coupon_delete"), validateId(), deleteCouponById);

export default router;
