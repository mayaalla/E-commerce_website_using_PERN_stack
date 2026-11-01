import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  createProduct,
  getProductById,
  getAllProducts,
  getProductsByCategory,
  updateProductById,
  deleteProductById,
} from "../controller/product.controller.js";
import { requestUploadTokens } from "../controller/upload.controller.js";
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateId,
  validateRequestUploadTokens,
} from "../middleware/validation.js";
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authirization.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Upload-specific rate limiter
// Much tighter than the global 100 req/15 min because token generation is
// expensive (Redis write × N, crypto × N) and burns Cloudinary signed-upload
// quota.
// ─────────────────────────────────────────────────────────────────────────────
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, errors: ["Too many upload requests, please slow down"] },
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products/upload/request-tokens
// Generates signed Cloudinary upload tokens for a set of files.
// Registered BEFORE /:id routes to prevent Express treating "upload" as an id.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/upload/request-tokens",
  uploadRateLimit,
  authenticate,
  authorize("product_add"),
  validateRequestUploadTokens,
  requestUploadTokens
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products
// Creates a new product. If imageUploads are provided, each token is verified
// and consumed before the product is inserted (one atomic DB insert).
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("product_add"),
  validateCreateProduct,
  createProduct
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products  (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", getAllProducts);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/by-category/:categoryId  (public)
// MUST be registered before /:id so Express does not interpret "by-category"
// as a numeric id and reject it early.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/by-category/:categoryId",
  validateId("categoryId"),
  getProductsByCategory
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/:id  (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", validateId(), getProductById);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/products/:id
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id",
  authenticate,
  authorize("product_update"),
  validateId(),
  validateUpdateProduct,
  updateProductById
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/products/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  authenticate,
  authorize("product_delete"),
  validateId(),
  deleteProductById
);

export default router;
