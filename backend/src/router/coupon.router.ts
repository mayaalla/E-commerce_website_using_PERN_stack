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

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/coupons
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validateCreateCoupon, createCoupon);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", getAllCoupons);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons/validate/:code
// Must be declared BEFORE /:id so Express doesn't try to parse "validate"
// as a numeric id.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/validate/:code", validateCouponCode);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", validateId(), getCouponById);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/coupons/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", validateId(), validateUpdateCoupon, updateCouponById);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/coupons/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", validateId(), deleteCouponById);

export default router;
