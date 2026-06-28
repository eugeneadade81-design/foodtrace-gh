/**
 * SafetyResultScreen.tsx
 *
 * Displays the full-screen safety result after a QR scan.
 * Background colour reflects the safety status:
 *   safe     → #1B5E20  (deep green)
 *   caution  → #E65100  (deep orange)
 *   recalled → #7F0000  (deep red)
 *
 * Audio summary is played AUTOMATICALLY via expo-speech (with a Google TTS
 * fallback through the backend) as soon as the screen mounts.
 */

import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import type { DrugScanResult, ProductScanResult, SpeechSummaryResponse } from "@foodtrace/shared";

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

type ScanResult = ProductScanResult | DrugScanResult;

type SafetyResultScreenProps = {
  /** The decoded scan result returned by the backend. */
  result: ScanResult;
  /** Active language for TTS: "en" or "tw" (Twi). */
  scanLanguage: "en" | "tw";
  /** Base URL of the backend API, e.g. "http://192.168.x.x:3000/api". */
  apiBase: string;
  /** Navigate back to the scanner. */
  onBack: () => void;
  /** Navigate to the scan history screen. */
  onViewHistory: () => void;
  /** Navigate to the consumer report screen. */
  onReport: () => void;
  /** Navigate to the AI helper tab with the product pre-loaded as context. */
  onAskAI?: (prefill: string) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the full-screen background hex for each scan status. */
function backgroundForStatus(status: ProductScanResult["status"]): string {
  switch (status) {
    case "safe":
      return "#1B5E20";
    case "caution":
      return "#E65100";
    case "recalled":
      return "#7F0000";
    default:
      return "#1a2228";
  }
}

/** Returns a human-readable label for each scan status. */
function labelForStatus(status: ProductScanResult["status"]): string {
  switch (status) {
    case "safe":
      return "✓  SAFE";
    case "caution":
      return "⚠  CAUTION";
    case "recalled":
      return "✕  RECALLED";
    default:
      return status.toUpperCase();
  }
}

/** Big symbol shown inside the circular status icon. */
function iconForStatus(status: ProductScanResult["status"]): string {
  switch (status) {
    case "safe":
      return "✓";
    case "caution":
      return "!";
    case "recalled":
      return "✕";
    default:
      return "?";
  }
}

/**
 * Builds the spoken summary sentence.
 * Prefers the backend-crafted `audioSummary` field; falls back to
 * concatenating title + summary + recommendedAction.
 */
function buildSpeechText(result: ScanResult, language: "en" | "tw"): string {
  if (language === "tw" && (result as any).audioSummaryTwi) return (result as any).audioSummaryTwi;
  if (result.audioSummary) return result.audioSummary;
  const parts = [result.title, result.summary, result.recommendedAction].filter(Boolean);
  return parts.join(" ").trim();
}

/** Builds a contextual question for the AI assistant about this scan result. */
function buildAiPrefill(result: ScanResult): string {
  const name = "drugName" in result && result.drugName ? result.drugName : (result as ProductScanResult).productName ?? result.title;
  const batch = result.batchNumber ? ` (batch ${result.batchNumber})` : "";
  return `I just scanned a product called "${name}"${batch} and got a ${result.status.toUpperCase()} result. ${result.summary} What should I do?`;
}

/** Narrows a result to check whether it carries drug-specific fields. */
function isDrugResult(result: ScanResult): result is DrugScanResult {
  return "drugName" in result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SafetyResultScreen({
  result,
  scanLanguage,
  apiBase,
  onBack,
  onViewHistory,
  onReport,
  onAskAI,
}: SafetyResultScreenProps) {
  const bgColor = backgroundForStatus(result.status);
  const statusLabel = labelForStatus(result.status);
  const statusIcon = iconForStatus(result.status);

  // ── Entrance animation for the status icon ────────────────────────────────
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [iconScale, iconOpacity]);

  // ── Auto-play audio on mount ──────────────────────────────────────────────

  /**
   * Attempt to play the spoken summary through the backend Google TTS
   * endpoint. Falls back to the on-device expo-speech engine when the
   * network call fails or the backend is unavailable.
   */
  const playGoogleTTS = useCallback(
    async (text: string): Promise<void> => {
      const response = await fetch(`${apiBase}/audio/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: scanLanguage }),
      });

      const data = (await readJsonResponse(response)) as SpeechSummaryResponse & {
        error?: unknown;
      };

      if (!response.ok || !data.audioBase64) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Google TTS unavailable"
        );
      }

      // Allow audio to play even when the iOS silent switch is on.
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:${data.mimeType};base64,${data.audioBase64}` },
        { shouldPlay: true }
      );

      // Unload the sound object once playback finishes to free memory.
      sound.setOnPlaybackStatusUpdate((status) => {
        if ("didJustFinish" in status && status.didJustFinish) {
          void sound.unloadAsync();
        }
      });
    },
    [apiBase, scanLanguage]
  );

  /** Device TTS fallback via expo-speech. */
  const speakFallback = useCallback(
    (text: string): void => {
      Speech.stop();
      Speech.speak(text, {
        language: scanLanguage === "tw" ? "tw" : "en-US",
        rate: 0.95,
      });
    },
    [scanLanguage]
  );

  /** Entry-point: try Google TTS, fall back to device TTS on any error. */
  const playSummary = useCallback(async (): Promise<void> => {
    const text = buildSpeechText(result, scanLanguage);
    if (!text) return;

    try {
      await playGoogleTTS(text);
    } catch {
      speakFallback(text);
    }
  }, [result, scanLanguage, playGoogleTTS, speakFallback]);

  // Trigger audio automatically when the screen mounts.
  useEffect(() => {
    void playSummary();

    // Stop any in-progress speech when the component unmounts.
    return () => {
      Speech.stop();
    };
  }, [playSummary]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ backgroundColor: bgColor }}
      contentContainerStyle={[styles.container, { backgroundColor: bgColor }]}
    >
      {/* ── Animated status icon ── */}
      <Animated.View style={[styles.iconCircle, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
        <Text style={styles.iconText}>{statusIcon}</Text>
      </Animated.View>

      {/* ── Status badge ── */}
      <View style={styles.statusBadge}>
        <Text style={styles.statusLabel}>{statusLabel}</Text>
      </View>

      {/* ── Product title & summary ── */}
      <Text style={styles.title}>{result.title}</Text>
      <Text style={styles.summary}>{result.summary}</Text>

      {/* ── Detail rows ── */}
      <View style={styles.detailCard}>
        {isDrugResult(result) && result.drugName ? (
          <DetailRow label="Drug" value={result.drugName} />
        ) : null}

        <DetailRow label="Batch" value={result.batchNumber ?? "N/A"} />
        <DetailRow label="Manufacturer" value={result.manufacturerName ?? "N/A"} />
        <DetailRow label="Expiry" value={result.expiryDate ?? "N/A"} />

        {result.recommendedAction ? (
          <View style={styles.actionRow}>
            <Text style={styles.actionLabel}>Recommended action</Text>
            <Text style={styles.actionText}>{result.recommendedAction}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        {/* Replay the audio summary on demand */}
        <Pressable style={styles.secondaryButton} onPress={() => void playSummary()}>
          <Text style={styles.secondaryButtonText}>🔊  Play audio again</Text>
        </Pressable>

        {onAskAI ? (
          <Pressable style={styles.ghostButton} onPress={() => onAskAI(buildAiPrefill(result))}>
            <Text style={styles.ghostButtonText}>Ask AI about this product</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.ghostButton} onPress={onReport}>
          <Text style={styles.ghostButtonText}>Report a concern</Text>
        </Pressable>

        <Pressable style={styles.ghostButton} onPress={onViewHistory}>
          <Text style={styles.ghostButtonText}>View scan history</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Scan another</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    gap: 16,
  },
  iconCircle: {
    alignSelf: "center",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  iconText: {
    color: "#ffffff",
    fontSize: 50,
    fontWeight: "800",
    lineHeight: 56,
  },
  statusBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 8,
  },
  statusLabel: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  summary: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingBottom: 8,
  },
  detailLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  detailValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  actionRow: {
    paddingTop: 4,
  },
  actionLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  controls: {
    marginTop: 8,
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  ghostButton: {
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  ghostButtonText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  backButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    fontSize: 15,
  },
});
