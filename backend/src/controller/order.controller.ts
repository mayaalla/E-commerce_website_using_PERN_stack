import type { Request, Response, NextFunction } from "express";

import {
  createOrderService,
  getOrderByIdService,
  getAllOrdersService,
  updateOrderInformationService,
  updateOrderStatusService,
  deleteOrderByIdService,
  getOrderStatsService,
  type CreateOrderPayload,
  type UpdateOrderInformationPayload,
  type UpdateOrderStatusPayload,
  type CreateOrderResult,
} from "../service/order.service.js";
import type { OrderQuery } from "../schema/order.schema.js";

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

const isInvalidOrderAddress = (err: unknown) =>
  errorCode(err) === "INVALID_ORDER_ADDRESS";

const isInsufficientStock = (err: unknown) =>
  errorCode(err) === "INSUFFICIENT_STOCK";

// NEW: thrown when a color/size is missing or does not belong to the product.
const isInvalidVariant = (err: unknown) =>
  errorCode(err) === "INVALID_VARIANT";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders
// Body already validated by validateCreateOrder middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Places a new order.
 *
 * The server recomputes the total from live product prices, so the client
 * cannot manipulate the charge by sending an incorrect total. The color name
 * is resolved server-side from product_colors using `colorHex`.
 *
 * Returns 201 + the new order record and a full pricing breakdown on success.
 * Returns 404 if a referenced entity (wilaya, commune, company, product) does not exist.
 * Returns 400 if the coupon code is invalid, the color/size is invalid for the
 *   product (INVALID_VARIANT), or the commune does not belong to the wilaya.
 * Returns 409 if there is not enough stock.
 * Returns 422 if the shipping price is not configured for the chosen company + wilaya.
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
    // CHANGED: invalid color/size and commune-not-in-wilaya are client errors.
    if (isInvalidVariant(error) || isInvalidOrderAddress(error)) {
      return next(createHttpError(400, (error as Error).message));
    }
    if (isInsufficientStock(error)) {
      return next(createHttpError(409, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders
// Supports: pagination, search, filters, sorting via query params.
// Query params are pre-validated and typed by validateOrderQuery middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of orders.
 *
 * Query params:
 *   page       – page number (default 1)
 *   limit      – rows per page (default 20, max 100)
 *   search     – searches name, phone number, order id, wilaya name
 *   status     – filter by status (confirmed|pending|canceled|returned|delivered)
 *   wilayaCode – filter by 2-digit wilaya code
 *   dateFrom   – filter orders on or after YYYY-MM-DD
 *   dateTo     – filter orders on or before YYYY-MM-DD
 *   totalMin   – filter orders with total >= value
 *   totalMax   – filter orders with total <= value
 *   sortBy     – sort column (id|name|phoneNumber|wilayaCode|total|date|status)
 *   sortOrder  – asc | desc (default desc)
 */
export async function getAllOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderQuery = res.locals.orderQuery as OrderQuery;
    const result = await getAllOrdersService(orderQuery);

    res.status(200).json({ success: true, ...result });
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
// PATCH /api/orders/:id
// Param and customer information body are validated by middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates the customer's name, phone number, wilaya, and/or commune.
 * Returns 404 when the order or a referenced location does not exist, and
 * 400 when the selected commune does not belong to the selected wilaya.
 */
export async function updateOrderInformation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const payload = req.body as UpdateOrderInformationPayload;
    const order = await updateOrderInformationService(id, payload);

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isInvalidOrderAddress(error)) {
      return next(createHttpError(400, (error as Error).message));
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
 * Only the `status` field is changed by this operation.
 * Orders in a terminal state ("canceled", "returned") cannot be updated.
 * Moving an order to "canceled" or "returned" restores its reserved stock.
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
 * Soft-deletes an order and returns its last snapshot.
 * A pending or confirmed order releases its reserved stock when deleted.
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/stats
// Returns store-wide order statistics including total revenue.
//
// IMPORTANT: totalRevenue intentionally includes soft-deleted order rows.
// Soft-deleting an order is a UI archival action — it does NOT reverse the
// real-world payment that was collected. Excluding those rows would
// silently under-report the store's actual earnings.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns store-wide order stats:
 *   - totalRevenue: sum of all confirmed + delivered orders (ever placed, including archived)
 *   - activeOrderCount: orders visible in the dashboard (soft-deleted excluded)
 *   - allTimeOrderCount: every order ever placed
 */
export async function getOrderStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getOrderStatsService();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}