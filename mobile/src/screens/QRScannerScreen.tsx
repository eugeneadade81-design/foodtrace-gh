/**
 * QRScannerScreen.tsx
 *
 * Camera-based QR code scanner for both food and drug product codes.
 *
 * Flow:
 *   1. User points device camera at a FoodTrace GH QR code.
 *   2. Decoded value is parsed to determine kind ("food" | "drug") and code.
 *   3. GET {apiBase}/api/qr/scan/{code} is called.
 *   4. On success, onScanResult is invoked so App.tsx can show SafetyResultScreen.
 *   5. On failure, an inline error message is shown and the scanner resumes.
 *
 * A text fallback input lets users type or paste a code manually when the
 * camera cannot read it (low light, damaged label, etc.).
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { DrugScanResult, ProductScanResult } from "@foodtrace/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

type ScanKind = "food" | "drug";

type ParsedTarget = {
  kind: ScanKind;
  codeString: string;
};

type ScanResult = ProductScanResult | DrugScanResult;

type QRScannerScreenProps = {
  /** Base URL of the backend API, e.g. "http://192.168.x.x:3000/api". */
  apiBase: string;
  /** JWT bearer token, null when the user is a guest. */
  token: string | null;
  /** Active language: "en" or "tw". Used for UI copy only here. */
  scanLanguage: "en" | "tw";
  /** Called with the parsed result when a scan succeeds. */
  onScanResult: (result: ScanResult, kind: ScanKind) => void;
};

// ─── Sample codes for quick testing ──────────────────────────────────────────

