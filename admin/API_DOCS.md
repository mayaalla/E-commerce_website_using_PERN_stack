# E-Commerce Backend — API Documentation

> **Base URL:** `http://localhost:5000/api`  
> **Content-Type:** `application/json` (all requests & responses)  
> **Rate Limit:** 100 requests / 15 minutes (global). Upload endpoint: 10 requests / 15 minutes.  
> **Auth:** JWT — include `Authorization: Bearer <accessToken>` header on protected routes.  
> Refresh token is stored in a secure **HTTP-only cookie** (`refreshToken`).

---

## Table of Contents

1. [Common Patterns](#common-patterns)
2. [Middleware](#middleware)
3. [Auth](#auth)
4. [Admins](#admins)
5. [Categories](#categories)
6. [Products](#products)
7. [Wilayas](#wilayas)
8. [Communes](#communes)
9. [Shipping](#shipping)
10. [Coupons](#coupons)
11. [Orders](#orders)
12. [Health Check](#health-check)
13. [Frontend Integration — Products](#frontend-integration--products)
14. [Frontend Integration — Orders](#frontend-integration--orders)

---

## Common Patterns

### Success Response

```json
{ "success": true, "data": { ... } }
```

### Validation Error (400)

```json
{
  "success": false,
  "errors": ["field: message", "other.field: message"]
}
```

### Generic Error (4xx / 500)

```json
{ "message": "Human-readable error message" }
```

### Enums Reference

| Enum | Values |
|---|---|
| `adminType` | `super_admin`, `regular_admin` |
| `adminPermission` | `product_read`, `product_add`, `product_update`, `product_delete`, `category_read`, `category_add`, `category_update`, `category_delete`, `commune_read`, `commune_add`, `commune_update`, `commune_delete`, `order_read`, `order_add`, `order_update`, `order_delete`, `coupon_read`, `coupon_add`, `coupon_update`, `coupon_delete`, `shipping_read`, `shipping_add`, `shipping_update`, `shipping_delete`, `shipping_company_read`, `shipping_company_add`, `shipping_company_update`, `shipping_company_delete`, `wilaya_read`, `wilaya_add`, `wilaya_update`, `wilaya_delete`, `full_access` |
| `clothingSize` | `34`, `36`, `38`, `40`, `42`, `44`, `46`, `48` |
| `orderStatus` | `confirmed`, `pending`, `canceled`, `returned`, `delivered` |
| `couponStatus` | `active`, `inactive`, `expired` |
| `shippingCompanyStatus` | `active`, `inactive` |
| `shippingWilayaStatus` | `active`, `inactive` |

---

## Middleware

These three middleware modules sit between the router and every controller. They are imported and composed in each route file.

---

### `authenticate`

**File:** `backend/src/middleware/authentication.ts`

Verifies the caller's identity on every protected route. Must run **before** `authorize`.

**How it works (in order):**

| Step | Action | Failure response |
|---|---|---|
| 1 | Extract `Authorization: Bearer <token>` header | `401 No token provided` |
| 2 | Verify JWT signature + expiry with `verifyAccessToken()` | `401 Invalid or expired token` |
| 3 | Check the token against the revocation block-list (`isAccessTokenBlocked()`) | `401 Token has been revoked` |
| 4 | Fetch the matching admin row from the database | `401 Admin not found` |
| 5 | Attach the admin record to `req.admin` and call `next()` | — |

**Usage**

```ts
router.post("/logout", authenticate, logoutHandler);
```

> The middleware augments the Express `Request` type globally so `req.admin` is typed as the full admin DB row everywhere downstream.

---

### `authorize(permission | permissions[])`

**File:** `backend/src/middleware/authirization.ts`

Factory that returns a middleware enforcing a specific permission. **Must be placed after `authenticate`** (it reads `req.admin`). Now accepts either a single permission string **or an array of permissions** — granting access when the admin holds **any one** of the listed permissions.

**Permission resolution order:**

| Priority | Condition | Result |
|---|---|---|
| 1 | `req.admin` is missing | `401 Not authenticated` |
| 2 | `req.admin.type === "super_admin"` | ✅ Always allowed |
| 3 | `req.admin.permissions` includes `"full_access"` | ✅ Always allowed |
| 4 | `req.admin.permissions` includes the required `permission` | ✅ Allowed |
| 5 | None of the above | `403 Insufficient permissions` |

**Usage**

```ts
router.post("/products", authenticate, authorize("product_add"), createProductHandler);
router.post("/products/upload/request-tokens", authenticate, authorize(["product_add", "product_update"]), handler);
```

**Permission values** (`adminPermission` enum):

| Value | Grants access to |
|---|---|
| `product_read` | Read/list products |
| `product_add` | Create products & request upload tokens |
| `product_update` | Update products |
| `product_delete` | Delete products |
| `category_read` | Read/list categories |
| `category_add` | Create categories |
| `category_update` | Update categories |
| `category_delete` | Delete categories |
| `commune_read` | Read/list communes |
| `commune_add` | Create communes |
| `commune_update` | Update communes |
| `commune_delete` | Delete communes |
| `order_read` | Read/list orders & stats |
| `order_add` | Create orders |
| `order_update` | Update order status |
| `order_delete` | Soft-delete orders |
| `coupon_read` | Read/list coupons |
| `coupon_add` | Create coupons |
| `coupon_update` | Update coupons |
| `coupon_delete` | Delete coupons |
| `shipping_read` | Read shipping companies and prices |
| `shipping_add` | Create shipping prices |
| `shipping_update` | Update shipping prices |
| `shipping_delete` | Delete shipping prices |
| `shipping_company_read` | Read shipping companies |
| `shipping_company_add` | Create shipping companies |
| `shipping_company_update` | Update shipping companies |
| `shipping_company_delete` | Soft-delete shipping companies |
| `wilaya_read` | Read/list wilayas |
| `wilaya_add` | Create wilayas |
| `wilaya_update` | Update wilayas |
| `wilaya_delete` | Delete wilayas |
| `full_access` | Everything (equivalent to `super_admin`) |

---

### `validate(schema)` — Body Validation

**File:** `backend/src/middleware/validation.ts`

Generic Zod-powered middleware factory. Parses `req.body` against a Zod schema; on success it **replaces `req.body`** with the cleaned/transformed data and calls `next()`. On failure it short-circuits with a `400`.

**Error response shape (400)**

```json
{
  "success": false,
  "errors": ["field: message", "other.field: message"]
}
```

**Usage**

```ts
import { validate } from "../middleware/validation.js";
import { z } from "zod";

const mySchema = z.object({ name: z.string().min(1) });
router.post("/example", validate(mySchema), handler);
```

#### Pre-built body validators

Every route that mutates data uses one of these exported validators (all built on top of `validate()`):

| Exported validator | Route(s) used on |
|---|---|
| `validateAdminLogin` | `POST /auth/login` |
| `validateCreateAdmin` | `POST /admins` |
| `validateUpdateAdmin` | `PUT /admins/:id` |
| `validateCategory` | `POST /categories`, `PUT /categories/:id` |
| `validateCreateProduct` | `POST /products` |
| `validateUpdateProduct` | `PUT /products/:id` |
| `validateRequestUploadTokens` | `POST /products/upload/request-tokens` |
| `validateCreateWilaya` | `POST /wilayas` |
| `validateUpdateWilaya` | `PUT /wilayas/:code` |
| `validateCreateCommune` | `POST /communes` |
| `validateUpdateCommune` | `PUT /communes/:id` |
| `validateCreateShippingCompany` | `POST /shipping/companies` |
| `validateUpdateShippingCompany` | `PUT /shipping/companies/:id` |
| `validateCreateShippingPrice` | `POST /shipping/prices` |
| `validateUpdateShippingPrice` | `PUT /shipping/prices/:id` |
| `validateCreateCoupon` | `POST /coupons` |
| `validateUpdateCoupon` | `PUT /coupons/:id` |
| `validateCreateOrder` | `POST /orders` — now also accepts optional `colorHex` per product item |
| `validateUpdateOrderStatus` | `PATCH /orders/:id/status` |
| `validateUpdateOrderInformation` | `PATCH /orders/:id` — validates name, phoneNumber, wilayaCode, communeId |
| `validateProductQuery` | `GET /products` — validates pagination, search, filters and sort query params |
| `validateOrderQuery` | `GET /orders` — validates pagination, search, filters and sort query params |

#### URL parameter validators

Two additional middleware factories validate URL params instead of the body:

| Factory | Default param | Validates |
|---|---|---|
| `validateId(paramName?)` | `"id"` | Positive integer (e.g. `/admins/:id`) |
| `validateWilayaCode(paramName?)` | `"code"` | Exactly 2 digits (e.g. `/wilayas/:code`) |

Both respond with `400 { success: false, errors: ["<param>: must be ..."] }` on failure.

---

## Auth

### POST `/auth/login`

Authenticate an admin and receive a JWT access token.

**Request Body**

```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response `200`**

```json
{
  "success": true,
  "accessToken": "eyJhbGc..."
}
```

> The refresh token is set automatically in an HTTP-only cookie named `refreshToken`.

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error |
| `401` | `Invalid credentials` |

---

### POST `/auth/logout`

Log out the current admin. Revokes both tokens.

> 🔒 Requires: `authenticate` middleware (send the `Authorization: Bearer <token>` header).

**Response `200`**

```json
{ "success": true, "message": "Logged out successfully" }
```

---

### GET `/auth/me`

Return the profile of the currently authenticated admin.

> 🔒 Requires: `Authorization: Bearer <accessToken>` header.

**Request** — no body, no params, no query string.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin1",
    "phoneNumber": "0555000000",
    "permissions": ["product_add", "order_read"],
    "type": "regular_admin"
  }
}
```

> ⚠️ `password` is never returned.

**Errors**

| Status | Message |
|---|---|
| `401` | `No token provided` |
| `401` | `Invalid or expired token` |
| `401` | `Token has been revoked` |
| `401` | `Admin not found` |
| `401` | `Unauthorized` |

---

### POST `/auth/refresh-token`

Rotate the refresh token and get a new access token. Reads `refreshToken` from the HTTP-only cookie.

**Response `200`**

```json
{
  "success": true,
  "accessToken": "eyJhbGc..."
}
```

**Errors**

| Status | Message |
|---|---|
| `401` | `Refresh token not provided` |
| `401` | `Invalid or expired refresh token` |
| `401` | `Refresh token not found or already revoked` |

---

## Admins

### POST `/admins`

Create a new admin account.

**Request Body**

```json
{
  "username": "string (3–50 chars, no spaces, required)",
  "password": "string (min 8 chars, ≥1 uppercase, ≥1 digit, required)",
  "phoneNumber": "string (10 digits, starts with 0, required)",
  "permissions": ["product_add", "product_update", "order_read"],
  "type": "regular_admin"
}
```

> `permissions` defaults to `[]`. `type` defaults to `regular_admin`.

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin1",
    "phoneNumber": "0555000000",
    "permissions": ["product_add"],
    "type": "regular_admin"
  }
}
```

> ⚠️ `password` is never returned.

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error |
| `409` | `Username is already taken` |

---

### GET `/admins`

Get all admin accounts.

**Response `200`**

```json
{
  "success": true,
  "data": [
    { "id": 1, "username": "admin1", "phoneNumber": "0555000000", "permissions": [], "type": "super_admin" }
  ]
}
```

---

### GET `/admins/:id`

Get a single admin by ID.

**Params:** `id` — positive integer

**Response `200`** — single admin object (same shape as above)

**Errors:** `404` if not found.

---

### PUT `/admins/:id`

Partially update an admin (all body fields are optional).

**Request Body** — same fields as `POST /admins`, all optional.

**Response `200`** — updated admin object.

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error |
| `404` | Not found |
| `409` | `Username is already taken` |

---

### DELETE `/admins/:id`

Delete an admin and return their last snapshot.

**Response `200`** — deleted admin object.

**Errors:** `404` if not found.

---

## Categories

> **UPDATED** — All endpoints now use **soft-delete**. Deleted categories have a `deletedAt` date string set; `null` means active. Soft-deleted categories are hidden from all list/read endpoints and cannot be updated or re-deleted.

### POST `/categories`

**Request Body**

```json
{ "name": "string (required)" }
```

**Response `201`**

```json
{ "success": true, "data": { "id": 1, "name": "Clothing", "deletedAt": null } }
```

**Errors:** `400` validation, `409` duplicate name.

---

### GET `/categories`

**🌐 Public — no authentication required.**

Returns only **active** (non-deleted) categories.

**Response `200`**

```json
{ "success": true, "data": [{ "id": 1, "name": "Clothing", "deletedAt": null }] }
```

---

### GET `/categories/:id`

**🌐 Public — no authentication required.**

**Response `200`** — single active category. **`404`** if not found **or soft-deleted**.

---

### PUT `/categories/:id`

**Request Body:** `{ "name": "string" }`

**Response `200`** — updated category. **`404`** if not found or soft-deleted. **`409`** on name conflict.

---

### DELETE `/categories/:id` ✦ UPDATED

**Behaviour changed:** now performs a **soft-delete** — sets `deletedAt` to today's date. The row is preserved in the database.

**Response `200`** — the category record with `deletedAt` stamped.

```json
{ "success": true, "data": { "id": 1, "name": "Clothing", "deletedAt": "2026-11-09" } }
```

**Errors**

| Status | Message |
|---|---|
| `404` | Not found or already deleted |
| `409` | Category still has products attached (FK constraint) |

---

## Products

> **UPDATED** — All endpoints now use **soft-delete**. Deleted products have a `deletedAt` date string set; `null` means active. Soft-deleted products are hidden from all list/read endpoints, cannot be ordered, and cannot be updated or re-deleted. Products cannot be created under a soft-deleted category.
>
> **NEW** — Products now support per-(colorHex, size) **stock tracking** via the `product_stock` table. Create and update endpoints accept `stockEntries`; create/update responses include a `stock` array. Read/list endpoints return product fields only (stock is not embedded).
>
> **UPDATED** — All `GET` product endpoints (`GET /products`, `GET /products/:id`, `GET /products/by-category/:categoryId`) are now **public — no authentication required**. The product catalog must be browsable without a session.

### POST `/products/upload/request-tokens`

> 🔒 Requires: `authenticate` + `authorize(["product_add", "product_update"])` + upload rate limit (10 req / 15 min)

> **UPDATED:** This endpoint now also grants access to admins with `product_update` permission (not just `product_add`), since updating a product can require uploading replacement images.

Request signed Cloudinary upload tokens before uploading images.

**Request Body**

```json
{
  "files": [
    {
      "fileName": "shirt-red.jpg",
      "mimeType": "image/jpeg",
      "size": 204800
    }
  ]
}
```

> Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.  
> Max file size: **5 MB**. Max files per request: **8**.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "publicId": "products/abc123-uuid",
      "signature": "sha1hexhash",
      "timestamp": 1699876543,
      "apiKey": "699178484225616",
      "cloudName": "dwrdmevki"
    }
  ]
}
```

---

### POST `/products`

> 🔒 Requires: `authenticate` + `authorize("product_add")`

Create a new product. Images must be uploaded via Cloudinary first using the token endpoint above.

**Request Body**

```json
{
  "title": "string (required)",
  "description": "string (required)",
  "price": "number or numeric string (required, ≥0, ≤2 decimals)",
  "colors": ["red", "blue"],
  "sizes": ["38", "40", "42"],
  "promo": "number or numeric string (optional, must be ≤ price)",
  "categoryId": 1,
  "imageUploads": [
    {
      "publicId": "products/abc123",
      "version": 1699876543,
      "signature": "sha1hash"
    }
  ],
  "stockEntries": [
    {
      "colorHex": "FF0000",
      "size": "40",
      "stock": 10
    }
  ]
}
```

> `colors` and `sizes` default to `[]`. `imageUploads` is optional (max 8 entries).  
> `stockEntries` is optional. Each entry defines stock for a specific `(colorHex, size)` pair. `colorHex` is 6 uppercase hex digits **without** the `#` prefix (e.g. `"FF0000"`). `size` must be a valid `clothingSize` enum value. `stock` must be a non-negative integer.  
> **UPDATED:** `categoryId` must reference an **active** (non-soft-deleted) category.

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "title": "Red T-Shirt",
    "description": "100% cotton",
    "price": "299.99",
    "promo": "199.99",
    "images": ["https://res.cloudinary.com/..."],
    "colors": ["red"],
    "sizes": ["38", "40"],
    "categoryId": 1,
    "deletedAt": null,
    "stock": [
      { "id": 1, "productId": 10, "colorHex": "FF0000", "size": "40", "stock": 10 }
    ]
  }
}
```

> `stock` is an array of `product_stock` rows. It is empty (`[]`) when no `stockEntries` were provided.

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error |
| `404` | Category not found or deleted |
| `422` | Promo price exceeds regular price |
| `422` | Upload token verification failed / token not found |
| `422` | Too many images (max 8) |
| `422` | Stock value is negative or `colorHex` format is invalid |

---

### GET `/products`

**🌐 Public — no authentication required.**

List **active** (non-deleted) products with optional search, filters, sorting, and pagination.

**Query Parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | `integer ≥ 1` | `1` | Page number (1-based). |
| `limit` | `integer 1–100` | `20` | Rows per page. |
| `search` | `string (max 200)` | — | Free-text search matched against **title** and **description** (case-insensitive). |
| `categoryId` | `positive integer` | — | Filter by exact category ID. |
| `size` | `clothingSize` | — | Filter to products that include this size in their `sizes` array. Must be one of `34`, `36`, `38`, `40`, `42`, `44`, `46`, `48`. |
| `color` | `string (max 50)` | — | Filter to products whose `colors` array contains a value matching this string (case-insensitive, partial match). |
| `priceMin` | `number ≥ 0` | — | Filter to products with `price ≥ priceMin`. |
| `priceMax` | `number ≥ 0` | — | Filter to products with `price ≤ priceMax`. |
| `hasPromo` | `"true"` \| `"false"` | — | `"true"` → only products with a promo price; `"false"` → only products without. |
| `sortBy` | `id` \| `title` \| `price` \| `promo` \| `categoryId` | `id` | Column to sort by. |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction. |

**Example requests:**
```
GET /api/products?search=shirt&categoryId=2&priceMin=100&priceMax=500&hasPromo=true&sortBy=price&sortOrder=asc&page=1&limit=20
GET /api/products?size=40&color=red&sortBy=title&sortOrder=asc
```

**Response `200`**

```json
{
  "success": true,
  "data": [ { "id": 10, "title": "Red T-Shirt", "..." } ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

> Stock entries are **not** embedded in list responses.

---

### GET `/products/by-category/:categoryId` ✦ UPDATED

**🌐 Public — no authentication required.**

Get all **active** products in a given **active** category.

**Params:** `categoryId` — positive integer

**Response `200`** — array of active product objects.

**Errors:** `404` if category not found **or soft-deleted**.

> **Fix applied:** The query now performs a proper `INNER JOIN` on categories so both `products.deletedAt` and `categories.deletedAt` are correctly filtered. Previously this endpoint would have thrown a runtime SQL error.

---

### GET `/products/:id`

**🌐 Public — no authentication required.**

Get a single **active** product.

**Response `200`** — single product object. **`404`** if not found **or soft-deleted**.

---

### PUT `/products/:id`

> 🔒 Requires: `authenticate` + `authorize("product_update")`

Partially update a product (all fields optional).

**Request Body** — same as `POST /products`, all fields optional. `promo` can additionally be set to `null` to explicitly clear an existing promo price. When `stockEntries` is provided, it **replaces the entire stock grid atomically** (delete-all then re-insert).

**Image management on update ✦ NEW:**

| Field | Type | Description |
|---|---|---|
| `imageUploads` | `array` | Same shape as create, but each entry now accepts an optional `replaceImage` field (a full Cloudinary URL). When present, the new upload replaces that specific existing image in-place. Without `replaceImage`, the upload is appended. |
| `imageRemovals` | `string[]` | Array of full image URLs to remove from the product. Max 8. No duplicates allowed. Applied **before** new uploads are appended. |

> Images are updated atomically: removals are applied first, then replacement uploads are swapped in by position, then any purely-additive uploads are appended. The final image count must not exceed 8.

**`imageUpload` entry shape (on update):**

```json
{
  "publicId": "products/abc123",
  "version": 1699876543,
  "signature": "sha1hash",
  "replaceImage": "https://res.cloudinary.com/.../old-image.jpg"
}
```

> `replaceImage` is optional. When provided it must be a URL that belongs to the product's current `images` array and must not be listed in `imageRemovals`. Omit it to append the new image.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "title": "Red T-Shirt",
    "...",
    "stock": [
      { "id": 1, "productId": 10, "colorHex": "FF0000", "size": "40", "stock": 10 }
    ]
  }
}
```

> `stock` reflects the current stock grid after the update. If `stockEntries` was not sent, the existing stock rows are returned unchanged.

**Errors:** `404` (not found or soft-deleted), `422` (invalid promo).

---

### GET `/products/:id/stock` ✦ NEW

**🌐 Public — no authentication required.**

Query the stock grid for a specific product. Optionally filter by `colorHex` and/or `size` to retrieve a specific cell.

**Params:** `id` — positive integer (the product ID)

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `colorHex` | `string` | ❌ Optional | 6-character hex code without `#` (e.g. `FF0000`). Case-insensitive. Narrows results to this color. |
| `size` | `clothingSize` | ❌ Optional | One of `34`, `36`, `38`, `40`, `42`, `44`, `46`, `48`. Narrows results to this size. |

**Example requests:**
```
GET /api/products/10/stock                           → all stock rows for product 10
GET /api/products/10/stock?colorHex=FF0000           → all sizes for that color
GET /api/products/10/stock?colorHex=FF0000&size=40   → one specific cell
```

**Response `200`**

```json
{
  "success": true,
  "data": [
    { "id": 1, "productId": 10, "colorHex": "FF0000", "size": "40", "stock": 8 },
    { "id": 2, "productId": 10, "colorHex": "FF0000", "size": "42", "stock": 3 }
  ]
}
```

> Returns an empty array `[]` when no matching stock entries exist — not a `404`.

---

### DELETE `/products/:id` ✦ UPDATED

> 🔒 Requires: `authenticate` + `authorize("product_delete")`

**Behaviour changed:** now performs a **soft-delete** — sets `deletedAt` to today's date. The row is preserved in the database.

**Response `200`** — the product record with `deletedAt` stamped.

```json
{
  "success": true,
  "data": {
    "id": 10,
    "title": "Red T-Shirt",
    "deletedAt": "2026-11-09",
    "..."
  }
}
```

**Errors:** `404` if not found or already soft-deleted.

---

### Product Stock Schema

The `product_stock` table tracks available units for every `(product, colorHex, size)` combination. It is managed via the `stockEntries` field on `POST /products` and `PUT /products/:id`.

**`StockEntry` object (used in `stockEntries` arrays):**

| Field | Type | Description |
|---|---|---|
| `colorHex` | `string` | 6 hex digits **without** `#` (e.g. `"FF0000"`). Case-insensitive input; stored as uppercase. |
| `size` | `clothingSize` | One of `"34"`, `"36"`, `"38"`, `"40"`, `"42"`, `"44"`, `"46"`, `"48"`. |
| `stock` | `integer ≥ 0` | Number of units available. |

**`ProductStock` row (returned in `stock` arrays of create/update responses):**

| Field | Type | Description |
|---|---|---|
| `id` | `number` | Auto-generated primary key. |
| `productId` | `number` | FK to the parent product. |
| `colorHex` | `string` | 6 uppercase hex digits without `#`. |
| `size` | `clothingSize` | Clothing size enum value. |
| `stock` | `number` | Available units (always ≥ 0). |

> **Uniqueness:** The `(productId, colorHex, size)` triple is unique. Sending duplicate entries in `stockEntries` will cause a DB-level constraint error.  
> **Replace semantics on update:** When `stockEntries` is provided in `PUT /products/:id`, the entire existing stock grid is deleted and replaced atomically. Omit `stockEntries` to leave the current stock untouched.

---

## Wilayas

Algeria has 58 wilayas identified by a 2-digit code (e.g. `"16"` for Algiers).

> **UPDATED** — `GET /wilayas` and `GET /wilayas/:code` are now **public — no authentication required**. Wilaya data is required by the checkout form and must be accessible without a session.

### POST `/wilayas`

**Request Body**

```json
{
  "code": "16",
  "name": "Alger"
}
```

> `code` must be exactly 2 digits.

**Response `201`**

```json
{ "success": true, "data": { "code": "16", "name": "Alger" } }
```

---

### GET `/wilayas`

**Response `200`** — array of `{ code, name }` objects.

---

### GET `/wilayas/:code`

**Params:** `code` — 2-digit string (e.g. `16`)

**Response `200`** — single wilaya. **`404`** if not found.

---

### PUT `/wilayas/:code`

**Request Body** — `{ "code"?: "string", "name"?: "string" }` (all optional)

**Response `200`** — updated wilaya. **`404`** if not found.

---

### DELETE `/wilayas/:code`

**Response `200`** — deleted wilaya. **`404`** if not found.

---

## Communes

> **UPDATED** — `GET /communes` and `GET /communes/by-wilaya/:code` are now **public — no authentication required**. Commune data is needed by the checkout flow before a customer has an account.

### POST `/communes`

**Request Body**

```json
{
  "name": "Hussein Dey",
  "wilayaId": "16"
}
```

> `wilayaId` is the 2-digit wilaya code.

**Response `201`**

```json
{ "success": true, "data": { "id": 1, "name": "Hussein Dey", "wilayaId": "16" } }
```

---

### GET `/communes`

**🌐 Public — no authentication required.**

**Response `200`** — array of commune objects.

---

### GET `/communes/by-wilaya/:code`

**🌐 Public — no authentication required.**

Get all communes in a wilaya.

**Params:** `code` — 2-digit wilaya code

**Response `200`** — array of commune objects. **`404`** if wilaya not found.

---

### GET `/communes/:id`

**Response `200`** — single commune. **`404`** if not found.

---

### PUT `/communes/:id`

**Request Body** — `{ "name"?: "string", "wilayaId"?: "string" }` (all optional)

**Response `200`** — updated commune. **`404`** if not found.

---

### DELETE `/communes/:id`

**Response `200`** — deleted commune.

**Errors**

| Status | Message |
|---|---|
| `404` | Not found |
| `409` | `Cannot delete a commune that is referenced by existing orders` |

---

## Shipping

### Shipping Companies

> **UPDATED** — Shipping companies now use **soft-delete**. Deleted companies have `deletedAt` set; active ones have `deletedAt: null`. A soft-deleted company name can be **reused** when creating a new company.
>
> **UPDATED** — `GET /shipping/companies`, `GET /shipping/companies/:id`, and `GET /shipping/prices/lookup` are now **public — no authentication required**. These endpoints are needed by the public checkout flow before a customer places an order.

#### POST `/shipping/companies`

**Request Body**

```json
{
  "name": "Yalidine",
  "apiKey": "at-least-16-chars-secret"
}
```

> `apiKey` is hashed before storage and never returned. Min length: 16 chars.

**Response `201`**

```json
{
  "success": true,
  "data": { "id": 1, "name": "Yalidine", "status": "active", "deletedAt": null }
}
```

**Errors:** `409` if an **active** company with the same name already exists.

---

#### GET `/shipping/companies`

**🌐 Public — no authentication required.**

Returns only **active** (non-deleted) shipping companies.

**Response `200`** — array of `{ id, name, status, deletedAt }` objects.

---

#### GET `/shipping/companies/:id`

**🌐 Public — no authentication required.**

**Response `200`** — single active shipping company. **`404`** if not found **or soft-deleted**.

---

#### GET `/shipping/companies/:id/prices`

Get all wilaya-level prices for a shipping company.

**Response `200`**

```json
{
  "success": true,
  "data": [
    { "id": 1, "price": "350.00", "wilayaCode": "16", "shippingCompanyId": 1, "status": "active" }
  ]
}
```

---

#### PUT `/shipping/companies/:id` ✦ UPDATED

**Request Body** — `{ "name"?: "string", "apiKey"?: "string" }` (all optional)

**Response `200`** — updated company. **`404`** if not found or soft-deleted.

> **UPDATED:** Name uniqueness check now ignores soft-deleted companies — a previously-used name can be reused.

---

#### DELETE `/shipping/companies/:id` ✦ UPDATED

**Behaviour changed:** now performs a **soft-delete** — sets `deletedAt` to today's date. The row is preserved in the database.

**Response `200`** — the company record with `deletedAt` stamped.

**Errors**

| Status | Message |
|---|---|
| `404` | Not found or already deleted |
| `409` | Company still has orders or shipping prices referencing it (FK constraint) |

---

### Shipping Prices

Prices are set **per company × wilaya pair** (unique constraint).

> **Note:** Shipping price rows use **hard-delete** (no `deletedAt` column). They are configuration data — deleting a price row permanently removes it.

#### POST `/shipping/prices`

**Request Body**

```json
{
  "price": "350.00",
  "wilayaCode": "16",
  "shippingCompanyId": 1
}
```

> `price` must be a non-negative number with at most 2 decimal places.

**Response `201`**

```json
{
  "success": true,
  "data": { "id": 1, "price": "350.00", "wilayaCode": "16", "shippingCompanyId": 1, "status": "active" }
}
```

**Errors:** `404` wilaya/company not found, `409` duplicate company+wilaya pair.

---

#### GET `/shipping/prices`

List all shipping prices.

**Response `200`** — array of shipping price objects.

---

#### GET `/shipping/prices/:id`

**Response `200`** — single shipping price. **`404`** if not found.

---

#### GET `/shipping/prices/lookup`

**🌐 Public — no authentication required.**

Get the price for a specific company + wilaya combination using query parameters.

**Query Params (use one of each pair):**

| Param | Type | Description |
|---|---|---|
| `companyId` | number | Resolve company by its numeric id |
| `companyName` | string | Resolve company by its name |
| `wilayaCode` | string | Resolve wilaya by its 2-digit code (e.g. `"16"`) |
| `wilayaName` | string | Resolve wilaya by its human-readable name (e.g. `"Alger"`) |

**Examples:**
- `GET /api/shipping/prices/lookup?companyId=1&wilayaCode=16`
- `GET /api/shipping/prices/lookup?companyName=Yalidine&wilayaName=Alger`

**Response `200`** — single shipping price object. **`404`** if not found.

---

#### PUT `/shipping/prices/:id`

**Request Body** — `{ "price"?: "string", "wilayaCode"?: "string", "shippingCompanyId"?: number }` (all optional)

**Response `200`** — updated price. **`404`** / **`409`** on error.

---

#### DELETE `/shipping/prices/:id`

**Response `200`** — deleted price snapshot. **`404`** if not found.

---

## Coupons

> **UPDATED** — `GET /coupons/validate/:code` and `GET /coupons/:id` are now **public — no authentication required**. These endpoints are needed by the checkout flow. `GET /coupons` (the full admin list) still requires authentication.

### POST `/coupons`

> 🔒 Requires: `authenticate` + `authorize("coupon_add")`

**Request Body**

```json
{
  "code": "SUMMER25",
  "expireDate": "2027-12-31",
  "discountPercentage": 25,
  "status": "active"
}
```

> `code`: 4–20 chars, uppercase letters and digits only (e.g. `SAVE10`).  
> `expireDate`: `YYYY-MM-DD`, must be a future date.  
> `discountPercentage`: integer between `1` and `100` (required).  
> `status` defaults to `active`.

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "SUMMER25",
    "expireDate": "2027-12-31",
    "discountPercentage": 25,
    "status": "active"
  }
}
```

**Errors:** `400` validation, `409` duplicate code.

---

### GET `/coupons`

> 🔒 Requires: `authenticate` + `authorize("coupon_read")`

**Response `200`** — array of coupon objects (each including `discountPercentage`).

---

### GET `/coupons/validate` ✦ UPDATED

Validate a coupon code at checkout **(public — no auth required)**. Checks that it is active and not expired.

> **BREAKING CHANGE:** The coupon code is now passed as a **query parameter** (`?code=`) instead of a URL path segment. The old `/validate/:code` route no longer exists; update any client calls to use `/validate?code=SUMMER25`.

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | ✅ Yes | The coupon code to validate (e.g. `SUMMER25`). |

**Example request:**
```
GET /api/coupons/validate?code=SUMMER25
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "SUMMER25",
    "expireDate": "2027-12-31",
    "discountPercentage": 25,
    "status": "active"
  }
}
```

> Use `discountPercentage` to show the customer a live discount preview in the cart UI before they place the order.

**Errors**

| Status | Message |
|---|---|
| `404` | Coupon not found |
| `422` | Coupon is inactive or expired |

---

### GET `/coupons/:id`

**🌐 Public — no authentication required.**

**Response `200`** — single coupon (including `discountPercentage`). **`404`** if not found.

---

### PUT `/coupons/:id`

> 🔒 Requires: `authenticate` + `authorize("coupon_update")`

**Request Body** — same fields as `POST /coupons`, all optional.

```json
{
  "code": "WINTER30",
  "expireDate": "2028-01-31",
  "discountPercentage": 30,
  "status": "inactive"
}
```

**Response `200`** — updated coupon. **`404`** / **`409`** on error.

---

### DELETE `/coupons/:id`

> 🔒 Requires: `authenticate` + `authorize("coupon_delete")`

**Response `200`** — deleted coupon. **`404`** if not found.

---

## Orders

> **UPDATED** — Orders now use **soft-delete**. `GET /orders` only returns active orders. Revenue statistics must be fetched from the dedicated `GET /orders/stats` endpoint, which correctly includes soft-deleted orders in the revenue total (since the payment was already collected).
>
> **NEW** — Stock is now managed transactionally on order creation and status updates:
> - **`POST /orders`**: stock is decremented for each item that has both `color`/`colorHex` + `size`. If any item is out of stock the entire order is rolled back and a `409` is returned.
> - **`PATCH /orders/:id/status`** (→ `canceled` / `returned`): stock is automatically restored for all matching items inside the same transaction.

### POST `/orders`

Place a new customer order **(public — no auth required)**.

> ⚠️ The server recomputes `total` from live product prices. The client **must not** send a `total` field — the authoritative value is always computed server-side, preventing price-manipulation attacks.

> **UPDATED:** Soft-deleted products **cannot** be ordered. Attempting to order a deleted product returns `404`.

**Request Body**

```json
{
  "name": "Amira Benali",
  "phoneNumber": "0555123456",
  "wilayaCode": "16",
  "communeId": 3,
  "shippingCompanyId": 1,
  "products": [
    {
      "productId": 10,
      "quantity": 2,
      "color": "red",
      "colorHex": "FF0000",
      "size": "40"
    }
  ],
  "couponCode": "SUMMER25"
}
```

> `phoneNumber`: 10 digits, starts with `0`.  
> `products`: at least 1 item required. `color` and `size` per item are optional.  
> `colorHex`: optional, 6 uppercase hex digits without `#` (e.g. `"FF0000"`). **Required alongside `color`** when the product has stock tracking entries — the server uses it to look up the matching `product_stock` row and decrement it atomically.  
> `couponCode` is optional. When supplied, the discount is applied to the product subtotal only (not to shipping).

**Response `201`**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": 42,
      "name": "Amira Benali",
      "phoneNumber": "0555123456",
      "wilayaCode": "16",
      "communeId": 3,
      "shippingCompanyId": 1,
      "total": "1049.99",
      "products": [
        { "productId": 10, "title": "Red T-Shirt", "quantity": 2, "price": "299.99", "color": "red", "colorHex": "FF0000", "size": "40" }
      ],
      "date": "2026-11-08",
      "hour": "19:34:00",
      "status": "pending",
      "deletedAt": null
    },
    "pricing": {
      "subtotal": "599.98",
      "discountPercentage": 25,
      "discountAmount": "150.00",
      "shippingCost": "600.01",
      "total": "1049.99",
      "couponCode": "SUMMER25"
    }
  }
}
```

> When no coupon is used, `discountPercentage` is `0`, `discountAmount` is `"0.00"`, and `couponCode` is `null`.

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error |
| `404` | Wilaya / commune / shipping company / product not found (or soft-deleted) |
| `400` | Coupon not found or unavailable |
| `409` | `Insufficient stock for product <id>` — one or more items have less stock than requested; the whole order is rolled back |
| `422` | Shipping price not configured for that wilaya + company |

---

### GET `/orders`

> 🔒 Requires: `authenticate` + `authorize("order_read")`

Get a **paginated** list of **active** (non-soft-deleted) orders with optional search, filters, sorting, and pagination.

**Query Parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | `integer ≥ 1` | `1` | Page number (1-based). |
| `limit` | `integer 1–100` | `20` | Rows per page. |
| `search` | `string (max 100)` | — | Free-text search matched against **customer name**, **phone number**, **order ID** (prefix), and **wilaya name** (case-insensitive). |
| `status` | `confirmed` \| `pending` \| `canceled` \| `returned` \| `delivered` | — | Filter by exact order status. |
| `wilayaCode` | `string (2 digits)` | — | Filter by wilaya code (e.g. `"16"`). |
| `dateFrom` | `YYYY-MM-DD` | — | Filter orders placed **on or after** this date. |
| `dateTo` | `YYYY-MM-DD` | — | Filter orders placed **on or before** this date. |
| `totalMin` | `number ≥ 0` | — | Filter orders with `total ≥ totalMin`. |
| `totalMax` | `number ≥ 0` | — | Filter orders with `total ≤ totalMax`. |
| `sortBy` | `id` \| `name` \| `phoneNumber` \| `wilayaCode` \| `total` \| `date` \| `status` | `id` | Column to sort by. |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction. |

**Example requests:**
```
GET /api/orders?search=Amira&status=pending&sortBy=date&sortOrder=desc&page=1&limit=20
GET /api/orders?wilayaCode=16&dateFrom=2026-01-01&dateTo=2026-12-31&totalMin=500&sortBy=total&sortOrder=asc
```

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "name": "Amira Benali",
      "phoneNumber": "0555123456",
      "wilayaCode": "16",
      "communeId": 3,
      "shippingCompanyId": 1,
      "total": "1049.99",
      "products": [ { "productId": 10, "title": "Red T-Shirt", "quantity": 2, "price": "299.99" } ],
      "date": "2026-11-08",
      "hour": "19:34:00",
      "status": "pending",
      "deletedAt": null
    }
  ],
  "pagination": {
    "total": 312,
    "page": 1,
    "limit": 20,
    "totalPages": 16
  }
}
```

> ⚠️ **UPDATED:** Soft-deleted orders are **excluded** from this list. Use `GET /orders/stats` to get revenue totals that include all orders.

---

### GET `/orders/stats` ✦ NEW

> 🔒 Requires: `authenticate` + `authorize("order_read")`

Returns store-wide order statistics for the **admin dashboard**.

> ⚠️ **Important:** `totalRevenue` deliberately includes **soft-deleted orders**. Soft-deleting an order is a UI archival action — the payment was already collected. Excluding those rows would silently under-report the store's actual earnings.  
> Only orders with revenue-generating statuses (`confirmed`, `delivered`) are summed.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "totalRevenue": "158420.50",
    "activeOrderCount": 312,
    "allTimeOrderCount": 347
  }
}
```

| Field | Description | Soft-deleted included? |
|---|---|---|
| `totalRevenue` | Sum of all `confirmed` + `delivered` orders (all time) | ✅ Yes |
| `activeOrderCount` | Orders visible in the dashboard | ❌ No |
| `allTimeOrderCount` | Every order ever placed | ✅ Yes |

**Status → revenue inclusion:**

| Status | Counts toward revenue? |
|---|---|
| `confirmed` | ✅ Yes |
| `delivered` | ✅ Yes |
| `pending` | ❌ No |
| `canceled` | ❌ No |
| `returned` | ❌ No |

---

### GET `/orders/:id`

> 🔒 Requires: `authenticate` + `authorize("order_read")`

**Response `200`** — single active order object. **`404`** if not found **or soft-deleted**.

---

### PATCH `/orders/:id` ✦ NEW

> 🔒 Requires: `authenticate` + `authorize("order_update")`

Update the **customer contact and delivery information** of an existing active order. The order's products, total, status, and timestamps are **not** affected by this endpoint.

> At least one field must be provided. If `wilayaCode` or `communeId` is supplied, the system validates that the resulting commune belongs to the resulting wilaya — keeping the delivery address internally consistent.

**Request Body** — all fields optional, but at least one is required:

```json
{
  "name": "Amira Benali",
  "phoneNumber": "0555123456",
  "wilayaCode": "16",
  "communeId": 5
}
```

| Field | Type | Description |
|---|---|---|
| `name` | `string (min 1)` | Customer full name. |
| `phoneNumber` | `string (10 digits, starts with 0)` | Customer phone number. |
| `wilayaCode` | `string (2 digits)` | Destination wilaya code (e.g. `"16"`). |
| `communeId` | `positive integer` | Destination commune ID. Must belong to the resulting wilaya. |

**Response `200`** — the updated order object.

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error (body shape invalid or no fields provided) |
| `400` | `Commune with id <id> does not belong to wilaya "<code>"` |
| `404` | Order / commune / wilaya not found or order is soft-deleted |

---

### PATCH `/orders/:id/status`

> 🔒 Requires: `authenticate` + `authorize("order_update")`

Update an order's status. Orders in a terminal state (`canceled`, `returned`) cannot be updated.

> **UPDATED** — When transitioning to `canceled` or `returned`, stock is automatically **restored** for all items that have a matching `product_stock` row (items without `colorHex` + `size` are skipped). The status update and stock restore run inside a single transaction.

**Request Body**

```json
{ "status": "delivered" }
```

**Response `200`** — updated order.

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error |
| `404` | Order not found |
| `409` | Order is in a terminal state |

---

### DELETE `/orders/:id` ✦ UPDATED

> 🔒 Requires: `authenticate` + `authorize("order_delete")`

**Behaviour changed:** now performs a **soft-delete** — sets `deletedAt` to today's date. The row is preserved for auditing and revenue reporting.

**Response `200`** — the order record with `deletedAt` stamped.

```json
{
  "success": true,
  "data": {
    "id": 42,
    "name": "Amira Benali",
    "total": "1049.99",
    "status": "pending",
    "deletedAt": "2026-11-09",
    "..."
  }
}
```

**Errors:** `404` if not found or already soft-deleted.

---

### Product Stock Schema

The `product_stock` table tracks available units for every `(product, colorHex, size)` combination. It is managed via the `stockEntries` field on `POST /products` and `PUT /products/:id`.

**`StockEntry` object (used in `stockEntries` arrays):**

| Field | Type | Description |
|---|---|---|
| `colorHex` | `string` | 6 hex digits **without** `#` (e.g. `"FF0000"`). Case-insensitive input; stored as uppercase. |
| `size` | `clothingSize` | One of `"34"`, `"36"`, `"38"`, `"40"`, `"42"`, `"44"`, `"46"`, `"48"`. |
| `stock` | `integer ≥ 0` | Number of units available. |

**`ProductStock` row (returned in `stock` arrays of create/update responses):**

| Field | Type | Description |
|---|---|---|
| `id` | `number` | Auto-generated primary key. |
| `productId` | `number` | FK to the parent product. |
| `colorHex` | `string` | 6 uppercase hex digits without `#`. |
| `size` | `clothingSize` | Clothing size enum value. |
| `stock` | `number` | Available units (always ≥ 0). |

> **Uniqueness:** The `(productId, colorHex, size)` triple is unique. Sending duplicate entries in `stockEntries` will cause a DB-level constraint error.  
> **Replace semantics on update:** When `stockEntries` is provided in `PUT /products/:id`, the entire existing stock grid is deleted and replaced atomically. Omit `stockEntries` to leave the current stock untouched.

---

## Health Check

### GET `/health`

Check that the server is up and running.

**Response `200`**

```json
{ "status": "ok" }
```


---

## Frontend Integration — Products

> **Updated** — `GET /products` now returns a **paginated** response. The frontend hook and type definitions have been updated accordingly.

> **Dashboard note** — `useDashboardData` calls `GET /products?limit=100&sortBy=id&sortOrder=desc` and normalises the paginated envelope into a flat `Product[]` for KPI and Store Snapshot widgets. The paginated `ProductPannel` on the Products page is unaffected.

### `ProductsQueryParams` type

```ts
interface ProductsQueryParams {
  page?: number;           // 1-based page number (default: 1)
  limit?: number;          // rows per page, 1–100 (default: 20)
  search?: string;         // free-text: title + description (max 200 chars)
  categoryId?: number;     // exact category ID filter
  size?: ClothingSize;     // one of "34"|"36"|"38"|"40"|"42"|"44"|"46"|"48"
  color?: string;          // partial, case-insensitive color name match
  priceMin?: number;       // price >= priceMin
  priceMax?: number;       // price <= priceMax
  hasPromo?: boolean;      // true = only promo products, false = no promo
  sortBy?: "id" | "title" | "price" | "promo" | "categoryId";  // default: "id"
  sortOrder?: "asc" | "desc";   // default: "desc"
}
```

### `GetProductsResponse` type (updated)

```ts
interface GetProductsResponse {
  success: boolean;
  data: Product[];
  total: number;       // total matching rows (for pagination display)
  page: number;        // current page
  limit: number;       // current limit
  totalPages: number;  // Math.ceil(total / limit)
}
```

### `useGetProducts(params?)` hook

**Location:** `src/features/products/hooks/useGetProducts.ts`

The hook now accepts an **optional** `ProductsQueryParams` object. The `queryKey` is `["products", params]` — changing any param automatically invalidates and refetches.

```ts
const { data, isLoading, isFetching, isError, error, refetch } = useGetProducts({
  page: 1,
  limit: 20,
  search: "shirt",
  categoryId: 2,
  sortBy: "price",
  sortOrder: "asc",
  hasPromo: true,
});

const products   = data?.data ?? [];
const total      = data?.total ?? 0;
const totalPages = data?.totalPages ?? 1;
```

> `placeholderData: (prev) => prev` is set so the table keeps showing old data while a new page loads, preventing flicker.

### Mutation cache invalidation

All product mutations (`useAddProduct`, `useUpdateProduct`, `useDeleteProduct`) call:

```ts
queryClient.invalidateQueries({ queryKey: ["products"] });
```

This invalidates **all** `["products", *]` queries (every param combination in the cache) so every open page/filter view refreshes automatically.

### `ProductPannel` features

| Feature | Detail |
|---|---|
| **Search** | Debounced 350 ms — hits `search` param (title + description) |
| **Category filter** | Dropdown populated from `GET /categories` |
| **Size filter** | Dropdown — values: 34–48 |
| **Price range** | Min / Max DZD inputs |
| **Promo filter** | All / On promo only / No promo |
| **Sort** | 5 column buttons with asc/desc toggle |
| **Pagination** | Smart ellipsis page buttons + prev/next |
| **Per-page** | 10 / 20 / 50 / 100 selector |
| **Active filter chips** | Dismissable badges under toolbar |
| **isFetching indicator** | CardDescription shows "Loading…" while re-fetching |
| **Edit order info** | `EditOrderWindow` dialog — inline form to patch customer name, phone, wilaya, and commune via `PATCH /orders/:id` |
| **Order details dialog** | `OrderDetailsDialogContent` — read-only expanded view of a single order's products, pricing, and delivery info |

---

## Frontend Integration — Orders

> **Updated** — `GET /orders` now returns a **paginated** response with a `pagination` envelope.

> **Dashboard note** — `useDashboardData` calls `GET /orders?limit=100&sortBy=id&sortOrder=desc` and normalises the `{ data, pagination }` envelope into a flat `Order[]` for KPIs, charts, and the recent-orders table. The paginated `OrderPannel` on the Orders page is unaffected.

### `OrdersQueryParams` type

```ts
interface OrdersQueryParams {
  page?: number;         // 1-based page number (default: 1)
  limit?: number;        // rows per page, 1–100 (default: 20)
  search?: string;       // matches customer name, phone, order ID prefix, wilaya name
  status?: OrderStatus;  // "pending"|"confirmed"|"delivered"|"canceled"|"returned"
  wilayaCode?: string;   // 2-digit code, e.g. "16"
  dateFrom?: string;     // YYYY-MM-DD — orders on or after this date
  dateTo?: string;       // YYYY-MM-DD — orders on or before this date
  totalMin?: number;     // order total >= totalMin
  totalMax?: number;     // order total <= totalMax
  sortBy?: "id" | "name" | "phoneNumber" | "wilayaCode" | "total" | "date" | "status";  // default: "id"
  sortOrder?: "asc" | "desc";   // default: "desc"
}
```

### `GetOrdersResponse` type (updated)

```ts
interface GetOrdersResponse {
  success: boolean;
  data: Order[];
  pagination: {
    total: number;       // total matching rows
    page: number;        // current page
    limit: number;       // current limit
    totalPages: number;  // Math.ceil(total / limit)
  };
}
```

### `useGetOrders(params?)` hook

**Location:** `src/features/orders/hooks/useGetOrders.ts`

The hook now accepts an **optional** `OrdersQueryParams` object. The `queryKey` is `["orders", params]`.

```ts
const { data, isLoading, isFetching, isError, error, refetch } = useGetOrders({
  page: 1,
  limit: 20,
  status: "pending",
  sortBy: "date",
  sortOrder: "desc",
});

const orders     = data?.data ?? [];
const total      = data?.pagination?.total ?? 0;
const totalPages = data?.pagination?.totalPages ?? 1;
```

### Mutation cache invalidation

All order mutations (`useAddOrder`, `useUpdateOrderStatus`, `useUpdateOrder`, `useDeleteOrder`) call:

```ts
queryClient.invalidateQueries({ queryKey: ["orders"] });
```

This invalidates **all** `["orders", *]` queries across every param combination.

### `OrderPannel` features

| Feature | Detail |
|---|---|
| **Search** | Debounced 350 ms — customer name, phone, ID prefix, wilaya name |
| **Status filter** | Dropdown — pending / confirmed / delivered / canceled / returned |
| **Wilaya filter** | 2-digit code text input |
| **Date range filter** | From / To date pickers (YYYY-MM-DD) |
| **Total range** | Min / Max DZD inputs |
| **Sort** | 6 column buttons (ID, Name, Total, Date, Status, Wilaya) with asc/desc toggle |
| **Pagination** | Smart ellipsis page buttons + prev/next |
| **Per-page** | 10 / 20 / 50 / 100 selector |
| **Active filter chips** | Dismissable badges under toolbar |
| **isFetching indicator** | CardDescription shows "Loading…" while re-fetching |
| **Edit order info** | `EditOrderWindow` dialog — inline form to patch customer name, phone, wilaya, and commune via `PATCH /orders/:id` |
| **Order details dialog** | `OrderDetailsDialogContent` — read-only expanded view of a single order's products, pricing, and delivery info |
