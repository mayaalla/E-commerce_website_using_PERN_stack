import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import type { Response } from "express";
import env from "../config/env.js";
import redis from "./redis.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenPayload {
  sub: number; // admin id
}

export interface DecodedToken extends Omit<JwtPayload, "sub"> {
  sub: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers – parse duration string ("15m", "7d", …) into seconds
// ─────────────────────────────────────────────────────────────────────────────

const UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3_600,
  d: 86_400,
};

function durationToSeconds(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  const multiplier = UNIT_TO_SECONDS[unit];

  if (!multiplier || isNaN(value) || value <= 0) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }

  return value * multiplier;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types – Redis stored values
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of the refresh-token record stored in Redis.
 *
 * - `token`   – the raw signed JWT refresh token string.
 * - `revoked` – when `true` the token must be rejected even if the JWT
 *               signature and expiry are still valid.  Defaults to `false`.
 */
export interface StoredRefreshToken {
  token: string;
  revoked: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis key helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Redis key that stores the refresh token record for a given admin.
 * Pattern:  refresh_token:<adminId>
 */
function refreshTokenKey(adminId: number): string {
  return `refresh_token:${adminId}`;
}

/**
 * Redis key used to block a specific access token after logout.
 * Pattern:  blocked_access_token:<jti>
 *
 * We use the raw token string as the identifier so the middleware can look it
 * up in O(1) without re-parsing it.  The key is given a TTL equal to the
 * remaining lifetime of the access token so it is cleaned up automatically.
 */
function blockedAccessTokenKey(token: string): string {
  return `blocked_access_token:${token}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token creation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a signed JWT access token.
 *
 * The access token is a **short-lived Bearer token** (default: 15 m) that is
 * returned in the JSON response body and stored in memory on the client.
 */
export function signAccessToken(adminId: number): string {
  const payload: TokenPayload = { sub: adminId };

  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

/**
 * Creates a signed JWT refresh token.
 *
 * The refresh token is a **long-lived token** (default: 7 d) that is stored in
 * an HTTP-only cookie and in Redis so it can be revoked server-side.
 */
export function signRefreshToken(adminId: number): string {
  const payload: TokenPayload = { sub: adminId };

  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// Token verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies the access token signature and expiry.
 *
 * @returns The decoded `adminId` (`sub` claim) on success, or `null` if the
 *          token is invalid, expired, or malformed.
 */
export function verifyAccessToken(token: string): number | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as DecodedToken;
    return decoded.sub;
  } catch {
    return null;
  }
}

/**
 * Verifies the refresh token signature and expiry.
 *
 * @returns The decoded `adminId` (`sub` claim) on success, or `null` if the
 *          token is invalid, expired, or malformed.
 */
export function verifyRefreshToken(token: string): number | null {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as unknown as DecodedToken;
    return decoded.sub;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis – refresh token persistence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists the refresh token in Redis as a {@link StoredRefreshToken} record
 * with a TTL that matches the token's own expiry so the entry is cleaned up
 * automatically.
 *
 * The record is stored as JSON so extra fields (e.g. `revoked`) can be updated
 * in place without re-issuing the token.
 */
export async function saveRefreshTokenToRedis(
  adminId: number,
  refreshToken: string
): Promise<void> {
  const ttlSeconds = durationToSeconds(env.JWT_REFRESH_EXPIRES_IN);
  const record: StoredRefreshToken = { token: refreshToken, revoked: false };
  await redis.set(refreshTokenKey(adminId), JSON.stringify(record), {
    ex: ttlSeconds,
  });
}

/**
 * Retrieves the stored {@link StoredRefreshToken} record for the given admin
 * from Redis.
 *
 * @returns The parsed record, or `null` if no entry exists.
 */
export async function getRefreshTokenFromRedis(
  adminId: number
): Promise<StoredRefreshToken | null> {
  // Upstash Redis automatically deserializes JSON values, so the value comes
  // back as a plain object — NOT a string.  Using redis.get<StoredRefreshToken>
  // gets the correct type and skips the JSON.parse() that was crashing with
  // "SyntaxError: [object Object] is not valid JSON".
  const record = await redis.get<StoredRefreshToken>(refreshTokenKey(adminId));
  return record ?? null;
}

/**
 * Marks the stored refresh token for the given admin as **revoked** in Redis.
 *
 * After calling this function the token remains in Redis (for audit / TTL
 * clean-up purposes) but the `revoked` flag is set to `true`.  Any middleware
 * that checks the token must reject it even if the JWT signature is still valid.
 *
 * If no token record exists for the admin this function is a no-op.
 */
export async function revokeRefreshTokenInRedis(adminId: number): Promise<void> {
  const record = await getRefreshTokenFromRedis(adminId);
  if (!record) return;

  const revoked: StoredRefreshToken = { ...record, revoked: true };

  // Preserve the remaining TTL so Redis still auto-cleans the key.
  const remainingTtl = await redis.ttl(refreshTokenKey(adminId));
  const ttlOption = remainingTtl > 0 ? { ex: remainingTtl } : {};

  await redis.set(refreshTokenKey(adminId), JSON.stringify(revoked), ttlOption);
}

/**
 * Removes the refresh token from Redis, effectively revoking the session.
 * Call this on logout or when rotating tokens.
 */
export async function deleteRefreshTokenFromRedis(
  adminId: number
): Promise<void> {
  await redis.del(refreshTokenKey(adminId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis – access token block-list (logout invalidation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds an access token to the Redis **block-list** so it cannot be reused
 * after the user has logged out.
 *
 * How it works:
 * - The token is decoded (without verifying) to read its `exp` claim.
 * - A Redis key scoped to the token is written with a TTL equal to the token's
 *   remaining lifetime, so the entry is garbage-collected automatically once
 *   the token would have expired naturally.
 * - On every authenticated request the middleware should call
 *   {@link isAccessTokenBlocked} and reject `401` if it returns `true`.
 *
 * @param accessToken - The raw signed JWT access token to block.
 * @throws If the token cannot be decoded or has no `exp` claim.
 */
export async function blockAccessTokenInRedis(accessToken: string): Promise<void> {
  const decoded = jwt.decode(accessToken) as JwtPayload | null;

  if (!decoded?.exp) {
    throw new Error("Cannot block access token: missing or undecodable exp claim.");
  }

  const nowSeconds = Math.floor(Date.now() / 1_000);
  const remainingTtl = decoded.exp - nowSeconds;

  // Token already expired – nothing to block.
  if (remainingTtl <= 0) return;

  await redis.set(blockedAccessTokenKey(accessToken), "1", { ex: remainingTtl });
}

/**
 * Checks whether an access token has been added to the Redis block-list.
 *
 * @returns `true` if the token is blocked (i.e. the user has logged out and
 *          this token must not be accepted), `false` otherwise.
 */
export async function isAccessTokenBlocked(accessToken: string): Promise<boolean> {
  const value = await redis.get<string>(blockedAccessTokenKey(accessToken));
  return value !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cookie – set / clear refresh token
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Writes the refresh token into a secure HTTP-only cookie on the response.
 *
 * Cookie attributes:
 * - `httpOnly`  – not accessible via JS (XSS protection)
 * - `secure`    – HTTPS-only in production
 * - `sameSite`  – `"strict"` to prevent CSRF
 * - `maxAge`    – mirrors the token TTL so the browser auto-expires it
 * - `path`      – scoped to `/api/auth` to minimise exposure
 */
export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  const maxAgeMs = durationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1_000;

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: maxAgeMs,
    path: "/api/auth",
  });
}

/**
 * Clears the refresh token cookie, effectively logging the client out.
 * Must use identical `path` and security options as `setRefreshTokenCookie`.
 */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
}
