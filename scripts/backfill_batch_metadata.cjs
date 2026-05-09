const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { Client } = require("pg");

function loadEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  dotenv.config();
}

async function run() {
  loadEnv();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      "UPDATE product_batches SET product_name = COALESCE(product_name, CONCAT('Seeded product ', batch_number)), farm_origin = COALESCE(farm_origin, 'Ghana') WHERE product_name IS NULL OR farm_origin IS NULL"
    );
    const r = await client.query(
      "SELECT batch_number, product_name, farm_origin, recall_status FROM product_batches ORDER BY created_at DESC LIMIT 5"
    );
    console.log(r.rows);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

