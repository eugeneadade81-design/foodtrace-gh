import { useEffect, useState } from "react";
import type {
  AuthResponse,
  RegulatorDashboardResponse,
  RegulatorRecallRequest,
  ReviewReportRequest,
} from "@foodtrace/shared";
import { apiBase, readJsonResponse, enableDrugModule } from "../lib/api";
import { styles } from "../lib/styles";

interface Props {
  session: AuthResponse;
}

export function RegulatorSection({ session }: Props) {
  const [regulatorDashboard, setRegulatorDashboard] = useState<RegulatorDashboardResponse | null>(null);
  const [regulatorStatus, setRegulatorStatus] = useState("Regulator portal ready");
  const [reportId, setReportId] = useState("");
  const [reportStatus, setReportStatus] = useState<"reviewing" | "resolved" | "dismissed">("reviewing");
  const [regulatorRecallBatchId, setRegulatorRecallBatchId] = useState("");
  const [regulatorRecallReason, setRegulatorRecallReason] = useState("Public safety issue");
  const [regulatorRecallDistricts, setRegulatorRecallDistricts] = useState("Accra,Kumasi");
  const [regulatorRecallDomain, setRegulatorRecallDomain] = useState<"food" | "drug">("food");

  useEffect(() => { void loadRegulatorDashboard(); }, []);

  async function loadRegulatorDashboard() {
    setRegulatorStatus("Loading regulator dashboard...");
    try {
      const response = await fetch(`${apiBase}/regulator/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await readJsonResponse(response)) as { dashboard: RegulatorDashboardResponse; error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load regulator dashboard");

      setRegulatorDashboard(data.dashboard);
      setRegulatorStatus("Regulator dashboard loaded.");
      if (!reportId && data.dashboard.reports[0]?.id) setReportId(data.dashboard.reports[0].id);
      if (!regulatorRecallBatchId && data.dashboard.recalls[0]?.batchId) setRegulatorRecallBatchId(data.dashboard.recalls[0].batchId);
    } catch (error) {
      setRegulatorStatus(error instanceof Error ? error.message : "Could not load regulator dashboard");
    }
  }

  async function reviewRegulatorReport() {
    const payload: ReviewReportRequest = { reportId, status: reportStatus };
    setRegulatorStatus("Updating report...");
    const response = await fetch(`${apiBase}/regulator/reports`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not update report");
    await loadRegulatorDashboard();
  }

  async function createRegulatorRecall() {
    const payload: RegulatorRecallRequest = {
      batchId: regulatorRecallBatchId,
      reason: regulatorRecallReason,
      scopeDistricts: regulatorRecallDistricts.split(",").map((s) => s.trim()).filter(Boolean),
      domain: regulatorRecallDomain,
    };
    setRegulatorStatus("Issuing regulator recall...");
    const response = await fetch(`${apiBase}/regulator/recalls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not issue regulator recall");
    await loadRegulatorDashboard();
  }

  return (
    <section style={styles.foodCard}>
      <p style={styles.scanKicker}>Regulator dashboard</p>
      <h2 style={styles.scanTitle}>FDA oversight, report review, and emergency recall.</h2>
      <p style={styles.scanBody}>
        Traceability health across farms, manufacturers, reports, and recalls — with direct regulator actions.
      </p>
      <div style={styles.foodButtons}>
        <button type="button" style={styles.primaryButton} onClick={() => void loadRegulatorDashboard()}>Load regulator dashboard</button>
        <button type="button" style={styles.sampleButton} onClick={() => void reviewRegulatorReport()}>Review report</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createRegulatorRecall()}>Issue recall</button>
      </div>
      <div style={styles.foodFormGrid}>
        <input value={reportId} onChange={(e) => setReportId(e.target.value)} style={styles.scanInput} placeholder="Report ID" />
        <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value as typeof reportStatus)} style={styles.scanInput}>
          <option value="reviewing">reviewing</option>
          <option value="resolved">resolved</option>
          <option value="dismissed">dismissed</option>
        </select>
        <input value={regulatorRecallBatchId} onChange={(e) => setRegulatorRecallBatchId(e.target.value)} style={styles.scanInput} placeholder="Batch ID for regulator recall" />
        <input value={regulatorRecallReason} onChange={(e) => setRegulatorRecallReason(e.target.value)} style={styles.scanInput} placeholder="Regulator recall reason" />
        <input value={regulatorRecallDistricts} onChange={(e) => setRegulatorRecallDistricts(e.target.value)} style={styles.scanInput} placeholder="Regulator recall districts comma separated" />
        <select value={regulatorRecallDomain} onChange={(e) => setRegulatorRecallDomain(e.target.value as typeof regulatorRecallDomain)} style={styles.scanInput}>
          <option value="food">food recall</option>
          {enableDrugModule ? <option value="drug">drug recall</option> : null}
        </select>
      </div>
      <p style={styles.status}>{regulatorStatus}</p>
      {regulatorDashboard ? (
        <article style={styles.resultCard}>
          <h3 style={styles.resultTitle}>Compliance overview</h3>
          <p style={styles.resultSummary}>
            Farms: {regulatorDashboard.compliance.farms} | Manufacturers: {regulatorDashboard.compliance.manufacturers}
            {enableDrugModule ? ` | Pharmacies: ${regulatorDashboard.compliance.pharmacies}` : ""}
          </p>
          <p style={styles.resultSummary}>
            Food recalls: {regulatorDashboard.compliance.foodRecalls}
            {enableDrugModule ? ` | Drug recalls: ${regulatorDashboard.compliance.drugRecalls}` : ""}
          </p>
          <p style={styles.resultSummary}>
            Reports pending: {regulatorDashboard.compliance.pendingReports} | Reviewing: {regulatorDashboard.compliance.reviewingReports} | Resolved: {regulatorDashboard.compliance.resolvedReports}
          </p>
          <p style={styles.resultSummary}>
            Scans safe: {regulatorDashboard.compliance.safeScans} | Caution: {regulatorDashboard.compliance.cautionScans} | Recalled: {regulatorDashboard.compliance.recalledScans}
          </p>
          <p style={styles.resultSummary}>
            Total scans: {regulatorDashboard.analytics.totalScans} | High risk alerts: {regulatorDashboard.analytics.highRiskAlerts}
          </p>
          <p style={styles.resultSummary}>Top districts: {regulatorDashboard.analytics.topDistricts.join(", ") || "None yet"}</p>
          <p style={styles.resultSummary}>Latest report: {regulatorDashboard.reports[0]?.description ?? "None yet"}</p>
          <p style={styles.resultSummary}>Latest recall: {regulatorDashboard.recalls[0]?.reason ?? "None yet"}</p>
        </article>
      ) : null}
      {regulatorDashboard ? (
        <article style={styles.resultCard}>
          <h3 style={styles.resultTitle}>Violation alerts</h3>
          {regulatorDashboard.alerts.slice(0, 4).map((alert) => (
            <p key={alert.id} style={styles.resultSummary}>
              [{alert.source}] {alert.title}: {alert.description}
            </p>
          ))}
        </article>
      ) : null}
    </section>
  );
}
