import {
  and,
  eq,
  desc,
  asc,
  inArray,
  isNull,
  sql,
  ilike,
  gte,
  lte,
  or,
} from "drizzle-orm";

import { db } from "../db/db.js";
import {
  orders,
  products,
  productStock,
  productColors, // NEW
  clothingSize, // NEW (enum, used to derive the size type)
  wilayas,
  communes,
  shippingCompanies,
  shippingPrices,
  type OrderProduct,
} from "../db/schema.js";
import { validateCouponCodeService } from "./coupon.service.js";
import type {
  OrderQuery,
  UpdateOrderInformation,
} from "../schema/order.schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Drizzle transaction object – inferred from db.transaction callback signature. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A single order row as stored in the database. */
export type Order = typeof orders.$inferSelect;

/** Size values allowed by the `clothing_size` DB enum. */
type ClothingSize = (typeof clothingSize.enumValues)[number];

/** Shape of one line-item sent by the client at checkout. */
export type OrderItemInput = {
  productId: number;
  quantity: number;
  /**
   * @deprecated Ignored. The color name is always resolved server-side from
   * product_colors using `colorHex`, so the client can never spoof it.
   */
  color?: string;
  /**
   * Identity of the chosen color (6 uppercase hex digits, no "#").
   * Required when the product has colors. Must exist in product_colors for
   * this product.
   */
  colorHex?: string;
  /** Size variant. Required when the product has sizes. Must be one of them. */
  size?: ClothingSize;
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

export type UpdateOrderInformationPayload = UpdateOrderInformation;

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

/**
 * CHANGED (was assertCommuneExists).
 * Throw NOT_FOUND when the commune does not exist, and
 * INVALID_ORDER_ADDRESS when it does not belong to the given wilaya.
 * Shared by order creation and order information updates.
 */
async function assertCommuneInWilaya(
  communeId: number,
  wilayaCode: string,
  tx: Tx
): Promise<void> {
  const [commune] = await tx
    .select({ id: communes.id, wilayaId: communes.wilayaId })
    .from(communes)
    .where(eq(communes.id, communeId))
    .limit(1);

  if (!commune) {
    throw serviceError(`Commune with id ${communeId} not found`, "NOT_FOUND");
  }

  if (commune.wilayaId !== wilayaCode) {
    throw serviceError(
      `Commune with id ${communeId} does not belong to wilaya "${wilayaCode}"`,
      "INVALID_ORDER_ADDRESS"
    );
  }
}

/**
 * CHANGED (was assertShippingCompanyExists).
 * Throw NOT_FOUND when the shipping company does not exist, is soft-deleted,
 * or is inactive.
 */
async function assertShippingCompanyAvailable(
  shippingCompanyId: number,
  tx: Tx
): Promise<void> {
  const [row] = await tx
    .select({ id: shippingCompanies.id })
    .from(shippingCompanies)
    .where(
      and(
        eq(shippingCompanies.id, shippingCompanyId),
        isNull(shippingCompanies.deletedAt),
        eq(shippingCompanies.status, "active")
      )
    )
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
 * CHANGED: only active prices are considered.
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
        eq(shippingPrices.wilayaCode, wilayaCode),
        eq(shippingPrices.status, "active")
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
// Both run inside the caller's transaction.
//
// CHANGED: no more read-then-write. Each update is a single atomic SQL
// statement, so concurrent checkouts can never oversell and concurrent
// restores can never lose an increment.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decrement stock for each order item that has both a color and a size.
 * Throws INSUFFICIENT_STOCK when no row matches or stock would go negative.
 *
 * The guard `stock >= quantity` lives inside the UPDATE itself: Postgres locks
 * the row, re-checks the condition and decrements in one step.
 *
 * By the time this runs, validateVariants() has already guaranteed that every
 * item of a product with colors and sizes carries both, so nothing can bypass
 * stock tracking by omitting them.
 */
async function decrementStock(
  items: OrderItemInput[],
  tx: Tx
): Promise<void> {
  const lines = items
    .filter((i) => i.colorHex && i.size)
    // Stable order → concurrent checkouts lock rows in the same order,
    // which avoids deadlocks.
    .sort((a, b) =>
      `${a.productId}:${a.colorHex}:${a.size}`.localeCompare(
        `${b.productId}:${b.colorHex}:${b.size}`
      )
    );

  for (const item of lines) {
    const colorHex = item.colorHex!.toUpperCase();

    const updated = await tx
      .update(productStock)
      .set({ stock: sql`${productStock.stock} - ${item.quantity}` })
      .where(
        and(
          eq(productStock.productId, item.productId),
          eq(productStock.colorHex, colorHex),
          eq(productStock.size, item.size!),
          gte(productStock.stock, item.quantity)
        )
      )
      .returning({ id: productStock.id });

    if (updated.length === 0) {
      throw serviceError(
        `Insufficient stock for product ${item.productId} ` +
          `(colorHex: ${colorHex}, size: ${item.size})`,
        "INSUFFICIENT_STOCK"
      );
    }
  }
}

/**
 * Restore (increment) stock for every item in the order snapshot that has
 * both a color and a size. Called when an order is canceled, returned, or
 * deleted while still holding reserved stock.
 *
 * If the stock row no longer exists (color or product removed), the UPDATE
 * matches 0 rows and the item is silently skipped.
 */
async function restoreStock(
  orderProducts: OrderProduct[],
  tx: Tx
): Promise<void> {
  for (const item of orderProducts) {
    if (!item.colorHex || !item.size) continue;

    await tx
      .update(productStock)
      .set({ stock: sql`${productStock.stock} + ${item.quantity}` })
      .where(
        and(
          eq(productStock.productId, item.productId),
          eq(productStock.colorHex, item.colorHex.toUpperCase()),
          eq(productStock.size, item.size as ClothingSize)
        )
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create order
//
// All DB work runs inside a single transaction:
//   1. Validate FK targets (wilaya, commune ↔ wilaya, shipping company).
//   2. Fetch the shipping cost for the chosen company + wilaya pair.
//   3. Fetch live product rows AND their colors from product_colors.
//   4. Guard: every product must exist and every variant (color/size) must be
//      valid for that product.                                         (CHANGED)
//   5. Optionally validate the coupon code (fails fast on invalid code).
//   6. Build the product snapshot array and compute the server-side total.
//      The color NAME comes from product_colors, never from the client. (CHANGED)
//   7. Atomically decrement stock for items that have color + size.     (CHANGED)
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
    await assertCommuneInWilaya(communeId, wilayaCode, tx);
    await assertShippingCompanyAvailable(shippingCompanyId, tx);

    // ── Step 2: Fetch shipping cost ─────────────────────────────────────────
    const shippingCost = await fetchShippingCost(
      shippingCompanyId,
      wilayaCode,
      tx
    );

    // ── Step 3: Fetch live product rows + their colors ──────────────────────
    // Only active (non-soft-deleted) products are eligible for purchase.
    const productIds = [...new Set(items.map((i) => i.productId))];

    const productRows = await tx
      .select({
        id: products.id,
        title: products.title,
        price: products.price,
        promo: products.promo,
        sizes: products.sizes, // NEW
      })
      .from(products)
      .where(and(inArray(products.id, productIds), isNull(products.deletedAt)));

    // NEW: colors of every product in the cart.
    const colorRows = await tx
      .select({
        productId: productColors.productId,
        hex: productColors.hex,
        name: productColors.name,
      })
      .from(productColors)
      .where(inArray(productColors.productId, productIds));

    // "productId:HEX" → color name (source of truth for the snapshot).
    const colorNameByKey = new Map(
      colorRows.map((c) => [`${c.productId}:${c.hex}`, c.name])
    );
    // Products that define at least one color (so a color is mandatory).
    const productsWithColors = new Set(colorRows.map((c) => c.productId));

    // ── Step 4: Guard – product exists AND variant is valid ─────────────────
    const productMap = new Map(productRows.map((r) => [r.id, r]));

    for (const item of items) {
      const row = productMap.get(item.productId);

      if (!row) {
        throw serviceError(
          `Product with id ${item.productId} not found`,
          "NOT_FOUND"
        );
      }

      // Color: required if the product has colors; must belong to the product.
      const hex = item.colorHex?.toUpperCase();
      if (hex) {
        if (!colorNameByKey.has(`${item.productId}:${hex}`)) {
          throw serviceError(
            `Color ${hex} is not available for product ${item.productId}`,
            "INVALID_VARIANT"
          );
        }
      } else if (productsWithColors.has(item.productId)) {
        throw serviceError(
          `A color must be selected for product ${item.productId}`,
          "INVALID_VARIANT"
        );
      }

      // Size: required if the product has sizes; must be one of them.
      if (item.size) {
        if (!row.sizes.includes(item.size)) {
          throw serviceError(
            `Size ${item.size} is not available for product ${item.productId}`,
            "INVALID_VARIANT"
          );
        }
      } else if (row.sizes.length > 0) {
        throw serviceError(
          `A size must be selected for product ${item.productId}`,
          "INVALID_VARIANT"
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

      // CHANGED: hex is the identity; the name is read from product_colors.
      // The snapshot freezes both at purchase time, so a later rename in
      // product_colors does not alter past orders.
      if (item.colorHex) {
        const hex = item.colorHex.toUpperCase();
        snapshot.colorHex = hex;
        snapshot.color = colorNameByKey.get(`${item.productId}:${hex}`)!;
      }
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
// Read all  –  with pagination, search, filters and sorting
//
// Search (single input) matches any of:
//   • customer name        (ILIKE)
//   • phone number         (ILIKE)
//   • order id             (cast to text, ILIKE)
//   • wilaya name          (EXISTS sub-select, ILIKE)
//
// Filters:
//   status | wilayaCode | dateFrom | dateTo | totalMin | totalMax
//
// Sorting: any allowed column, asc or desc.
// ─────────────────────────────────────────────────────────────────────────────

/** Shape returned by getAllOrdersService. */
export type PaginatedOrders = {
  data: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function getAllOrdersService(
  query: OrderQuery
): Promise<PaginatedOrders> {
  const {
    page,
    limit,
    search,
    status,
    wilayaCode,
    dateFrom,
    dateTo,
    totalMin,
    totalMax,
    sortBy,
    sortOrder,
  } = query;

  const offset = (page - 1) * limit;

  // ── Build the WHERE conditions ────────────────────────────────────────────
  // Start with the mandatory soft-delete filter.
  const conditions: ReturnType<typeof and>[] = [isNull(orders.deletedAt)];

  // Discrete filters
  if (status) {
    conditions.push(eq(orders.status, status));
  }
  if (wilayaCode) {
    conditions.push(eq(orders.wilayaCode, wilayaCode));
  }
  if (dateFrom) {
    conditions.push(gte(orders.date, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(orders.date, dateTo));
  }
  if (totalMin !== undefined) {
    conditions.push(gte(orders.total, String(totalMin)));
  }
  if (totalMax !== undefined) {
    conditions.push(lte(orders.total, String(totalMax)));
  }

  // Global search – matched against name, phone, id (cast), wilaya name (join)
  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        ilike(orders.name, term),
        ilike(orders.phoneNumber, term),
        // Cast numeric id to text so we can do an ILIKE on it
        sql`${orders.id}::text ILIKE ${term}`,
        // Sub-select: order's wilaya name from the wilayas table
        sql`EXISTS (
          SELECT 1 FROM wilayas w
          WHERE w.code = ${orders.wilayaCode}
            AND w.name ILIKE ${term}
        )`
      )!
    );
  }

  const where = and(...conditions);

  // ── Sort column mapping ───────────────────────────────────────────────────
  const columnMap = {
    id: orders.id,
    name: orders.name,
    phoneNumber: orders.phoneNumber,
    wilayaCode: orders.wilayaCode,
    total: orders.total,
    date: orders.date,
    status: orders.status,
  } as const;

  const sortColumn = columnMap[sortBy as keyof typeof columnMap] ?? orders.id;
  const orderDir = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  // ── Fetch data + total count in parallel ─────────────────────────────────
  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(orderDir)
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(where),
  ]);

  const total = countRow?.count ?? 0;

  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update customer information
//
// Only name, phone number, wilaya, and commune can be changed. The selected
// commune must belong to the resulting wilaya so the order keeps a valid
// delivery address.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateOrderInformationService(
  id: number,
  payload: UpdateOrderInformationPayload
): Promise<Order> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(orders)
      .where(and(isNull(orders.deletedAt), eq(orders.id, id)))
      .limit(1)
      .for("update");

    if (!existing) {
      throw serviceError(`Order with id ${id} not found`, "NOT_FOUND");
    }

    const wilayaCode = payload.wilayaCode ?? existing.wilayaCode;
    const communeId = payload.communeId ?? existing.communeId;
    const updatesDeliveryLocation =
      payload.wilayaCode !== undefined || payload.communeId !== undefined;

    if (updatesDeliveryLocation) {
      if (payload.wilayaCode !== undefined) {
        await assertWilayaExists(wilayaCode, tx);
      }
      await assertCommuneInWilaya(communeId, wilayaCode, tx);
    }

    const [updated] = await tx
      .update(orders)
      .set(payload)
      .where(eq(orders.id, id))
      .returning();

    return updated;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Update status
//
// This operation changes only the `status` field. Customer contact and
// delivery information have their own targeted update service above.
//
// Business rule: once an order reaches a terminal state ("canceled" or
// "returned") it cannot transition to any other state.
//
// CHANGED: the order row is locked (FOR UPDATE) so two concurrent "cancel"
// requests cannot both pass the terminal guard and restore stock twice.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateOrderStatusService(
  id: number,
  payload: UpdateOrderStatusPayload
): Promise<Order> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(orders)
      .where(and(isNull(orders.deletedAt), eq(orders.id, id)))
      .limit(1)
      .for("update");

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
    // Safe from double-restore: the row is locked and terminal orders are
    // rejected above.
    if (terminalStatuses.includes(payload.status)) {
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
//
// CHANGED: deleting an order that still holds reserved stock (pending or
// confirmed) releases that stock. Orders that are delivered, canceled or
// returned are left alone: delivered stock is really gone, and canceled /
// returned orders already restored theirs.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteOrderByIdService(id: number): Promise<Order> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1)
      .for("update");

    if (!existing || existing.deletedAt) {
      throw serviceError(`Order with id ${id} not found`, "NOT_FOUND");
    }

    const stockHoldingStatuses: Order["status"][] = ["pending", "confirmed"];
    if (stockHoldingStatuses.includes(existing.status)) {
      await restoreStock(existing.products as OrderProduct[], tx);
    }

    await tx
      .update(orders)
      .set({ deletedAt: new Date().toISOString().slice(0, 10) })
      .where(eq(orders.id, id));

    return existing;
  });
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
//   ✅ confirmed  – order accepted
//   ✅ delivered  – delivered, payment collected
//   ❌ pending    – not yet confirmed
//   ❌ canceled   – no money collected
//   ❌ returned   – COD order not collected
// ─────────────────────────────────────────────────────────────────────────────

/** Shape returned by getOrderStatsService. */
export type OrderStats = {
  /** Total revenue from confirmed + delivered orders (all time, including soft-deleted rows). */
  totalRevenue: string;
  /** Total number of orders visible in the dashboard (soft-deleted excluded). */
  activeOrderCount: number;
  /** Total number of orders ever placed (soft-deleted included). */
  allTimeOrderCount: number;
};

const REVENUE_STATUSES: Order["status"][] = ["confirmed", "delivered"];

export async function getOrderStatsService(): Promise<OrderStats> {
  // ── Revenue ──────────────────────────────────────────────────────────────
  // CHANGED: inArray(REVENUE_STATUSES) instead of notInArray(...), so a new
  // status added to the enum later is not counted as revenue by accident.
  const [revenueRow] = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)::text`,
    })
    .from(orders)
    .where(inArray(orders.status, REVENUE_STATUSES));

  // ── Active order count ───────────────────────────────────────────────────
  const [activeRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(orders)
    .where(isNull(orders.deletedAt));

  // ── All-time order count ─────────────────────────────────────────────────
  const [allTimeRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(orders);

  return {
    totalRevenue: revenueRow?.totalRevenue ?? "0",
    activeOrderCount: activeRow?.count ?? 0,
    allTimeOrderCount: allTimeRow?.count ?? 0,
  };
}