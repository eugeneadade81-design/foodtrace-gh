import { useState } from "react";
import type { AuthResponse, ProductScanResult, SubmitConsumerReportResponse } from "@foodtrace/shared";
import { apiBase, readJsonResponse, getFriendlyErrorMessage, showDemoMode } from "../lib/api";
import { styles, scanBadgeStyle } from "../lib/styles";
import { sampleCodes } from "../lib/constants";

interface Props {
  session: AuthResponse | null;
  scanCode: string;
  setScanCode: (v: string) => void;
  scanResult: ProductScanResult | null;
  scanLoading: boolean;
  scanStatus: string;
  onScan: () => void;
}

export function ConsumerScanSection({ session, scanCode, setScanCode, scanResult, scanLoading, scanStatus, onScan }: Props) {
  const [reportDescription, setReportDescription] = useState("The product looks damaged and the label is unclear.");
  const [reportDistrict, setReportDistrict] = useState("Accra");
  const [reportPhoto, setReportPhoto] = useState<File | null>(null);
  const [reportStatusText, setReportStatusText] = useState("Ready to submit a consumer report");

  async function submitConsumerReport() {
    const code = (scanResult?.codeString ?? scanCode).trim();
    if (!session?.token) { setReportStatusText("Log in as a consumer first."); return; }
    if (!code) { setReportStatusText("Scan a product before reporting."); return; }

    setReportStatusText("Submitting report...");
    try {
      const body = new FormData();
      body.append("description", reportDescription);
      body.append("district", reportDistrict);
      if (reportPhoto) body.append("photo", reportPhoto);

      const response = await fetch(`${apiBase}/scan/${encodeURIComponent(code)}/report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body,
      });
      const data = (await readJsonResponse(response)) as SubmitConsumerReportResponse & { error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not submit report");

      setReportStatusText(`Report submitted: ${data.report.status}`);
      setReportPhoto(null);
    } catch (error) {
      setReportStatusText(error instanceof Error ? error.message : "Could not submit report");
    }
  }

  return (
    <section style={styles.scanCard}>
      <p style={styles.scanKicker}>Consumer scan</p>
      <h2 style={styles.scanTitle}>Check a code and see the safety result.</h2>
      <p style={styles.scanBody}>
        Enter a QR or batch code from a package. The backend returns a status, summary, and recommended action.
      </p>
      <div style={styles.scanInputRow}>
        <input
          value={scanCode}
          onChange={(e) => setScanCode(e.target.value)}
          style={styles.scanInput}
          placeholder="FT-QR-1001"
        />
        <button type="button" style={styles.primaryButton} onClick={onScan} disabled={scanLoading}>
          {scanLoading ? "Scanning..." : "Scan"}
        </button>
      </div>
      {showDemoMode ? (
        <div style={styles.sampleRow}>
          {sampleCodes.map((code) => (
            <button key={code} type="button" style={styles.sampleButton} onClick={() => { setScanCode(code); onScan(); }}>
              {code}
            </button>
          ))}
        </div>
      ) : null}
      <p style={styles.status}>{scanStatus}</p>
      {scanResult ? (
        <article style={styles.resultCard}>
          <div style={scanBadgeStyle(scanResult.status)}>{scanResult.status.toUpperCase()}</div>
          <h3 style={styles.resultTitle}>{scanResult.title}</h3>
          <p style={styles.resultSummary}>{scanResult.summary}</p>
          <dl style={styles.resultGrid}>
            <div><dt>Batch</dt><dd>{scanResult.batchNumber ?? "N/A"}</dd></div>
            <div><dt>Manufacturer</dt><dd>{scanResult.manufacturerName ?? "N/A"}</dd></div>
            <div><dt>Packaging</dt><dd>{scanResult.packagingDate ?? "N/A"}</dd></div>
            <div><dt>Expiry</dt><dd>{scanResult.expiryDate ?? "N/A"}</dd></div>
          </dl>
          <p style={styles.action}>{scanResult.recommendedAction}</p>
        </article>
      ) : null}
      <article style={styles.resultCard}>
        <h3 style={styles.resultTitle}>Report concern</h3>
        <p style={styles.resultSummary}>Add a description and attach a photo so the consumer report is ready for review.</p>
        <div style={styles.foodFormGrid}>
          <textarea
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            style={{ ...styles.scanInput, minHeight: 110, gridColumn: "1 / -1" }}
            placeholder="Describe the issue"
          />
          <input value={reportDistrict} onChange={(e) => setReportDistrict(e.target.value)} style={styles.scanInput} placeholder="District" />
          <input type="file" accept="image/*" onChange={(e) => setReportPhoto(e.target.files?.[0] ?? null)} style={styles.scanInput} />
        </div>
        <button type="button" style={styles.primaryButton} onClick={() => void submitConsumerReport()}>
          Submit consumer report
        </button>
        <p style={styles.status}>{reportStatusText}</p>
      </article>
    </section>
  );
}
