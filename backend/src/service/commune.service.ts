import { eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { communes, wilayas } from "../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single commune row as stored in the database. */
export type Commune = typeof communes.$inferSelect;

/** Payload accepted when creating a new commune. */
export type CreateCommunePayload = {
  name: string;
  /** The 2-digit wilaya code this commune belongs to (e.g. "16"). */
  wilayaId: string;
};

/** Payload accepted when updating an existing commune.
 *  Every field is optional so callers can do partial updates. */
export type UpdateCommunePayload = Partial<CreateCommunePayload>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies that the referenced wilaya exists before we insert or update a
 * commune.  Throwing here keeps the FK check at the service layer, which
 * gives us a cleaner error message than the raw Postgres constraint violation.
 */
async function assertWilayaExists(wilayaId: string): Promise<void> {
  const [wilaya] = await db
    .select()
    .from(wilayas)
    .where(eq(wilayas.code, wilayaId))
    .limit(1);

  if (!wilaya) {
    throw new Error(`Wilaya with code ${wilayaId} not found`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// Validate the referenced wilaya, insert the commune, return the new record.
// ─────────────────────────────────────────────────────────────────────────────

export async function createCommuneService(
  payload: CreateCommunePayload
): Promise<Commune> {
  await assertWilayaExists(payload.wilayaId);

  const [newCommune] = await db
    .insert(communes)
    .values({ name: payload.name, wilayaId: payload.wilayaId })
    .returning();

  return newCommune;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read one
// Fetch a single commune by serial id.
// ─────────────────────────────────────────────────────────────────────────────

export async function getCommuneByIdService(id: number): Promise<Commune> {
  const [commune] = await db
    .select()
    .from(communes)
    .where(eq(communes.id, id))
    .limit(1);

  if (!commune) {
    throw new Error(`Commune with id ${id} not found`);
  }

  return commune;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read all
// Return every commune row; returns an empty array when the table is empty.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCommunesService(): Promise<Commune[]> {
  return db.select().from(communes);
}

// ─────────────────────────────────────────────────────────────────────────────
// Read by wilaya
// Return all communes that belong to a given wilaya code.
// ─────────────────────────────────────────────────────────────────────────────

export async function getCommunesByWilayaService(
  wilayaCode: string
): Promise<Commune[]> {
  await assertWilayaExists(wilayaCode);

  return db
    .select()
    .from(communes)
    .where(eq(communes.wilayaId, wilayaCode));
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// Verify the commune exists; if wilayaId is being changed, verify the new
// wilaya exists as well.  Apply the patch and return the updated record.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateCommuneByIdService(
  id: number,
  payload: UpdateCommunePayload
): Promise<Commune> {
  const [existing] = await db
    .select()
    .from(communes)
    .where(eq(communes.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Commune with id ${id} not found`);
  }

  // Only validate the wilaya when the caller is actually changing it.
  if (payload.wilayaId !== undefined) {
    await assertWilayaExists(payload.wilayaId);
  }

  const [updated] = await db
    .update(communes)
    .set(payload)
    .where(eq(communes.id, id))
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// Verify the record exists, remove it, and return its last snapshot.
// Orders that reference this commune will trigger a FK error from the DB;
// the controller maps that to HTTP 409.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteCommuneByIdService(id: number): Promise<Commune> {
  const [existing] = await db
    .select()
    .from(communes)
    .where(eq(communes.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Commune with id ${id} not found`);
  }

  await db.delete(communes).where(eq(communes.id, id));

  return existing;
}
