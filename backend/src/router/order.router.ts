import { Router } from "express";

import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrderById,
} from "../controller/order.controller.js";
import {
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateId,
} from "../middleware/validation.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders
// Validate request body before it reaches the controller.
// The controller service will recompute `total` from live prices, so the
// client-supplied `total` field is only used for client-side display; the
// authoritative value always comes from the server.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validateCreateOrder, createOrder);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders
// Returns all orders, most-recent first.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", getAllOrders);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id
// Validate :id is a positive integer before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", validateId(), getOrderById);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status
// Only the status field is mutable after creation.
// Using PATCH (not PUT) to signal a partial, targeted update.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/status", validateId(), validateUpdateOrderStatus, updateOrderStatus);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/orders/:id
// Hard-delete the order record and return its final snapshot.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", validateId(), deleteOrderById);

export default router;
