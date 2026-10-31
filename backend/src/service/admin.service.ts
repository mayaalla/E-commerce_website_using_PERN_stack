

import { eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { admins } from "../db/schema.js";
import { hashPassword } from "../utils/password.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** The columns that are safe to return to the client (never the password hash). */
export type PublicAdmin = Omit<typeof admins.$inferSelect, "password">;

/** Payload accepted when creating a new admin. */
export type CreateAdminPayload = {
  username: string;
  password: string;
  phoneNumber: string;
  permissions?: (typeof admins.$inferSelect)["permissions"];
  type?: (typeof admins.$inferSelect)["type"];
};

/** Payload accepted when updating an existing admin.
 *  Every field is optional so callers can do partial updates. */
export type UpdateAdminPayload = Partial<CreateAdminPayload>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip the password hash before sending admin data to the client.
 * Using destructuring + rest is O(1) and keeps the return type accurate.
 */
function toPublicAdmin(admin: typeof admins.$inferSelect): PublicAdmin {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...publicAdmin } = admin;
  return publicAdmin;
}

// ─────────────────────────────────────────────────────────────────────────────
// service to create admin :
// hach the password before storing it in the database
// store data in the database
// ─────────────────────────────────────────────────────────────────────────────

export async function createAdminService(
  payload: CreateAdminPayload
): Promise<PublicAdmin> {
  const { username, password, phoneNumber, permissions = [], type = "regular_admin" } = payload;

  // hach the password before storing it in the database
  const hashedPassword = await hashPassword(password);

  // store data in the database
  const [newAdmin] = await db
    .insert(admins)
    .values({
      username,
      password: hashedPassword,
      phoneNumber,
      permissions,
      type,
    })
    .returning();

  // return public data of the admin to the client
  return toPublicAdmin(newAdmin);
}

// ─────────────────────────────────────────────────────────────────────────────
// service to get admin by id
// verify that the admin exists in the database
// return public data of the admin to the client
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminByIdService(id: number): Promise<PublicAdmin> {
  // verify that the admin exists in the database
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.id, id))
    .limit(1);

  if (!admin) {
    throw new Error(`Admin with id ${id} not found`);
  }

  // return public data of the admin to the client
  return toPublicAdmin(admin);
}

// ─────────────────────────────────────────────────────────────────────────────
// service to get all admins
// return public data of the admins to the client
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllAdminsService(): Promise<PublicAdmin[]> {
  const allAdmins = await db.select().from(admins);

  // return public data of the admins to the client
  return allAdmins.map(toPublicAdmin);
}

// ─────────────────────────────────────────────────────────────────────────────
// service to update admin by id
// verify that the admin exists in the database
// update the admin data in the database
// return public data of the admin to the client
// ─────────────────────────────────────────────────────────────────────────────

export async function updateAdminByIdService(
  id: number,
  payload: UpdateAdminPayload
): Promise<PublicAdmin> {
  // verify that the admin exists in the database
  const [existing] = await db
    .select()
    .from(admins)
    .where(eq(admins.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Admin with id ${id} not found`);
  }

  // If a new password is provided, hash it before storing — never persist plain text.
  const updates: Partial<typeof admins.$inferInsert> = { ...payload };

  if (payload.password) {
    // hach the password before storing it in the database
    updates.password = await hashPassword(payload.password);
  } else {
    // No password change requested — drop the key entirely so Drizzle doesn't
    // overwrite the existing hash with an undefined value.
    delete updates.password;
  }

  // update the admin data in the database
  const [updatedAdmin] = await db
    .update(admins)
    .set(updates)
    .where(eq(admins.id, id))
    .returning();

  // return public data of the admin to the client
  return toPublicAdmin(updatedAdmin);
}

// ─────────────────────────────────────────────────────────────────────────────
// service to delete admin by id
// verify that the admin exists in the database
// delete the admin from the database
// return public data of the admin to the client
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteAdminByIdService(id: number): Promise<PublicAdmin> {
  // verify that the admin exists in the database
  const [existing] = await db
    .select()
    .from(admins)
    .where(eq(admins.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Admin with id ${id} not found`);
  }

  // delete the admin from the database
  await db.delete(admins).where(eq(admins.id, id));

  // return public data of the admin to the client
  return toPublicAdmin(existing);
}