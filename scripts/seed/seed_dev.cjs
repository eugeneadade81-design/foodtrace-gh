const bcrypt = require("bcryptjs");
const { Client } = require("pg");
const dotenv = require("dotenv");
const fs = require("node:fs");
const path = require("node:path");

{
  let dir = process.cwd();
  let loaded = false;
  for (let i = 0; i < 8; i += 1) {
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

async function upsertUser({ fullName, phone, email, role, passwordHash }) {
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1`,
    [email, phone]
  );

  if (existing.rowCount) {
    const updated = await client.query(
      `
      UPDATE users
      SET full_name = $2,
          phone = $3,
          email = $4,
          password_hash = $5,
          role = $6,
          is_verified = true,
          is_active = true
      WHERE id = $1
      RETURNING id
      `,
      [existing.rows[0].id, fullName, phone, email, passwordHash, role]
    );
    return updated.rows[0].id;
  }

  const result = await client.query(
    `
    INSERT INTO users (full_name, phone, email, password_hash, role, is_verified, is_active)
    VALUES ($1, $2, $3, $4, $5, true, true)
    RETURNING id
    `,
    [fullName, phone, email, passwordHash, role]
  );
  return result.rows[0].id;
}

async function getOrCreateFarm(ownerId, farm) {
  const existing = await client.query(
    `SELECT id FROM farms WHERE owner_id = $1 AND name = $2 LIMIT 1`,
    [ownerId, farm.name]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO farms (owner_id, name, district, region, crop_types, verification_status, badge_status)
    VALUES ($1, $2, $3, $4, $5, 'verified', 'certified')
    RETURNING id
    `,
    [ownerId, farm.name, farm.district, farm.region, farm.cropTypes]
  );
  return inserted.rows[0].id;
}

async function getOrCreateCropCycle(farmId, cropType) {
  const existing = await client.query(
    `SELECT id FROM crop_cycles WHERE farm_id = $1 AND crop_type = $2 LIMIT 1`,
    [farmId, cropType]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO crop_cycles (farm_id, crop_type, planting_date, notes, status)
    VALUES ($1, $2, CURRENT_DATE - INTERVAL '30 days', 'Seeded demo crop cycle', 'growing')
    RETURNING id
    `,
    [farmId, cropType]
  );
  return inserted.rows[0].id;
}

async function getOrCreateManufacturer(userId, companyName, fdaRegistrationNumber, sector) {
  const existing = await client.query(`SELECT id FROM manufacturers WHERE user_id = $1 LIMIT 1`, [userId]);
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO manufacturers (user_id, company_name, fda_registration_number, sector, is_verified, subscription_tier)
    VALUES ($1, $2, $3, $4, true, 'small')
    RETURNING id
    `,
    [userId, companyName, fdaRegistrationNumber, sector]
  );
  return inserted.rows[0].id;
}

async function getOrCreatePharmacy(userId, pharmacy) {
  const existing = await client.query(`SELECT id FROM pharmacies WHERE user_id = $1 LIMIT 1`, [userId]);
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO pharmacies (user_id, business_name, ghana_pharmacy_council_number, district, region, is_verified)
    VALUES ($1, $2, $3, $4, $5, true)
    RETURNING id
    `,
    [userId, pharmacy.businessName, pharmacy.gpcNumber, pharmacy.district, pharmacy.region]
  );
  return inserted.rows[0].id;
}

async function getOrCreatePesticide(pesticide) {
  const existing = await client.query(`SELECT id FROM pesticides WHERE LOWER(name) = LOWER($1) LIMIT 1`, [pesticide.name]);
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO pesticides (
      name, active_ingredient, epa_status, approved_crops, withdrawal_days,
      health_risk_level, health_risks, ban_reason, last_updated, source
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), 'seed_dev')
    RETURNING id
    `,
    [
      pesticide.name,
      pesticide.activeIngredient,
      pesticide.epaStatus,
      pesticide.approvedCrops,
      pesticide.withdrawalDays,
      pesticide.healthRiskLevel,
      pesticide.healthRisks,
      pesticide.banReason ?? null,
    ]
  );
  return inserted.rows[0].id;
}

