import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  unique,
} from "drizzle-orm/pg-core";

export const adminType = pgEnum("admin_type", ["super_admin", "regular_admin"]);

export const adminPermission = pgEnum("admin_permission", [
  "product_read",
  "product_delete",
  "product_add",
  "product_update",
  "category_read",
  "category_delete",
  "category_add",
  "category_update",
  "order_read",
  "order_delete",
  "order_add",
  "order_update",
  "coupon_read",
  "coupon_delete",
  "coupon_add",
  "coupon_update",
  "shipping_read",
  "shipping_delete",
  "shipping_add",
  "shipping_update",
  "shipping_company_read",
  "shipping_company_delete",
  "shipping_company_add",
  "shipping_company_update",
  "full_access",
]);

export const clothingSize = pgEnum("clothing_size", [
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
]);

export const couponStatus = pgEnum("coupon_status", [
  "active",
  "inactive",
  "expired",
]);

export const orderStatus = pgEnum("order_status", [
  "confirmed",
  "pending",
  "canceled",
  // A COD order that the customer did not collect.
  "returned",
  "shipped",
]);

export const shippingCompanyStatus = pgEnum("shipping_company_status", [
  "active",
  "inactive",
]);

export const shippingWilayaStatus = pgEnum("shipping_wilaya_status", [
  "active",
  "inactive",
]);

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  // Store a password hash here, never a plain-text password.
  password: text("password").notNull(),
  phoneNumber: text("phone_number").notNull(),
  permissions: adminPermission("permissions").array().notNull().default([]),
  type: adminType("type").notNull().default("regular_admin"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  deletedAt: date("deleted_at"), // Soft delete timestamp, null if not deleted
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    images: text("images").array().notNull().default([]),
    colors: text("colors").array().notNull().default([]),
    sizes: clothingSize("sizes").array().notNull().default([]),
    // Optional discounted price, in the same currency as price.
    promo: numeric("promo", { precision: 12, scale: 2 }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    deletedAt: date("deleted_at"), // Soft delete timestamp, null if not deleted
  },
  (table) => [
    check("products_price_non_negative", sql`${table.price} >= 0`),
    check(
      "products_promo_valid",
      sql`${table.promo} IS NULL OR (${table.promo} >= 0 AND ${table.promo} <= ${table.price})`,
    ),
  ],
);

export const shippingCompanies = pgTable("shipping_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hashedApiKey: text("hashed_api_key").notNull(),
  status: shippingCompanyStatus("status").notNull().default("active"),
  deletedAt: date("deleted_at"), // Soft delete timestamp, null if not deleted
});

export const wilayas = pgTable("wilayas", {
  // Text preserves leading zeros in codes such as "01".
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});

export const shippingPrices = pgTable(
  "shipping_prices",
  {
    id: serial("id").primaryKey(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    wilayaCode: text("wilaya_code")
      .notNull()
      .references(() => wilayas.code),
    shippingCompanyId: integer("shipping_company_id")
      .notNull()
      .references(() => shippingCompanies.id),
    status: shippingWilayaStatus("status").notNull().default("active"),

  },
  (table) => [
    unique("shipping_prices_company_wilaya_unique").on(
      table.shippingCompanyId,
      table.wilayaCode,
    ),
    check("shipping_prices_price_non_negative", sql`${table.price} >= 0`),
  ],
);

export const communes = pgTable("communes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // The wilaya code is its primary key.
  wilayaId: text("wilaya_id")
    .notNull()
    .references(() => wilayas.code),
});

export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    expireDate: date("expire_date").notNull(),
    status: couponStatus("status").notNull().default("active"),
    discountPercentage: integer("discount_percentage").notNull(),
  },
  (table) => [
    check(
      "coupons_discount_percentage_valid",
      sql`${table.discountPercentage} >= 0 AND ${table.discountPercentage} <= 100`
    ),
  ]
);

// Snapshot the purchased items so product edits do not change past orders.
// Monetary values are decimal strings, matching Drizzle's numeric columns.
export type OrderProduct = {
  productId: number;
  title: string;
  quantity: number;
  price: string;
  color?: string;
  size?: string;
};

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phoneNumber: text("phone_number").notNull(),
    wilayaCode: text("wilaya_code")
      .notNull()
      .references(() => wilayas.code),
    communeId: integer("commune_id")
      .notNull()
      .references(() => communes.id),
    shippingCompanyId: integer("shipping_company_id")
      .notNull()
      .references(() => shippingCompanies.id),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    products: jsonb("products").$type<OrderProduct[]>().notNull(),
    date: date("date").notNull().default(sql`CURRENT_DATE`),
    hour: time("hour").notNull().default(sql`LOCALTIME`),
    status: orderStatus("status").notNull().default("pending"),
    deletedAt: date("deleted_at"), // Soft delete timestamp, null if not deleted
  },
  (table) => [
    check("orders_total_non_negative", sql`${table.total} >= 0`),
    check(
      "orders_products_non_empty",
      sql`CASE WHEN jsonb_typeof(${table.products}) = 'array' THEN jsonb_array_length(${table.products}) > 0 ELSE false END`,
    ),
  ],
);
