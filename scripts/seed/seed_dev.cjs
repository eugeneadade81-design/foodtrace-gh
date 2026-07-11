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
          recalled_at = CASE WHEN $7::recall_status = 'recalled'::recall_status THEN COALESCE(recalled_at, now()) ELSE NULL END,
          image_url = COALESCE($9, image_url)
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
        batch.imageUrl ?? null,
      ]
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `
    INSERT INTO product_batches (
      manufacturer_id, batch_number, product_name, farm_origin, ingredient_sources, processing_steps, quality_checks,
      packaging_date, expiry_date, recall_status, recall_reason, recalled_at, image_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '365 days', $8::recall_status, $9, CASE WHEN $8::text = 'recalled' THEN now() ELSE NULL END, $10)
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
      batch.imageUrl ?? null,
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
    await client.query(
      `UPDATE drug_batches SET recall_status = $2, image_url = COALESCE($3, image_url) WHERE id = $1`,
      [existing.rows[0].id, batch.recallStatus, batch.imageUrl ?? null]
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `
    INSERT INTO drug_batches (
      drug_id, pharmacy_id, batch_number, manufacture_date, expiry_date,
      quantity_received, quantity_remaining, supplier_name, recall_status, image_url
    )
    VALUES ($1, $2, $3, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '180 days', $4, $5, $6, $7, $8)
    RETURNING id
    `,
    [drugId, pharmacyId, batch.batchNumber, batch.quantityReceived, batch.quantityRemaining, batch.supplierName, batch.recallStatus, batch.imageUrl ?? null]
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
      { manufacturerId: manufacturers[0].manufacturerId, batchNumber: "FB-1001", code: "FT-QR-1001", recallStatus: "active", product: "Accra Foods Tomato Paste 400g", farmOrigin: "Kumasi, Ashanti", imageUrl: "data:image/jpeg;base64,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" },
      { manufacturerId: manufacturers[1].manufacturerId, batchNumber: "FB-2002", code: "FT-QR-2002", recallStatus: "active", product: "GoldCoast Sobolo Drink 500ml", farmOrigin: "Sunyani, Brong-Ahafo", imageUrl: "data:image/jpeg;base64,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" },
      { manufacturerId: manufacturers[1].manufacturerId, batchNumber: "FB-4004", code: "FT-QR-4004", recallStatus: "recalled", product: "GoldCoast Sobolo Drink 500ml - RECALLED", farmOrigin: "Sunyani, Brong-Ahafo", recallReason: "Possible contamination detected during quality review.", imageUrl: "data:image/jpeg;base64,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" },
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
        imageUrl: batch.imageUrl,
      });
      const qrId = await getOrCreateQrCode(batchId, batch.code, batch.recallStatus === "recalled" ? "recalled" : "active");
      if (!firstQrId) firstQrId = qrId;
      if (batch.recallStatus === "recalled") {
        await ensureFoodRecall(batchId, manufacturers[1].userId, batch.recallReason);
      }
    }

    const drugBatches = [
      { drugId: drugIds[0], pharmacyId: pharmacies[0].pharmacyId, batchNumber: "DB-1001", code: "DR-QR-1001", recallStatus: "active", imageUrl: "data:image/jpeg;base64,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" },
      { drugId: drugIds[2], pharmacyId: pharmacies[0].pharmacyId, batchNumber: "DB-2002", code: "DR-QR-2002", recallStatus: "active", imageUrl: "data:image/jpeg;base64,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" },
      { drugId: drugIds[3], pharmacyId: pharmacies[1].pharmacyId, batchNumber: "DB-4004", code: "DR-QR-4004", recallStatus: "recalled", recallReason: "Banned drug test batch.", imageUrl: "data:image/jpeg;base64,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" },
    ];
    for (const batch of drugBatches) {
      const drugBatchId = await getOrCreateDrugBatch(batch.drugId, batch.pharmacyId, {
        batchNumber: batch.batchNumber,
        quantityReceived: 100,
        quantityRemaining: 80,
        supplierName: "Seeded Supplier",
        recallStatus: batch.recallStatus,
        imageUrl: batch.imageUrl,
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
