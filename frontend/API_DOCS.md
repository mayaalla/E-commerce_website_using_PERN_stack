# E-Commerce Backend — API Documentation

> **Base URL:** `http://localhost:5000/api`  
> **Content-Type:** `application/json` (all requests & responses)  
> **Rate Limit:** 100 requests / 15 minutes (global). Upload endpoint: 10 requests / 15 minutes.  
> **Auth:** JWT — include `Authorization: Bearer <accessToken>` header on protected routes.  
> Refresh token is stored in a secure **HTTP-only cookie** (`refreshToken`).

---

## Table of Contents

1. [Common Patterns](#common-patterns)
2. [Auth](#auth)
3. [Admins](#admins)
4. [Categories](#categories)
5. [Products](#products)
6. [Wilayas](#wilayas)
7. [Communes](#communes)
8. [Shipping](#shipping)
9. [Coupons](#coupons)
10. [Orders](#orders)
11. [Health Check](#health-check)

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
| `adminPermission` | `product_management`, `order_management`, `coupon_management`, `shipping_management`, `full_access` |
| `clothingSize` | `34`, `36`, `38`, `40`, `42`, `44`, `46`, `48` |
| `orderStatus` | `confirmed`, `pending`, `canceled`, `returned`, `shipped` |
| `couponStatus` | `active`, `inactive`, `expired` |
| `shippingCompanyStatus` | `active`, `inactive` |
| `shippingWilayaStatus` | `active`, `inactive` |

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
  "permissions": ["product_management", "order_management"],
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
    "permissions": ["product_management"],
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
      "uploadUrl": "https://api.cloudinary.com/...",
      "token": "...",
      "publicId": "products/abc123"
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

**Request Body**

```json
{
  "code": "SUMMER25",
  "expireDate": "2027-12-31",
  "status": "active"
}
```

> `code`: 4–20 chars, uppercase letters and digits only (e.g. `SAVE10`).  
> `expireDate`: `YYYY-MM-DD`, must be a future date.  
> `status` defaults to `active`.

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "SUMMER25",
    "expireDate": "2027-12-31",
    "status": "active"
  }
}
```

**Errors:** `400` validation, `409` duplicate code.

---

### GET `/coupons`

**Response `200`** — array of coupon objects.

---

### GET `/coupons/validate/:code`

Validate a coupon code at checkout (public). Checks that it is active and not expired.

**Params:** `code` — the coupon code string (e.g. `SUMMER25`)

**Response `200`** — coupon object (when valid).

**Errors**

| Status | Message |
|---|---|
| `404` | Coupon not found |
| `422` | Coupon is inactive or expired |

---

### GET `/coupons/:id`

**Response `200`** — single coupon. **`404`** if not found.

---

### PUT `/coupons/:id`

**Request Body** — same as `POST /coupons`, all fields optional.

**Response `200`** — updated coupon. **`404`** / **`409`** on error.

---

### DELETE `/coupons/:id`

**Response `200`** — deleted coupon. **`404`** if not found.

---

## Orders

### POST `/orders`

Place a new customer order (public — no auth required).

> ⚠️ The server recomputes `total` from live product prices. The `total` field in the request body is for client display only; the authoritative value comes from the server.

**Request Body**

```json
{
  "name": "Amira Benali",
  "phoneNumber": "0555123456",
  "wilayaCode": "16",
  "communeId": 3,
  "shippingCompanyId": 1,
  "total": "649.99",
  "products": [
    {
      "productId": 10,
      "title": "Red T-Shirt",
      "quantity": 2,
      "price": "299.99",
      "color": "red",
      "size": "40"
    }
  ],
  "couponCode": "SUMMER25"
}
```

> `phoneNumber`: 10 digits, starts with `0`.  
> `products`: at least 1 item required.  
> `color` and `size` per item are optional.  
> `couponCode` is optional.

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "name": "Amira Benali",
    "phoneNumber": "0555123456",
    "wilayaCode": "16",
    "communeId": 3,
    "shippingCompanyId": 1,
    "total": "649.99",
    "products": [ { "productId": 10, "title": "Red T-Shirt", "quantity": 2, "price": "299.99", "color": "red", "size": "40" } ],
    "date": "2026-11-01",
    "hour": "01:43:00",
    "status": "pending"
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `400` | Validation error |
| `404` | Wilaya / commune / product not found |
| `400` | Coupon not found or unavailable |
| `422` | Shipping price not configured for that wilaya + company |

---

### GET `/orders`

Get all orders, most-recent first.

**Response `200`** — array of order objects.

---

### GET `/orders/:id`

**Response `200`** — single order object. **`404`** if not found.

---

### PATCH `/orders/:id/status`

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
