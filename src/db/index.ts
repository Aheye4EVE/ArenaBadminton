import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const globalForArenaDb = globalThis as unknown as {
  arenaDb?: ReturnType<typeof drizzle>;
  arenaClient?: ReturnType<typeof postgres>;
};

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!globalForArenaDb.arenaDb) {
    globalForArenaDb.arenaClient = postgres(connectionString, {
      prepare: false,
      max: 5,
    });
    globalForArenaDb.arenaDb = drizzle({ client: globalForArenaDb.arenaClient });
  }

  return globalForArenaDb.arenaDb;
}
