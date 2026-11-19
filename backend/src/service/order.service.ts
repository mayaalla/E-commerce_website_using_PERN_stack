import { and, eq, desc, inArray, isNull, sql, notInArray } from "drizzle-orm";

import { db } from "../db/db.js";
import {
  orders,
  products,
  productStock,
  wilayas,
  communes,
  shippingCompanies,
  shippingPrices,
  type OrderProduct,
} from "../db/schema.js";
import { validateCouponCodeService } from "./coupon.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Drizzle transaction object – inferred from db.transaction callback signature. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A single order row as stored in the database. */
export type Order = typeof orders.$inferSelect;

/** Shape of one line-item sent by the client at checkout. */
export type OrderItemInput = {
  productId: number;
  quantity: number;
  /** Display color name chosen by the customer (e.g. "Skin", "Red"). Stored in the order snapshot. */
  color?: string;
  /**
   * Hex code of the chosen color (6 uppercase hex digits, no "#").
   * Used to look up the matching product_stock row.
   * Must be provided alongside `color` when stock tracking is needed.
   */
  colorHex?: string;
  /** Optional size variant chosen by the customer. */
  size?: string;
};

/**
 * Payload accepted when placing a new order.
 *
 * `total` is intentionally omitted from the client payload – the service
 * computes it from live product prices so the client can never manipulate
 * the final charge.
 */
export type CreateOrderPayload = {
  name: string;
  phoneNumber: string;
  wilayaCode: string;
  communeId: number;
  shippingCompanyId: number;
  /** Line-items: product id + quantity + optional variant selection. */
  products: OrderItemInput[];
  /** Optional coupon code applied at checkout. */
  couponCode?: string;
};

/**
 * Extended response returned by createOrderService.
 * Includes the persisted order plus a pricing breakdown so the client
 * can display sub-total, discount amount, shipping, and grand total.
 */
export type CreateOrderResult = {
  order: Order;
  pricing: {
    subtotal: string;
    discountPercentage: number;
    discountAmount: string;
    shippingCost: string;
    total: string;
    couponCode: string | null;
  };
};

/**
 * Payload accepted when updating an order's status.
 * Access control (admin-only) is enforced at the router/middleware level.
 */
export type UpdateOrderStatusPayload = {
  status: Order["status"];
};

// ─────────────────────────────────────────────────────────────────────────────
// Typed service errors
// ─────────────────────────────────────────────────────────────────────────────

/** Attach a machine-readable `code` to any thrown Error for easy HTTP mapping. */
function serviceError(
  message: string,
  code: string
): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

// ─────────────────────────────────────────────────────────────────────────────
// Private guard helpers
// Each runs inside the transaction (`tx`) when called during order creation so
// that all reads and the final insert share the same snapshot.
// ─────────────────────────────────────────────────────────────────────────────

/** Throw NOT_FOUND when the wilaya does not exist. */
async function assertWilayaExists(
  wilayaCode: string,
  tx: Tx
): Promise<void> {
  const [row] = await tx
    .select({ code: wilayas.code })
    .from(wilayas)
    .where(eq(wilayas.code, wilayaCode))
    .limit(1);

  if (!row) {
    throw serviceError(
      `Wilaya with code "${wilayaCode}" not found`,
      "NOT_FOUND"
    );
  }
}

/** Throw NOT_FOUND when the commune does not exist. */
async function assertCommuneExists(
  communeId: number,
  tx: Tx
): Promise<void> {
  const [row] = await tx
    .select({ id: communes.id })
    .from(communes)
    .where(eq(communes.id, communeId))
    .limit(1);

  if (!row) {
    throw serviceError(`Commune with id ${communeId} not found`, "NOT_FOUND");
  }
}

/** Throw NOT_FOUND when the shipping company does not exist. */
async function assertShippingCompanyExists(
  shippingCompanyId: number,
  tx: Tx
): Promise<void> {
  const [row] = await tx
    .select({ id: shippingCompanies.id })
    .from(shippingCompanies)
    .where(eq(shippingCompanies.id, shippingCompanyId))
    .limit(1);

  if (!row) {
    throw serviceError(
      `Shipping company with id ${shippingCompanyId} not found`,
      "NOT_FOUND"
    );
  }
}

