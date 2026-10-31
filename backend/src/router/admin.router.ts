import { Router } from "express";
import {
  createAdmin,
  getAdminById,
  getAllAdmins,
  updateAdminById,
  deleteAdminById,
} from "../controller/admin.controller.js";
import {
  validateCreateAdmin,
  validateUpdateAdmin,
  validateId,
} from "../middleware/validation.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admins
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validateCreateAdmin, createAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admins
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", getAllAdmins);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admins/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", validateId(), getAdminById);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admins/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", validateId(), validateUpdateAdmin, updateAdminById);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admins/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", validateId(), deleteAdminById);

export default router;
