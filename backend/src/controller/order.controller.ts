import type { Request, Response, NextFunction } from "express";

import {
  createOrderService,
  getOrderByIdService,
  getAllOrdersService,
  updateOrderStatusService,
  deleteOrderByIdService,
  type CreateOrderPayload,
  type UpdateOrderStatusPayload,
  type CreateOrderResult,
} from "../service/order.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTTP error factory
// ─────────────────────────────────────────────────────────────────────────────

function createHttpError(
  status: number,
  message: string
): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error classifier helpers
// Map service-level typed error codes → HTTP status codes so the controller
// stays a thin translation layer and does not embed business logic.
// ─────────────────────────────────────────────────────────────────────────────

function errorCode(err: unknown): string | undefined {
  return err instanceof Error
    ? (err as Error & { code?: string }).code
    : undefined;
}

const isNotFound = (err: unknown) => errorCode(err) === "NOT_FOUND";

const isShippingPriceNotFound = (err: unknown) =>
  errorCode(err) === "SHIPPING_PRICE_NOT_FOUND";

const isCouponNotFound = (err: unknown) =>
  errorCode(err) === "COUPON_NOT_FOUND";

const isCouponUnavailable = (err: unknown) =>
  errorCode(err) === "COUPON_UNAVAILABLE";

const isTerminalOrderStatus = (err: unknown) =>
  errorCode(err) === "TERMINAL_ORDER_STATUS";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders
// Body already validated by validateCreateOrder middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Places a new order.
 *
 * The server recomputes the total from live product prices, so the client
 * cannot manipulate the charge by sending an incorrect total.
 *
 * Returns 201 + the new order record and a full pricing breakdown on success.
 * Returns 404 if a referenced entity (wilaya, commune, company, product) does not exist.
 * Returns 422 if the shipping price is not configured for the chosen company + wilaya.
 * Returns 400 if the coupon code does not exist or is no longer active.
 */
export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as CreateOrderPayload;
    const result: CreateOrderResult = await createOrderService(payload);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isShippingPriceNotFound(error)) {
      return next(createHttpError(422, (error as Error).message));
    }
    if (isCouponNotFound(error) || isCouponUnavailable(error)) {
      return next(createHttpError(400, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all orders ordered by most-recent first.
 */
export async function getAllOrders(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const allOrders = await getAllOrdersService();

    res.status(200).json({ success: true, data: allOrders });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id
// Param already validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single order by id.
 * Returns 404 if no order exists with the given id.
 */
export async function getOrderById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const order = await getOrderByIdService(id);

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status
// Param validated by validateId(), body validated by validateUpdateOrderStatus.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates the status of an existing order.
 *
 * Only the `status` field is mutable after creation.
 * Orders in a terminal state ("canceled", "returned") cannot be updated.
 *
 * Returns 200 + the updated record on success.
 * Returns 404 if the order does not exist.
 * Returns 409 if the order is already in a terminal state.
 */
export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const payload = req.body as UpdateOrderStatusPayload;
    const order = await updateOrderStatusService(id, payload);

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isTerminalOrderStatus(error)) {
      return next(createHttpError(409, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/orders/:id
// Param validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hard-deletes an order and returns its last snapshot.
 * Returns 200 + the deleted record on success.
 * Returns 404 if no order exists with the given id.
 */
export async function deleteOrderById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const order = await deleteOrderByIdService(id);

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}
