import type { MeResponse } from "./types";

export type AdminProfile = MeResponse["data"];

export type ProtectedPage =
  | "dashboard"
  | "products"
  | "categories"
  | "orders"
  | "coupons"
  | "shippings"
  | "shippingPrices"
  | "wilaya"
  | "commune"
  | "admins";

const PAGE_PERMISSIONS: Record<Exclude<ProtectedPage, "dashboard">, readonly string[]> = {
  products: ["product_read", "product_add", "product_update", "product_delete"],
  categories: ["category_read", "category_add", "category_update", "category_delete"],
  orders: ["order_read", "order_add", "order_update", "order_delete"],
  coupons: ["coupon_read", "coupon_add", "coupon_update", "coupon_delete"],
  shippings: [
    "shipping_read",
    "shipping_add",
    "shipping_update",
    "shipping_delete",
    "shipping_company_read",
    "shipping_company_add",
    "shipping_company_update",
    "shipping_company_delete",
  ],
  shippingPrices: ["shipping_read", "shipping_add", "shipping_update", "shipping_delete"],
  wilaya: ["full_access"],
  commune: ["full_access"],
  // Only super_admins or full_access holders may manage other admins.
  admins: ["full_access"],
};

export function canAccessPage(
  admin: AdminProfile | null | undefined,
  page: ProtectedPage,
): boolean {
  if (!admin) return false;
  if (admin.type === "super_admin" || admin.permissions.includes("full_access")) return true;

  // The dashboard is an overview of the resources this admin can manage.
  if (page === "dashboard") return admin.permissions.length > 0;

  return PAGE_PERMISSIONS[page].some((permission) => admin.permissions.includes(permission));
}
