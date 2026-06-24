import { useEffect, useState } from "react";
import type {
  AuthResponse,
  CreateManufacturerProfileRequest,
  CreateProductBatchRequest,
  CreateProductBatchResponse,
  CreateRecallRequest,
  ManufacturerDashboardResponse,
} from "@foodtrace/shared";
import { apiBase, readJsonResponse, resolveAssetUrl } from "../lib/api";
import { styles } from "../lib/styles";

interface Props {
  session: AuthResponse;
}

export function ManufacturerSection({ session }: Props) {
  const [manufacturerDashboard, setManufacturerDashboard] = useState<ManufacturerDashboardResponse | null>(null);
  const [manufacturerStatus, setManufacturerStatus] = useState("Manufacturer portal ready");
  const [companyName, setCompanyName] = useState("FoodTrace Foods Ltd");
  const [fdaRegNumber, setFdaRegNumber] = useState("FDA-12345");
  const [manufacturerSector, setManufacturerSector] = useState("food");
  const [subscriptionTier, setSubscriptionTier] = useState<"micro" | "small" | "medium" | "large">("small");
  const [batchNumber, setBatchNumber] = useState("FB-1001");
  const [batchProductName, setBatchProductName] = useState("Tomato Paste 400g");
  const [batchFarmOrigin, setBatchFarmOrigin] = useState("Ejisu, Ashanti");
  const [packagingDate, setPackagingDate] = useState("2026-05-01");
  const [expiryDate, setExpiryDate] = useState("2027-05-01");
  const [ingredientSources, setIngredientSources] = useState("farm inputs");
  const [processingSteps, setProcessingSteps] = useState("mix,heat,pack");
  const [qualityChecks, setQualityChecks] = useState("visual pass");
  const [recallBatchId, setRecallBatchId] = useState("");
  const [recallReason, setRecallReason] = useState("Possible contamination");
  const [recallType, setRecallType] = useState<"manufacturer" | "regulator">("manufacturer");
  const [recallScopeDistricts, setRecallScopeDistricts] = useState("Accra,Kumasi");
  const [latestCreatedQr, setLatestCreatedQr] = useState<CreateProductBatchResponse["qrCode"] | null>(null);

  useEffect(() => { void loadManufacturerDashboard(); }, []);

  async function loadManufacturerDashboard() {
    setManufacturerStatus("Loading manufacturer dashboard...");
    try {
      const response = await fetch(`${apiBase}/manufacturer/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await readJsonResponse(response)) as { dashboard: ManufacturerDashboardResponse; error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load manufacturer dashboard");

      setManufacturerDashboard(data.dashboard);
      setManufacturerStatus(data.dashboard.profile ? "Manufacturer dashboard loaded." : "Create a manufacturer profile to continue.");
      if (!recallBatchId && data.dashboard.batches[0]?.id) setRecallBatchId(data.dashboard.batches[0].id);
    } catch (error) {
      setManufacturerStatus(error instanceof Error ? error.message : "Could not load manufacturer dashboard");
    }
  }

  async function createManufacturerProfile() {
    const payload: CreateManufacturerProfileRequest = {
      companyName,
      fdaRegistrationNumber: fdaRegNumber || null,
      sector: manufacturerSector,
      subscriptionTier,
    };
    setManufacturerStatus("Creating manufacturer profile...");
    const response = await fetch(`${apiBase}/manufacturer/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create manufacturer profile");
    await loadManufacturerDashboard();
  }

  async function createManufacturerBatch() {
    const payload: CreateProductBatchRequest = {
      batchNumber,
      productName: batchProductName,
      farmOrigin: batchFarmOrigin,
      ingredientSources: [ingredientSources],
      processingSteps: processingSteps.split(",").map((s) => s.trim()).filter(Boolean),
      qualityChecks: [qualityChecks],
      packagingDate,
      expiryDate,
    };
    setManufacturerStatus("Creating batch and QR...");
    const response = await fetch(`${apiBase}/manufacturer/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as CreateProductBatchResponse & { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create batch");
    setManufacturerStatus(`Batch created. QR: ${data.qrCode.codeString}`);
    setLatestCreatedQr(data.qrCode);
    await loadManufacturerDashboard();
  }

  async function copyLatestQrCode() {
    if (!latestCreatedQr?.codeString) { setManufacturerStatus("Create a batch first to get a QR code."); return; }
    try {
      await navigator.clipboard.writeText(latestCreatedQr.codeString);
      setManufacturerStatus(`Copied QR code ${latestCreatedQr.codeString}.`);
    } catch {
      setManufacturerStatus(`QR code: ${latestCreatedQr.codeString}`);
    }
  }

  async function createManufacturerRecall() {
    const payload: CreateRecallRequest = {
      batchId: recallBatchId,
      recallType,
      reason: recallReason,
      scopeDistricts: recallScopeDistricts.split(",").map((s) => s.trim()).filter(Boolean),
    };
    setManufacturerStatus("Creating recall...");
    const response = await fetch(`${apiBase}/manufacturer/recalls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create recall");
    await loadManufacturerDashboard();
  }

  return (
    <section style={styles.foodCard}>
      <p style={styles.scanKicker}>Manufacturer portal</p>
      <h2 style={styles.scanTitle}>Batch creation, QR generation, and recalls.</h2>
      <p style={styles.scanBody}>
        Create a profile first, then build batches, produce QR labels, and issue recalls when needed.
      </p>
      <div style={styles.foodButtons}>
        <button type="button" style={styles.primaryButton} onClick={() => void loadManufacturerDashboard()}>Load manufacturer dashboard</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createManufacturerProfile()}>Create profile</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createManufacturerBatch()}>Create batch</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createManufacturerRecall()}>Issue recall</button>
      </div>
      <div style={styles.foodFormGrid}>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={styles.scanInput} placeholder="Company name" />
        <input value={fdaRegNumber} onChange={(e) => setFdaRegNumber(e.target.value)} style={styles.scanInput} placeholder="FDA registration number" />
        <input value={manufacturerSector} onChange={(e) => setManufacturerSector(e.target.value)} style={styles.scanInput} placeholder="Sector" />
        <select value={subscriptionTier} onChange={(e) => setSubscriptionTier(e.target.value as typeof subscriptionTier)} style={styles.scanInput}>
          <option value="micro">micro</option>
          <option value="small">small</option>
          <option value="medium">medium</option>
          <option value="large">large</option>
        </select>
        <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} style={styles.scanInput} placeholder="Batch number" />
        <input value={batchProductName} onChange={(e) => setBatchProductName(e.target.value)} style={styles.scanInput} placeholder="Product name" />
        <input value={batchFarmOrigin} onChange={(e) => setBatchFarmOrigin(e.target.value)} style={styles.scanInput} placeholder="Farm origin" />
        <input value={packagingDate} onChange={(e) => setPackagingDate(e.target.value)} style={styles.scanInput} placeholder="Packaging date YYYY-MM-DD" />
        <input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={styles.scanInput} placeholder="Expiry date YYYY-MM-DD" />
        <input value={recallBatchId} onChange={(e) => setRecallBatchId(e.target.value)} style={styles.scanInput} placeholder="Recall batch ID" />
        <input value={recallReason} onChange={(e) => setRecallReason(e.target.value)} style={styles.scanInput} placeholder="Recall reason" />
        <input value={ingredientSources} onChange={(e) => setIngredientSources(e.target.value)} style={styles.scanInput} placeholder="Ingredient sources" />
        <input value={processingSteps} onChange={(e) => setProcessingSteps(e.target.value)} style={styles.scanInput} placeholder="Processing steps comma separated" />
        <input value={qualityChecks} onChange={(e) => setQualityChecks(e.target.value)} style={styles.scanInput} placeholder="Quality checks" />
        <input value={recallScopeDistricts} onChange={(e) => setRecallScopeDistricts(e.target.value)} style={styles.scanInput} placeholder="Recall scope districts comma separated" />
        <select value={recallType} onChange={(e) => setRecallType(e.target.value as typeof recallType)} style={styles.scanInput}>
          <option value="manufacturer">manufacturer</option>
          <option value="regulator">regulator</option>
        </select>
      </div>
      <p style={styles.status}>{manufacturerStatus}</p>
      {latestCreatedQr ? (
        <article style={styles.qrCard}>
          <div>
            <p style={styles.scanKicker}>Generated QR</p>
            <h3 style={styles.resultTitle}>{latestCreatedQr.codeString}</h3>
            <p style={styles.resultSummary}>Use this QR code on the batch label. A consumer scan will resolve to the batch safety record.</p>
            <div style={styles.foodButtons}>
              <button type="button" style={styles.sampleButton} onClick={() => void copyLatestQrCode()}>Copy code</button>
              {resolveAssetUrl(latestCreatedQr.url) ? (
                <a style={styles.linkButton} href={resolveAssetUrl(latestCreatedQr.url) ?? undefined} download>Download QR</a>
              ) : null}
            </div>
          </div>
          {resolveAssetUrl(latestCreatedQr.url) ? (
            <img src={resolveAssetUrl(latestCreatedQr.url) ?? undefined} alt={`FoodTrace QR code ${latestCreatedQr.codeString}`} style={styles.qrImage} />
          ) : null}
        </article>
      ) : null}
      {manufacturerDashboard ? (
        <article style={styles.resultCard}>
          <h3 style={styles.resultTitle}>Manufacturer metrics</h3>
          <p style={styles.resultSummary}>
            Batches: {manufacturerDashboard.metrics.batches} | QR codes: {manufacturerDashboard.metrics.qrCodes} | Recalls: {manufacturerDashboard.metrics.recalls}
          </p>
          <p style={styles.resultSummary}>Active recalls: {manufacturerDashboard.metrics.activeRecalls}</p>
          <p style={styles.resultSummary}>Profile: {manufacturerDashboard.profile?.companyName ?? "No profile yet"}</p>
          <p style={styles.resultSummary}>Latest batch: {manufacturerDashboard.batches[0]?.batchNumber ?? "None yet"}</p>
          <p style={styles.resultSummary}>Latest QR: {manufacturerDashboard.batches[0]?.qrCode ?? "None yet"}</p>
          <p style={styles.resultSummary}>Latest recall: {manufacturerDashboard.recalls[0]?.reason ?? "None yet"}</p>
        </article>
      ) : null}
    </section>
  );
}
