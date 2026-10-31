import { eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { wilayas } from "../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single wilaya row as stored in the database. */
export type Wilaya = typeof wilayas.$inferSelect;

/** Payload accepted when creating a new wilaya.
 *  `code` is the 2-digit text primary key (e.g. "01", "16"). */
export type CreateWilayaPayload = {
  code: string;
  name: string;
};

/** Payload accepted when updating an existing wilaya.
 *  Every field is optional so callers can do partial updates. */
export type UpdateWilayaPayload = Partial<CreateWilayaPayload>;

// ─────────────────────────────────────────────────────────────────────────────
// Create
// Insert a new wilaya row and return the created record.
// ─────────────────────────────────────────────────────────────────────────────

export async function createWilayaService(
  payload: CreateWilayaPayload
): Promise<Wilaya> {
  const [newWilaya] = await db
    .insert(wilayas)
    .values({ code: payload.code, name: payload.name })
    .returning();

  return newWilaya;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read one
// Fetch a single wilaya by its text code (primary key).
// ─────────────────────────────────────────────────────────────────────────────

export async function getWilayaByCodeService(code: string): Promise<Wilaya> {
  const [wilaya] = await db
    .select()
    .from(wilayas)
    .where(eq(wilayas.code, code))
    .limit(1);

  if (!wilaya) {
    throw new Error(`Wilaya with code ${code} not found`);
  }

  return wilaya;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read all
// Return every wilaya row ordered by code ascending; empty array when none.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllWilayasService(): Promise<Wilaya[]> {
  return db.select().from(wilayas);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// Verify the record exists, apply the partial patch, return the new state.
// Note: updating the `code` (PK) is allowed by the schema but rare – the
// caller must ensure no child rows (communes, shipping_prices, orders) still
// reference the old code before doing so.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateWilayaByCodeService(
  code: string,
  payload: UpdateWilayaPayload
): Promise<Wilaya> {
  const [existing] = await db
    .select()
    .from(wilayas)
    .where(eq(wilayas.code, code))
    .limit(1);

  if (!existing) {
    throw new Error(`Wilaya with code ${code} not found`);
  }

  const [updated] = await db
    .update(wilayas)
    .set(payload)
    .where(eq(wilayas.code, code))
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// Verify the record exists, remove it, and return its last snapshot.
// Child rows in communes, shipping_prices and orders will trigger a FK error
// from the DB; the controller maps that to HTTP 409.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteWilayaByCodeService(
  code: string
): Promise<Wilaya> {
  const [existing] = await db
    .select()
    .from(wilayas)
    .where(eq(wilayas.code, code))
    .limit(1);

  if (!existing) {
    throw new Error(`Wilaya with code ${code} not found`);
  }

  await db.delete(wilayas).where(eq(wilayas.code, code));

  return existing;
}
