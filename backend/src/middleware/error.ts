import type { ErrorRequestHandler } from "express";

// ─────────────────────────────────────────────────────────────────────────────
// AppError
// A typed Error subclass that carries an HTTP status code.
// Throw or pass one to next() anywhere in the app to get a precise,
// production-safe HTTP response without leaking internal details.
//
// Usage:
//   throw new AppError(404, "Product not found");
//   next(new AppError(403, "Insufficient permissions"));
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
    // Restore the prototype chain so `instanceof AppError` works after
    // TypeScript compiles to ES5.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createHttpError
// Lightweight factory for one-off operational errors (4xx) that don't need a
// full class instance – mirrors the local helper previously in auth.controller.
//
// Usage:
//   next(createHttpError(401, "Invalid credentials"));
// ─────────────────────────────────────────────────────────────────────────────

export function createHttpError(
  status: number,
  message: string
): AppError {
  return new AppError(status, message);
}

// ─────────────────────────────────────────────────────────────────────────────
// isClientError
// Returns true for any error whose status falls in the 4xx range.
// Used by the handler below to decide whether to echo the message back.
// ─────────────────────────────────────────────────────────────────────────────

function isClientError(status: unknown): status is number {
  return (
    typeof status === "number" &&
    Number.isInteger(status) &&
    status >= 400 &&
    status < 500
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// errorHandler  (global Express error-handling middleware)
// Must be registered AFTER all routes with app.use(errorHandler).
// Express recognises it as an error handler because it declares 4 parameters.
//
// Behaviour:
//  • 4xx errors  → reply with the error's own message so the client knows what
//                  went wrong (validation failure, bad credentials, etc.)
//  • 5xx errors  → reply with a generic "Internal server error" so internal
//                  details (stack traces, SQL, etc.) never reach the client.
//  • Headers already sent → delegate to Express's built-in bail-out handler.
//  • Always logs the full error server-side for debugging / monitoring.
// ─────────────────────────────────────────────────────────────────────────────

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next
) => {
  // ── Guard: if the response is already streaming, hand off to Express ──────
  if (res.headersSent) {
    next(error);
    return;
  }

  // ── Log every error server-side (swap console.error for a real logger) ────
  console.error(error);

  // ── Resolve HTTP status code ──────────────────────────────────────────────
  const rawStatus =
    error instanceof AppError
      ? error.status
      : typeof error === "object" && error !== null && "status" in error
        ? (error as { status: unknown }).status
        : undefined;

  const status = isClientError(rawStatus) ? rawStatus : 500;

  // ── Resolve response message ──────────────────────────────────────────────
  // For client errors (4xx) we echo the message so the caller knows what was
  // wrong.  For server errors (5xx) we hide the details.
  const message =
    status < 500 && error instanceof Error
      ? error.message
      : "Internal server error";

  res.status(status).json({ success: false, errors: [message] });
};