async function getOrCreateDrug(drug) {
  const existing = await client.query(
    `SELECT id FROM drugs WHERE fda_drug_registration_number = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
    [drug.fdaNumber, drug.name]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO drugs (
      name, generic_name, manufacturer_name, fda_drug_registration_number, drug_class,
      dosage_form, strength, requires_prescription, is_controlled, fda_approval_status,
      storage_conditions, side_effects_summary, last_updated
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
    RETURNING id
    `,
    [
      drug.name,
      drug.genericName,
      drug.manufacturerName,
      drug.fdaNumber,
      drug.drugClass,
      drug.dosageForm,
      drug.strength,
      drug.requiresPrescription,
      drug.isControlled,
      drug.fdaApprovalStatus,
      drug.storageConditions,
      drug.sideEffectsSummary,
    ]
  );
  return inserted.rows[0].id;
}

async function getOrCreateProductBatch(manufacturerId, batch) {
  const existing = await client.query(
    `SELECT id FROM product_batches WHERE manufacturer_id = $1 AND batch_number = $2 LIMIT 1`,
    [manufacturerId, batch.batchNumber]
  );
  if (existing.rowCount) {
    await client.query(
      `
      UPDATE product_batches
      SET product_name = $2,
          farm_origin = $3,
          ingredient_sources = $4,
          processing_steps = $5,
          quality_checks = $6,
          recall_status = $7::recall_status,
          recall_reason = $8,
          recalled_at = CASE WHEN $7::recall_status = 'recalled'::recall_status THEN COALESCE(recalled_at, now()) ELSE NULL END
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        batch.productName,
        batch.farmOrigin,
        JSON.stringify(batch.ingredientSources),
        JSON.stringify(batch.processingSteps),
        JSON.stringify(batch.qualityChecks),
        batch.recallStatus,
        batch.recallReason ?? null,
      ]
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `
    INSERT INTO product_batches (
      manufacturer_id, batch_number, product_name, farm_origin, ingredient_sources, processing_steps, quality_checks,
      packaging_date, expiry_date, recall_status, recall_reason, recalled_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '365 days', $8::recall_status, $9, CASE WHEN $8::text = 'recalled' THEN now() ELSE NULL END)
    RETURNING id
    `,
    [
      manufacturerId,
      batch.batchNumber,
      batch.productName,
      batch.farmOrigin,
      JSON.stringify(batch.ingredientSources),
      JSON.stringify(batch.processingSteps),
      JSON.stringify(batch.qualityChecks),
      batch.recallStatus,
      batch.recallReason ?? null,
    ]
  );
  return inserted.rows[0].id;
}

async function getOrCreateQrCode(batchId, codeString, status) {
  const result = await client.query(
    `
    INSERT INTO qr_codes (batch_id, code_string, s3_url, scan_count, status)
    VALUES ($1, $2, $3, 0, $4)
    ON CONFLICT (code_string)
    DO UPDATE SET batch_id = EXCLUDED.batch_id, status = EXCLUDED.status
    RETURNING id
    `,
    [batchId, codeString, `https://s3.example.com/qrcodes/${codeString}.png`, status]
  );
  return result.rows[0].id;
}

async function getOrCreateDrugBatch(drugId, pharmacyId, batch) {
  const existing = await client.query(
    `SELECT id FROM drug_batches WHERE pharmacy_id = $1 AND batch_number = $2 LIMIT 1`,
    [pharmacyId, batch.batchNumber]
  );
  if (existing.rowCount) {
    await client.query(`UPDATE drug_batches SET recall_status = $2 WHERE id = $1`, [existing.rows[0].id, batch.recallStatus]);
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `
    INSERT INTO drug_batches (
      drug_id, pharmacy_id, batch_number, manufacture_date, expiry_date,
      quantity_received, quantity_remaining, supplier_name, recall_status
    )
    VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '180 days', $4, $5, $6, $7)
    RETURNING id
    `,
    [drugId, pharmacyId, batch.batchNumber, batch.quantityReceived, batch.quantityRemaining, batch.supplierName, batch.recallStatus]
  );
  return inserted.rows[0].id;
}

async function getOrCreateDrugQrCode(drugBatchId, codeString, status) {
  const result = await client.query(
    `
    INSERT INTO drug_qr_codes (drug_batch_id, code_string, s3_url, scan_count, status)
    VALUES ($1, $2, $3, 0, $4)
    ON CONFLICT (code_string)
    DO UPDATE SET drug_batch_id = EXCLUDED.drug_batch_id, status = EXCLUDED.status
    RETURNING id
    `,
    [drugBatchId, codeString, `https://s3.example.com/drug-qrcodes/${codeString}.png`, status]
  );
  return result.rows[0].id;
}

async function ensureFoodRecall(batchId, userId, reason) {
  const existing = await client.query(`SELECT id FROM recall_events WHERE batch_id = $1 AND reason = $2 LIMIT 1`, [batchId, reason]);
  if (existing.rowCount) return;

  await client.query(
    `
    INSERT INTO recall_events (batch_id, issued_by, recall_type, reason, scope_districts, notification_sent_at)
    VALUES ($1, $2, 'manufacturer', $3, $4, now())
    `,
    [batchId, userId, reason, ["Accra", "Kumasi"]]
  );
}

async function ensureDrugRecall(drugBatchId, userId, reason) {
  const existing = await client.query(`SELECT id FROM drug_recall_events WHERE drug_batch_id = $1 AND reason = $2 LIMIT 1`, [
    drugBatchId,
    reason,
  ]);
  if (existing.rowCount) return;

  await client.query(
    `INSERT INTO drug_recall_events (drug_batch_id, issued_by, reason) VALUES ($1, $2, $3)`,
    [drugBatchId, userId, reason]
  );
}

async function ensureConsumerScans(qrCodeId, consumerId) {
  const current = await client.query(`SELECT COUNT(*)::int AS total FROM consumer_scans WHERE qr_code_id = $1`, [qrCodeId]);
  const missing = Math.max(5 - Number(current.rows[0]?.total ?? 0), 0);
  for (let i = 0; i < missing; i++) {
    await client.query(
      `INSERT INTO consumer_scans (qr_code_id, user_id, user_agent) VALUES ($1, $2, 'seed_dev')`,
      [qrCodeId, consumerId]
    );
  }
}

async function run() {
  await client.connect();

  try {
    await client.query("BEGIN");
    const passwordHash = await bcrypt.hash("Password123!", 12);

    const consumerId = await upsertUser({
      fullName: "Demo Consumer",
      phone: "0200000001",
      email: "consumer@foodtrace.gh",
      role: "consumer",
      passwordHash,
    });
    const regulatorId = await upsertUser({
      fullName: "FDA Regulator",
      phone: "0200000002",
      email: "regulator@foodtrace.gh",
      role: "regulator",
      passwordHash,
    });

    const farmerData = [
      { fullName: "Kwame Asante", phone: "0240000011", email: "kwame.asante@foodtrace.gh", farm: { name: "Kwame Asante Farm", district: "Kumasi", region: "Ashanti", cropTypes: ["tomato", "pepper"] } },
      { fullName: "Abena Mensah", phone: "0240000012", email: "abena.mensah@foodtrace.gh", farm: { name: "Abena Mensah Farm", district: "Sunyani", region: "Brong-Ahafo", cropTypes: ["maize", "cassava"] } },
      { fullName: "Ibrahim Alhassan", phone: "0240000013", email: "ibrahim.alhassan@foodtrace.gh", farm: { name: "Ibrahim Alhassan Farm", district: "Tamale", region: "Northern", cropTypes: ["yam", "millet"] } },
    ];
    const farmers = [];
    for (const farmer of farmerData) {
      const userId = await upsertUser({ ...farmer, role: "farmer", passwordHash });
      const farmId = await getOrCreateFarm(userId, farmer.farm);
      const cycleId = await getOrCreateCropCycle(farmId, farmer.farm.cropTypes[0]);
      farmers.push({ userId, farmId, cycleId });
    }

    await client.query(
      `
      INSERT INTO input_logs (crop_cycle_id, input_type, product_name, epa_approval_status, application_date, withdrawal_period_days, safe_harvest_date)
      SELECT $1, 'pesticide', 'Cypermethrin', 'approved', CURRENT_DATE - INTERVAL '3 days', 7, CURRENT_DATE + INTERVAL '4 days'
      WHERE NOT EXISTS (SELECT 1 FROM input_logs WHERE crop_cycle_id = $1 AND product_name = 'Cypermethrin')
      `,
      [farmers[0].cycleId]
    );

    const manufacturerUsers = [
      { fullName: "Accra Foods Admin", phone: "0260000011", email: "accra.foods@foodtrace.gh", companyName: "Accra Foods Ltd", fda: "FDA/GH/2024/001", sector: "packaged foods" },
      { fullName: "GoldCoast Naturals Admin", phone: "0260000012", email: "goldcoast.naturals@foodtrace.gh", companyName: "GoldCoast Naturals", fda: "FDA/GH/2024/002", sector: "beverages" },
    ];
    const manufacturers = [];
    for (const manufacturer of manufacturerUsers) {
      const userId = await upsertUser({ ...manufacturer, role: "manufacturer", passwordHash });
      const manufacturerId = await getOrCreateManufacturer(userId, manufacturer.companyName, manufacturer.fda, manufacturer.sector);
      manufacturers.push({ userId, manufacturerId });
    }

    const pharmacyUsers = [
      { fullName: "Kumasi Central Pharmacist", phone: "0270000011", email: "kumasi.pharmacy@foodtrace.gh", pharmacy: { businessName: "Kumasi Central Pharmacy", gpcNumber: "GPC/2024/0234", district: "Kumasi", region: "Ashanti" } },
      { fullName: "Accra Health Pharmacist", phone: "0270000012", email: "accra.pharmacy@foodtrace.gh", pharmacy: { businessName: "Accra Health Pharmacy", gpcNumber: "GPC/2024/0456", district: "Accra", region: "Greater Accra" } },
    ];
    const pharmacies = [];
    for (const pharmacyUser of pharmacyUsers) {
      const userId = await upsertUser({ ...pharmacyUser, role: "pharmacist", passwordHash });
      const pharmacyId = await getOrCreatePharmacy(userId, pharmacyUser.pharmacy);
      pharmacies.push({ userId, pharmacyId });
    }

    const pesticides = [
      ["Cypermethrin", "Cypermethrin", "approved", ["tomato", "pepper"], 7, "medium", "Use PPE and observe withdrawal period."],
      ["Chlorpyrifos", "Chlorpyrifos", "approved", ["maize", "cassava"], 14, "high", "Avoid inhalation and runoff."],
      ["DDT", "Dichlorodiphenyltrichloroethane", "banned", [], 0, "critical", "Banned pesticide.", "Banned due to persistence and health risk."],
      ["Mancozeb", "Mancozeb", "approved", ["tomato", "potato"], 7, "medium", "Fungicide with standard precautions."],
      ["Lambda-cyhalothrin", "Lambda-cyhalothrin", "restricted", ["maize"], 10, "high", "Restricted use insecticide."],
      ["Glyphosate", "Glyphosate", "approved", ["maize"], 14, "medium", "Avoid crop contact during application."],
      ["Metalaxyl", "Metalaxyl", "approved", ["cassava", "tomato"], 7, "low", "Seed treatment fungicide."],
      ["Imidacloprid", "Imidacloprid", "restricted", ["pepper"], 14, "high", "Pollinator risk; follow label."],
      ["Copper Hydroxide", "Copper hydroxide", "approved", ["tomato"], 3, "low", "Copper fungicide."],
      ["Atrazine", "Atrazine", "restricted", ["maize"], 21, "medium", "Restricted herbicide."],
    ];
    for (const item of pesticides) {
      await getOrCreatePesticide({
        name: item[0],
        activeIngredient: item[1],
        epaStatus: item[2],
        approvedCrops: item[3],
        withdrawalDays: item[4],
        healthRiskLevel: item[5],
        healthRisks: item[6],
        banReason: item[7],
      });
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
    ];
    const drugIds = [];
    for (const drug of drugData) {
      drugIds.push(
        await getOrCreateDrug({
          name: drug[0],
          genericName: drug[1],
          manufacturerName: drug[2],
          fdaNumber: drug[3],
          drugClass: drug[4],
          dosageForm: drug[5],
          strength: drug[6],
          requiresPrescription: drug[7],
          isControlled: drug[8],
          fdaApprovalStatus: drug[9],
          storageConditions: "Store below 25C",
          sideEffectsSummary: "Seeded demo medicine. Follow label and clinician guidance.",
        })
      );
    }

    const foodBatches = [
      { manufacturerId: manufacturers[0].manufacturerId, batchNumber: "FB-1001", code: "FT-QR-1001", recallStatus: "active", product: "Accra Foods Tomato Paste 400g", farmOrigin: "Kumasi, Ashanti" },
      { manufacturerId: manufacturers[1].manufacturerId, batchNumber: "FB-2002", code: "FT-QR-2002", recallStatus: "active", product: "GoldCoast Sobolo Drink 500ml", farmOrigin: "Sunyani, Brong-Ahafo" },
      { manufacturerId: manufacturers[1].manufacturerId, batchNumber: "FB-4004", code: "FT-QR-4004", recallStatus: "recalled", product: "GoldCoast Sobolo Drink 500ml - RECALLED", farmOrigin: "Sunyani, Brong-Ahafo", recallReason: "Possible contamination detected during quality review." },
    ];
    let firstQrId = null;
    for (const batch of foodBatches) {
      const batchId = await getOrCreateProductBatch(batch.manufacturerId, {
        batchNumber: batch.batchNumber,
        productName: batch.product,
        farmOrigin: batch.farmOrigin,
        ingredientSources: [{ farmerId: farmers[0].userId, ingredientName: "tomato", product: batch.product }],
        processingSteps: [{ step: "mix", order: 1 }, { step: "pack", order: 2 }],
        qualityChecks: [{ check: "visual", result: "pass" }],
        recallStatus: batch.recallStatus,
        recallReason: batch.recallReason,
      });
      const qrId = await getOrCreateQrCode(batchId, batch.code, batch.recallStatus === "recalled" ? "recalled" : "active");
      if (!firstQrId) firstQrId = qrId;
      if (batch.recallStatus === "recalled") {
        await ensureFoodRecall(batchId, manufacturers[1].userId, batch.recallReason);
      }
    }

    const drugBatches = [
      { drugId: drugIds[0], pharmacyId: pharmacies[0].pharmacyId, batchNumber: "DB-1001", code: "DR-QR-1001", recallStatus: "active" },
      { drugId: drugIds[2], pharmacyId: pharmacies[0].pharmacyId, batchNumber: "DB-2002", code: "DR-QR-2002", recallStatus: "active" },
      { drugId: drugIds[3], pharmacyId: pharmacies[1].pharmacyId, batchNumber: "DB-4004", code: "DR-QR-4004", recallStatus: "recalled", recallReason: "Banned drug test batch." },
    ];
    for (const batch of drugBatches) {
      const drugBatchId = await getOrCreateDrugBatch(batch.drugId, batch.pharmacyId, {
        batchNumber: batch.batchNumber,
        quantityReceived: 100,
        quantityRemaining: 80,
        supplierName: "Seeded Supplier",
        recallStatus: batch.recallStatus,
      });
      await getOrCreateDrugQrCode(drugBatchId, batch.code, batch.recallStatus === "recalled" ? "recalled" : "active");
      if (batch.recallStatus === "recalled") {
        await ensureDrugRecall(drugBatchId, regulatorId, batch.recallReason);
      }
    }

    if (firstQrId) {
      await ensureConsumerScans(firstQrId, consumerId);
    }

    await client.query("COMMIT");
    console.log("Seed data inserted or updated.");
    console.log("Demo password for seeded accounts: Password123!");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
