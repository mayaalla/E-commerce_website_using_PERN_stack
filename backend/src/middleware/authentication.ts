import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";

import { verifyAccessToken, isAccessTokenBlocked } from "../utils/token.js";
import { db } from "../db/db.js";
import { admins } from "../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Express type augmentation
// Adds `admin` to every Request object so downstream middleware and controllers
// can read it without casting.
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      admin?: typeof import("../db/schema.js").admins.$inferSelect;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// authenticate
// Reads the Authorization header, verifies the JWT access token, checks it has
// not been revoked (block-list), fetches the matching admin row, and attaches
// it to req.admin before calling next().
// Rejects with 401 on any failure.
// ─────────────────────────────────────────────────────────────────────────────

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // ── Step 1: Extract token from Authorization header ──────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, errors: ["No token provided"] });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  // ── Step 2: Verify JWT signature + expiry ────────────────────────────────
  const adminId = verifyAccessToken(token);

  if (adminId === null) {
    res
      .status(401)
      .json({ success: false, errors: ["Invalid or expired token"] });
    return;
  }

  // ── Step 3: Check block-list (post-logout revocation) ────────────────────
  const blocked = await isAccessTokenBlocked(token);

  if (blocked) {
    res
      .status(401)
      .json({ success: false, errors: ["Token has been revoked"] });
    return;
  }

  // ── Step 4: Fetch the admin from the database ─────────────────────────────
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  if (!admin) {
    res.status(401).json({ success: false, errors: ["Admin not found"] });
    return;
  }

  // ── Step 5: Attach to request and continue ───────────────────────────────
  req.admin = admin;
  next();
}
