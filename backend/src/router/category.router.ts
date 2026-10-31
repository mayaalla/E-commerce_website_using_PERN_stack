import { Router } from "express";
import {
  createCategory,
  getCategoryById,
  getAllCategories,
  updateCategoryById,
  deleteCategoryById,
} from "../controller/category.controller.js";
import { validateCategory, validateId } from "../middleware/validation.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/categories
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validateCategory, createCategory);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", getAllCategories);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", validateId(), getCategoryById);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/categories/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", validateId(), validateCategory, updateCategoryById);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/categories/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", validateId(), deleteCategoryById);

export default router;
