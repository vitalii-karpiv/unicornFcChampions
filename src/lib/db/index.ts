import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { pool?: Pool };

// Reuse one pool across hot reloads in dev and across invocations on Vercel.
const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db: DB = drizzle(pool, { schema });
export { pool };
