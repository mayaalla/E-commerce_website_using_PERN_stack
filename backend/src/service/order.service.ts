import { and, eq, desc, inArray } from "drizzle-orm";

import { db } from "../db/db.js";
import {
  orders,
  products,
  wilayas,
  communes,
  shippingCompanies,
  shippingPrices,
  type OrderProduct,
} from "../db/schema.js";
import { validateCouponCodeService } from "./coupon.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// DB / Transaction union type
//
// All private helpers accept either the top-level `db` instance or a Drizzle
// transaction (`tx`).  Using `Parameters<typeof db.transaction>[0]` extracts
// the exact callback signature so we never depend on internal Drizzle types.
// ─────────────────────────────────────────────────────────────────────────────
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single order row as stored in the database. */
export type Order = typeof orders.$inferSelect;

/** Shape of one line-item sent by the client at checkout. */
export type OrderItemInput = {
  productId: number;
  quantity: number;
  /** Optional color variant chosen by the customer. */
  color?: string;
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
// Create order
//
// All DB work runs inside a single serializable-level transaction:
//   1. Validate FK targets (wilaya, commune, shipping company).
//   2. Fetch the shipping cost for the chosen company + wilaya pair.
//   3. Fetch live product rows for every item in the cart.
//   4. Guard: every requested product must exist.
//   5. Optionally validate the coupon code (fails fast on invalid code).
//   6. Build the product snapshot array and compute the server-side total.
//   7. Insert the order row and return the new record.
//
// Computing the total on the server prevents price-manipulation attacks where
// the client sends a lower total than the real charge.
// ─────────────────────────────────────────────────────────────────────────────

export async function createOrderService(
  payload: CreateOrderPayload
): Promise<Order> {
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
    const productIds = [...new Set(items.map((i) => i.productId))];

    const productRows = await tx
      .select({
        id: products.id,
        title: products.title,
        price: products.price,
        promo: products.promo,
      })
      .from(products)
      .where(inArray(products.id, productIds));

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
    if (couponCode) {
      // Throws COUPON_NOT_FOUND or COUPON_UNAVAILABLE when the code is invalid.
      await validateCouponCodeService(couponCode);
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
      if (item.size) snapshot.size = item.size;

      return snapshot;
    });

    const total = (productSubtotal + shippingCost).toFixed(2);

    // ── Step 7: Persist the order ───────────────────────────────────────────
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

    return newOrder;
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

  if (!order) {
    throw serviceError(`Order with id ${id} not found`, "NOT_FOUND");
  }

  return order;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read all
// Return every order, most-recent first.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllOrdersService(): Promise<Order[]> {
  return db.select().from(orders).orderBy(desc(orders.id));
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
  // Read current state before updating so we can enforce transition rules.
  const [existing] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.id, id))
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

  const [updated] = await db
    .update(orders)
    .set({ status: payload.status })
    .where(eq(orders.id, id))
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
//
// Hard-deletes the order row and returns its last snapshot.
// In a production system you may prefer a soft-delete (adding a `deletedAt`
// timestamp column) to preserve historical records for auditing.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteOrderByIdService(id: number): Promise<Order> {
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!existing) {
    throw serviceError(`Order with id ${id} not found`, "NOT_FOUND");
  }

  await db.delete(orders).where(eq(orders.id, id));

  return existing;
}
