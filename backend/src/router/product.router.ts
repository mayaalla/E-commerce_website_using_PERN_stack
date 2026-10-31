import { Router } from "express";
import {
  createProduct,
  getProductById,
  getAllProducts,
  getProductsByCategory,
  updateProductById,
  deleteProductById,
} from "../controller/product.controller.js";
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateId,
} from "../middleware/validation.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validateCreateProduct, createProduct);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", getAllProducts);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/by-category/:categoryId
// MUST be registered before /:id so Express does not interpret "by-category"
// as a numeric id and reject it early.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/by-category/:categoryId",
  validateId("categoryId"),
  getProductsByCategory
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", validateId(), getProductById);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/products/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", validateId(), validateUpdateProduct, updateProductById);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/products/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", validateId(), deleteProductById);

export default router;
