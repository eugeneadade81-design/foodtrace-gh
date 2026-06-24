import { useEffect, useState } from "react";
import type {
  AuthResponse,
  CreateDrugBatchRequest,
  CreateDrugBatchResponse,
  CreateDrugRecordRequest,
  CreateDrugRecallRequest,
  DrugDashboardResponse,
  DrugScanResult,
  RegisterPharmacyRequest,
} from "@foodtrace/shared";
import { apiBase, readJsonResponse } from "../lib/api";
import { styles } from "../lib/styles";

interface Props {
  session: AuthResponse | null;
  isPharmacist: boolean;
  drugScanCode: string;
  setDrugScanCode: (v: string) => void;
  drugScanResult: DrugScanResult | null;
  drugScanStatus: string;
  onScanDrug: () => void;
}

export function DrugSection({ session, isPharmacist, drugScanCode, setDrugScanCode, drugScanResult, drugScanStatus, onScanDrug }: Props) {
  const [pharmacyDashboard, setPharmacyDashboard] = useState<DrugDashboardResponse | null>(null);
  const [pharmacyStatus, setPharmacyStatus] = useState("Pharmacy portal ready");
  const [businessName, setBusinessName] = useState("MediCare Pharmacy");
  const [gpcNumber, setGpcNumber] = useState("GPC-1001");
  const [pharmacyDistrict, setPharmacyDistrict] = useState("Kumasi");
  const [pharmacyRegion, setPharmacyRegion] = useState("Ashanti");
  const [drugName, setDrugName] = useState("Amoxicillin");
  const [drugGenericName, setDrugGenericName] = useState("Amoxicillin");
  const [drugManufacturer, setDrugManufacturer] = useState("ACME Pharma");
  const [drugFdaNumber, setDrugFdaNumber] = useState("FDA-DRUG-1001");
  const [drugClass, setDrugClass] = useState("antibiotic");
  const [drugDosageForm, setDrugDosageForm] = useState("capsule");
  const [drugStrength, setDrugStrength] = useState("500mg");
  const [drugRequiresPrescription, setDrugRequiresPrescription] = useState(true);
  const [drugIsControlled, setDrugIsControlled] = useState(false);
  const [drugApprovalStatus, setDrugApprovalStatus] = useState<"approved" | "banned" | "restricted" | "under_review" | "not_approved">("approved");
  const [drugStorage, setDrugStorage] = useState("Store below 25C");
  const [drugSideEffects, setDrugSideEffects] = useState("Nausea");
  const [drugBatchNumber, setDrugBatchNumber] = useState("DB-1001");
  const [drugManufactureDate, setDrugManufactureDate] = useState("2026-05-01");
  const [drugExpiryDate, setDrugExpiryDate] = useState("2027-05-01");
  const [drugQuantityReceived, setDrugQuantityReceived] = useState("100");
  const [drugQuantityRemaining, setDrugQuantityRemaining] = useState("95");
  const [drugSupplierName, setDrugSupplierName] = useState("Global Med Supplies");
  const [drugRecallBatchId, setDrugRecallBatchId] = useState("");
  const [drugRecallReason, setDrugRecallReason] = useState("Quality issue");

  useEffect(() => {
    if (isPharmacist && session?.token) void loadPharmacyDashboard();
  }, []);

  async function loadPharmacyDashboard() {
    if (!session?.token) return;
    setPharmacyStatus("Loading pharmacy dashboard...");
    try {
      const response = await fetch(`${apiBase}/drug/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await readJsonResponse(response)) as { dashboard: DrugDashboardResponse; error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load pharmacy dashboard");
      setPharmacyDashboard(data.dashboard);
      setPharmacyStatus(data.dashboard.pharmacy ? "Pharmacy dashboard loaded." : "Register a pharmacy to continue.");
      if (!drugRecallBatchId && data.dashboard.batches[0]?.id) setDrugRecallBatchId(data.dashboard.batches[0].id);
    } catch (error) {
      setPharmacyStatus(error instanceof Error ? error.message : "Could not load pharmacy dashboard");
    }
  }

  async function registerPharmacy() {
    if (!session?.token) return;
    const payload: RegisterPharmacyRequest = { businessName, ghanaPharmacyCouncilNumber: gpcNumber, district: pharmacyDistrict, region: pharmacyRegion };
    setPharmacyStatus("Registering pharmacy...");
    const response = await fetch(`${apiBase}/drug/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not register pharmacy");
    await loadPharmacyDashboard();
  }

  async function createDrugRecord() {
    if (!session?.token) return;
    const payload: CreateDrugRecordRequest = {
      name: drugName,
      genericName: drugGenericName,
      manufacturerName: drugManufacturer,
      fdaDrugRegistrationNumber: drugFdaNumber,
      drugClass,
      dosageForm: drugDosageForm,
      strength: drugStrength,
      requiresPrescription: drugRequiresPrescription,
      isControlled: drugIsControlled,
      fdaApprovalStatus: drugApprovalStatus,
      storageConditions: drugStorage,
      sideEffectsSummary: drugSideEffects,
    };
    setPharmacyStatus("Creating drug record...");
    const response = await fetch(`${apiBase}/drug/drugs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create drug record");
    await loadPharmacyDashboard();
  }

  async function createDrugBatch() {
    if (!session?.token) return;
    const pharmacyDrugId = pharmacyDashboard?.drugs[0]?.id;
    if (!pharmacyDrugId) { setPharmacyStatus("Create or load a drug record first."); return; }
    const payload: CreateDrugBatchRequest = {
      drugId: pharmacyDrugId,
      batchNumber: drugBatchNumber,
      manufactureDate: drugManufactureDate,
      expiryDate: drugExpiryDate,
      quantityReceived: Number(drugQuantityReceived),
      quantityRemaining: Number(drugQuantityRemaining),
      supplierName: drugSupplierName,
    };
    setPharmacyStatus("Creating drug batch and QR...");
    const response = await fetch(`${apiBase}/drug/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as CreateDrugBatchResponse & { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create drug batch");
    setPharmacyStatus(`Drug batch created. QR: ${data.qrCode.codeString}`);
    await loadPharmacyDashboard();
  }

  async function createDrugRecall() {
    if (!session?.token) return;
    const payload: CreateDrugRecallRequest = { batchId: drugRecallBatchId, reason: drugRecallReason };
    setPharmacyStatus("Creating drug recall...");
    const response = await fetch(`${apiBase}/drug/recalls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create drug recall");
    await loadPharmacyDashboard();
  }

  return (
    <section style={styles.foodCard}>
      <p style={styles.scanKicker}>Drug module</p>
      <h2 style={styles.scanTitle}>{isPharmacist ? "Pharmacy registration, batches, and drug scans." : "Drug QR scan."}</h2>
      <p style={styles.scanBody}>
        {isPharmacist
          ? "Register the pharmacy, log drug records and batches, generate QR codes, and scan public drug QR labels."
          : "Scan a medicine QR code to check approval, expiry, recall status, and the recommended action."}
      </p>
      {isPharmacist ? (
        <>
          <div style={styles.foodButtons}>
            <button type="button" style={styles.primaryButton} onClick={() => void loadPharmacyDashboard()}>Load pharmacy dashboard</button>
            <button type="button" style={styles.sampleButton} onClick={() => void registerPharmacy()}>Register pharmacy</button>
            <button type="button" style={styles.sampleButton} onClick={() => void createDrugRecord()}>Create drug</button>
            <button type="button" style={styles.sampleButton} onClick={() => void createDrugBatch()}>Create batch</button>
            <button type="button" style={styles.sampleButton} onClick={() => void createDrugRecall()}>Issue recall</button>
          </div>
          <div style={styles.foodFormGrid}>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={styles.scanInput} placeholder="Business name" />
            <input value={gpcNumber} onChange={(e) => setGpcNumber(e.target.value)} style={styles.scanInput} placeholder="Pharmacy council number" />
            <input value={pharmacyDistrict} onChange={(e) => setPharmacyDistrict(e.target.value)} style={styles.scanInput} placeholder="District" />
            <input value={pharmacyRegion} onChange={(e) => setPharmacyRegion(e.target.value)} style={styles.scanInput} placeholder="Region" />
            <input value={drugName} onChange={(e) => setDrugName(e.target.value)} style={styles.scanInput} placeholder="Drug name" />
            <input value={drugGenericName} onChange={(e) => setDrugGenericName(e.target.value)} style={styles.scanInput} placeholder="Generic name" />
            <input value={drugManufacturer} onChange={(e) => setDrugManufacturer(e.target.value)} style={styles.scanInput} placeholder="Drug manufacturer" />
            <input value={drugFdaNumber} onChange={(e) => setDrugFdaNumber(e.target.value)} style={styles.scanInput} placeholder="FDA drug number" />
            <input value={drugClass} onChange={(e) => setDrugClass(e.target.value)} style={styles.scanInput} placeholder="Drug class" />
            <input value={drugDosageForm} onChange={(e) => setDrugDosageForm(e.target.value)} style={styles.scanInput} placeholder="Dosage form" />
            <input value={drugStrength} onChange={(e) => setDrugStrength(e.target.value)} style={styles.scanInput} placeholder="Strength" />
            <select value={String(drugRequiresPrescription)} onChange={(e) => setDrugRequiresPrescription(e.target.value === "true")} style={styles.scanInput}>
              <option value="true">requires prescription</option>
              <option value="false">over the counter</option>
            </select>
            <select value={String(drugIsControlled)} onChange={(e) => setDrugIsControlled(e.target.value === "true")} style={styles.scanInput}>
              <option value="false">not controlled</option>
              <option value="true">controlled</option>
            </select>
            <select value={drugApprovalStatus} onChange={(e) => setDrugApprovalStatus(e.target.value as typeof drugApprovalStatus)} style={styles.scanInput}>
              <option value="approved">approved</option>
              <option value="restricted">restricted</option>
              <option value="banned">banned</option>
              <option value="under_review">under review</option>
              <option value="not_approved">not approved</option>
            </select>
            <input value={drugStorage} onChange={(e) => setDrugStorage(e.target.value)} style={styles.scanInput} placeholder="Storage conditions" />
            <input value={drugSideEffects} onChange={(e) => setDrugSideEffects(e.target.value)} style={styles.scanInput} placeholder="Side effects summary" />
            <input value={drugBatchNumber} onChange={(e) => setDrugBatchNumber(e.target.value)} style={styles.scanInput} placeholder="Batch number" />
            <input value={drugManufactureDate} onChange={(e) => setDrugManufactureDate(e.target.value)} style={styles.scanInput} placeholder="Manufacture date YYYY-MM-DD" />
            <input value={drugExpiryDate} onChange={(e) => setDrugExpiryDate(e.target.value)} style={styles.scanInput} placeholder="Expiry date YYYY-MM-DD" />
            <input value={drugQuantityReceived} onChange={(e) => setDrugQuantityReceived(e.target.value)} style={styles.scanInput} placeholder="Quantity received" />
            <input value={drugQuantityRemaining} onChange={(e) => setDrugQuantityRemaining(e.target.value)} style={styles.scanInput} placeholder="Quantity remaining" />
            <input value={drugSupplierName} onChange={(e) => setDrugSupplierName(e.target.value)} style={styles.scanInput} placeholder="Supplier name" />
            <input value={drugRecallBatchId} onChange={(e) => setDrugRecallBatchId(e.target.value)} style={styles.scanInput} placeholder="Drug batch ID for recall" />
            <input value={drugRecallReason} onChange={(e) => setDrugRecallReason(e.target.value)} style={styles.scanInput} placeholder="Drug recall reason" />
          </div>
        </>
      ) : null}
      <div style={styles.scanInputRow}>
        <input value={drugScanCode} onChange={(e) => setDrugScanCode(e.target.value)} style={styles.scanInput} placeholder="DR-QR-1001" />
        <button type="button" style={styles.primaryButton} onClick={onScanDrug}>Scan drug</button>
      </div>
      <p style={styles.status}>{drugScanStatus}</p>
      {isPharmacist ? <p style={styles.status}>{pharmacyStatus}</p> : null}
      {drugScanResult ? (
        <article style={styles.resultCard}>
          <h3 style={styles.resultTitle}>{drugScanResult.title}</h3>
          <p style={styles.resultSummary}>{drugScanResult.summary}</p>
          <p style={styles.resultSummary}>Drug: {drugScanResult.drugName ?? "N/A"}</p>
          <p style={styles.resultSummary}>Batch: {drugScanResult.batchNumber ?? "N/A"}</p>
          <p style={styles.resultSummary}>Manufacturer: {drugScanResult.manufacturerName ?? "N/A"}</p>
          <p style={styles.resultSummary}>Expiry: {drugScanResult.expiryDate ?? "N/A"}</p>
          <p style={styles.resultSummary}>{drugScanResult.recommendedAction}</p>
        </article>
      ) : null}
      {isPharmacist && pharmacyDashboard ? (
        <article style={styles.resultCard}>
          <h3 style={styles.resultTitle}>Pharmacy metrics</h3>
          <p style={styles.resultSummary}>
            Drugs: {pharmacyDashboard.metrics.drugs} | Batches: {pharmacyDashboard.metrics.batches} | QR codes: {pharmacyDashboard.metrics.qrCodes} | Recalls: {pharmacyDashboard.metrics.recalls}
          </p>
          <p style={styles.resultSummary}>Pharmacy: {pharmacyDashboard.pharmacy?.businessName ?? "No pharmacy yet"}</p>
          <p style={styles.resultSummary}>Latest batch: {pharmacyDashboard.batches[0]?.batchNumber ?? "None yet"}</p>
          <p style={styles.resultSummary}>Latest QR: {pharmacyDashboard.batches[0]?.qrCode ?? "None yet"}</p>
          <p style={styles.resultSummary}>Latest recall: {pharmacyDashboard.recalls[0]?.reason ?? "None yet"}</p>
        </article>
      ) : null}
    </section>
  );
}
