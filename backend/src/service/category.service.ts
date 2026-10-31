import { eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { categories } from "../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single category row as stored in the database. */
export type Category = typeof categories.$inferSelect;

/** Payload accepted when creating a new category. */
export type CreateCategoryPayload = {
  name: string;
};

/** Payload accepted when updating an existing category.
 *  Every field is optional so callers can do partial updates. */
export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

// ─────────────────────────────────────────────────────────────────────────────
// Create
// Insert a new category row and return the created record.
// ─────────────────────────────────────────────────────────────────────────────

export async function createCategoryService(
  payload: CreateCategoryPayload
): Promise<Category> {
  const [newCategory] = await db
    .insert(categories)
    .values({ name: payload.name })
    .returning();

  return newCategory;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read one
// Fetch a single category by primary key; throw a descriptive error on miss.
// ─────────────────────────────────────────────────────────────────────────────

export async function getCategoryByIdService(id: number): Promise<Category> {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!category) {
    throw new Error(`Category with id ${id} not found`);
  }

  return category;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read all
// Return every category row; returns an empty array when the table is empty.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCategoriesService(): Promise<Category[]> {
  return db.select().from(categories);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// Verify the record exists, apply the partial patch, and return the new state.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateCategoryByIdService(
  id: number,
  payload: UpdateCategoryPayload
): Promise<Category> {
  // Guard: make sure the row is present before we attempt an UPDATE.
  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Category with id ${id} not found`);
  }

  const [updated] = await db
    .update(categories)
    .set(payload)
    .where(eq(categories.id, id))
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// Verify the record exists, remove it, and return its last snapshot.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteCategoryByIdService(id: number): Promise<Category> {
  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Category with id ${id} not found`);
  }

  // A category that still has products attached will violate the FK constraint
  // on products.category_id.  The DB will throw; let it bubble up to the
  // controller so it can map to HTTP 409.
  await db.delete(categories).where(eq(categories.id, id));

  return existing;
}
