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
| `adminPermission` | `product_read`, `product_add`, `product_update`, `product_delete`, `category_read`, `category_add`, `category_update`, `category_delete`, `order_read`, `order_add`, `order_update`, `order_delete`, `coupon_read`, `coupon_add`, `coupon_update`, `coupon_delete`, `shipping_read`, `shipping_add`, `shipping_update`, `shipping_delete`, `shipping_company_read`, `shipping_company_add`, `shipping_company_update`, `shipping_company_delete`, `full_access` |
| `clothingSize` | `34`, `36`, `38`, `40`, `42`, `44`, `46`, `48` |
| `orderStatus` | `confirmed`, `pending`, `canceled`, `returned`, `shipped` |
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

### `authorize(permission)`

**File:** `backend/src/middleware/authirization.ts`

Factory that returns a middleware enforcing a specific permission. **Must be placed after `authenticate`** (it reads `req.admin`).

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
| `order_read` | Read/list orders |
| `order_add` | Create orders |
| `order_update` | Update order status |
| `order_delete` | Delete orders |
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
| `shipping_company_delete` | Delete shipping companies |
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
| `validateCreateOrder` | `POST /orders` |
| `validateUpdateOrderStatus` | `PATCH /orders/:id/status` |

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

### POST `/categories`

**Request Body**

```json
{ "name": "string (required)" }
```

**Response `201`**

```json
{ "success": true, "data": { "id": 1, "name": "Clothing" } }
```

**Errors:** `400` validation, `409` duplicate name.

---

### GET `/categories`

**Response `200`**

```json
{ "success": true, "data": [{ "id": 1, "name": "Clothing" }] }
```

---

### GET `/categories/:id`

**Response `200`** — single category object. **`404`** if not found.

---

### PUT `/categories/:id`

**Request Body:** `{ "name": "string" }`

**Response `200`** — updated category. **`404`** / **`409`** on error.

---

### DELETE `/categories/:id`

**Response `200`** — deleted category. **`404`** if not found.

---

## Products

### POST `/products/upload/request-tokens`

> 🔒 Requires: `authenticate` + `authorize("product_add")` + upload rate limit (10 req / 15 min)

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
  ]
}
```

> `colors` and `sizes` default to `[]`. `imageUploads` is optional (max 8 entries).

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
    "categoryId": 1
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error |
| `404` | Category not found |
| `422` | Promo price exceeds regular price |

---

### GET `/products`

List all products (public).

**Response `200`** — array of product objects.

---

### GET `/products/by-category/:categoryId`

Get all products in a given category (public).

**Params:** `categoryId` — positive integer

**Response `200`** — array of product objects.

**Errors:** `404` if category not found.

---

### GET `/products/:id`

Get a single product (public).

**Response `200`** — single product object. **`404`** if not found.

---

### PUT `/products/:id`

> 🔒 Requires: `authenticate` + `authorize("product_update")`

Partially update a product (all fields optional).

**Request Body** — same as `POST /products`, all fields optional.

**Response `200`** — updated product.

**Errors:** `404`, `422` (invalid promo).

---

### DELETE `/products/:id`

> 🔒 Requires: `authenticate` + `authorize("product_delete")`

**Response `200`** — deleted product snapshot. **`404`** if not found.

---

## Wilayas

Algeria has 58 wilayas identified by a 2-digit code (e.g. `"16"` for Algiers).

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

**Response `200`** — array of commune objects.

---

### GET `/communes/by-wilaya/:code`

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
  "data": { "id": 1, "name": "Yalidine", "status": "active" }
}
```

---

#### GET `/shipping/companies`

**Response `200`** — array of `{ id, name, status }` objects.

---

#### GET `/shipping/companies/:id`

**Response `200`** — single shipping company. **`404`** if not found.

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

#### PUT `/shipping/companies/:id`

**Request Body** — `{ "name"?: "string", "apiKey"?: "string" }` (all optional)

**Response `200`** — updated company. **`404`** if not found.

---

#### DELETE `/shipping/companies/:id`

**Response `200`** — deleted company. **`404`** if not found.

---

### Shipping Prices

Prices are set **per company × wilaya pair** (unique constraint).

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

#### GET `/shipping/prices/by-company-wilaya`

Get the price for a specific company + wilaya combination.

**Query Params:** `companyId=1&wilayaCode=16`

**Response `200`** — single shipping price object. **`404`** if not found.

---

#### PUT `/shipping/prices/:id`

**Request Body** — `{ "price"?: "string", "wilayaCode"?: "string", "shippingCompanyId"?: number }` (all optional)

**Response `200`** — updated price. **`404`** / **`409`** on error.

---

#### DELETE `/shipping/prices/:id`

**Response `200`** — deleted price. **`404`** if not found.

---

## Coupons

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

### GET `/coupons/validate/:code`

Validate a coupon code at checkout **(public — no auth required)**. Checks that it is active and not expired.

**Params:** `code` — the coupon code string (e.g. `SUMMER25`)

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

> 🔒 Requires: `authenticate` + `authorize("coupon_read")`

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

### POST `/orders`

Place a new customer order **(public — no auth required)**.

> ⚠️ The server recomputes `total` from live product prices. The client **must not** send a `total` field — the authoritative value is always computed server-side, preventing price-manipulation attacks.

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
      "size": "40"
    }
  ],
  "couponCode": "SUMMER25"
}
```

> `phoneNumber`: 10 digits, starts with `0`.  
> `products`: at least 1 item required. `color` and `size` per item are optional.  
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
        { "productId": 10, "title": "Red T-Shirt", "quantity": 2, "price": "299.99", "color": "red", "size": "40" }
      ],
      "date": "2026-11-08",
      "hour": "19:34:00",
      "status": "pending"
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
| `404` | Wilaya / commune / shipping company / product not found |
| `400` | Coupon not found or unavailable |
| `422` | Shipping price not configured for that wilaya + company |

---

### GET `/orders`

> 🔒 Requires: `authenticate` + `authorize("order_read")`

Get all orders, most-recent first.

**Response `200`** — array of order objects.

---

### GET `/orders/:id`

> 🔒 Requires: `authenticate` + `authorize("order_read")`

**Response `200`** — single order object. **`404`** if not found.

---

### PATCH `/orders/:id/status`

> 🔒 Requires: `authenticate` + `authorize("order_update")`

Update an order's status. Orders in a terminal state (`canceled`, `returned`) cannot be updated.

**Request Body**

```json
{ "status": "shipped" }
```

**Response `200`** — updated order.

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error |
| `404` | Order not found |
| `409` | Order is in a terminal state |

---

### DELETE `/orders/:id`

> 🔒 Requires: `authenticate` + `authorize("order_delete")`

Hard-delete an order and return its last snapshot.

**Response `200`** — deleted order. **`404`** if not found.

---

## Health Check

### GET `/health`

Check that the server is up and running.

**Response `200`**

```json
{ "status": "ok" }
```
