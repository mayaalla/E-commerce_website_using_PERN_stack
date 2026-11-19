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
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authirization.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/communes
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("commune_add"),
  validateCreateCommune,
  createCommune
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/communes
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", 
  // authenticate, 
  // authorize("commune_read"),
   getAllCommunes);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/communes/by-wilaya/:code
// MUST be registered before /:id so Express does not interpret "by-wilaya"
// as a numeric id and reject it early.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/by-wilaya/:code",
  // authenticate,
  // authorize("commune_read"),
  validateWilayaCode("code"),
  getCommunesByWilaya
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/communes/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:id",
  authenticate,
  authorize("commune_read"),
  validateId(),
  getCommuneById
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/communes/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id",
  authenticate,
  authorize("commune_update"),
  validateId(),
  validateUpdateCommune,
  updateCommuneById
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/communes/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", authenticate, authorize("commune_delete"), validateId(), deleteCommuneById);

export default router;
