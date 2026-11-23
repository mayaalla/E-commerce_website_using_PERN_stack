# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:24-alpine AS base
WORKDIR /app

# ---------- deps: all dependencies (needed to compile TypeScript) ----------
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ---------- build: TypeScript -> JavaScript ----------
FROM deps AS build
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ---------- prod-deps: only production dependencies ----------
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- tools: migrations and seeds on demand (has dev dependencies) ----------
FROM deps AS tools
COPY . .
CMD ["npx", "drizzle-kit", "migrate"]

# ---------- runner: final image (keep this LAST) ----------
FROM base AS runner
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 5000
CMD ["node", "dist/server.js"]