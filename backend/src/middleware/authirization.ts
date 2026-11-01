import type { Request, Response, NextFunction } from "express";

// ─────────────────────────────────────────────────────────────────────────────
// authorize
// Factory that returns an Express middleware which enforces that req.admin
// holds a permission equal to the given string (or is a super_admin / holds
// full_access, which bypasses all permission checks).
// ─────────────────────────────────────────────────────────────────────────────

export function authorize(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // ── Step 1: Ensure the request was authenticated first ───────────────
    if (!req.admin) {
      res
        .status(401)
        .json({ success: false, errors: ["Not authenticated"] });
      return;
    }

    const { type, permissions } = req.admin;

    // ── Step 2: Super admins bypass all permission checks ────────────────
    if (type === "super_admin") {
      next();
      return;
    }

    // ── Step 3: full_access grants everything ────────────────────────────
    if (permissions.includes("full_access")) {
      next();
      return;
    }

    // ── Step 4: Specific permission check ────────────────────────────────
    if (permissions.includes(permission as (typeof permissions)[number])) {
      next();
      return;
    }

    // ── Step 5: Deny ─────────────────────────────────────────────────────
    res
      .status(403)
      .json({ success: false, errors: ["Insufficient permissions"] });
  };
}
