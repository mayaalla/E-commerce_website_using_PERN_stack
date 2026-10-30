# 📦 Project Dependencies

> **Project:** `e-commerce-backend` v1.0.0
> **Runtime:** Node.js `>= 24`
> **Language:** TypeScript (ESM)

---

## ✅ Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| [`@neondatabase/serverless`](https://github.com/neondatabase/serverless) | `1.2.0` | Neon serverless PostgreSQL driver (HTTP/WebSocket) |
| [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) | `3.0.3` | Password hashing and comparison |
| [`cookie-parser`](https://github.com/expressjs/cookie-parser) | `1.4.7` | Parse `Cookie` header and populate `req.cookies` |
| [`cors`](https://github.com/expressjs/cors) | `2.8.6` | Cross-Origin Resource Sharing middleware |
| [`dotenv`](https://github.com/motdotla/dotenv) | `17.4.2` | Load environment variables from `.env` file |
| [`drizzle-orm`](https://orm.drizzle.team/) | `0.45.4` | TypeScript ORM for SQL databases |
| [`express`](https://expressjs.com/) | `5.3.0` | Fast, minimalist web framework |
| [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit) | `8.7.1` | Rate limiting middleware for Express |
| [`helmet`](https://helmetjs.github.io/) | `8.3.0` | Secure HTTP headers middleware |
| [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken) | `9.0.3` | JSON Web Token (JWT) sign and verify |
| [`morgan`](https://github.com/expressjs/morgan) | `1.12.1` | HTTP request logger middleware |
| [`pg`](https://node-postgres.com/) | `8.23.1` | PostgreSQL client for Node.js |
| [`pino-http`](https://github.com/pinojs/pino-http) | `11.0.0` | High-performance HTTP logger (Pino) |
| [`zod`](https://zod.dev/) | `4.6.7` | TypeScript-first schema validation |
| [`@upstash/redis`](https://upstash.com/docs/redis/sdks/ts/overview) | latest | Serverless Redis client (HTTP-based) for caching & sessions |

---

## 🛠️ Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| [`@types/cookie-parser`](https://www.npmjs.com/package/@types/cookie-parser) | `1.4.10` | TypeScript types for `cookie-parser` |
| [`@types/cors`](https://www.npmjs.com/package/@types/cors) | `2.8.19` | TypeScript types for `cors` |
| [`@types/express`](https://www.npmjs.com/package/@types/express) | `5.0.6` | TypeScript types for `express` |
| [`@types/jsonwebtoken`](https://www.npmjs.com/package/@types/jsonwebtoken) | `9.0.10` | TypeScript types for `jsonwebtoken` |
| [`@types/morgan`](https://www.npmjs.com/package/@types/morgan) | `1.9.10` | TypeScript types for `morgan` |
| [`@types/node`](https://www.npmjs.com/package/@types/node) | `24.19.2` | TypeScript types for Node.js built-ins |
| [`@types/pg`](https://www.npmjs.com/package/@types/pg) | `8.23.1` | TypeScript types for `pg` |
| [`drizzle-kit`](https://orm.drizzle.team/kit-docs/overview) | `0.31.11` | Drizzle ORM CLI — migrations & schema push |
| [`tsx`](https://github.com/privatenumber/tsx) | `4.23.15` | Run TypeScript files directly (used in `dev` script) |
| [`typescript`](https://www.typescriptlang.org/) | `5.9.3` | TypeScript compiler |

---

## 📜 NPM Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `tsx watch src/server.ts` | Run dev server with hot reload |
| `build` | `tsc -p tsconfig.build.json` | Compile TypeScript to `dist/` |
| `start` | `node dist/server.js` | Run compiled production build |
| `typecheck` | `tsc --noEmit` | Type-check without emitting files |

---

## 🗂️ Dependency Groups by Feature

```
Authentication
  ├── bcryptjs        → password hashing
  └── jsonwebtoken    → JWT tokens

Database
  ├── pg                        → PostgreSQL client
  ├── @neondatabase/serverless  → Neon serverless driver
  └── drizzle-orm               → ORM + query builder

API / Server
  ├── express             → HTTP server & routing
  ├── cors                → CORS policy
  ├── helmet              → security headers
  ├── cookie-parser       → cookie handling
  ├── express-rate-limit  → abuse prevention
  ├── morgan              → request logging
  └── pino-http           → structured logging

Validation
  └── zod   → schema & request validation

Caching / Sessions
  └── @upstash/redis   → serverless Redis (caching + session storage)

Config
  └── dotenv   → environment variables

Dev Tooling
  ├── typescript   → static typing
  ├── tsx          → TS execution (dev)
  └── drizzle-kit  → DB migrations CLI
```
