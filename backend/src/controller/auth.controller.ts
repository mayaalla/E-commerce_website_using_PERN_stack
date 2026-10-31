import type { Request, Response, NextFunction } from "express";
import {
  loginService,
  logoutService,
  refreshTokenService,
} from "../service/auth.service.js";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/token.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps a well-known service error message in an object that carries an HTTP
 * status code so the global error handler in app.ts can pick it up.
 */
function createHttpError(status: number, message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticates an admin with username + password.
 *
 * On success:
 *  - Sets the refresh token in a secure HTTP-only cookie.
 *  - Returns the access token in the JSON body (stored in memory on the client).
 *
 * The request body is already validated by `validateAdminLogin` middleware
 * before this handler is reached.
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { username, password } = req.body as {
      username: string;
      password: string;
    };

    const { accessToken, refreshToken } = await loginService(username, password);

    // Persist the refresh token in a secure HTTP-only cookie so the JS layer
    // never has direct access to it (XSS protection).
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    // loginService throws a generic "Invalid credentials" for both "not found"
    // and "wrong password" cases – keep it 401 and never leak which one failed.
    if (error instanceof Error && error.message === "Invalid credentials") {
      return next(createHttpError(401, "Invalid credentials"));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logs the currently authenticated admin out.
 *
 * - Deletes the refresh token from Redis.
 * - Adds the access token to the Redis block-list so it cannot be reused.
 * - Clears the refresh token cookie from the client.
 *
 * Requires the `authenticate` middleware to run first so that `req.adminId`
 * and `req.accessToken` are populated.
 */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = (req as Request & { adminId: number }).adminId;
    const accessToken = (req as Request & { accessToken: string }).accessToken;

    await logoutService(adminId, accessToken);

    // Remove the cookie from the browser.
    clearRefreshTokenCookie(res);

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh-token
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Issues a new access token + refresh token pair using the refresh token stored
 * in the HTTP-only cookie (token rotation).
 *
 * - Old refresh token is revoked in Redis immediately after reading.
 * - New refresh token replaces the cookie.
 * - New access token is returned in the JSON body.
 */
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const oldRefreshToken: string | undefined = req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      return next(createHttpError(401, "Refresh token not provided"));
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await refreshTokenService(oldRefreshToken);

    // Rotate the cookie with the new refresh token.
    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Invalid or expired refresh token" ||
        error.message === "Refresh token not found or already revoked")
    ) {
      // Clear the stale cookie so the client does not keep sending it.
      clearRefreshTokenCookie(res);
      return next(createHttpError(401, error.message));
    }
    next(error);
  }
}
