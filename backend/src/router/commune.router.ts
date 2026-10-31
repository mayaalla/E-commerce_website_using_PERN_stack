import { Router } from "express";
import {
  createCommune,
  getCommuneById,
  getAllCommunes,
  getCommunesByWilaya,
  updateCommuneById,
  deleteCommuneById,
} from "../controller/commune.controller.js";
import {
  validateCreateCommune,
  validateUpdateCommune,
  validateId,
  validateWilayaCode,
} from "../middleware/validation.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/communes
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validateCreateCommune, createCommune);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/communes
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", getAllCommunes);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/communes/by-wilaya/:code
// MUST be registered before /:id so Express does not interpret "by-wilaya"
// as a numeric id and reject it early.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/by-wilaya/:code",
  validateWilayaCode("code"),
  getCommunesByWilaya
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/communes/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", validateId(), getCommuneById);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/communes/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", validateId(), validateUpdateCommune, updateCommuneById);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/communes/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", validateId(), deleteCommuneById);

export default router;
