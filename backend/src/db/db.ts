import "dotenv/config";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema.js";

// The neon-serverless WebSocket driver is required for transaction support.
// neon-http does NOT support db.transaction() — use this driver instead.
neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });