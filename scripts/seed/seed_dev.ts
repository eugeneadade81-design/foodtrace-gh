import { Client } from "pg";

const client = new Client({ connectionString: process.env.DATABASE_URL });

const passwordHash = "$2b$12$demohashdemohashdemohashdemohashdemohashdemohashdemoha";

async function run() {
  await client.connect();

  try {
    const farmers = await Promise.all(
      Array.from({ length: 3 }).map(async (_, index) => {
        const user = await client.query(
          `INSERT INTO users (full_name, phone, email, password_hash, role, is_verified, is_active)
           VALUES ($1, $2, $3, $4, 'farmer', true, true)
           RETURNING id`,
          [
            `Farmer ${index + 1}`,
            `02400000${index + 1}`,
            `farmer${index + 1}@foodtrace.gh`,
            passwordHash,
          ]
        );
        return user.rows[0].id;
      })
    );

    const manufacturers = await Promise.all(
      Array.from({ length: 2 }).map(async (_, index) => {
        const user = await client.query(
          `INSERT INTO users (full_name, phone, email, password_hash, role, is_verified, is_active)
           VALUES ($1, $2, $3, $4, 'manufacturer', true, true)
           RETURNING id`,
          [
            `Manufacturer ${index + 1}`,
            `02600000${index + 1}`,
            `manufacturer${index + 1}@foodtrace.gh`,
            passwordHash,
          ]
        );
        const manufacturer = await client.query(
          `INSERT INTO manufacturers (user_id, company_name, fda_registration_number, sector, is_verified, subscription_tier)
           VALUES ($1, $2, $3, $4, true, 'small')
           RETURNING id`,
          [user.rows[0].id, `FoodTrace Manufacturer ${index + 1}`, `FDA-${index + 1}00${index + 1}`, "food"]
        );
        return { userId: user.rows[0].id, manufacturerId: manufacturer.rows[0].id };
      })
    );

    const pharmacies = await Promise.all(
      Array.from({ length: 2 }).map(async (_, index) => {
        const user = await client.query(
          `INSERT INTO users (full_name, phone, email, password_hash, role, is_verified, is_active)
           VALUES ($1, $2, $3, $4, 'pharmacist', true, true)
           RETURNING id`,
          [
            `Pharmacist ${index + 1}`,
            `02700000${index + 1}`,
            `pharmacist${index + 1}@foodtrace.gh`,
            passwordHash,
          ]
        );
        const pharmacy = await client.query(
          `INSERT INTO pharmacies (user_id, business_name, ghana_pharmacy_council_number, district, region, is_verified)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING id`,
          [
            user.rows[0].id,
            `FoodTrace Pharmacy ${index + 1}`,
            `GPC-${index + 1}00${index + 1}`,
            index === 0 ? "Accra" : "Kumasi",
            index === 0 ? "Greater Accra" : "Ashanti",
          ]
        );
        return { userId: user.rows[0].id, pharmacyId: pharmacy.rows[0].id };
      })
    );

    const pesticideIds: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const pesticide = await client.query(
        `INSERT INTO pesticides (name, active_ingredient, epa_status, approved_crops, withdrawal_days, health_risk_level, health_risks, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'seed_dev')
         RETURNING id`,
        [
          `Pesticide ${i}`,
          `Active Ingredient ${i}`,
          i % 4 === 0 ? "restricted" : "approved",
          ["tomato", "maize"],
          7 + i,
          i % 4 === 0 ? "high" : "medium",
          "Seeded test data",
        ]
      );
      pesticideIds.push(pesticide.rows[0].id);
    }

    const drugIds: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const drug = await client.query(
        `INSERT INTO drugs (name, generic_name, manufacturer_name, fda_drug_registration_number, drug_class, dosage_form, strength, requires_prescription, is_controlled, fda_approval_status, storage_conditions, side_effects_summary, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
         RETURNING id`,
        [
          `Drug ${i}`,
          `Generic ${i}`,
          `Drug Maker ${i}`,
          `DRUG-${i}00${i}`,
          "antibiotic",
          "tablet",
          `${100 * i}mg`,
          i % 2 === 0,
          i % 3 === 0,
          i % 4 === 0 ? "restricted" : "approved",
          "Store below 25C",
          "Seeded test data",
        ]
      );
      drugIds.push(drug.rows[0].id);
    }

    const batchIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const batch = await client.query(
        `INSERT INTO product_batches (manufacturer_id, batch_number, ingredient_sources, processing_steps, quality_checks, packaging_date, expiry_date, recall_status)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - ($6 || ' days')::interval, CURRENT_DATE + ($7 || ' days')::interval, $8)
         RETURNING id`,
        [
          manufacturers[i % manufacturers.length].manufacturerId,
          `FB-${i + 1}00${i + 1}`,
          JSON.stringify([{ farmerId: farmers[i % farmers.length], ingredientName: `Ingredient ${i + 1}` }]),
          JSON.stringify([{ step: "mix", order: 1 }, { step: "pack", order: 2 }]),
          JSON.stringify([{ check: "visual", result: "pass" }]),
          i + 1,
          365 - i * 10,
          i === 3 ? "recalled" : "active",
        ]
      );
      batchIds.push(batch.rows[0].id);
    }

    const drugBatchIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const batch = await client.query(
        `INSERT INTO drug_batches (drug_id, pharmacy_id, batch_number, manufacture_date, expiry_date, quantity_received, quantity_remaining, supplier_name, recall_status)
         VALUES ($1, $2, $3, CURRENT_DATE - ($4 || ' days')::interval, CURRENT_DATE + ($5 || ' days')::interval, $6, $7, $8, $9)
         RETURNING id`,
        [
          drugIds[i],
          pharmacies[i % pharmacies.length].pharmacyId,
          `DB-${i + 1}00${i + 1}`,
          5 + i,
          180 - i * 15,
          100 + i * 20,
          80 + i * 20,
          `Supplier ${i + 1}`,
          i === 1 ? "recalled" : "active",
        ]
      );
      drugBatchIds.push(batch.rows[0].id);
    }

    for (let i = 0; i < 10; i++) {
      await client.query(
        `INSERT INTO qr_codes (batch_id, code_string, s3_url, scan_count, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          batchIds[i % batchIds.length],
          `FT-QR-${i + 1}00${i + 1}`,
          `https://s3.example.com/qrcodes/FT-QR-${i + 1}00${i + 1}.png`,
          i * 2,
          i === 3 ? "recalled" : "active",
        ]
      );
    }

    for (let i = 0; i < 2; i++) {
      await client.query(
        `INSERT INTO recall_events (batch_id, issued_by, recall_type, reason, scope_districts, notification_sent_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [batchIds[i], manufacturers[0].userId, "manufacturer", `Recall reason ${i + 1}`, ["Accra", "Kumasi"]]
      );
    }

    console.log("Seed data inserted.");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
