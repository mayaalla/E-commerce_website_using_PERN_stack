import { Router } from "express";

import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderInformation,
  updateOrderStatus,
  deleteOrderById,
  getOrderStats,
} from "../controller/order.controller.js";
import {
  validateCreateOrder,
  validateUpdateOrderInformation,
  validateUpdateOrderStatus,
  validateId,
  validateOrderQuery,
} from "../middleware/validation.js";
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authirization.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders
// Validate request body before it reaches the controller.
// The controller service will recompute `total` from live prices, so the
// client-supplied `total` field is only used for client-side display; the
// authoritative value always comes from the server.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  // authenticate,
  // authorize("order_add"),
  validateCreateOrder,
  createOrder
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders
// Supports pagination, search, filters, and sorting via query params.
// validateOrderQuery parses & validates the query string; on success it stores
// the typed result in res.locals.orderQuery for the controller to consume.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", authenticate, authorize("order_read"), validateOrderQuery, getAllOrders);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/stats
// Store-wide order statistics including total revenue.
// MUST be declared before /:id so Express does not treat "stats" as an id param.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats", authenticate, authorize("order_read"), getOrderStats);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", authenticate, authorize("order_read"), validateId(), getOrderById);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id
// Update only customer contact and delivery information.
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id",
  authenticate,
  authorize("order_update"),
  validateId(),
  validateUpdateOrderInformation,
  updateOrderInformation
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status
// Update the status without changing customer information.
// Using PATCH (not PUT) to signal a partial, targeted update.
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/status",
  authenticate,
  authorize("order_update"),
  validateId(),
  validateUpdateOrderStatus,
  updateOrderStatus
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/orders/:id
// Soft-delete the order record and return its final snapshot.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", authenticate, authorize("order_delete"), validateId(), deleteOrderById);

export default router;
