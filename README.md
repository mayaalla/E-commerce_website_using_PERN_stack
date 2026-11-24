# MAISON

A full-stack e-commerce project for a women's clothing shop, with a customer storefront, an admin dashboard, and a REST API.


Shop live preview: [https://maison-phi-six.vercel.app](https://maison-phi-six.vercel.app)



![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black) ![React](https://img.shields.io/badge/React-19-149eca) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Node.js](https://img.shields.io/badge/Node.js-24+-green) ![Express](https://img.shields.io/badge/Express-5-lightgrey) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle-336791) ![Redis](https://img.shields.io/badge/Redis-Upstash-red) ![React Query](https://img.shields.io/badge/React_Query-5-ff4154) ![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-used-black) ![Vite](https://img.shields.io/badge/Vite-8-646cff) ![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ed) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088ff)

> **Architecture**
>
> - Admin auth uses access and refresh JWTs, with refresh rotation and logout revocation (`backend/src/service/auth.service.ts`, `backend/src/utils/token.ts`).
> - Admin routes check resource permissions; super admins bypass those checks (`backend/src/middleware/authirization.ts`).
> - Checkout and stock changes run in database transactions (`backend/src/service/order.service.ts`).
> - Conditional stock updates protect the last item from concurrent checkouts (`backend/src/service/order.service.ts`).
> - Product colors are loaded in one batch query, avoiding an N+1 query (`backend/src/service/product.service.ts`).
> - Upstash Redis stores refresh-token records and the access-token blocklist (`backend/src/utils/token.ts`).
> - GitHub Actions builds the apps and publishes Docker images to GHCR (`.github/workflows/`).

## 3 apps, 1 API

| App | Folder | Tech | Purpose |
|---|---|---|---|
| Storefront | `shop/` | Next.js, React, TypeScript, shadcn/ui | Product browsing, cart, and checkout |
| Admin dashboard | `admin/` | React, TypeScript, Vite, React Query | Shop and order management |
| API | `backend/` | Node.js, Express, TypeScript, Drizzle | REST endpoints, business rules, and PostgreSQL access |

**Jump to:** [Architecture](#architecture) · [Engineering highlights](#engineering-highlights) · [Database](#database) · [API](#api-overview) · [Getting started](#getting-started) · [CI/CD and Docker](#cicd-and-docker)

## Architecture

```mermaid
flowchart LR
    Shop["Storefront<br/>Next.js"] -->|REST| API["API<br/>Express"]
    Admin["Admin dashboard<br/>React + Vite"] -->|REST| API
    API -->|Drizzle| DB[("PostgreSQL")]
    API -->|Refresh sessions and token revocation| Redis[("Upstash Redis")]
```

- Routers in `backend/src/router/` map HTTP paths to middleware and controllers.
- Middleware checks authentication, permissions, and request data before protected handlers run (`backend/src/middleware/`).
- Controllers in `backend/src/controller/` translate Express requests and responses.
- Services in `backend/src/service/` own business rules; `backend/src/db/db.ts` configures Drizzle and the PostgreSQL connection.
- These layers keep route wiring, HTTP handling, business rules, and database access in separate places.

## Features

### Customer storefront

- Browse products and categories, search and filter the catalog, and view product variants (`shop/app/`, `shop/components/product-catalog.tsx`).
- Keep a cart in browser local storage (`shop/lib/cart-store.ts`).
- Place an order with contact and delivery details, and pay on delivery (`shop/components/checkout/checkout-form.tsx`, `backend/src/router/order.router.ts`).

### Admin dashboard

- Manage products, categories, orders, coupons, shipping companies and prices, wilayas, and communes (`admin/src/pages/`, `admin/src/features/`).
- Manage product images, colors, sizes, and stock through the product screens and API (`admin/src/features/products/`, `backend/src/router/product.router.ts`).
- Wilaya and commune pages require `full_access` in the dashboard (`admin/src/features/auth/permissions.ts`).
- Protected pages use authentication and permission guards (`admin/src/app/router.tsx`).

### Super Admin only (and admins granted `full_access`)

- Super admins can pass every backend permission check. A regular admin with `full_access` also passes those checks (`backend/src/middleware/authirization.ts`).
- Admin account routes require `full_access`; the dashboard also allows a regular admin who has that permission (`backend/src/router/admin.router.ts`, `admin/src/features/auth/permissions.ts`).

## Engineering Highlights

### Authentication and token flow

**Problem.** Admin API requests need a verified identity, and sessions need a way to continue after an access token expires.

**Solution.** Login checks the admin username and bcrypt password hash, then returns a short-lived access token in JSON and sets a refresh token in an HTTP-only cookie. The refresh token is also recorded in Redis; refresh requests check that record, revoke the old token, and save a new one. Logout deletes the refresh record and blocks the current access token until it expires.

**Example.** A wrong username and a wrong password both return the same `Invalid credentials` response.

**Where in code.** `loginService`, `refreshTokenService`, and `logoutService` in `backend/src/service/auth.service.ts`; cookie and Redis helpers in `backend/src/utils/token.ts`; password hashing in `backend/src/utils/password.ts`.

### Authorization and roles

**Problem.** Different admin accounts should only use the operations allowed by their role and permissions.

**Solution.** The API authenticates the request, then route middleware checks the requested permission. Super admins bypass permission checks; `full_access` grants the same bypass to regular admins. Other admins need a matching permission, such as `product_add` or `order_read`.

**Example.** Creating a product requires an authenticated admin with `product_add` (`backend/src/router/product.router.ts`).

**Where in code.** `authenticate` in `backend/src/middleware/authentication.ts`, `authorize` in `backend/src/middleware/authirization.ts`, and resource routers in `backend/src/router/`.

### Transactions

**Problem.** A failure between related database writes can leave product variants, stock, and orders out of sync.

**Solution.** Product creation writes the product, colors, and stock in one transaction; product updates lock the product row while syncing related data. Order creation checks the delivery details, computes the total, changes stock, and inserts the order in one transaction. Order information updates, status changes, and soft deletes also use transactions to keep their validation and writes together.

**Example.** If stock is unavailable during checkout, the transaction rolls back and the order is not inserted.

**Where in code.** `createProductService` and `updateProductByIdService` in `backend/src/service/product.service.ts`; `createOrderService`, `updateOrderInformationService`, `updateOrderStatusService`, and `deleteOrderByIdService` in `backend/src/service/order.service.ts`.

### Race conditions

**Problem.** Two checkouts could try to buy the same last unit at the same time.

**Solution.** `decrementStock` uses one conditional SQL update that subtracts quantity only when the row has enough stock. If no row matches, it throws and the surrounding order transaction rolls back. Order status changes lock the order row and reject already canceled or returned orders, which prevents two concurrent cancellations from restoring stock twice.

**Example.** If one dress remains, only the update that sees stock at least equal to the requested quantity can succeed.

**Where in code.** `decrementStock` and `updateOrderStatusService` in `backend/src/service/order.service.ts`; product edits also lock their row in `updateProductByIdService` in `backend/src/service/product.service.ts`.

### N+1 query fix

**Problem.** Loading colors separately for each product would add one database query per product in a catalog page.

**Solution.** The product service fetches colors for all product IDs with one `inArray` query, groups them by product ID, and attaches the groups to the page results.

**Example.** A page of products uses one colors query instead of one colors query for every product.

**Where in code.** `fetchColorsByProduct`, `attachColors`, and `getAllProductsService` in `backend/src/service/product.service.ts`.

### Redis usage

**Problem.** A signed token can remain valid after logout unless the server tracks session state.

**Solution.** Upstash Redis stores the current refresh-token record for each admin and access-token blocklist entries after logout. Entries expire with their token lifetime. Rate limiting is configured separately with `express-rate-limit`, not Redis.

**Example.** After logout, the access token is rejected by `authenticate` even if its JWT expiry has not passed.

**Where in code.** `backend/src/utils/token.ts`, `backend/src/middleware/authentication.ts`, and `backend/src/config/env.ts`.

### Business rules

**Problem.** Checkout totals, delivery locations, product variants, and stock must be checked by the server.

**Solution.** The order service reads current product prices and uses a promo price when present; it ignores a client-supplied total. It checks that a commune belongs to the selected wilaya, that the shipping company and price are active, and that selected colors and sizes exist. A valid coupon discount applies to the product subtotal, then shipping is added. New orders start as `pending`; `canceled` and `returned` are terminal statuses.

**Example.** Changing the total in a browser request does not change the total saved by the API.

**Where in code.** `createOrderService`, `assertCommuneInWilaya`, `fetchShippingCost`, `decrementStock`, and `updateOrderStatusService` in `backend/src/service/order.service.ts`; coupon checks in `backend/src/service/coupon.service.ts`; order and coupon validators in `backend/src/middleware/validation.ts`.

### Validation and error handling

**Problem.** Invalid request bodies and query values should be rejected before they reach business logic.

**Solution.** Zod schemas validate route bodies, IDs, and query strings. For example, order phone numbers must be ten digits and start with `0`, and checkout requires at least one product. The global error handler logs errors, returns client error messages for 4xx responses, and hides internal details behind a generic 500 response.

**Example.** An order with an invalid phone number is rejected before `createOrder` calls the service.

**Where in code.** `validate` and route validators in `backend/src/middleware/validation.ts`; `errorHandler` in `backend/src/middleware/error.ts`; middleware placement in `backend/src/router/`.

### Security

**Problem.** Admin endpoints, cookies, and file upload requests need basic protections at the HTTP boundary.

**Solution.** The API uses Helmet, disables `x-powered-by`, parses JSON with a 1 MB limit, and enables credentialed CORS for `http://localhost:3000` and `http://localhost:5174`. A global rate limit allows 100 requests per 15 minutes; upload-token requests have a separate limit of 10 per 15 minutes. Refresh cookies are HTTP-only, `SameSite=Strict`, and secure in production.

**Example.** Upload-token requests hit their own lower rate limit before the upload controller runs.

**Where in code.** `backend/src/app.ts`, `backend/src/router/product.router.ts`, and cookie helpers in `backend/src/utils/token.ts`.

## Database

The schema is in `backend/src/db/schema.ts`; Drizzle migrations are in `backend/drizzle/`.

```mermaid
erDiagram
    categories ||--o{ products : contains
    products ||--o{ product_colors : has
    products ||--o{ product_stock : tracks
    product_colors ||--o{ product_stock : identifies
    wilayas ||--o{ communes : contains
    wilayas ||--o{ shipping_prices : has
    shipping_companies ||--o{ shipping_prices : offers
    wilayas ||--o{ orders : receives
    communes ||--o{ orders : delivers_to
    shipping_companies ||--o{ orders : handles
```

The 11 tables are `admins`, `categories`, `products`, `product_colors`, `product_stock`, `wilayas`, `communes`, `shipping_companies`, `shipping_prices`, `coupons`, and `orders`. Order line items are JSONB snapshots, not product foreign keys. The schema does not store a coupon-to-order relation.

Important constraints and indexes:

- Primary keys are defined for each table. `admins.username` and `coupons.code` are unique.
- Product colors are unique by product and color hex, and by product and color name. Stock is unique by product, color hex, and size.
- Shipping prices are unique by company and wilaya. Foreign keys connect orders to wilayas, communes, and shipping companies.
- Database checks reject negative product prices, shipping prices, stock, and order totals. A promo price cannot exceed the regular price; order items must be a non-empty JSON array.
- Wilaya codes are text keys, preserving leading zeroes such as `01`.

## API Overview

These are the main routes; the resource routers contain additional CRUD routes. All paths are mounted in `backend/src/app.ts`.

| Resource | Method | Route | Access | Purpose |
|---|---|---|---|---|
| Auth (`backend/src/router/auth.router.ts`) | `POST` | `/api/auth/login` | Public | Admin login |
| Auth | `POST` | `/api/auth/refresh-token` | Public; refresh cookie required | Issue a new token pair |
| Auth | `POST` | `/api/auth/logout` | Authenticated admin | Revoke the session |
| Auth | `GET` | `/api/auth/me` | Authenticated admin | Return the current admin profile |
| Products (`backend/src/router/product.router.ts`) | `GET` | `/api/products` | Public | Search, filter, sort, and paginate products |
| Products | `GET` | `/api/products/:id` | Public | Read a product |
| Products | `GET` | `/api/products/:id/stock` | Public | Read product stock variants |
| Products | `POST` | `/api/products` | Admin: `product_add` | Create a product |
| Products | `PUT` | `/api/products/:id` | Admin: `product_update` | Update a product |
| Products | `DELETE` | `/api/products/:id` | Admin: `product_delete` | Soft-delete a product |
| Categories (`backend/src/router/category.router.ts`) | `GET` | `/api/categories` | Public | List categories |
| Categories | `POST` | `/api/categories` | Admin: `category_add` | Create a category |
| Orders (`backend/src/router/order.router.ts`) | `POST` | `/api/orders` | Public | Place an order |
| Orders | `GET` | `/api/orders` | Admin: `order_read` | Search and filter orders |
| Orders | `PATCH` | `/api/orders/:id/status` | Admin: `order_update` | Change order status |
| Orders | `DELETE` | `/api/orders/:id` | Admin: `order_delete` | Soft-delete an order |
| Coupons (`backend/src/router/coupon.router.ts`) | `GET` | `/api/coupons/validate?code=...` | Public | Validate a coupon code |
| Coupons | `POST` | `/api/coupons` | Admin: `coupon_add` | Create a coupon |
| Shipping (`backend/src/router/shipping.router.ts`) | `GET` | `/api/shipping/companies` | Public | List shipping companies |
| Shipping | `GET` | `/api/shipping/prices/lookup` | Public | Look up a company and wilaya price |
| Shipping | `POST` | `/api/shipping/prices` | Admin: `shipping_add` | Add a shipping price |
| Admins (`backend/src/router/admin.router.ts`) | `GET` | `/api/admins` | Super admin or `full_access` | List admin accounts |

## Frontend Notes

- **Shop:** Next.js App Router pages fetch product and category data in server components. Product data uses Next's cache with a 60-second stale/revalidate period and 300-second expiry; stock fetches use `no-store` (`shop/lib/storefront-products.ts`, `shop/lib/api.ts`). Catalog, product detail, cart, and checkout interactions are client components. UI primitives live in `shop/components/ui/`.
- **Admin:** Vite serves a React single-page app with feature folders under `admin/src/features/`. TanStack React Query handles server reads and mutations; its default query stale time is 30 seconds, with selected feature queries using two or five minutes (`admin/src/lib/query-client.ts`, `admin/src/features/`). React Hook Form and Zod validate the login form. `AuthGuard` and `PermissionGuard` wrap dashboard routes (`admin/src/app/router.tsx`).

## Project Structure

```text
.
├── backend/
│   ├── src/{config,controller,db,middleware,router,schema,service,utils}/  # Express API layers
│   ├── drizzle/                                                           # SQL migrations and metadata
│   ├── Dockerfile
│   └── package.json
├── shop/
│   ├── app/                                                               # Next.js App Router pages
│   ├── components/                                                        # Storefront and UI components
│   ├── lib/                                                               # API, cached data, and cart
│   ├── Dockerfile
│   └── package.json
├── admin/
│   ├── src/app/                                                           # React Router and providers
│   ├── src/features/                                                      # Feature APIs, hooks, and components
│   ├── src/lib/                                                           # API client and query client
│   ├── Dockerfile
│   └── package.json
├── .github/workflows/                                                    # CI and image publishing
├── docker-compose.yml
└── docker-compose.prod.yml
```

## Getting Started

### Prerequisites

- Node.js 24 or newer and npm (`backend/package.json`, `.github/workflows/`).
- PostgreSQL, Upstash Redis REST credentials, and Cloudinary credentials for the backend (`backend/src/config/env.ts`). The Compose files do not start these services.
- Docker and Docker Compose if using the container setup.

Create `backend/.env` with the backend settings below. Create `shop/.env.local` and `admin/.env` for their API URLs. The example values are fake and must be replaced.

| Name | Purpose | Fake example |
|---|---|---|
| `PORT` | API port; defaults to `5000` | `5000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `CLIENT_ORIGIN` | Required client URL setting | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection used by the API | `postgresql://user:password@db.example/maison` |
| `DATABASE_URL_UNPOOLED` | Direct database URL for Drizzle migrations | `postgresql://user:password@db.example/maison` |
| `JWT_ACCESS_SECRET` | Access-token signing secret, at least 32 characters | `fake-access-secret-for-local-use-123456` |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret, at least 32 characters | `fake-refresh-secret-for-local-use-123456` |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime; defaults to `15m` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime; defaults to `7d` | `7d` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | `https://example.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | `fake-upstash-token` |
| `CLOUDINARY_URL` | Cloudinary connection URL | `cloudinary://fake-key:fake-secret@example-cloud` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `example-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `0000000000000000` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `fake-cloudinary-secret` |
| `NEXT_PUBLIC_API_URL` | Shop API origin; Docker build argument | `http://localhost:5000` |
| `API_INTERNAL_URL` | API origin used by the shop in Compose | `http://api:5000` |
| `VITE_API_URL` | Admin API base URL, including `/api` | `http://localhost:5000/api` |

### Run locally

Run each app in its own terminal. Install dependencies in each app folder with `npm ci`.

```sh
cd backend
npm run dev
```

```sh
cd shop
npm run dev
```

```sh
cd admin
npm run dev
```

The package scripts are defined in each app's `package.json`. The backend's Drizzle migration configuration reads `DATABASE_URL_UNPOOLED` (`backend/drizzle.config.ts`).

### Run with Docker

From the repository root, build and start the Compose services:

```sh
docker compose up --build
```

The local Compose file maps the API to port `5000`, the shop to `3000`, and the admin dashboard to `5174` (`docker-compose.yml`). To run the optional migration service, the Compose file documents:

```sh
docker compose --profile tools run --rm migrate
```

## CI/CD and Docker

- Backend, shop, and admin workflows run on pull requests and pushes to `main` when their app or workflow files change (`.github/workflows/backend-ci.yml`, `.github/workflows/shop-ci.yml`, `.github/workflows/admin-ci.yml`).
- Each workflow installs dependencies, runs lint when a lint script exists, builds the app, and invokes `npm test --if-present`. No test script or test files are present, so there is no automated test suite in this repository.
- Each CI workflow also builds its Docker image without pushing it. The images use the Dockerfiles in `backend/`, `shop/`, and `admin/`.
- `.github/workflows/publish.yml` builds and pushes API, shop, admin, and migration images to GitHub Container Registry on pushes to `main`. It publishes images; it does not deploy the running services.
- `docker-compose.prod.yml` uses the published `latest` images. The backend Dockerfile has separate build, production dependency, migration-tool, and runner stages; the shop uses Next standalone output; the admin is served by Nginx.

## Screenshots

Screenshots coming soon

## Author

Author: Maya
