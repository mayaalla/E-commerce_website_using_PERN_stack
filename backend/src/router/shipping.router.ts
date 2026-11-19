import { Router } from "express";
import {
  // Shipping Company
  createShippingCompany,
  getShippingCompanyById,
  getAllShippingCompanies,
  updateShippingCompanyById,
  deleteShippingCompanyById,
  // Shipping Price
  createShippingPrice,
  getShippingPriceById,
  getShippingPriceByCompanyAndWilaya,
  getAllShippingPricesForCompany,
  updateShippingPriceById,
  deleteShippingPriceById,
} from "../controller/shipping.controller.js";
import {
  validateCreateShippingCompany,
  validateUpdateShippingCompany,
  validateCreateShippingPrice,
  validateUpdateShippingPrice,
  validateId,
} from "../middleware/validation.js";
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authirization.js";

const router = Router();

// ═════════════════════════════════════════════════════════════════════════════
// ███  SHIPPING COMPANY ROUTES   /api/shipping/companies
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shipping/companies
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/companies",
  authenticate,
  authorize("shipping_company_add"),
  validateCreateShippingCompany,
  createShippingCompany
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/companies
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/companies",
  // authenticate,
  // authorize("shipping_company_read"),
  getAllShippingCompanies
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/companies/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/companies/:id",
  // authenticate,
  // authorize("shipping_company_read"),
  validateId(),
  getShippingCompanyById
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/companies/:id/prices
// Returns every wilaya price for one shipping company.
// Must be declared BEFORE the generic /:id routes to avoid shadowing.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/companies/:id/prices",
  authenticate,
  authorize("shipping_read"),
  validateId(),
  getAllShippingPricesForCompany
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/shipping/companies/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/companies/:id",
  authenticate,
  authorize("shipping_company_update"),
  validateId(),
  validateUpdateShippingCompany,
  updateShippingCompanyById
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/shipping/companies/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/companies/:id",
  authenticate,
  authorize("shipping_company_delete"),
  validateId(),
  deleteShippingCompanyById
);

// ═════════════════════════════════════════════════════════════════════════════
// ███  SHIPPING PRICE ROUTES   /api/shipping/prices
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shipping/prices
// Validate body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/prices",
  authenticate,
  authorize("shipping_add"),
  validateCreateShippingPrice,
  createShippingPrice
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/prices/lookup
// Query-string lookup: ?companyId=1&wilayaCode=16 | ?companyName=X&wilayaName=Y
// Must be declared BEFORE /:id so Express does not treat "lookup" as a param.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/prices/lookup",
  // Public checkout needs the delivery price before the customer places an order.
  getShippingPriceByCompanyAndWilaya
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/prices/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/prices/:id",
  authenticate,
  authorize("shipping_read"),
  validateId(),
  getShippingPriceById
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/shipping/prices/:id
// Validate :id and request body before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/prices/:id",
  authenticate,
  authorize("shipping_update"),
  validateId(),
  validateUpdateShippingPrice,
  updateShippingPriceById
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/shipping/prices/:id
// Validate :id before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/prices/:id",
  authenticate,
  authorize("shipping_delete"),
  validateId(),
  deleteShippingPriceById
);

export default router;