const FOOD_SAMPLE_CODES = ["FT-QR-1001", "FT-QR-2002", "FT-QR-4004"];
const DRUG_SAMPLE_CODE = "DR-QR-1001";

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "The server returned an empty response."
        : `The server returned ${response.status} ${response.statusText || "without details"}. Check the API URL and backend logs.`
    );
  }

  try {
    const data = JSON.parse(text) as T & {
      error?: unknown;
      message?: unknown;
      detail?: unknown;
      title?: unknown;
    };

    if (!response.ok) {
      const message = [data.error, data.message, data.detail, data.title].find((value) => typeof value === "string");
      throw new Error(typeof message === "string" ? message : `Request failed with status ${response.status}.`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && !error.message.includes("Unexpected")) {
      throw error;
    }
    throw new Error(`The server returned a response the app could not read. Status: ${response.status}.`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parses a raw QR code string or URL into a { kind, codeString } target.
 * Handles both bare codes (FT-QR-1001) and full scan URLs returned by some
 * QR generators (https://example.com/scan/FT-QR-1001?batchId=…).
 */
function parseScannerTarget(raw: string): ParsedTarget | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/\s+/g, "");

  try {
    const url = new URL(normalized);
    const segments = url.pathname
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => decodeURIComponent(s));

    const queryCode =
      url.searchParams.get("batchId") ??
      url.searchParams.get("drugBatchId") ??
      url.searchParams.get("code") ??
      url.searchParams.get("id") ??
      url.searchParams.get("qr");

    const lowerSegments = segments.map((s) => s.toLowerCase());
    const kind: ScanKind = lowerSegments.some((s) => s.includes("drug"))
      ? "drug"
      : "food";

    const lastSegment = segments[segments.length - 1] ?? "";
    const codeString = (queryCode ?? lastSegment).trim();

    return codeString ? { kind, codeString: codeString.toUpperCase() } : null;
  } catch {
    const upper = normalized.toUpperCase();
    if (
      upper.startsWith("DR-") ||
      upper.includes("/DRUGS/") ||
      upper.includes("DR-QR-")
    ) {
      return { kind: "drug", codeString: upper };
    }
    return { kind: "food", codeString: upper };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QRScannerScreen({
  apiBase,
  token,
  scanLanguage,
  onScanResult,
}: QRScannerScreenProps) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState("FT-QR-1001");
  const [loading, setLoading] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to scan");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer ref so we can clear the camera-resume timeout on unmount.
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request camera permission on first render if not yet decided.
  useEffect(() => {
    if (cameraPermission === null) {
      void requestCameraPermission();
    }
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [cameraPermission, requestCameraPermission]);

  // ── Scan logic ────────────────────────────────────────────────────────────

  /**
   * Core fetch function: calls the backend scan endpoint and returns the
   * parsed result.  Throws on network error or non-OK response.
   */
  async function fetchScanResult(
    code: string,
    kind: ScanKind
  ): Promise<ScanResult> {
    const encodedCode = encodeURIComponent(code.trim().toUpperCase());

    const endpoint =
      kind === "drug"
        ? `${apiBase}/drug/scan/${encodedCode}`
        : `${apiBase}/scan/${encodedCode}`;

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(endpoint, { headers });
    const data = (await readJsonResponse(response)) as
      | { result: ProductScanResult }
      | { result: DrugScanResult }
      | { error?: unknown };

    if (!response.ok) {
      const msg =
        "error" in data && typeof data.error === "string"
          ? data.error
          : "Scan failed";
      throw new Error(msg);
    }

    return (data as { result: ScanResult }).result;
  }

  /**
   * High-level scan handler.  Parses the raw code string, calls the backend,
   * and either forwards the result to the parent or shows an error message.
   */
  async function handleScan(raw: string): Promise<void> {
    if (loading || scannerPaused) return;

    const target = parseScannerTarget(raw);
    if (!target) {
      setErrorMessage("Could not read a valid QR code from that input.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(
      `Checking ${target.kind === "drug" ? "drug" : "food"} code ${target.codeString}…`
    );

    try {
      const result = await fetchScanResult(target.codeString, target.kind);
      onScanResult(result, target.kind);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      setErrorMessage(msg);
      setStatusMessage("Scan failed — please try again.");
      // Resume camera after a short delay so the user can retry.
      scheduleResume(2500);
    } finally {
      setLoading(false);
    }
  }

  /** Called by the CameraView when a barcode is detected. */
  async function handleBarcodeScanned({ data }: { data: string }) {
    if (loading || scannerPaused) return;
    // Pause the scanner to avoid duplicate rapid scans.
    setScannerPaused(true);
    setStatusMessage(`QR detected: ${data}`);
    await handleScan(data);
    // Resume after a delay whether the scan succeeded or not (error path
    // calls scheduleResume itself, so guard against double-scheduling).
    if (!errorMessage) scheduleResume(2200);
  }

  /** Schedule scanner re-activation after a fixed delay. */
  function scheduleResume(ms: number) {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setScannerPaused(false);
      resumeTimerRef.current = null;
    }, ms);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>QR Scanner</Text>
      <Text style={styles.title}>Point at a FoodTrace GH label.</Text>
      <Text style={styles.body}>
        The camera reads food and drug QR codes automatically. Use the text
        input below if the camera cannot read the label.
      </Text>

      {/* ── Camera viewport ── */}
      <View style={styles.cameraFrame}>
        {cameraPermission?.granted ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={
              scannerPaused || loading ? undefined : handleBarcodeScanned
            }
          />
        ) : (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              {cameraPermission === null
                ? "Requesting camera access…"
                : "Camera access is required to scan QR codes."}
            </Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => void requestCameraPermission()}
            >
              <Text style={styles.secondaryButtonText}>Grant camera access</Text>
            </Pressable>
          </View>
        )}

        {/* Overlay status strip */}
        <View style={styles.overlay}>
          {loading ? (
            <ActivityIndicator color="#77c7a2" size="small" style={{ marginBottom: 4 }} />
          ) : null}
          <Text style={styles.overlayTitle}>
            {scannerPaused
              ? "Scanner paused"
              : loading
              ? "Checking code…"
              : "Live — ready to scan"}
          </Text>
          <Text style={styles.overlayBody}>
            {scannerPaused
              ? "Scan registered. Resuming shortly…"
              : "Align the QR code within the frame."}
          </Text>
        </View>
      </View>

      {/* ── Camera controls ── */}
      <View style={styles.rowWrap}>
        <Pressable
          style={styles.chip}
          onPress={() => setScannerPaused((p) => !p)}
        >
          <Text style={styles.chipText}>
            {scannerPaused ? "Resume scanner" : "Pause scanner"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => void requestCameraPermission()}
        >
          <Text style={styles.chipText}>Refresh permission</Text>
        </Pressable>
      </View>

      {/* ── Status / error ── */}
      <Text style={styles.statusText}>{statusMessage}</Text>
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {/* ── Text fallback ── */}
      <View style={styles.fallbackCard}>
        <Text style={styles.fallbackTitle}>Type or paste a code</Text>
        <Text style={styles.fallbackBody}>
          Use this when the camera cannot read the label.
        </Text>
        <TextInput
          style={styles.input}
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="e.g. FT-QR-1001 or DR-QR-1001"
          placeholderTextColor="#748089"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Pressable
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={() => void handleScan(manualCode)}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Checking…" : "Scan this code"}
          </Text>
        </Pressable>

        {/* Quick-access sample codes */}
        <View style={styles.sampleRow}>
          {FOOD_SAMPLE_CODES.map((code) => (
            <Pressable
              key={code}
              style={styles.sampleChip}
              onPress={() => void handleScan(code)}
            >
              <Text style={styles.sampleChipText}>{code}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.sampleChip, styles.drugChip]}
            onPress={() => void handleScan(DRUG_SAMPLE_CODE)}
          >
            <Text style={styles.sampleChipText}>{DRUG_SAMPLE_CODE}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Language indicator ── */}
      <Text style={styles.footerNote}>
        Audio language: {scanLanguage === "tw" ? "Twi" : "English"}
      </Text>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#05080b",
    gap: 12,
  },
  kicker: {
    color: "#93b9ac",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    color: "#f4f4ef",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  body: {
    color: "#b4c3be",
    lineHeight: 20,
    marginBottom: 4,
  },
  cameraFrame: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#05080b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minHeight: 300,
  },
  camera: {
    width: "100%",
    height: 300,
  },
  permissionBox: {
    minHeight: 300,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#0b0f13",
  },
  permissionText: {
    color: "#d0dbd7",
    textAlign: "center",
    lineHeight: 20,
  },
  overlay: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(5,8,11,0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  overlayTitle: {
    color: "#f4f4ef",
    fontWeight: "700",
    marginBottom: 2,
  },
  overlayBody: {
    color: "#b4c3be",
    fontSize: 13,
    lineHeight: 18,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#182028",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  chipText: {
    color: "#d5ddd9",
    fontSize: 13,
  },
  statusText: {
    color: "#a8c1b6",
    fontSize: 13,
  },
  errorText: {
    color: "#f7a0a0",
    fontSize: 13,
    fontWeight: "600",
  },
  fallbackCard: {
    backgroundColor: "#10161b",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  fallbackTitle: {
    color: "#f4f4ef",
    fontWeight: "700",
    fontSize: 16,
  },
  fallbackBody: {
    color: "#748089",
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: "#0b0f13",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f4f4ef",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  primaryButton: {
    backgroundColor: "#77c7a2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#062014",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
  secondaryButton: {
    backgroundColor: "#182028",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#d5ddd9",
    fontWeight: "600",
  },
  sampleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sampleChip: {
    backgroundColor: "#0b0f13",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  drugChip: {
    borderColor: "rgba(230,81,0,0.35)",
  },
  sampleChipText: {
    color: "#a8c1b6",
    fontSize: 12,
  },
  footerNote: {
    color: "#748089",
    fontSize: 12,
    textAlign: "center",
  },
});
