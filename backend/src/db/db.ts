import "dotenv/config";
import { fetch, Agent } from "undici";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

// Fix: Node 24 uses Happy Eyeballs which races IPv4 + IPv6 simultaneously.
// Neon's endpoints time out on IPv6, causing AggregateError [ETIMEDOUT].
// Solution: use undici's HTTP fetch with an IPv4-only agent for Neon's HTTP driver.
const ipv4Agent = new Agent({ connect: { family: 4 } });
neonConfig.fetchFunction = (url: RequestInfo | URL, opts?: RequestInit) =>
  fetch(url as Parameters<typeof fetch>[0], {
    ...(opts as Parameters<typeof fetch>[1]),
    dispatcher: ipv4Agent,
  });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });

// pool shim for seed-admin.ts compatibility
export const pool = { end: async () => {} };