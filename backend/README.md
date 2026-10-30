# E-commerce backend

Express with TypeScript, using ES modules. Requires Node.js 24 or newer.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The health endpoint is `GET http://localhost:5000/api/health`.
Set `CLIENT_ORIGIN` in `.env` to your frontend's origin.

## Commands

- `npm run dev`: run TypeScript with automatic restarts.
- `npm run typecheck`: check TypeScript without generating files.
- `npm run build`: compile the backend into `dist/`.
- `npm start`: run the compiled backend after building.

## Dependencies

- `express`: HTTP server and routing.
- `dotenv`: load environment variables from `.env`.
- `cors`: configure access from the frontend.
- `helmet`: set security headers.
- `cookie-parser`: read request cookies.
- `jsonwebtoken`: sign and verify JWTs when authentication is implemented.
- `bcryptjs`: hash and compare passwords when authentication is implemented.
- `zod`: validate data when routes are implemented.
- `express-rate-limit`: limit repeated requests.
- `morgan`: log HTTP requests.
- `typescript`, `tsx`, and `@types/*`: TypeScript development tools and definitions.

The starter configures middleware, a health route, and JSON error responses.
Authentication, database access, and business routes are not implemented yet.
PostgreSQL and React dependencies are excluded for now.
