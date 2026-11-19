import { Router } from "express";
import {
  createCategory,
  getCategoryById,
  getAllCategories,
  updateCategoryById,
  deleteCategoryById,
} from "../controller/category.controller.js";
import { validateCategory, validateId } from "../middleware/validation.js";
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authirization.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/categories
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("category_add"),
  validateCategory,
  createCategory
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories
// ─────────────────────────────────────────────────────────────────────────────
// router.get("/", authenticate, authorize("category_read"), getAllCategories);
router.get("/", getAllCategories);
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
// router.get(
//   "/:id",
//   authenticate,
//   authorize("category_read"),
//   validateId(),
//   getCategoryById
// );
router.get("/:id", validateId(), getCategoryById);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/categories/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id",
  authenticate,
  authorize("category_update"),
  validateId(),
  validateCategory,
  updateCategoryById
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/categories/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", authenticate, authorize("category_delete"), validateId(), deleteCategoryById);

export default router;
