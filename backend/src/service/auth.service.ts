// import token tools from utils folder
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  saveRefreshTokenToRedis,
  getRefreshTokenFromRedis,
  deleteRefreshTokenFromRedis,
  revokeRefreshTokenInRedis,
  blockAccessTokenInRedis,
} from "../utils/token.js";

// import password tools from utils folder
import { comparePassword } from "../utils/password.js";

import { db } from "../db/db.js";
import { admins } from "../db/schema.js";
import { eq } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// create service to login
// ─────────────────────────────────────────────────────────────────────────────

// login service
export async function loginService(
  username: string,
  password: string
): Promise<AuthTokens> {
  // verify that the user exists in the database
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1);

  if (!admin) {
    throw new Error("Invalid credentials");
  }

  // verify that the password is correct
  const isPasswordValid = await comparePassword(password, admin.password);

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  // create access token and refresh token
  const accessToken = signAccessToken(admin.id);
  const refreshToken = signRefreshToken(admin.id);

  // store the refresh token in the redis database
  await saveRefreshTokenToRedis(admin.id, refreshToken);

  return { accessToken, refreshToken };
}

// ─────────────────────────────────────────────────────────────────────────────
// create service to logout
// ─────────────────────────────────────────────────────────────────────────────

export async function logoutService(
  adminId: number,
  accessToken: string
): Promise<void> {
  // delete the refresh token from the redis database
  await deleteRefreshTokenFromRedis(adminId);

  // add access token to the blacklist in the redis database
  await blockAccessTokenInRedis(accessToken);
}

// ─────────────────────────────────────────────────────────────────────────────
// create service to refresh token
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshTokenService(
  oldRefreshToken: string
): Promise<AuthTokens> {
  // verify that the refresh token is valid
  const adminId = verifyRefreshToken(oldRefreshToken);

  if (!adminId) {
    throw new Error("Invalid or expired refresh token");
  }

  // verify that the refresh token exists in the redis database
  const stored = await getRefreshTokenFromRedis(adminId);

  if (!stored || stored.token !== oldRefreshToken || stored.revoked) {
    throw new Error("Refresh token not found or already revoked");
  }

  // create new access token and refresh token
  const accessToken = signAccessToken(adminId);
  const refreshToken = signRefreshToken(adminId);

  // make the old refrech token revoked to true in the redis database
  await revokeRefreshTokenInRedis(adminId);

  // store the new refresh token in the redis database
  await saveRefreshTokenToRedis(adminId, refreshToken);

  return { accessToken, refreshToken };
}

