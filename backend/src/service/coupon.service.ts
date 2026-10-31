import { eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { coupons } from "../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single coupon row as stored in the database. */
export type Coupon = typeof coupons.$inferSelect;

/** Payload accepted when creating a new coupon. */
export type CreateCouponPayload = {
  code: string;
  expireDate: string; // YYYY-MM-DD
  status?: "active" | "inactive" | "expired";
};

/** Payload accepted when updating an existing coupon.
 *  Every field is optional so callers can perform partial updates. */
export type UpdateCouponPayload = Partial<CreateCouponPayload>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives the logical status of a coupon based on its stored status and
 * expiry date.  A coupon whose `expireDate` is in the past is treated as
 * "expired" regardless of its persisted status value.
 */
function resolveStatus(coupon: Coupon): Coupon["status"] {
  if (coupon.status === "expired") return "expired";
  if (new Date(coupon.expireDate) < new Date()) return "expired";
  return coupon.status;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// Insert a new coupon row and return the created record.
// ─────────────────────────────────────────────────────────────────────────────

export async function createCouponService(
  payload: CreateCouponPayload
): Promise<Coupon> {
  // Guard: duplicate codes would violate the UNIQUE constraint; fail early with
  // a meaningful message so the controller can map it to HTTP 409.
  const [existing] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, payload.code))
    .limit(1);

  if (existing) {
    throw Object.assign(
      new Error(`Coupon with code "${payload.code}" already exists`),
      { code: "DUPLICATE_COUPON_CODE" }
    );
  }

  const [newCoupon] = await db
    .insert(coupons)
    .values({
      code: payload.code,
      expireDate: payload.expireDate,
      status: payload.status ?? "active",
    })
    .returning();

  return newCoupon;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read one – by primary key
// Fetch a single coupon by its numeric id; throw a descriptive error on miss.
// ─────────────────────────────────────────────────────────────────────────────

export async function getCouponByIdService(id: number): Promise<Coupon> {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, id))
    .limit(1);

  if (!coupon) {
    throw new Error(`Coupon with id ${id} not found`);
  }

  return coupon;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read one – by code (used at checkout to validate a coupon code)
// Returns the coupon only when it is currently active and not expired.
// ─────────────────────────────────────────────────────────────────────────────

export async function validateCouponCodeService(code: string): Promise<Coupon> {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);

  if (!coupon) {
    throw Object.assign(new Error(`Coupon "${code}" not found`), {
      code: "COUPON_NOT_FOUND",
    });
  }

  const effectiveStatus = resolveStatus(coupon);

  if (effectiveStatus !== "active") {
    throw Object.assign(
      new Error(`Coupon "${code}" is ${effectiveStatus} and cannot be applied`),
      { code: "COUPON_UNAVAILABLE" }
    );
  }

  return coupon;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read all
// Return every coupon row; returns an empty array when the table is empty.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCouponsService(): Promise<Coupon[]> {
  return db.select().from(coupons);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// Verify the record exists, apply the partial patch, return the new state.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateCouponByIdService(
  id: number,
  payload: UpdateCouponPayload
): Promise<Coupon> {
  // Guard: make sure the row is present before attempting an UPDATE.
  const [existing] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Coupon with id ${id} not found`);
  }

  // Guard: if the caller is changing the code, ensure the new code is unique.
  if (payload.code && payload.code !== existing.code) {
    const [duplicate] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, payload.code))
      .limit(1);

    if (duplicate) {
      throw Object.assign(
        new Error(`Coupon with code "${payload.code}" already exists`),
        { code: "DUPLICATE_COUPON_CODE" }
      );
    }
  }

  const [updated] = await db
    .update(coupons)
    .set(payload)
    .where(eq(coupons.id, id))
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// Verify the record exists, remove it, and return its last snapshot.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteCouponByIdService(id: number): Promise<Coupon> {
  const [existing] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Coupon with id ${id} not found`);
  }

  await db.delete(coupons).where(eq(coupons.id, id));

  return existing;
}
