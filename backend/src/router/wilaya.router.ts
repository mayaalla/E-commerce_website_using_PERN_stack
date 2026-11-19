import { Router } from "express";
import {
  createWilaya,
  getWilayaByCode,
  getAllWilayas,
  updateWilayaByCode,
  deleteWilayaByCode,
} from "../controller/wilaya.controller.js";
import {
  validateCreateWilaya,
  validateUpdateWilaya,
  validateWilayaCode,
} from "../middleware/validation.js";
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authirization.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wilayas
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("wilaya_add"),
  validateCreateWilaya,
  createWilaya
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wilayas
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", 
  // authenticate, 
  // authorize("wilaya_read"), 
  getAllWilayas);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wilayas/:code
// Validate :code is a 2-digit string before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:code",
  // authenticate,
  // authorize("wilaya_read"),
  // validateWilayaCode(),
  getWilayaByCode
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/wilayas/:code
// Validate :code and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:code",
  authenticate,
  authorize("wilaya_update"),
  validateWilayaCode(),
  validateUpdateWilaya,
  updateWilayaByCode
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/wilayas/:code
// Validate :code before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/:code",
  authenticate,
  authorize("wilaya_delete"),
  validateWilayaCode(),
  deleteWilayaByCode
);

export default router;
