import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import fsSync from "node:fs";

async function run() {
  // Load repo-root .env even when running from `scripts/migrations`.
  {
    let dir = process.cwd();
    let loaded = false;
    for (let i = 0; i < 8; i++) {
      const envPath = path.join(dir, ".env");
      if (fsSync.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        loaded = true;
        break;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    if (!loaded) dotenv.config();
  }

  const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        run_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const file of files) {
      const already = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file]
      );
      if (already.rowCount) continue;

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf-8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Applied migration: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
