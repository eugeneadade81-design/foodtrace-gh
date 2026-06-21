/**
 * ConsumerReportScreen.tsx
 *
 * Allows an authenticated consumer to submit a concern about a previously
 * scanned food or drug product.
 *
 * Endpoint: POST {apiBase}/scan/{code}/report
 * Payload : { description, district, photoUrl? }
 *
 * Guards:
 *   - Requires a valid session token (shows a login prompt otherwise).
 *   - Requires a product code to have been scanned (shows a prompt otherwise).
 *   - Validates that a description and district are provided before submitting.
 */

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { SubmitConsumerReportResponse } from "@foodtrace/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

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

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

type ConsumerReportScreenProps = {
  /** Base URL of the backend API. */
  apiBase: string;
  /** JWT bearer token; null if the user is not logged in. */
  token: string | null;
  /**
   * Code string from the most recently scanned product.
   * Null when no scan has been performed in this session.
   */
  scannedCode: string | null;
  /** Navigate back to the previous screen. */
  onBack: () => void;
  /** Navigate to the scanner so the user can first scan a product. */
  onGoToScanner: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ConsumerReportScreen({
  apiBase,
  token,
  scannedCode,
  onBack,
  onGoToScanner,
}: ConsumerReportScreenProps) {
  const [description, setDescription] = useState(
    "The product looks damaged and the label is unclear."
  );
  const [district, setDistrict] = useState("Accra");
  const [photoUrl, setPhotoUrl] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Validation ────────────────────────────────────────────────────────────

  /** Returns a map of field → error message. Empty map means valid. */
  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!description.trim()) {
      errors["description"] = "Please describe the issue.";
    } else if (description.trim().length < 10) {
      errors["description"] = "Description must be at least 10 characters.";
    }
    if (!district.trim()) {
      errors["district"] = "Please enter your district.";
    }
    if (photoUrl.trim() && !photoUrl.trim().startsWith("http")) {
      errors["photoUrl"] = "Photo URL must start with http:// or https://";
    }
    return errors;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  /**
   * POSTs the report to the backend.
   * Uses the scannedCode to identify the product being reported.
   */
  async function submitReport(): Promise<void> {
    // Clear previous errors.
    setFieldErrors({});

    // Guard: must be logged in.
    if (!token) {
      setStatusMessage("Please log in to submit a report.");
      setSubmissionStatus("error");
      return;
    }

    // Guard: must have scanned a product first.
    if (!scannedCode) {
      setStatusMessage("Scan a product before submitting a report.");
      setSubmissionStatus("error");
      return;
    }

    // Client-side validation.
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmissionStatus("submitting");
    setStatusMessage("Submitting your report…");

    try {
      const response = await fetch(
        `${apiBase}/scan/${encodeURIComponent(scannedCode.trim().toUpperCase())}/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            description: description.trim(),
            district: district.trim(),
            photoUrl: photoUrl.trim() || null,
          }),
        }
      );

      const data = (await readJsonResponse(response)) as SubmitConsumerReportResponse & {
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not submit report"
        );
      }

      // Success — reset the photo URL; keep description/district for
      // convenience in case the user wants to follow up on the same product.
      setPhotoUrl("");
      setStatusMessage(
        `Report submitted successfully. Status: ${data.report.status}.`
      );
      setSubmissionStatus("success");
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Could not submit report"
      );
      setSubmissionStatus("error");
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  /** Renders an inline field-level error below an input. */
  function FieldError({ field }: { field: string }) {
    if (!fieldErrors[field]) return null;
    return <Text style={styles.fieldError}>{fieldErrors[field]}</Text>;
  }

  // ── Guard renders ─────────────────────────────────────────────────────────

  if (!token) {
    return (
      <View style={styles.gateContainer}>
        <Text style={styles.gateIcon}>🔒</Text>
        <Text style={styles.gateTitle}>Login required</Text>
        <Text style={styles.gateBody}>
          You must be logged in as a consumer to submit a report.
        </Text>
        <Pressable style={styles.primaryButton} onPress={onBack}>
          <Text style={styles.primaryButtonText}>Go to login</Text>
        </Pressable>
      </View>
    );
  }

  if (!scannedCode) {
    return (
      <View style={styles.gateContainer}>
        <Text style={styles.gateIcon}>📷</Text>
        <Text style={styles.gateTitle}>Scan a product first</Text>
        <Text style={styles.gateBody}>
          You need to scan a product QR code before you can report a concern
          about it.
        </Text>
        <Pressable style={styles.primaryButton} onPress={onGoToScanner}>
          <Text style={styles.primaryButtonText}>Open scanner</Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={onBack}>
          <Text style={styles.ghostButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#05080b" }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Consumer report</Text>
            <Text style={styles.title}>Report a concern</Text>
          </View>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        </View>

        <Text style={styles.body}>
          Help keep Ghana's food and drug supply safe. Your report is reviewed
          by our team and forwarded to the relevant regulators.
        </Text>

        {/* ── Product code indicator ── */}
        <View style={styles.productBadge}>
          <Text style={styles.productBadgeLabel}>Reporting on</Text>
          <Text style={styles.productBadgeCode}>{scannedCode}</Text>
        </View>

        {/* ── Form fields ── */}
        <View style={styles.formCard}>
          {/* Description */}
          <Text style={styles.label}>
            Describe the issue{" "}
            <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, fieldErrors["description"] && styles.inputError]}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setFieldErrors((prev) => ({ ...prev, description: "" }));
            }}
            placeholder="e.g. The product looks damaged and the label is unclear."
            placeholderTextColor="#748089"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <FieldError field="description" />

          {/* District */}
          <Text style={styles.label}>
            Your district <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, fieldErrors["district"] && styles.inputError]}
            value={district}
            onChangeText={(text) => {
              setDistrict(text);
              setFieldErrors((prev) => ({ ...prev, district: "" }));
            }}
            placeholder="e.g. Accra, Kumasi"
            placeholderTextColor="#748089"
          />
          <FieldError field="district" />

          {/* Photo URL (optional) */}
          <Text style={styles.label}>Photo URL (optional)</Text>
          <TextInput
            style={[styles.input, fieldErrors["photoUrl"] && styles.inputError]}
            value={photoUrl}
            onChangeText={(text) => {
              setPhotoUrl(text);
              setFieldErrors((prev) => ({ ...prev, photoUrl: "" }));
            }}
            placeholder="https://example.com/photo.jpg"
            placeholderTextColor="#748089"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <FieldError field="photoUrl" />

          {/* Submit button */}
          <Pressable
            style={[
              styles.submitButton,
              submissionStatus === "submitting" && styles.disabledButton,
              submissionStatus === "success" && styles.successButton,
            ]}
            onPress={() => void submitReport()}
            disabled={submissionStatus === "submitting"}
          >
            <Text style={styles.submitButtonText}>
              {submissionStatus === "submitting"
                ? "Submitting…"
                : submissionStatus === "success"
                ? "✓  Report submitted"
                : "Submit report"}
            </Text>
          </Pressable>

          {/* Status message */}
          {statusMessage ? (
            <Text
              style={[
                styles.statusMessage,
                submissionStatus === "success" && styles.statusSuccess,
                submissionStatus === "error" && styles.statusError,
              ]}
            >
              {statusMessage}
            </Text>
          ) : null}
        </View>

        {/* ── Privacy note ── */}
        <Text style={styles.privacyNote}>
          Your report is tied to your account so our team can follow up if
          needed. Reports are never shared publicly.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#05080b",
    gap: 14,
  },

  // ── Gate screens ──
  gateContainer: {
    flex: 1,
    backgroundColor: "#05080b",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  gateIcon: {
    fontSize: 48,
  },
  gateTitle: {
    color: "#f4f4ef",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  gateBody: {
    color: "#748089",
    lineHeight: 20,
    textAlign: "center",
  },

  // ── Header ──
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#182028",
    borderRadius: 999,
  },
  backButtonText: {
    color: "#d5ddd9",
    fontWeight: "600",
  },
  body: {
    color: "#b4c3be",
    lineHeight: 20,
  },

  // ── Product badge ──
  productBadge: {
    backgroundColor: "#10161b",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(119,199,162,0.25)",
  },
  productBadgeLabel: {
    color: "#748089",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  productBadgeCode: {
    color: "#77c7a2",
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Form ──
  formCard: {
    backgroundColor: "#10161b",
    borderRadius: 20,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  label: {
    color: "#d0dbd7",
    fontWeight: "600",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 4,
  },
  required: {
    color: "#f7a0a0",
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
  textArea: {
    minHeight: 110,
  },
  inputError: {
    borderColor: "rgba(247,162,162,0.5)",
  },
  fieldError: {
    color: "#f7a0a0",
    fontSize: 12,
    marginTop: 2,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: "#77c7a2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  successButton: {
    backgroundColor: "#3d9970",
  },
  disabledButton: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: "#062014",
    fontWeight: "700",
    fontSize: 15,
  },
  statusMessage: {
    color: "#a8c1b6",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  statusSuccess: {
    color: "#77c7a2",
  },
  statusError: {
    color: "#f7a0a0",
  },

  // ── Shared buttons ──
  primaryButton: {
    backgroundColor: "#77c7a2",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#062014",
    fontWeight: "700",
  },
  ghostButton: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 32,
  },
  ghostButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },

  // ── Footer ──
  privacyNote: {
    color: "#748089",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
