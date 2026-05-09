import { Client } from "pg";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

// Load repo-root .env even when running from `scripts/seed`.
{
  let dir = process.cwd();
  let loaded = false;
  for (let i = 0; i < 8; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
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

const client = new Client({ connectionString: process.env.DATABASE_URL });

const passwordHash = "$2b$12$demohashdemohashdemohashdemohashdemohashdemohashdemoha";

async function run() {
  await client.connect();

  try {
    const farmerData = [
      {
        fullName: "Kwame Asante",
        phone: "0240000011",
        email: "kwame.asante@foodtrace.gh",
        farm: { name: "Kwame Asante Farm", district: "Kumasi", region: "Ashanti", cropTypes: ["tomato", "pepper"] },
      },
      {
        fullName: "Abena Mensah",
        phone: "0240000012",
        email: "abena.mensah@foodtrace.gh",
        farm: { name: "Abena Mensah Farm", district: "Sunyani", region: "Brong-Ahafo", cropTypes: ["maize", "cassava"] },
      },
      {
        fullName: "Ibrahim Alhassan",
        phone: "0240000013",
        email: "ibrahim.alhassan@foodtrace.gh",
        farm: { name: "Ibrahim Alhassan Farm", district: "Tamale", region: "Northern", cropTypes: ["yam", "millet"] },
      },
    ];

    const farmers = await Promise.all(
      farmerData.map(async (farmer) => {
        const user = await client.query(
          `INSERT INTO users (full_name, phone, email, password_hash, role, is_verified, is_active)
           VALUES ($1, $2, $3, $4, 'farmer', true, true)
           RETURNING id`,
          [farmer.fullName, farmer.phone, farmer.email, passwordHash]
        );
        await client.query(
          `INSERT INTO farms (owner_id, name, district, region, crop_types, verification_status, badge_status)
           VALUES ($1, $2, $3, $4, $5, 'verified', 'certified')`,
          [user.rows[0].id, farmer.farm.name, farmer.farm.district, farmer.farm.region, farmer.farm.cropTypes]
        );
        return { userId: user.rows[0].id, farm: farmer.farm };
      })
    );

    const manufacturerData = [
      { fullName: "Accra Foods Admin", phone: "0260000011", email: "accra.foods@foodtrace.gh", companyName: "Accra Foods Ltd", fda: "FDA/GH/2024/001", sector: "packaged foods" },
      { fullName: "GoldCoast Naturals Admin", phone: "0260000012", email: "goldcoast.naturals@foodtrace.gh", companyName: "GoldCoast Naturals", fda: "FDA/GH/2024/002", sector: "beverages" },
    ];

    const manufacturers = await Promise.all(
      manufacturerData.map(async (manufacturerDataItem) => {
        const user = await client.query(
          `INSERT INTO users (full_name, phone, email, password_hash, role, is_verified, is_active)
           VALUES ($1, $2, $3, $4, 'manufacturer', true, true)
           RETURNING id`,
          [manufacturerDataItem.fullName, manufacturerDataItem.phone, manufacturerDataItem.email, passwordHash]
        );
        const manufacturer = await client.query(
          `INSERT INTO manufacturers (user_id, company_name, fda_registration_number, sector, is_verified, subscription_tier)
           VALUES ($1, $2, $3, $4, true, 'small')
           RETURNING id`,
          [user.rows[0].id, manufacturerDataItem.companyName, manufacturerDataItem.fda, manufacturerDataItem.sector]
        );
        return { userId: user.rows[0].id, manufacturerId: manufacturer.rows[0].id };
      })
    );

    const pharmacyData = [
      { fullName: "Kumasi Central Pharmacist", phone: "0270000011", email: "kumasi.pharmacy@foodtrace.gh", pharmacy: { businessName: "Kumasi Central Pharmacy", gpcNumber: "GPC/2024/0234", district: "Kumasi", region: "Ashanti" } },
      { fullName: "Accra Health Pharmacist", phone: "0270000012", email: "accra.pharmacy@foodtrace.gh", pharmacy: { businessName: "Accra Health Pharmacy", gpcNumber: "GPC/2024/0456", district: "Accra", region: "Greater Accra" } },
    ];

    const pharmacies = await Promise.all(
      pharmacyData.map(async (pharmacyDataItem) => {
        const user = await client.query(
          `INSERT INTO users (full_name, phone, email, password_hash, role, is_verified, is_active)
           VALUES ($1, $2, $3, $4, 'pharmacist', true, true)
           RETURNING id`,
          [pharmacyDataItem.fullName, pharmacyDataItem.phone, pharmacyDataItem.email, passwordHash]
        );
        const pharmacy = await client.query(
          `INSERT INTO pharmacies (user_id, business_name, ghana_pharmacy_council_number, district, region, is_verified)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING id`,
          [
            user.rows[0].id,
            pharmacyDataItem.pharmacy.businessName,
            pharmacyDataItem.pharmacy.gpcNumber,
            pharmacyDataItem.pharmacy.district,
            pharmacyDataItem.pharmacy.region,
          ]
        );
        return { userId: user.rows[0].id, pharmacyId: pharmacy.rows[0].id };
      })
    );

    const pesticideData = [
      ["Cypermethrin", "Cypermethrin", "approved", ["tomato", "pepper"], 7, "medium", "EPA approved; observe a 7 day withdrawal period."],
      ["Chlorpyrifos", "Chlorpyrifos", "approved", ["maize", "cassava"], 14, "high", "EPA approved; observe a 14 day withdrawal period."],
      ["DDT", "Dichlorodiphenyltrichloroethane", "banned", [], 0, "critical", "EPA banned pesticide for alert testing."],
      ["Mancozeb", "Mancozeb", "approved", ["tomato", "potato"], 7, "medium", "Fungicide with standard precautions."],
      ["Lambda-cyhalothrin", "Lambda-cyhalothrin", "restricted", ["maize"], 10, "high", "Restricted use insecticide."],
      ["Glyphosate", "Glyphosate", "approved", ["maize"], 14, "medium", "Avoid crop contact during application."],
      ["Metalaxyl", "Metalaxyl", "approved", ["cassava", "tomato"], 7, "low", "Seed treatment fungicide."],
      ["Imidacloprid", "Imidacloprid", "restricted", ["pepper"], 14, "high", "Pollinator risk; follow label."],
      ["Copper Hydroxide", "Copper hydroxide", "approved", ["tomato"], 3, "low", "Copper fungicide."],
      ["Atrazine", "Atrazine", "restricted", ["maize"], 21, "medium", "Restricted herbicide."],
    ] as const;

    const pesticideIds: string[] = [];
    for (const pesticideItem of pesticideData) {
      const pesticide = await client.query(
        `INSERT INTO pesticides (name, active_ingredient, epa_status, approved_crops, withdrawal_days, health_risk_level, health_risks, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'seed_dev')
         RETURNING id`,
        [
          pesticideItem[0],
          pesticideItem[1],
          pesticideItem[2],
          pesticideItem[3],
          pesticideItem[4],
          pesticideItem[5],
          pesticideItem[6],
        ]
      );
      pesticideIds.push(pesticide.rows[0].id);
    }

    const drugData = [
      ["Paracetamol 500mg", "Paracetamol", "Ghana Pharma", "FDA-DRUG-1001", "analgesic", "tablet", "500mg", false, false, "approved"],
      ["Amoxicillin 250mg", "Amoxicillin", "Ghana Pharma", "FDA-DRUG-1002", "antibiotic", "capsule", "250mg", true, false, "approved"],
      ["Artesunate 50mg", "Artesunate", "MalariaCare Labs", "FDA-DRUG-1003", "antimalarial", "tablet", "50mg", true, false, "approved"],
      ["Fake Chloroquine", "Chloroquine", "Unknown Maker", "FDA-DRUG-1004", "antimalarial", "tablet", "250mg", true, false, "banned"],
      ["Cetirizine 10mg", "Cetirizine", "CareMeds", "FDA-DRUG-1005", "antihistamine", "tablet", "10mg", false, false, "approved"],
      ["Ibuprofen 400mg", "Ibuprofen", "CareMeds", "FDA-DRUG-1006", "NSAID", "tablet", "400mg", false, false, "approved"],
      ["Metformin 500mg", "Metformin", "Diabeta Labs", "FDA-DRUG-1007", "antidiabetic", "tablet", "500mg", true, false, "approved"],
      ["Diazepam 5mg", "Diazepam", "NeuroCare", "FDA-DRUG-1008", "benzodiazepine", "tablet", "5mg", true, true, "restricted"],
      ["ORS Sachet", "Oral rehydration salts", "HealthPack", "FDA-DRUG-1009", "rehydration", "sachet", "standard", false, false, "approved"],
      ["Cough Syrup DX", "Dextromethorphan", "HealthPack", "FDA-DRUG-1010", "cough suppressant", "syrup", "100ml", false, false, "under_review"],
    ] as const;

    const drugIds: string[] = [];
    for (const drugItem of drugData) {
      const drug = await client.query(
        `INSERT INTO drugs (name, generic_name, manufacturer_name, fda_drug_registration_number, drug_class, dosage_form, strength, requires_prescription, is_controlled, fda_approval_status, storage_conditions, side_effects_summary, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
         RETURNING id`,
        [
          drugItem[0],
          drugItem[1],
          drugItem[2],
          drugItem[3],
          drugItem[4],
          drugItem[5],
          drugItem[6],
          drugItem[7],
          drugItem[8],
          drugItem[9],
          "Store below 25C",
          "Seeded demo medicine. Follow label and clinician guidance.",
        ]
      );
      drugIds.push(drug.rows[0].id);
    }

    const foodProductData = [
      { batchNumber: "FB-1001", productName: "Accra Foods Tomato Paste 400g", farmOrigin: "Kumasi, Ashanti", recallStatus: "active" },
      { batchNumber: "FB-2002", productName: "GoldCoast Sobolo Drink 500ml", farmOrigin: "Sunyani, Brong-Ahafo", recallStatus: "active" },
      { batchNumber: "FB-4004", productName: "GoldCoast Sobolo Drink 500ml - RECALLED", farmOrigin: "Sunyani, Brong-Ahafo", recallStatus: "recalled" },
      { batchNumber: "FB-3003", productName: "Northern Millet Flour 1kg", farmOrigin: "Tamale, Northern", recallStatus: "active" },
      { batchNumber: "FB-5005", productName: "Ashanti Pepper Sauce 250ml", farmOrigin: "Kumasi, Ashanti", recallStatus: "active" },
    ];

    const batchIds: string[] = [];
    for (let i = 0; i < foodProductData.length; i++) {
      const product = foodProductData[i];
      const batch = await client.query(
        `INSERT INTO product_batches (manufacturer_id, batch_number, product_name, farm_origin, ingredient_sources, processing_steps, quality_checks, packaging_date, expiry_date, recall_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE - ($8 || ' days')::interval, CURRENT_DATE + ($9 || ' days')::interval, $10)
         RETURNING id`,
        [
          manufacturers[i % manufacturers.length].manufacturerId,
          product.batchNumber,
          product.productName,
          product.farmOrigin,
          JSON.stringify([{ farmerId: farmers[i % farmers.length].userId, ingredientName: product.productName }]),
          JSON.stringify([{ step: "mix", order: 1 }, { step: "pack", order: 2 }]),
          JSON.stringify([{ check: "visual", result: "pass" }]),
          i + 1,
          365 - i * 10,
          product.recallStatus,
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
