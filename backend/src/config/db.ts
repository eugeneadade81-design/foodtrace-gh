import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export async function checkDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
    return "connected" as const;
  } catch (error) {
    console.error("PostgreSQL health check failed:", error instanceof Error ? error.message : error);
    return "unreachable" as const;
  }
}
