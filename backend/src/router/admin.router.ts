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
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authirization.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admins
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("full_access"),
  validateCreateAdmin,
  createAdmin
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admins
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", authenticate, authorize("full_access"), getAllAdmins);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admins/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:id",
  authenticate,
  authorize("full_access"),
  validateId(),
  getAdminById
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admins/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id",
  authenticate,
  authorize("full_access"),
  validateId(),
  validateUpdateAdmin,
  updateAdminById
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admins/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", authenticate, authorize("full_access"), validateId(), deleteAdminById);

export default router;
