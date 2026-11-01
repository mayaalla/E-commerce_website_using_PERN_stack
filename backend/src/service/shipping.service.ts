import { and, eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { shippingCompanies, shippingPrices, wilayas } from "../db/schema.js";
import { hashPassword } from "../utils/password.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single shipping-company row as stored in the database. */
export type ShippingCompany = typeof shippingCompanies.$inferSelect;

/** A single shipping-price row as stored in the database. */
export type ShippingPrice = typeof shippingPrices.$inferSelect;

/** Payload accepted when creating a new shipping company.
 *  `apiKey` is the raw secret; the service will hash it before persisting. */
export type CreateShippingCompanyPayload = {
  name: string;
  apiKey: string;
  status?: "active" | "inactive";
};

/** Payload accepted when updating an existing shipping company.
 *  Every field is optional so callers can do partial updates. */
export type UpdateShippingCompanyPayload =
  Partial<CreateShippingCompanyPayload>;

/** Payload accepted when creating a new shipping price.
 *  Supports resolution by company name OR id, and by wilaya name OR code. */
export type CreateShippingPricePayload = {
  price: string | number;
  /** Resolve the wilaya by its 2-digit code (e.g. "16"). */
  wilayaCode?: string;
  /** Resolve the wilaya by its human-readable name (e.g. "Alger"). */
  wilayaName?: string;
  /** Resolve the company by its numeric id. */
  shippingCompanyId?: number;
  /** Resolve the company by its name. */
  shippingCompanyName?: string;
  status?: "active" | "inactive";
};

/** Payload accepted when updating an existing shipping price. */
export type UpdateShippingPricePayload = Partial<CreateShippingPricePayload>;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the wilaya code from a payload that may carry either a `wilayaCode`
 * or a `wilayaName`.  Throws a descriptive error when neither is provided or
 * when the wilaya cannot be found.
 */
async function resolveWilayaCode(
  wilayaCode?: string,
  wilayaName?: string
): Promise<string> {
  if (!wilayaCode && !wilayaName) {
    throw Object.assign(
      new Error("Either wilayaCode or wilayaName must be provided"),
      { code: "WILAYA_MISSING" }
    );
  }

  if (wilayaCode) {
    const [row] = await db
      .select()
      .from(wilayas)
      .where(eq(wilayas.code, wilayaCode))
      .limit(1);

    if (!row) {
      throw new Error(`Wilaya with code "${wilayaCode}" not found`);
    }

    return row.code;
  }

  // wilayaName path
  const [row] = await db
    .select()
    .from(wilayas)
    .where(eq(wilayas.name, wilayaName!))
    .limit(1);

  if (!row) {
    throw new Error(`Wilaya with name "${wilayaName}" not found`);
  }

  return row.code;
}

/**
 * Resolves the shipping company id from a payload that may carry either a
 * `shippingCompanyId` or a `shippingCompanyName`.  Throws a descriptive error
 * when neither is provided or when the company cannot be found.
 */
async function resolveCompanyId(
  shippingCompanyId?: number,
  shippingCompanyName?: string
): Promise<number> {
  if (!shippingCompanyId && !shippingCompanyName) {
    throw Object.assign(
      new Error(
        "Either shippingCompanyId or shippingCompanyName must be provided"
      ),
      { code: "COMPANY_MISSING" }
    );
  }

  if (shippingCompanyId) {
    const [row] = await db
      .select()
      .from(shippingCompanies)
      .where(eq(shippingCompanies.id, shippingCompanyId))
      .limit(1);

    if (!row) {
      throw new Error(
        `Shipping company with id ${shippingCompanyId} not found`
      );
    }

    return row.id;
  }

  // shippingCompanyName path
  const [row] = await db
    .select()
    .from(shippingCompanies)
    .where(eq(shippingCompanies.name, shippingCompanyName!))
    .limit(1);

  if (!row) {
    throw new Error(
      `Shipping company with name "${shippingCompanyName}" not found`
    );
  }

  return row.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Company – Create
// Hash the raw API key, verify uniqueness by name, then insert.
// ─────────────────────────────────────────────────────────────────────────────

export async function createShippingCompanyService(
  payload: CreateShippingCompanyPayload
): Promise<ShippingCompany> {
  // Guard: a company with the same name would create ambiguity in name-based
  // resolution and is likely a user mistake.
  const [existing] = await db
    .select()
    .from(shippingCompanies)
    .where(eq(shippingCompanies.name, payload.name))
    .limit(1);

  if (existing) {
    throw Object.assign(
      new Error(`Shipping company "${payload.name}" already exists`),
      { code: "DUPLICATE_COMPANY_NAME" }
    );
  }

  const hashedApiKey = await hashPassword(payload.apiKey);

  const [newCompany] = await db
    .insert(shippingCompanies)
    .values({
      name: payload.name,
      hashedApiKey,
      status: payload.status ?? "active",
    })
    .returning();

  return newCompany;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Company – Read one
// Fetch a single company by primary key; throw a descriptive error on miss.
// ─────────────────────────────────────────────────────────────────────────────

export async function getShippingCompanyByIdService(
  id: number
): Promise<ShippingCompany> {
  const [company] = await db
    .select()
    .from(shippingCompanies)
    .where(eq(shippingCompanies.id, id))
    .limit(1);

  if (!company) {
    throw new Error(`Shipping company with id ${id} not found`);
  }

  return company;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Company – Read all
// Return every company row; returns an empty array when the table is empty.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllShippingCompaniesService(): Promise<
  ShippingCompany[]
> {
  return db.select().from(shippingCompanies);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Company – Update
// Verify the record exists, apply the partial patch, return the new state.
// If a new apiKey is provided it is hashed before persisting.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateShippingCompanyByIdService(
  id: number,
  payload: UpdateShippingCompanyPayload
): Promise<ShippingCompany> {
  // Guard: make sure the row is present before attempting an UPDATE.
  const [existing] = await db
    .select()
    .from(shippingCompanies)
    .where(eq(shippingCompanies.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Shipping company with id ${id} not found`);
  }

  // Guard: if the caller is changing the name, make sure the new name is unique.
  if (payload.name && payload.name !== existing.name) {
    const [duplicate] = await db
      .select()
      .from(shippingCompanies)
      .where(eq(shippingCompanies.name, payload.name))
      .limit(1);

    if (duplicate) {
      throw Object.assign(
        new Error(`Shipping company "${payload.name}" already exists`),
        { code: "DUPLICATE_COMPANY_NAME" }
      );
    }
  }

  // Build the update set – hash the API key only if a new one is provided.
  const { apiKey, ...rest } = payload;
  const updateSet: Partial<typeof shippingCompanies.$inferInsert> = { ...rest };

  if (apiKey) {
    updateSet.hashedApiKey = await hashPassword(apiKey);
  }

  const [updated] = await db
    .update(shippingCompanies)
    .set(updateSet)
    .where(eq(shippingCompanies.id, id))
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Company – Delete
// Verify the record exists, remove it, and return its last snapshot.
// The DB will throw a FK violation if any orders still reference this company;
// let it bubble up to the controller for HTTP 409 mapping.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteShippingCompanyByIdService(
  id: number
): Promise<ShippingCompany> {
  const [existing] = await db
    .select()
    .from(shippingCompanies)
    .where(eq(shippingCompanies.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Shipping company with id ${id} not found`);
  }

  await db.delete(shippingCompanies).where(eq(shippingCompanies.id, id));

  return existing;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Price – Create
// Accepts company/wilaya by name OR id.  Enforces the DB unique constraint
// (one price row per company+wilaya pair) with a meaningful error up-front.
// ─────────────────────────────────────────────────────────────────────────────

export async function createShippingPriceService(
  payload: CreateShippingPricePayload
): Promise<ShippingPrice> {
  const [companyId, wilayaCode] = await Promise.all([
    resolveCompanyId(payload.shippingCompanyId, payload.shippingCompanyName),
    resolveWilayaCode(payload.wilayaCode, payload.wilayaName),
  ]);

  // Guard: duplicate (company, wilaya) pair would violate the UNIQUE constraint.
  const [existing] = await db
    .select()
    .from(shippingPrices)
    .where(
      and(
        eq(shippingPrices.shippingCompanyId, companyId),
        eq(shippingPrices.wilayaCode, wilayaCode)
      )
    )
    .limit(1);

  if (existing) {
    throw Object.assign(
      new Error(
        `A shipping price for company id ${companyId} and wilaya "${wilayaCode}" already exists`
      ),
      { code: "DUPLICATE_SHIPPING_PRICE" }
    );
  }

  const [newPrice] = await db
    .insert(shippingPrices)
    .values({
      price: String(payload.price),
      wilayaCode,
      shippingCompanyId: companyId,
      status: payload.status ?? "active",
    })
    .returning();

  return newPrice;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Price – Read one
// Fetch by primary key; throw a descriptive error on miss.
// ─────────────────────────────────────────────────────────────────────────────

export async function getShippingPriceByIdService(
  id: number
): Promise<ShippingPrice> {
  const [price] = await db
    .select()
    .from(shippingPrices)
    .where(eq(shippingPrices.id, id))
    .limit(1);

  if (!price) {
    throw new Error(`Shipping price with id ${id} not found`);
  }

  return price;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Price – Read one by company + wilaya
// Useful when you know the pair but not the row id.
// ─────────────────────────────────────────────────────────────────────────────

export async function getShippingPriceByCompanyAndWilayaService(payload: {
  shippingCompanyId?: number;
  shippingCompanyName?: string;
  wilayaCode?: string;
  wilayaName?: string;
}): Promise<ShippingPrice> {
  const [companyId, wilayaCode] = await Promise.all([
    resolveCompanyId(payload.shippingCompanyId, payload.shippingCompanyName),
    resolveWilayaCode(payload.wilayaCode, payload.wilayaName),
  ]);

  const [price] = await db
    .select()
    .from(shippingPrices)
    .where(
      and(
        eq(shippingPrices.shippingCompanyId, companyId),
        eq(shippingPrices.wilayaCode, wilayaCode)
      )
    )
    .limit(1);

  if (!price) {
    throw new Error(
      `No shipping price found for company id ${companyId} and wilaya "${wilayaCode}"`
    );
  }

  return price;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Price – Read all for a company
// Returns every wilaya price row for the given shipping company.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllShippingPricesForCompanyService(
  shippingCompanyId: number
): Promise<ShippingPrice[]> {
  // Verify the company exists so the caller gets a meaningful 404.
  await getShippingCompanyByIdService(shippingCompanyId);

  return db
    .select()
    .from(shippingPrices)
    .where(eq(shippingPrices.shippingCompanyId, shippingCompanyId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Price – Update by id
// Applies a partial patch.  Resolves company/wilaya from name or id when
// the caller wants to reassign the price to a different pair.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateShippingPriceByIdService(
  id: number,
  payload: UpdateShippingPricePayload
): Promise<ShippingPrice> {
  // Guard: make sure the row is present before attempting an UPDATE.
  const [existing] = await db
    .select()
    .from(shippingPrices)
    .where(eq(shippingPrices.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Shipping price with id ${id} not found`);
  }

  // Resolve new company / wilaya only when the caller provides new references.
  const hasCompanyRef =
    payload.shippingCompanyId !== undefined ||
    payload.shippingCompanyName !== undefined;
  const hasWilayaRef =
    payload.wilayaCode !== undefined || payload.wilayaName !== undefined;

  const newCompanyId = hasCompanyRef
    ? await resolveCompanyId(
        payload.shippingCompanyId,
        payload.shippingCompanyName
      )
    : existing.shippingCompanyId;

  const newWilayaCode = hasWilayaRef
    ? await resolveWilayaCode(payload.wilayaCode, payload.wilayaName)
    : existing.wilayaCode;

  // Guard: if the (company, wilaya) pair is changing, check uniqueness.
  const pairChanged =
    newCompanyId !== existing.shippingCompanyId ||
    newWilayaCode !== existing.wilayaCode;

  if (pairChanged) {
    const [duplicate] = await db
      .select()
      .from(shippingPrices)
      .where(
        and(
          eq(shippingPrices.shippingCompanyId, newCompanyId),
          eq(shippingPrices.wilayaCode, newWilayaCode)
        )
      )
      .limit(1);

    if (duplicate) {
      throw Object.assign(
        new Error(
          `A shipping price for company id ${newCompanyId} and wilaya "${newWilayaCode}" already exists`
        ),
        { code: "DUPLICATE_SHIPPING_PRICE" }
      );
    }
  }

  const updateSet: Partial<typeof shippingPrices.$inferInsert> = {};

  if (payload.price !== undefined) updateSet.price = String(payload.price);
  if (payload.status !== undefined) updateSet.status = payload.status;
  if (hasCompanyRef) updateSet.shippingCompanyId = newCompanyId;
  if (hasWilayaRef) updateSet.wilayaCode = newWilayaCode;

  const [updated] = await db
    .update(shippingPrices)
    .set(updateSet)
    .where(eq(shippingPrices.id, id))
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipping Price – Delete by id
// Verify the record exists, remove it, and return its last snapshot.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteShippingPriceByIdService(
  id: number
): Promise<ShippingPrice> {
  const [existing] = await db
    .select()
    .from(shippingPrices)
    .where(eq(shippingPrices.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Shipping price with id ${id} not found`);
  }

  await db.delete(shippingPrices).where(eq(shippingPrices.id, id));

  return existing;
}
