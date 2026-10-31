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

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wilayas
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validateCreateWilaya, createWilaya);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wilayas
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", getAllWilayas);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wilayas/:code
// Validate :code is a 2-digit string before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:code", validateWilayaCode(), getWilayaByCode);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/wilayas/:code
// Validate :code and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:code", validateWilayaCode(), validateUpdateWilaya, updateWilayaByCode);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/wilayas/:code
// Validate :code before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:code", validateWilayaCode(), deleteWilayaByCode);

export default router;