/**
 * Return the shipping cost (as a number) for a given company + wilaya pair.
 * Throws SHIPPING_PRICE_NOT_FOUND when the combination is not configured.
 */
async function fetchShippingCost(
  shippingCompanyId: number,
  wilayaCode: string,
  tx: Tx
): Promise<number> {
  const [row] = await tx
    .select({ price: shippingPrices.price })
    .from(shippingPrices)
    .where(
      and(
        eq(shippingPrices.shippingCompanyId, shippingCompanyId),
        eq(shippingPrices.wilayaCode, wilayaCode)
      )
    )
    .limit(1);

  if (!row) {
    throw serviceError(
      `No shipping price configured for company ${shippingCompanyId} ` +
        `in wilaya "${wilayaCode}"`,
      "SHIPPING_PRICE_NOT_FOUND"
    );
  }

  return parseFloat(row.price);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock helpers
// Both run inside the caller's transaction so they share the same DB snapshot.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decrement stock for each order item that has both a color and a size.
 * Throws INSUFFICIENT_STOCK when any matching row would go negative.
 * Items without color+size are skipped (no stock row tracks them).
 */
async function decrementStock(
  items: OrderItemInput[],
  tx: Tx
): Promise<void> {
  for (const item of items) {
    if (!item.colorHex || !item.size) continue;

    const colorHex = item.colorHex.toUpperCase();

    // Lock the row and check available stock before decrementing.
    const [row] = await tx
      .select({ id: productStock.id, stock: productStock.stock })
      .from(productStock)
      .where(
        and(
          eq(productStock.productId, item.productId),
          eq(productStock.colorHex, colorHex),
          eq(productStock.size, item.size as typeof productStock.size._.data)
        )
      )
      .limit(1);

    if (!row) {
      throw serviceError(
        `No stock entry found for product ${item.productId} ` +
          `(colorHex: ${item.colorHex}, size: ${item.size})`,
        "INSUFFICIENT_STOCK"
      );
    }

    if (row.stock < item.quantity) {
      throw serviceError(
        `Insufficient stock for product ${item.productId} ` +
          `(colorHex: ${item.colorHex}, size: ${item.size}): ` +
          `requested ${item.quantity}, available ${row.stock}`,
        "INSUFFICIENT_STOCK"
      );
    }

    await tx
      .update(productStock)
      .set({ stock: row.stock - item.quantity })
      .where(eq(productStock.id, row.id));
  }
}

/**
 * Restore (increment) stock for every item in the order snapshot that has
 * both a color and a size.  Called when an order is canceled or returned.
 */
async function restoreStock(
  orderProducts: OrderProduct[],
  tx: Tx
): Promise<void> {
  for (const item of orderProducts) {
    if (!item.colorHex || !item.size) continue;

    const colorHex = item.colorHex.toUpperCase();

    const [row] = await tx
      .select({ id: productStock.id, stock: productStock.stock })
      .from(productStock)
      .where(
        and(
          eq(productStock.productId, item.productId),
          eq(productStock.colorHex, colorHex),
          eq(productStock.size, item.size as typeof productStock.size._.data)
        )
      )
      .limit(1);

    // If the stock row was deleted (e.g. product removed) we silently skip.
    if (!row) continue;

    await tx
      .update(productStock)
      .set({ stock: row.stock + item.quantity })
      .where(eq(productStock.id, row.id));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create order
//
// All DB work runs inside a single serializable-level transaction:
//   1. Validate FK targets (wilaya, commune, shipping company).
//   2. Fetch the shipping cost for the chosen company + wilaya pair.
//   3. Fetch live product rows for every item in the cart.
//   4. Guard: every requested product must exist.
//   5. Optionally validate the coupon code (fails fast on invalid code).
//   6. Build the product snapshot array and compute the server-side total.
//   7. Decrement stock for items that have color + size.
//   8. Insert the order row and return the new record.
//
// Computing the total on the server prevents price-manipulation attacks where
// the client sends a lower total than the real charge.
// ─────────────────────────────────────────────────────────────────────────────

export async function createOrderService(
  payload: CreateOrderPayload
): Promise<CreateOrderResult> {
  const {
    name,
    phoneNumber,
    wilayaCode,
    communeId,
    shippingCompanyId,
    products: items,
    couponCode,
  } = payload;

  return db.transaction(async (tx) => {
    // ── Step 1: Validate FK targets ─────────────────────────────────────────
    await assertWilayaExists(wilayaCode, tx);
    await assertCommuneExists(communeId, tx);
    await assertShippingCompanyExists(shippingCompanyId, tx);

    // ── Step 2: Fetch shipping cost ─────────────────────────────────────────
    const shippingCost = await fetchShippingCost(
      shippingCompanyId,
      wilayaCode,
      tx
    );

    // ── Step 3: Fetch live product rows ─────────────────────────────────────
    // Read inside the transaction so any concurrent price change that commits
    // before our INSERT is captured in the snapshot and the computed total.
    // Only active (non-soft-deleted) products are eligible for purchase.
    const productIds = [...new Set(items.map((i) => i.productId))];

    const productRows = await tx
      .select({
        id: products.id,
        title: products.title,
        price: products.price,
        promo: products.promo,
      })
      .from(products)
      .where(and(inArray(products.id, productIds), isNull(products.deletedAt)));

    // ── Step 4: Guard – every requested product must exist ──────────────────
    const productMap = new Map(productRows.map((r) => [r.id, r]));

    for (const item of items) {
      if (!productMap.has(item.productId)) {
        throw serviceError(
          `Product with id ${item.productId} not found`,
          "NOT_FOUND"
        );
      }
    }

    // ── Step 5: Validate coupon (if supplied) ───────────────────────────────
    // Performed after product resolution so we fail fast on bad product ids
    // before touching the coupons table.
    let discountPercentage = 0;

    if (couponCode) {
      // Throws COUPON_NOT_FOUND or COUPON_UNAVAILABLE when the code is invalid.
      const coupon = await validateCouponCodeService(couponCode);
      discountPercentage = coupon.discountPercentage;
    }

    // ── Step 6: Build snapshots & compute server-side total ─────────────────
    let productSubtotal = 0;

    const orderProducts: OrderProduct[] = items.map((item) => {
      const row = productMap.get(item.productId)!;

      // Use the promotional price when it is set; fall back to the regular price.
      const unitPrice =
        row.promo !== null && row.promo !== undefined
          ? parseFloat(row.promo)
          : parseFloat(row.price);

      productSubtotal += unitPrice * item.quantity;

      const snapshot: OrderProduct = {
        productId: row.id,
        title: row.title,
        quantity: item.quantity,
        price: unitPrice.toFixed(2),
      };

      if (item.color) snapshot.color = item.color;
      if (item.colorHex) snapshot.colorHex = item.colorHex.toUpperCase();
      if (item.size) snapshot.size = item.size;

      return snapshot;
    });

    // Apply coupon discount to the product subtotal only (not to shipping).
    const discountMultiplier = 1 - discountPercentage / 100;
    const discountedSubtotal = productSubtotal * discountMultiplier;
    const discountAmount = productSubtotal - discountedSubtotal;
    const total = (discountedSubtotal + shippingCost).toFixed(2);

    // ── Step 7: Decrement stock ─────────────────────────────────────────────
    // Must run before the INSERT so a failed stock check rolls back the whole
    // transaction and no order row is created.
    await decrementStock(items, tx);

    // ── Step 8: Persist the order ───────────────────────────────────────────
    const [newOrder] = await tx
      .insert(orders)
      .values({
        name,
        phoneNumber,
        wilayaCode,
        communeId,
        shippingCompanyId,
        total,
        products: orderProducts,
        status: "pending",
      })
      .returning();

    return {
      order: newOrder,
      pricing: {
        subtotal: productSubtotal.toFixed(2),
        discountPercentage,
        discountAmount: discountAmount.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        total,
        couponCode: couponCode ?? null,
      },
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Read one
// Fetch a single order by primary key; throw a typed error on miss.
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrderByIdService(id: number): Promise<Order> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order || order.deletedAt) {
    throw serviceError(`Order with id ${id} not found`, "NOT_FOUND");
  }

  return order;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read all
// Return every order, most-recent first.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllOrdersService(): Promise<Order[]> {
  // Return only non-deleted orders, ordered most-recent first.
  return db
    .select()
    .from(orders)
    .where(isNull(orders.deletedAt))
    .orderBy(desc(orders.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Update status
//
// Only the `status` field is mutable after creation.  Everything else (pricing,
// products, shipping selection) represents the customer's frozen intent at
// checkout time and must never change.
//
// Additional business rule: once an order reaches a terminal state
// ("canceled" or "returned") it cannot transition to any other state.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateOrderStatusService(
  id: number,
  payload: UpdateOrderStatusPayload
): Promise<Order> {
  return db.transaction(async (tx) => {
    // Read current state before updating so we can enforce transition rules.
    const [existing] = await tx
      .select()
      .from(orders)
      .where(and(isNull(orders.deletedAt), eq(orders.id, id)))
      .limit(1);

    if (!existing) {
      throw serviceError(`Order with id ${id} not found`, "NOT_FOUND");
    }

    // Terminal-state guard: canceled / returned orders are immutable.
    const terminalStatuses: Order["status"][] = ["canceled", "returned"];
    if (terminalStatuses.includes(existing.status)) {
      throw serviceError(
        `Order ${id} has reached terminal status "${existing.status}" ` +
          `and cannot be updated`,
        "TERMINAL_ORDER_STATUS"
      );
    }

    // Restore stock when the order moves to a terminal status.
    // We only restore if the previous status was one that consumed stock
    // (i.e. not already a stock-restoring state).
    const stockRestoringStatuses: Order["status"][] = ["canceled", "returned"];
    if (stockRestoringStatuses.includes(payload.status)) {
      await restoreStock(existing.products as OrderProduct[], tx);
    }

    const [updated] = await tx
      .update(orders)
      .set({ status: payload.status })
      .where(eq(orders.id, id))
      .returning();

    return updated;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
//
// Soft-deletes the order row by stamping `deletedAt` and returns its snapshot.
// The row is preserved in the database for auditing and historical reporting.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteOrderByIdService(id: number): Promise<Order> {
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!existing || existing.deletedAt) {
    throw serviceError(`Order with id ${id} not found`, "NOT_FOUND");
  }

  await db.update(orders).set({ deletedAt: new Date().toISOString().slice(0, 10) }).where(eq(orders.id, id));

  return existing;
}


// ─────────────────────────────────────────────────────────────────────────────
// Stats
//
// Revenue is calculated across ALL orders (including soft-deleted ones) because
// soft-deleting an order is an admin UI action — it does NOT reverse the actual
// payment that was collected.  Excluding soft-deleted rows would silently
// under-report how much money the store has earned.
//
// Only revenue-generating statuses are counted:
//   ✅ confirmed  – order accepted and paid
//   ✅ shipped    – in transit, payment collected
//   ❌ pending    – not yet confirmed
//   ❌ canceled   – no money collected
//   ❌ returned   – money refunded
// ─────────────────────────────────────────────────────────────────────────────

/** Shape returned by getOrderStatsService. */
export type OrderStats = {
  /** Total revenue from confirmed + shipped orders (all time, including soft-deleted rows). */
  totalRevenue: string;
  /** Total number of orders visible in the dashboard (soft-deleted excluded). */
  activeOrderCount: number;
  /** Total number of orders ever placed (soft-deleted included). */
  allTimeOrderCount: number;
};

const REVENUE_STATUSES: Order["status"][] = ["confirmed", "shipped"];

export async function getOrderStatsService(): Promise<OrderStats> {
  // ── Revenue ──────────────────────────────────────────────────────────────
  // SUM(total) across every confirmed/shipped order regardless of deletedAt.
  // Using a raw SQL aggregation so we do a single round-trip.
  const [revenueRow] = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)::text`,
    })
    .from(orders)
    .where(
      // Include soft-deleted rows — only filter by business-meaningful status.
      notInArray(orders.status, ["pending", "canceled", "returned"] as Order["status"][])
    );

  // ── Active order count ───────────────────────────────────────────────────
  // Orders the admin can see in the dashboard (soft-deleted excluded).
  const [activeRow] = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(orders)
    .where(isNull(orders.deletedAt));

  // ── All-time order count ─────────────────────────────────────────────────
  const [allTimeRow] = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(orders);

  return {
    totalRevenue: revenueRow?.totalRevenue ?? "0",
    activeOrderCount: activeRow?.count ?? 0,
    allTimeOrderCount: allTimeRow?.count ?? 0,
  };
}
