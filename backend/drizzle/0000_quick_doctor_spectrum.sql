CREATE TYPE "public"."admin_permission" AS ENUM('product_read', 'product_delete', 'product_add', 'product_update', 'category_read', 'category_delete', 'category_add', 'category_update', 'order_read', 'order_delete', 'order_add', 'order_update', 'coupon_read', 'coupon_delete', 'coupon_add', 'coupon_update', 'shipping_read', 'shipping_delete', 'shipping_add', 'shipping_update', 'shipping_company_read', 'shipping_company_delete', 'shipping_company_add', 'shipping_company_update', 'full_access');--> statement-breakpoint
CREATE TYPE "public"."admin_type" AS ENUM('super_admin', 'regular_admin');--> statement-breakpoint
CREATE TYPE "public"."clothing_size" AS ENUM('34', '36', '38', '40', '42', '44', '46', '48');--> statement-breakpoint
CREATE TYPE "public"."coupon_status" AS ENUM('active', 'inactive', 'expired');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('confirmed', 'pending', 'canceled', 'returned', 'shipped');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"phone_number" text NOT NULL,
	"permissions" "admin_permission"[] DEFAULT '{}' NOT NULL,
	"type" "admin_type" DEFAULT 'regular_admin' NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"wilaya_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"expire_date" date NOT NULL,
	"status" "coupon_status" DEFAULT 'active' NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone_number" text NOT NULL,
	"wilaya_code" text NOT NULL,
	"commune_id" integer NOT NULL,
	"shipping_company_id" integer NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"products" jsonb NOT NULL,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"hour" time DEFAULT LOCALTIME NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	CONSTRAINT "orders_total_non_negative" CHECK ("orders"."total" >= 0),
	CONSTRAINT "orders_products_non_empty" CHECK (CASE WHEN jsonb_typeof("orders"."products") = 'array' THEN jsonb_array_length("orders"."products") > 0 ELSE false END)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"colors" text[] DEFAULT '{}' NOT NULL,
	"sizes" "clothing_size"[] DEFAULT '{}' NOT NULL,
	"promo" numeric(12, 2),
	"category_id" integer NOT NULL,
	CONSTRAINT "products_price_non_negative" CHECK ("products"."price" >= 0),
	CONSTRAINT "products_promo_valid" CHECK ("products"."promo" IS NULL OR ("products"."promo" >= 0 AND "products"."promo" <= "products"."price"))
);
--> statement-breakpoint
CREATE TABLE "shipping_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hashed_api_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"wilaya_code" text NOT NULL,
	"shipping_company_id" integer NOT NULL,
	CONSTRAINT "shipping_prices_company_wilaya_unique" UNIQUE("shipping_company_id","wilaya_code"),
	CONSTRAINT "shipping_prices_price_non_negative" CHECK ("shipping_prices"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wilayas" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communes" ADD CONSTRAINT "communes_wilaya_id_wilayas_code_fk" FOREIGN KEY ("wilaya_id") REFERENCES "public"."wilayas"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_wilaya_code_wilayas_code_fk" FOREIGN KEY ("wilaya_code") REFERENCES "public"."wilayas"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_commune_id_communes_id_fk" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_company_id_shipping_companies_id_fk" FOREIGN KEY ("shipping_company_id") REFERENCES "public"."shipping_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_prices" ADD CONSTRAINT "shipping_prices_wilaya_code_wilayas_code_fk" FOREIGN KEY ("wilaya_code") REFERENCES "public"."wilayas"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_prices" ADD CONSTRAINT "shipping_prices_shipping_company_id_shipping_companies_id_fk" FOREIGN KEY ("shipping_company_id") REFERENCES "public"."shipping_companies"("id") ON DELETE no action ON UPDATE no action;