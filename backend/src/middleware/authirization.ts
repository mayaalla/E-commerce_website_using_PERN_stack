import type { Request, Response, NextFunction } from "express";
import { adminPermission } from "../db/schema.js";

type AdminPermission = (typeof adminPermission.enumValues)[number];

const actionsThatGrantRead = ["add", "update", "delete"] as const;

// product adding requires category reading, so if the user for exmaple has product add permission
// but not category read permission so the category read permission will be allowed for product add permission.
// so if the user has product add the catgeory read is allowed, so we check it for the read permissions.



// for each module, what modules i need to make a POST req (add).
// ex : When the product form requests category data, the backend checks whether the admin can read categories. 
// It sees product_add and allows that request because adding a product needs a category choice.
const readPermissionDependencies: Partial<
  Record<AdminPermission, readonly AdminPermission[]>
> = {
  product_add: ["category_read"], // ex: adding product depends on reading categories.
  commune_add: ["wilaya_read"],
  shipping_add: ["shipping_company_read", "wilaya_read"],
  order_add: [
    "product_read",
    "wilaya_read",
    "commune_read",
    "shipping_company_read",
    "shipping_read",
    "coupon_read",
  ],
};

function hasPermission(
  permissions: readonly AdminPermission[],
  requiredPermission: AdminPermission,
): boolean {
  if (permissions.includes(requiredPermission)) {
    return true; /// if it already has the required permission, return true
  }

  // we check if the permissions we need is a read is read permissions.
  if (!requiredPermission.endsWith("_read")) {
    return false;
  }

  const resource = requiredPermission.slice(0, -"_read".length);


  const canReadSameResource = actionsThatGrantRead.some((action) => {

   // check if it has update, add, delete permissions for the same resource, if it has any of them it can read the resource.
    const impliedPermission = adminPermission.enumValues.find(
      (permission) => permission === `${resource}_${action}`, 
    );

    return impliedPermission !== undefined && permissions.includes(impliedPermission);
  });

  if (canReadSameResource) {
    return true;
  }

  // check if admin permissions have any of the dependencies for the required permission, if it has any of them it can read the resource.
  return permissions.some((permission) =>
    // ex if order  add has product read as dependency, if the admin has order add permission, it can read products.
    readPermissionDependencies[permission]?.includes(requiredPermission),


  );
}

// ─────────────────────────────────────────────────────────────────────────────
// authorize
// Factory that returns middleware which checks req.admin's permission. For a
// *_read check, matching write permissions and configured module dependencies
// also grant access. super_admin and full_access bypass these checks.
// ─────────────────────────────────────────────────────────────────────────────

export function authorize(permission: AdminPermission | readonly AdminPermission[]) {
  const requiredPermissions =
    typeof permission === "string" ? [permission] : permission;

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
    if (requiredPermissions.some((requiredPermission) =>
      hasPermission(permissions, requiredPermission)
    )) {
      next();
      return;
    }

    // ── Step 5: Deny ─────────────────────────────────────────────────────
    res
      .status(403)
      .json({ success: false, errors: ["Insufficient permissions"] });
  };
}





