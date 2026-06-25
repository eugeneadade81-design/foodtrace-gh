import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Constants from "expo-constants";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import AsyncStorage from "expo-sqlite/kv-store";
import {
  USER_ROLES,
  type AuthResponse,
  type CreateCropCycleRequest,
  type CreateFarmRequest,
  type CreateInputLogRequest,
  type CreateDrugBatchRequest,
  type CreateDrugBatchResponse,
  type CreateDrugRecordRequest,
  type CreateDrugRecallRequest,
  type CreateManufacturerProfileRequest,
  type CreateProductBatchRequest,
  type CreateProductBatchResponse,
  type CreateRecallRequest,
  type FoodDashboardResponse,
  type DrugDashboardResponse,
  type DrugScanResult,
  type ManufacturerDashboardResponse,
  type OfflineSyncRequest,
  type ProductScanResult,
  type RegisterPharmacyRequest,
  type RegulatorDashboardResponse,
  type RegulatorRecallRequest,
  type ReviewReportRequest,
  type UserRole,
  type SpeechSummaryResponse,
} from "@foodtrace/shared";
import {
  QRScannerScreen,
  SafetyResultScreen,
  ScanHistoryScreen,
  ConsumerReportScreen,
} from "./src/screens";

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeApiBase(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function resolveDefaultApiBase() {
  const constants = Constants as typeof Constants & {
    expoConfig?: { hostUri?: string; extra?: { apiBaseUrl?: string } };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
    manifest?: { debuggerHost?: string };
  };
  const configured = constants.expoConfig?.extra?.apiBaseUrl?.trim();
  if (configured) return configured;
  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoClient?.hostUri ??
    constants.manifest?.debuggerHost ??
    null;
  if (hostUri) {
    const rawHost = hostUri.includes("://") ? new URL(hostUri).hostname : hostUri.split(":")[0];
    if (rawHost) return `http://${rawHost}:3000/api`;
  }
  return Platform.OS === "android" ? "http://10.0.2.2:3000/api" : "http://localhost:3000/api";
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "The server returned an empty response."
        : `Server error ${response.status}. Check your connection and try again.`
    );
  }
  try {
    const data = JSON.parse(text) as T & { error?: unknown; message?: unknown; detail?: unknown; title?: unknown };
    if (!response.ok) {
      const msg = [data.error, data.message, data.detail, data.title].find((v) => typeof v === "string");
      throw new Error(typeof msg === "string" ? msg : `Request failed (${response.status}).`);
    }
    return data;
  } catch (error) {
    if (error instanceof Error && !error.message.includes("Unexpected")) throw error;
    throw new Error(`Could not read server response (status ${response.status}).`);
  }
}

// ─── constants ───────────────────────────────────────────────────────────────

const defaultApiBase = resolveDefaultApiBase();
const consumerHistoryKey = "foodtrace.consumer.history.v1";
const apiBaseKey = "foodtrace.apiBase.v1";

const roleLabels: Record<string, string> = {
  consumer: "Consumer",
  farmer: "Farmer",
  manufacturer: "Manufacturer",
  regulator: "Regulator",
  pharmacist: "Pharmacist",
};

const roleDescriptions: Record<string, string> = {
  consumer: "Scan food & drug QR codes for safety info",
  farmer: "Log crop cycles, pesticide inputs & traceability",
  manufacturer: "Create product batches and QR labels",
  regulator: "Oversight, reports and emergency recalls",
  pharmacist: "Manage pharmacy inventory and drug batches",
};

// ─── types ───────────────────────────────────────────────────────────────────

type Mode = "login" | "register";
type ConsumerTab = "home" | "scanner" | "result" | "report" | "history" | "ai";
type ChatMessage = { role: "user" | "assistant"; content: string };
type HistoryEntry = {
  id: string;
  kind: "food" | "drug";
  codeString: string;
  status: ProductScanResult["status"];
  title: string;
  summary: string;
  recommendedAction?: string;
  createdAt: string;
};
type ScannerTarget = { kind: "food" | "drug"; codeString: string };

// ─── component ───────────────────────────────────────────────────────────────

export default function App() {
  // auth
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("consumer");
  const [language] = useState("en");
  const [authStatus, setAuthStatus] = useState("");
  const [session, setSession] = useState<AuthResponse | null>(null);

  // api
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [apiBaseDraft, setApiBaseDraft] = useState(defaultApiBase);

  // consumer
  const [consumerTab, setConsumerTab] = useState<ConsumerTab>("home");
  const [scanCode, setScanCode] = useState("FT-QR-1001");
  const [scanResult, setScanResult] = useState<ProductScanResult | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [consumerHistory, setConsumerHistory] = useState<HistoryEntry[]>([]);
  const [scanLanguage, setScanLanguage] = useState<"en" | "tw">("en");
  const [lastScanResult, setLastScanResult] = useState<ProductScanResult | DrugScanResult | null>(null);
  const [lastScanKind, setLastScanKind] = useState<"food" | "drug">("food");

  // drug scan
  const [drugScanCode, setDrugScanCode] = useState("DR-QR-1001");
  const [drugScanResult, setDrugScanResult] = useState<DrugScanResult | null>(null);
  const [drugScanStatus, setDrugScanStatus] = useState("");

  // farmer / food
  const [foodDashboard, setFoodDashboard] = useState<FoodDashboardResponse | null>(null);
  const [foodStatus, setFoodStatus] = useState("");
  const [farmName, setFarmName] = useState("Agyemang Farm");
  const [farmDistrict, setFarmDistrict] = useState("Ejisu");
  const [farmRegion, setFarmRegion] = useState("Ashanti");
  const [farmCrops, setFarmCrops] = useState("tomato,maize");
  const [cycleFarmId, setCycleFarmId] = useState("");
  const [cycleCropType, setCycleCropType] = useState("tomato");
  const [cyclePlantingDate, setCyclePlantingDate] = useState("2026-04-01");
  const [inputCycleId, setInputCycleId] = useState("");
  const [inputProductName, setInputProductName] = useState("Pesticide X");
  const [inputType, setInputType] = useState<"pesticide" | "fertilizer" | "seed" | "irrigation" | "other">("pesticide");
  const [inputApplicationDate, setInputApplicationDate] = useState("2026-04-20");
  const [inputWithdrawalDays, setInputWithdrawalDays] = useState("14");
  const [inputEpaStatus, setInputEpaStatus] = useState("approved");
  const [marketReadyCycleId, setMarketReadyCycleId] = useState("");
  const [marketReadyValue, setMarketReadyValue] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState("[]");

  // manufacturer
  const [manufacturerDashboard, setManufacturerDashboard] = useState<ManufacturerDashboardResponse | null>(null);
  const [manufacturerStatus, setManufacturerStatus] = useState("");
  const [companyName, setCompanyName] = useState("FoodTrace Foods Ltd");
  const [fdaRegNumber, setFdaRegNumber] = useState("FDA-12345");
  const [manufacturerSector, setManufacturerSector] = useState("food");
  const [subscriptionTier, setSubscriptionTier] = useState<"micro" | "small" | "medium" | "large">("small");
  const [batchNumber, setBatchNumber] = useState("FB-1001");
  const [packagingDate, setPackagingDate] = useState("2026-05-01");
  const [expiryDate, setExpiryDate] = useState("2027-05-01");
  const [ingredientSources, setIngredientSources] = useState("farm inputs");
  const [processingSteps, setProcessingSteps] = useState("mix,heat,pack");
  const [qualityChecks, setQualityChecks] = useState("visual pass");
  const [recallBatchId, setRecallBatchId] = useState("");
  const [recallReason, setRecallReason] = useState("Possible contamination");
  const [recallType, setRecallType] = useState<"manufacturer" | "regulator">("manufacturer");
  const [recallScopeDistricts, setRecallScopeDistricts] = useState("Accra,Kumasi");

  // regulator
  const [regulatorDashboard, setRegulatorDashboard] = useState<RegulatorDashboardResponse | null>(null);
  const [regulatorStatus, setRegulatorStatus] = useState("");
  const [reportId, setReportId] = useState("");
  const [reportStatus, setReportStatus] = useState<"reviewing" | "resolved" | "dismissed">("reviewing");
  const [regulatorRecallBatchId, setRegulatorRecallBatchId] = useState("");
  const [regulatorRecallReason, setRegulatorRecallReason] = useState("Public safety issue");
  const [regulatorRecallDistricts, setRegulatorRecallDistricts] = useState("Accra,Kumasi");
  const [regulatorRecallDomain, setRegulatorRecallDomain] = useState<"food" | "drug">("food");

  // pharmacist
  const [pharmacyDashboard, setPharmacyDashboard] = useState<DrugDashboardResponse | null>(null);
  const [pharmacyStatus, setPharmacyStatus] = useState("");
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

  // ai
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const cameraResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentRole = session?.user.role ?? null;
  const isConsumer = currentRole === "consumer";
  const isFarmer = currentRole === "farmer";
  const isManufacturer = currentRole === "manufacturer";
  const isRegulator = currentRole === "regulator";
  const isPharmacist = currentRole === "pharmacist";

  // ── effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(apiBaseKey);
        const next = saved?.trim() ? saved.trim() : defaultApiBase;
        setApiBase(next);
        setApiBaseDraft(next);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(consumerHistoryKey);
        if (stored) setConsumerHistory(JSON.parse(stored) as HistoryEntry[]);
      } catch { /* best effort */ }
    })();
  }, []);

  useEffect(() => {
    const detected = resolveDefaultApiBase();
    setApiBase((current) => {
      if (!current || current === "http://localhost:3000/api" || current === "http://10.0.2.2:3000/api") {
        setApiBaseDraft(detected);
        return detected;
      }
      return current;
    });
  }, []);

  useEffect(() => {
    return () => { if (cameraResumeTimerRef.current) clearTimeout(cameraResumeTimerRef.current); };
  }, []);

  // ── helpers ────────────────────────────────────────────────────────────────

  function getFriendlyError(error: unknown) {
    if (error instanceof TypeError) {
      return `Could not reach the server. Check your internet connection and try again.`;
    }
    return error instanceof Error ? error.message : "Something went wrong. Please try again.";
  }

  async function persistConsumerHistory(next: HistoryEntry[]) {
    setConsumerHistory(next);
    try { await AsyncStorage.setItem(consumerHistoryKey, JSON.stringify(next.slice(0, 25))); }
    catch { /* best effort */ }
  }

  function pushConsumerHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
    const next = [
      { ...entry, id: `${entry.kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString() },
      ...consumerHistory,
    ].slice(0, 25);
    void persistConsumerHistory(next);
  }

  function clearCameraResumeTimer() {
    if (cameraResumeTimerRef.current) { clearTimeout(cameraResumeTimerRef.current); cameraResumeTimerRef.current = null; }
  }

  function scheduleCameraResume(delayMs = 2200) {
    clearCameraResumeTimer();
    cameraResumeTimerRef.current = setTimeout(() => { setScannerPaused(false); cameraResumeTimerRef.current = null; }, delayMs);
  }

  function parseScannerTarget(raw: string): ScannerTarget | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/\s+/g, "");
    try {
      const url = new URL(normalized);
      const segments = url.pathname.split("/").map((s) => s.trim()).filter(Boolean).map((s) => decodeURIComponent(s));
      const queryCode = url.searchParams.get("batchId") ?? url.searchParams.get("drugBatchId") ?? url.searchParams.get("code") ?? url.searchParams.get("id") ?? url.searchParams.get("qr");
      const kind: ScannerTarget["kind"] = segments.map((s) => s.toLowerCase()).some((s) => s.includes("drug")) ? "drug" : "food";
      const last = segments[segments.length - 1] ?? "";
      const codeString = (queryCode ?? last).trim();
      if (!codeString) return null;
      return { kind, codeString: codeString.toUpperCase() };
    } catch {
      const upper = normalized.toUpperCase();
      if (upper.startsWith("DR-") || upper.includes("/DRUGS/") || upper.includes("DR-QR-")) return { kind: "drug", codeString: upper };
      return { kind: "food", codeString: upper };
    }
  }

  // ── auth ──────────────────────────────────────────────────────────────────

  async function submit() {
    setAuthStatus("Sending…");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { identifier, password }
          : { fullName, phone: phone || null, email: email || null, password, role, language };
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse<AuthResponse>(response);
      setSession(data);
      setAuthStatus("");
    } catch (error) {
      setAuthStatus(getFriendlyError(error));
    }
  }

  function signOut() {
    setSession(null);
    setAuthStatus("");
    setConsumerTab("home");
    setFoodDashboard(null);
    setManufacturerDashboard(null);
    setRegulatorDashboard(null);
    setPharmacyDashboard(null);
  }

  // ── scan ──────────────────────────────────────────────────────────────────

  const handleScanResult = useCallback(
    (result: ProductScanResult | DrugScanResult, kind: "food" | "drug") => {
      setLastScanResult(result);
      setLastScanKind(kind);
      if (kind === "drug") {
        setDrugScanResult(result as DrugScanResult);
      } else {
        setScanResult(result as ProductScanResult);
      }
      pushConsumerHistory({ kind, codeString: result.codeString, status: result.status, title: result.title, summary: result.summary, recommendedAction: result.recommendedAction });
      setConsumerTab("result");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [consumerHistory]
  );

  async function scanFoodProduct(code = scanCode) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setScanLoading(true);
    try {
      const response = await fetch(`${apiBase}/scan/${encodeURIComponent(normalized)}`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      });
      const data = await readJsonResponse<{ result: ProductScanResult }>(response);
      setScanResult(data.result);
      pushConsumerHistory({ kind: "food", codeString: data.result.codeString, status: data.result.status, title: data.result.title, summary: data.result.summary, recommendedAction: data.result.recommendedAction });
    } catch (error) {
      /* error shown via scanResult being null */
    } finally {
      setScanLoading(false);
    }
  }

  async function scanDrugProduct(code = drugScanCode) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) { setDrugScanStatus("Enter a drug QR code first."); return; }
    setDrugScanStatus("Looking up drug…");
    try {
      const response = await fetch(`${apiBase}/drug/scan/${encodeURIComponent(normalized)}`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      });
      const data = await readJsonResponse<{ result: DrugScanResult }>(response);
      setDrugScanResult(data.result);
      setDrugScanStatus("");
      pushConsumerHistory({ kind: "drug", codeString: data.result.codeString, status: data.result.status, title: data.result.title, summary: data.result.summary, recommendedAction: data.result.recommendedAction });
    } catch (error) {
      setDrugScanStatus(getFriendlyError(error));
    }
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scanLoading || scannerPaused) return;
    const target = parseScannerTarget(data);
    if (!target) return;
    setScannerPaused(true);
    if (target.kind === "drug") {
      setDrugScanCode(target.codeString);
      await scanDrugProduct(target.codeString);
    } else {
      setScanCode(target.codeString);
      await scanFoodProduct(target.codeString);
    }
    scheduleCameraResume();
  }

  // ── speech ────────────────────────────────────────────────────────────────

  async function playGoogleSpeech(text: string) {
    const response = await fetch(`${apiBase}/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: scanLanguage }),
    });
    const data = (await readJsonResponse(response)) as SpeechSummaryResponse & { error?: unknown; fallback?: boolean };
    if (!response.ok || !data.audioBase64) throw new Error("TTS unavailable");
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync({ uri: `data:${data.mimeType};base64,${data.audioBase64}` }, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((s) => { if ("didJustFinish" in s && s.didJustFinish) void sound.unloadAsync(); });
  }

  function speakScanSummary(text: string) {
    Speech.stop();
    Speech.speak(text, { language: scanLanguage === "tw" ? "tw" : "en-US", rate: 0.95 });
  }

  // ── food / farmer ─────────────────────────────────────────────────────────

  async function loadFoodDashboard() {
    if (!session?.token) { setFoodStatus("Log in first."); return; }
    setFoodStatus("Loading…");
    try {
      const response = await fetch(`${apiBase}/food/dashboard`, { headers: { Authorization: `Bearer ${session.token}` } });
      const data = await readJsonResponse<{ dashboard: FoodDashboardResponse }>(response);
      setFoodDashboard(data.dashboard);
      setFoodStatus("Dashboard loaded.");
      if (!cycleFarmId && data.dashboard.farms[0]?.id) setCycleFarmId(data.dashboard.farms[0].id);
      if (!inputCycleId && data.dashboard.cropCycles[0]?.id) setInputCycleId(data.dashboard.cropCycles[0].id);
    } catch (error) {
      setFoodStatus(getFriendlyError(error));
    }
  }

  async function createFarm() {
    if (!session?.token) return;
    const payload: CreateFarmRequest = { name: farmName, district: farmDistrict, region: farmRegion, cropTypes: farmCrops.split(",").map((s) => s.trim()).filter(Boolean) };
    setFoodStatus("Creating farm…");
    try {
      const response = await fetch(`${apiBase}/food/farms`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  async function createCropCycle() {
    if (!session?.token) return;
    const payload: CreateCropCycleRequest = { farmId: cycleFarmId, cropType: cycleCropType, plantingDate: cyclePlantingDate };
    setFoodStatus("Creating crop cycle…");
    try {
      const response = await fetch(`${apiBase}/food/crop-cycles`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  async function createInputLog() {
    if (!session?.token) return;
    const payload: CreateInputLogRequest = { cropCycleId: inputCycleId, inputType, productName: inputProductName, applicationDate: inputApplicationDate, withdrawalPeriodDays: Number(inputWithdrawalDays), epaApprovalStatus: inputEpaStatus as CreateInputLogRequest["epaApprovalStatus"] };
    setFoodStatus("Saving input log…");
    try {
      const response = await fetch(`${apiBase}/food/input-logs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  async function markMarketReady() {
    if (!session?.token) return;
    setFoodStatus("Updating…");
    try {
      const response = await fetch(`${apiBase}/food/crop-cycles/market-ready`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ cropCycleId: marketReadyCycleId, marketReady: marketReadyValue }) });
      await readJsonResponse(response);
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  async function syncOfflineQueue() {
    if (!session?.token) return;
    setFoodStatus("Syncing…");
    try {
      const payload = JSON.parse(offlineQueue) as OfflineSyncRequest;
      const response = await fetch(`${apiBase}/food/offline-sync`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      const data = await readJsonResponse<{ results?: unknown }>(response);
      setFoodStatus(`Synced: ${JSON.stringify(data.results)}`);
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  // ── manufacturer ──────────────────────────────────────────────────────────

  async function loadManufacturerDashboard() {
    if (!session?.token) { setManufacturerStatus("Log in first."); return; }
    setManufacturerStatus("Loading…");
    try {
      const response = await fetch(`${apiBase}/manufacturer/dashboard`, { headers: { Authorization: `Bearer ${session.token}` } });
      const data = await readJsonResponse<{ dashboard: ManufacturerDashboardResponse }>(response);
      setManufacturerDashboard(data.dashboard);
      setManufacturerStatus(data.dashboard.profile ? "Dashboard loaded." : "Create a manufacturer profile to continue.");
      if (!recallBatchId && data.dashboard.batches[0]?.id) setRecallBatchId(data.dashboard.batches[0].id);
    } catch (error) { setManufacturerStatus(getFriendlyError(error)); }
  }

  async function createManufacturerProfile() {
    if (!session?.token) return;
    const payload: CreateManufacturerProfileRequest = { companyName, fdaRegistrationNumber: fdaRegNumber || null, sector: manufacturerSector, subscriptionTier };
    setManufacturerStatus("Creating profile…");
    try {
      const response = await fetch(`${apiBase}/manufacturer/profile`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadManufacturerDashboard();
    } catch (error) { setManufacturerStatus(getFriendlyError(error)); }
  }

  async function createManufacturerBatch() {
    if (!session?.token) return;
    const payload: CreateProductBatchRequest = { batchNumber, ingredientSources: [ingredientSources], processingSteps: processingSteps.split(",").map((s) => s.trim()).filter(Boolean), qualityChecks: [qualityChecks], packagingDate, expiryDate };
    setManufacturerStatus("Creating batch…");
    try {
      const response = await fetch(`${apiBase}/manufacturer/batches`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      const data = await readJsonResponse<CreateProductBatchResponse>(response);
      setManufacturerStatus(`Batch created. QR: ${data.qrCode.codeString}`);
      await loadManufacturerDashboard();
    } catch (error) { setManufacturerStatus(getFriendlyError(error)); }
  }

  async function createManufacturerRecall() {
    if (!session?.token) return;
    const payload: CreateRecallRequest = { batchId: recallBatchId, recallType, reason: recallReason, scopeDistricts: recallScopeDistricts.split(",").map((s) => s.trim()).filter(Boolean) };
    setManufacturerStatus("Issuing recall…");
    try {
      const response = await fetch(`${apiBase}/manufacturer/recalls`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadManufacturerDashboard();
    } catch (error) { setManufacturerStatus(getFriendlyError(error)); }
  }

  // ── regulator ─────────────────────────────────────────────────────────────

  async function loadRegulatorDashboard() {
    if (!session?.token) { setRegulatorStatus("Log in first."); return; }
    setRegulatorStatus("Loading…");
    try {
      const response = await fetch(`${apiBase}/regulator/dashboard`, { headers: { Authorization: `Bearer ${session.token}` } });
      const data = await readJsonResponse<{ dashboard: RegulatorDashboardResponse }>(response);
      setRegulatorDashboard(data.dashboard);
      setRegulatorStatus("Dashboard loaded.");
      if (!reportId && data.dashboard.reports[0]?.id) setReportId(data.dashboard.reports[0].id);
      if (!regulatorRecallBatchId && data.dashboard.recalls[0]?.batchId) setRegulatorRecallBatchId(data.dashboard.recalls[0].batchId);
    } catch (error) { setRegulatorStatus(getFriendlyError(error)); }
  }

  async function reviewRegulatorReport() {
    if (!session?.token) return;
    const payload: ReviewReportRequest = { reportId, status: reportStatus };
    setRegulatorStatus("Updating report…");
    try {
      const response = await fetch(`${apiBase}/regulator/reports`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadRegulatorDashboard();
    } catch (error) { setRegulatorStatus(getFriendlyError(error)); }
  }

  async function createRegulatorRecall() {
    if (!session?.token) return;
    const payload: RegulatorRecallRequest = { batchId: regulatorRecallBatchId, reason: regulatorRecallReason, scopeDistricts: regulatorRecallDistricts.split(",").map((s) => s.trim()).filter(Boolean), domain: regulatorRecallDomain };
    setRegulatorStatus("Issuing recall…");
    try {
      const response = await fetch(`${apiBase}/regulator/recalls`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadRegulatorDashboard();
    } catch (error) { setRegulatorStatus(getFriendlyError(error)); }
  }

  // ── pharmacist ────────────────────────────────────────────────────────────

  async function loadPharmacyDashboard() {
    if (!session?.token) { setPharmacyStatus("Log in first."); return; }
    setPharmacyStatus("Loading…");
    try {
      const response = await fetch(`${apiBase}/drug/dashboard`, { headers: { Authorization: `Bearer ${session.token}` } });
      const data = await readJsonResponse<{ dashboard: DrugDashboardResponse }>(response);
      setPharmacyDashboard(data.dashboard);
      setPharmacyStatus(data.dashboard.pharmacy ? "Dashboard loaded." : "Register your pharmacy to continue.");
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  async function registerPharmacy() {
    if (!session?.token) return;
    const payload: RegisterPharmacyRequest = { businessName, ghanaPharmacyCouncilNumber: gpcNumber, district: pharmacyDistrict, region: pharmacyRegion };
    setPharmacyStatus("Registering pharmacy…");
    try {
      const response = await fetch(`${apiBase}/drug/register`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadPharmacyDashboard();
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  async function createDrugRecord() {
    if (!session?.token) return;
    const payload: CreateDrugRecordRequest = { name: drugName, genericName: drugGenericName || null, manufacturerName: drugManufacturer || null, fdaDrugRegistrationNumber: drugFdaNumber || null, drugClass: drugClass || null, dosageForm: drugDosageForm || null, strength: drugStrength || null, requiresPrescription: drugRequiresPrescription, isControlled: drugIsControlled, fdaApprovalStatus: drugApprovalStatus, storageConditions: drugStorage || null, sideEffectsSummary: drugSideEffects || null };
    setPharmacyStatus("Creating drug record…");
    try {
      const response = await fetch(`${apiBase}/drug/drugs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadPharmacyDashboard();
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  async function createDrugBatch() {
    if (!session?.token) return;
    const firstDrugId = pharmacyDashboard?.drugs[0]?.id ?? "";
    if (!firstDrugId) { setPharmacyStatus("Create a drug record first."); return; }
    const payload: CreateDrugBatchRequest = { drugId: firstDrugId, batchNumber: drugBatchNumber, manufactureDate: drugManufactureDate, expiryDate: drugExpiryDate, quantityReceived: Number(drugQuantityReceived), quantityRemaining: Number(drugQuantityRemaining), supplierName: drugSupplierName || null };
    setPharmacyStatus("Creating drug batch…");
    try {
      const response = await fetch(`${apiBase}/drug/batches`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      const data = await readJsonResponse<CreateDrugBatchResponse>(response);
      setPharmacyStatus(`Batch created. QR: ${data.qrCode.codeString}`);
      await loadPharmacyDashboard();
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  async function createDrugRecall() {
    if (!session?.token) return;
    const payload: CreateDrugRecallRequest = { batchId: drugRecallBatchId, reason: drugRecallReason };
    setPharmacyStatus("Creating recall…");
    try {
      const response = await fetch(`${apiBase}/drug/recalls`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) });
      await readJsonResponse(response);
      await loadPharmacyDashboard();
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  // ── AI assistant ──────────────────────────────────────────────────────────

  async function sendAiMessage() {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", content: text }]);
    setAiLoading(true);
    try {
      const response = await fetch(`${apiBase}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
        body: JSON.stringify({ message: text }),
      });
      const data = await readJsonResponse<{ reply: string }>(response);
      setAiMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setAiMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I could not respond right now. Please check your connection and try again." }]);
    } finally {
      setAiLoading(false);
    }
  }

  // ── render: auth screen ───────────────────────────────────────────────────

  if (!session) {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#05080b" />
        <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">
          <View style={s.authHeader}>
            <Text style={s.appName}>FoodTrace GH</Text>
            <Text style={s.appTagline}>Scan It. Trace It. Trust It.</Text>
          </View>

          <View style={s.card}>
            <View style={s.segmented}>
              <Pressable style={mode === "login" ? s.segActive : s.seg} onPress={() => { setMode("login"); setAuthStatus(""); }}>
                <Text style={mode === "login" ? s.segTextActive : s.segText}>Log in</Text>
              </Pressable>
              <Pressable style={mode === "register" ? s.segActive : s.seg} onPress={() => { setMode("register"); setAuthStatus(""); }}>
                <Text style={mode === "register" ? s.segTextActive : s.segText}>Sign up</Text>
              </Pressable>
            </View>

            {mode === "register" ? (
              <>
                <TextInput placeholder="Full name *" placeholderTextColor="#748089" style={s.input} value={fullName} onChangeText={setFullName} />
                <TextInput placeholder="Phone number (e.g. +233244123456) *" placeholderTextColor="#748089" style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <TextInput placeholder="Email address (optional)" placeholderTextColor="#748089" style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput placeholder="Password *" placeholderTextColor="#748089" style={s.input} value={password} onChangeText={setPassword} secureTextEntry />

                <Text style={s.roleLabel}>I am a…</Text>
                {USER_ROLES.map((item) => (
                  <Pressable key={item} style={[s.roleRow, role === item && s.roleRowActive]} onPress={() => setRole(item)}>
                    <View style={[s.radio, role === item && s.radioActive]}>
                      {role === item ? <View style={s.radioDot} /> : null}
                    </View>
                    <View style={s.roleTextBlock}>
                      <Text style={[s.roleRowName, role === item && s.roleRowNameActive]}>{roleLabels[item] ?? item}</Text>
                      <Text style={s.roleRowDesc}>{roleDescriptions[item] ?? ""}</Text>
                    </View>
                  </Pressable>
                ))}

                <Pressable style={s.primaryBtn} onPress={() => void submit()}>
                  <Text style={s.primaryBtnText}>Create account</Text>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput placeholder="Phone number or email" placeholderTextColor="#748089" style={s.input} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
                <TextInput placeholder="Password" placeholderTextColor="#748089" style={s.input} value={password} onChangeText={setPassword} secureTextEntry />
                <Pressable style={s.primaryBtn} onPress={() => void submit()}>
                  <Text style={s.primaryBtnText}>Log in</Text>
                </Pressable>
              </>
            )}

            {authStatus === "Sending…" ? (
              <Text style={s.statusLoading}>Please wait…</Text>
            ) : authStatus ? (
              <Text style={s.statusError}>{authStatus}</Text>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── render: logged-in dashboard ───────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#071a10" />

      {/* App header */}
      <View style={s.dashHeader}>
        <Text style={s.dashLogo}>FoodTrace GH</Text>
        <View style={s.dashHeaderRight}>
          <Text style={s.dashUser} numberOfLines={1}>{session.user.fullName || "Account"}</Text>
          <Pressable onPress={signOut} style={s.signOutBtn}>
            <Text style={s.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.dashScroll} keyboardShouldPersistTaps="handled">

        {/* ── CONSUMER ── */}
        {isConsumer ? (
          <>
            {/* Tab bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
              {(["home", "scanner", "history", "report", "ai"] as ConsumerTab[]).map((tab) => (
                <Pressable key={tab} style={[s.tab, consumerTab === tab && s.tabActive]} onPress={() => setConsumerTab(tab)}>
                  <Text style={[s.tabText, consumerTab === tab && s.tabTextActive]}>
                    {tab === "ai" ? "AI Helper" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {consumerTab === "home" ? (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Welcome, {session.user.fullName || "there"} 👋</Text>
                <Text style={s.sectionBody}>Scan a QR code on food or medicine packaging to check its safety, expiry, and recall status instantly.</Text>
                <Pressable style={s.primaryBtn} onPress={() => setConsumerTab("scanner")}>
                  <Text style={s.primaryBtnText}>Open Scanner</Text>
                </Pressable>
                <Pressable style={[s.outlineBtn, { marginTop: 10 }]} onPress={() => setConsumerTab("history")}>
                  <Text style={s.outlineBtnText}>View History ({consumerHistory.length})</Text>
                </Pressable>
                <Pressable style={[s.outlineBtn, { marginTop: 10 }]} onPress={() => setConsumerTab("ai")}>
                  <Text style={s.outlineBtnText}>Ask AI Assistant</Text>
                </Pressable>
                {scanResult ? (
                  <View style={[s.badge, badgeStyle(scanResult.status), { marginTop: 16 }]}>
                    <Text style={s.badgeText}>Last food scan: {scanResult.status.toUpperCase()}</Text>
                  </View>
                ) : null}
                {drugScanResult ? (
                  <View style={[s.badge, badgeStyle(drugScanResult.status), { marginTop: 8 }]}>
                    <Text style={s.badgeText}>Last drug scan: {drugScanResult.status.toUpperCase()}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {consumerTab === "scanner" ? (
              <QRScannerScreen
                apiBase={apiBase}
                token={session.token}
                scanLanguage={scanLanguage}
                onScanResult={handleScanResult}
              />
            ) : null}

            {consumerTab === "result" && lastScanResult ? (
              <SafetyResultScreen
                result={lastScanResult}
                scanLanguage={scanLanguage}
                apiBase={apiBase}
                onBack={() => setConsumerTab("scanner")}
                onViewHistory={() => setConsumerTab("history")}
                onReport={() => setConsumerTab("report")}
                onAskAI={(prefill) => { setAiInput(prefill); setConsumerTab("ai"); }}
              />
            ) : null}

            {consumerTab === "history" ? (
              <ScanHistoryScreen
                history={consumerHistory}
                onClear={() => void persistConsumerHistory([])}
                onBack={() => setConsumerTab("home")}
              />
            ) : null}

            {consumerTab === "report" ? (
              <ConsumerReportScreen
                apiBase={apiBase}
                token={session.token}
                scannedCode={lastScanResult?.codeString ?? null}
                onBack={() => setConsumerTab(lastScanResult ? "result" : "scanner")}
                onGoToScanner={() => setConsumerTab("scanner")}
              />
            ) : null}

            {consumerTab === "ai" ? (
              <View style={s.card}>
                <Text style={s.sectionTitle}>AI Food & Drug Assistant</Text>
                <Text style={s.sectionBody}>Ask me anything about food safety, medicine storage, expiry dates, or recalls.</Text>

                {/* Language toggle */}
                <View style={s.langRow}>
                  <Pressable style={[s.langBtn, scanLanguage === "en" && s.langBtnActive]} onPress={() => setScanLanguage("en")}>
                    <Text style={[s.langBtnText, scanLanguage === "en" && s.langBtnTextActive]}>English</Text>
                  </Pressable>
                  <Pressable style={[s.langBtn, scanLanguage === "tw" && s.langBtnActive]} onPress={() => setScanLanguage("tw")}>
                    <Text style={[s.langBtnText, scanLanguage === "tw" && s.langBtnTextActive]}>Twi</Text>
                  </Pressable>
                </View>

                {/* Messages */}
                <View style={s.chatBox}>
                  {aiMessages.length === 0 ? (
                    <View style={s.chatEmpty}>
                      <Text style={s.chatEmptyText}>Try asking one of these:</Text>
                      {[
                        "Is it safe to eat food past the expiry date?",
                        "What should I do if a product is recalled?",
                        "How do I store medicines properly?",
                      ].map((q) => (
                        <Pressable key={q} style={s.suggestion} onPress={() => setAiInput(q)}>
                          <Text style={s.suggestionText}>{q}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    aiMessages.map((msg, i) => (
                      <View key={i} style={[s.bubble, msg.role === "user" ? s.bubbleUser : s.bubbleAI]}>
                        <Text style={[s.bubbleText, msg.role === "user" ? s.bubbleTextUser : s.bubbleTextAI]}>{msg.content}</Text>
                      </View>
                    ))
                  )}
                  {aiLoading ? <Text style={s.statusLoading}>Thinking…</Text> : null}
                </View>

                {/* Input */}
                <View style={s.chatInputRow}>
                  <TextInput
                    style={s.chatInput}
                    placeholder="Ask a question…"
                    placeholderTextColor="#748089"
                    value={aiInput}
                    onChangeText={setAiInput}
                    multiline
                  />
                  <Pressable
                    style={[s.sendBtn, (!aiInput.trim() || aiLoading) && s.sendBtnDisabled]}
                    onPress={() => void sendAiMessage()}
                    disabled={!aiInput.trim() || aiLoading}
                  >
                    <Text style={s.sendBtnText}>Send</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {/* ── FARMER ── */}
        {isFarmer ? (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Farmer Portal</Text>
            <Text style={s.sectionBody}>Manage your farms, crop cycles, pesticide logs and traceability records.</Text>

            <View style={s.actionRow}>
              <Pressable style={s.primaryBtn} onPress={() => void loadFoodDashboard()}>
                <Text style={s.primaryBtnText}>Load Dashboard</Text>
              </Pressable>
            </View>

            {foodStatus ? <Text style={foodStatus.includes("Error") || foodStatus.includes("fail") || foodStatus.includes("Could not") ? s.statusError : s.statusOk}>{foodStatus}</Text> : null}

            {foodDashboard ? (
              <View style={s.metricBox}>
                <Text style={s.metricTitle}>Your Farm Stats</Text>
                <Text style={s.metric}>Farms: {foodDashboard.metrics.farms}</Text>
                <Text style={s.metric}>Crop cycles: {foodDashboard.metrics.cropCycles}</Text>
                <Text style={s.metric}>Market-ready: {foodDashboard.metrics.readyCycles}</Text>
                <Text style={s.metric}>Pending withdrawal: {foodDashboard.metrics.pendingWithdrawalCycles}</Text>
                <Text style={s.metric}>Overdue: {foodDashboard.metrics.overdueWithdrawalCycles}</Text>
                <Text style={s.metric}>Latest farm: {foodDashboard.farms[0]?.name ?? "None yet"}</Text>
                <Text style={s.metric}>Latest cycle: {foodDashboard.cropCycles[0]?.cropType ?? "None yet"}</Text>
                <Text style={s.metric}>Latest input: {foodDashboard.inputLogs[0]?.productName ?? "None yet"}</Text>
              </View>
            ) : null}

            <Text style={s.formSection}>Create Farm</Text>
            <TextInput placeholder="Farm name" placeholderTextColor="#748089" style={s.input} value={farmName} onChangeText={setFarmName} />
            <TextInput placeholder="District" placeholderTextColor="#748089" style={s.input} value={farmDistrict} onChangeText={setFarmDistrict} />
            <TextInput placeholder="Region" placeholderTextColor="#748089" style={s.input} value={farmRegion} onChangeText={setFarmRegion} />
            <TextInput placeholder="Crop types (comma-separated)" placeholderTextColor="#748089" style={s.input} value={farmCrops} onChangeText={setFarmCrops} />
            <Pressable style={s.outlineBtn} onPress={() => void createFarm()}><Text style={s.outlineBtnText}>Create Farm</Text></Pressable>

            <Text style={s.formSection}>Crop Cycle</Text>
            <TextInput placeholder="Farm ID (auto-filled after load)" placeholderTextColor="#748089" style={s.input} value={cycleFarmId} onChangeText={setCycleFarmId} />
            <TextInput placeholder="Crop type" placeholderTextColor="#748089" style={s.input} value={cycleCropType} onChangeText={setCycleCropType} />
            <TextInput placeholder="Planting date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={cyclePlantingDate} onChangeText={setCyclePlantingDate} />
            <Pressable style={s.outlineBtn} onPress={() => void createCropCycle()}><Text style={s.outlineBtnText}>Start Crop Cycle</Text></Pressable>

            <Text style={s.formSection}>Input Log</Text>
            <TextInput placeholder="Crop cycle ID (auto-filled after load)" placeholderTextColor="#748089" style={s.input} value={inputCycleId} onChangeText={setInputCycleId} />
            <TextInput placeholder="Product name" placeholderTextColor="#748089" style={s.input} value={inputProductName} onChangeText={setInputProductName} />
            <TextInput placeholder="Application date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={inputApplicationDate} onChangeText={setInputApplicationDate} />
            <TextInput placeholder="Withdrawal period (days)" placeholderTextColor="#748089" style={s.input} value={inputWithdrawalDays} onChangeText={setInputWithdrawalDays} keyboardType="numeric" />
            <TextInput placeholder="EPA status (approved/pending/banned)" placeholderTextColor="#748089" style={s.input} value={inputEpaStatus} onChangeText={setInputEpaStatus} />
            <Pressable style={s.outlineBtn} onPress={() => void createInputLog()}><Text style={s.outlineBtnText}>Log Input</Text></Pressable>

            <Text style={s.formSection}>Mark Market-Ready</Text>
            <TextInput placeholder="Crop cycle ID" placeholderTextColor="#748089" style={s.input} value={marketReadyCycleId} onChangeText={setMarketReadyCycleId} />
            <View style={s.actionRow}>
              <Pressable style={[s.langBtn, marketReadyValue && s.langBtnActive]} onPress={() => setMarketReadyValue(true)}><Text style={[s.langBtnText, marketReadyValue && s.langBtnTextActive]}>Ready</Text></Pressable>
              <Pressable style={[s.langBtn, !marketReadyValue && s.langBtnActive]} onPress={() => setMarketReadyValue(false)}><Text style={[s.langBtnText, !marketReadyValue && s.langBtnTextActive]}>Not ready</Text></Pressable>
            </View>
            <Pressable style={s.outlineBtn} onPress={() => void markMarketReady()}><Text style={s.outlineBtnText}>Update Status</Text></Pressable>

            <Text style={s.formSection}>Offline Sync</Text>
            <TextInput placeholder='Offline queue JSON {"actions":[]}' placeholderTextColor="#748089" style={[s.input, { minHeight: 80 }]} value={offlineQueue} onChangeText={setOfflineQueue} multiline />
            <Pressable style={s.outlineBtn} onPress={() => void syncOfflineQueue()}><Text style={s.outlineBtnText}>Sync Offline Queue</Text></Pressable>
          </View>
        ) : null}

        {/* ── MANUFACTURER ── */}
        {isManufacturer ? (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Manufacturer Portal</Text>
            <Text style={s.sectionBody}>Create product batches, generate QR labels, and issue recalls when needed.</Text>

            <Pressable style={s.primaryBtn} onPress={() => void loadManufacturerDashboard()}>
              <Text style={s.primaryBtnText}>Load Dashboard</Text>
            </Pressable>

            {manufacturerStatus ? <Text style={manufacturerStatus.includes("loaded") || manufacturerStatus.includes("created") ? s.statusOk : s.statusError}>{manufacturerStatus}</Text> : null}

            {manufacturerDashboard ? (
              <View style={s.metricBox}>
                <Text style={s.metricTitle}>Your Stats</Text>
                <Text style={s.metric}>Profile: {manufacturerDashboard.profile?.companyName ?? "Not created yet"}</Text>
                <Text style={s.metric}>Batches: {manufacturerDashboard.metrics.batches}</Text>
                <Text style={s.metric}>QR codes: {manufacturerDashboard.metrics.qrCodes}</Text>
                <Text style={s.metric}>Active recalls: {manufacturerDashboard.metrics.activeRecalls}</Text>
                <Text style={s.metric}>Latest batch: {manufacturerDashboard.batches[0]?.batchNumber ?? "None yet"}</Text>
              </View>
            ) : null}

            <Text style={s.formSection}>Company Profile</Text>
            <TextInput placeholder="Company name" placeholderTextColor="#748089" style={s.input} value={companyName} onChangeText={setCompanyName} />
            <TextInput placeholder="FDA registration number" placeholderTextColor="#748089" style={s.input} value={fdaRegNumber} onChangeText={setFdaRegNumber} />
            <TextInput placeholder="Sector (food/drug/etc)" placeholderTextColor="#748089" style={s.input} value={manufacturerSector} onChangeText={setManufacturerSector} />
            <TextInput placeholder="Subscription tier (micro/small/medium/large)" placeholderTextColor="#748089" style={s.input} value={subscriptionTier} onChangeText={(v) => setSubscriptionTier(v as typeof subscriptionTier)} />
            <Pressable style={s.outlineBtn} onPress={() => void createManufacturerProfile()}><Text style={s.outlineBtnText}>Create Profile</Text></Pressable>

            <Text style={s.formSection}>New Batch</Text>
            <TextInput placeholder="Batch number" placeholderTextColor="#748089" style={s.input} value={batchNumber} onChangeText={setBatchNumber} />
            <TextInput placeholder="Packaging date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={packagingDate} onChangeText={setPackagingDate} />
            <TextInput placeholder="Expiry date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={expiryDate} onChangeText={setExpiryDate} />
            <TextInput placeholder="Ingredient sources" placeholderTextColor="#748089" style={s.input} value={ingredientSources} onChangeText={setIngredientSources} />
            <TextInput placeholder="Processing steps (comma-separated)" placeholderTextColor="#748089" style={s.input} value={processingSteps} onChangeText={setProcessingSteps} />
            <TextInput placeholder="Quality checks" placeholderTextColor="#748089" style={s.input} value={qualityChecks} onChangeText={setQualityChecks} />
            <Pressable style={s.outlineBtn} onPress={() => void createManufacturerBatch()}><Text style={s.outlineBtnText}>Create Batch & Generate QR</Text></Pressable>

            <Text style={s.formSection}>Issue Recall</Text>
            <TextInput placeholder="Batch ID to recall" placeholderTextColor="#748089" style={s.input} value={recallBatchId} onChangeText={setRecallBatchId} />
            <TextInput placeholder="Reason for recall" placeholderTextColor="#748089" style={s.input} value={recallReason} onChangeText={setRecallReason} />
            <TextInput placeholder="Affected districts (comma-separated)" placeholderTextColor="#748089" style={s.input} value={recallScopeDistricts} onChangeText={setRecallScopeDistricts} />
            <Pressable style={[s.outlineBtn, { borderColor: "#f87171" }]} onPress={() => void createManufacturerRecall()}><Text style={[s.outlineBtnText, { color: "#f87171" }]}>Issue Recall</Text></Pressable>
          </View>
        ) : null}

        {/* ── REGULATOR ── */}
        {isRegulator ? (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Regulator Dashboard</Text>
            <Text style={s.sectionBody}>Overview of compliance, reports, and recall authority across food and drug sectors.</Text>

            <Pressable style={s.primaryBtn} onPress={() => void loadRegulatorDashboard()}>
              <Text style={s.primaryBtnText}>Load Dashboard</Text>
            </Pressable>

            {regulatorStatus ? <Text style={s.statusOk}>{regulatorStatus}</Text> : null}

            {regulatorDashboard ? (
              <View style={s.metricBox}>
                <Text style={s.metricTitle}>Compliance Overview</Text>
                <Text style={s.metric}>Farms: {regulatorDashboard.compliance.farms}</Text>
                <Text style={s.metric}>Manufacturers: {regulatorDashboard.compliance.manufacturers}</Text>
                <Text style={s.metric}>Pharmacies: {regulatorDashboard.compliance.pharmacies}</Text>
                <Text style={s.metric}>Food recalls: {regulatorDashboard.compliance.foodRecalls}</Text>
                <Text style={s.metric}>Drug recalls: {regulatorDashboard.compliance.drugRecalls}</Text>
                <Text style={s.metric}>Pending reports: {regulatorDashboard.compliance.pendingReports}</Text>
                <Text style={s.metric}>Total scans: {regulatorDashboard.analytics.totalScans}</Text>
                <Text style={s.metric}>High-risk alerts: {regulatorDashboard.analytics.highRiskAlerts}</Text>
                <Text style={s.metric}>Top districts: {regulatorDashboard.analytics.topDistricts.join(", ") || "None yet"}</Text>
                <Text style={s.metric}>Latest report: {regulatorDashboard.reports[0]?.description ?? "None yet"}</Text>
              </View>
            ) : null}

            <Text style={s.formSection}>Review Report</Text>
            <TextInput placeholder="Report ID" placeholderTextColor="#748089" style={s.input} value={reportId} onChangeText={setReportId} />
            <TextInput placeholder="Status (reviewing/resolved/dismissed)" placeholderTextColor="#748089" style={s.input} value={reportStatus} onChangeText={(v) => setReportStatus(v as typeof reportStatus)} />
            <Pressable style={s.outlineBtn} onPress={() => void reviewRegulatorReport()}><Text style={s.outlineBtnText}>Update Report</Text></Pressable>

            <Text style={s.formSection}>Issue Emergency Recall</Text>
            <TextInput placeholder="Batch ID" placeholderTextColor="#748089" style={s.input} value={regulatorRecallBatchId} onChangeText={setRegulatorRecallBatchId} />
            <TextInput placeholder="Reason" placeholderTextColor="#748089" style={s.input} value={regulatorRecallReason} onChangeText={setRegulatorRecallReason} />
            <TextInput placeholder="Districts (comma-separated)" placeholderTextColor="#748089" style={s.input} value={regulatorRecallDistricts} onChangeText={setRegulatorRecallDistricts} />
            <View style={s.actionRow}>
              <Pressable style={[s.langBtn, regulatorRecallDomain === "food" && s.langBtnActive]} onPress={() => setRegulatorRecallDomain("food")}><Text style={[s.langBtnText, regulatorRecallDomain === "food" && s.langBtnTextActive]}>Food</Text></Pressable>
              <Pressable style={[s.langBtn, regulatorRecallDomain === "drug" && s.langBtnActive]} onPress={() => setRegulatorRecallDomain("drug")}><Text style={[s.langBtnText, regulatorRecallDomain === "drug" && s.langBtnTextActive]}>Drug</Text></Pressable>
            </View>
            <Pressable style={[s.outlineBtn, { borderColor: "#f87171" }]} onPress={() => void createRegulatorRecall()}><Text style={[s.outlineBtnText, { color: "#f87171" }]}>Issue Recall</Text></Pressable>
          </View>
        ) : null}

        {/* ── PHARMACIST ── */}
        {isPharmacist ? (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Pharmacy Portal</Text>
            <Text style={s.sectionBody}>Register your pharmacy, manage drug inventory, generate QR codes, and scan medicine labels.</Text>

            <Pressable style={s.primaryBtn} onPress={() => void loadPharmacyDashboard()}>
              <Text style={s.primaryBtnText}>Load Dashboard</Text>
            </Pressable>

            {pharmacyStatus ? <Text style={pharmacyStatus.includes("loaded") || pharmacyStatus.includes("created") || pharmacyStatus.includes("QR") ? s.statusOk : s.statusError}>{pharmacyStatus}</Text> : null}

            {pharmacyDashboard ? (
              <View style={s.metricBox}>
                <Text style={s.metricTitle}>Pharmacy Stats</Text>
                <Text style={s.metric}>Pharmacy: {pharmacyDashboard.pharmacy?.businessName ?? "Not registered yet"}</Text>
                <Text style={s.metric}>Drugs on record: {pharmacyDashboard.metrics.drugs}</Text>
                <Text style={s.metric}>Batches: {pharmacyDashboard.metrics.batches}</Text>
                <Text style={s.metric}>QR codes: {pharmacyDashboard.metrics.qrCodes}</Text>
                <Text style={s.metric}>Recalls: {pharmacyDashboard.metrics.recalls}</Text>
                <Text style={s.metric}>Latest batch: {pharmacyDashboard.batches[0]?.batchNumber ?? "None yet"}</Text>
              </View>
            ) : null}

            <Text style={s.formSection}>Register Pharmacy</Text>
            <TextInput placeholder="Business name" placeholderTextColor="#748089" style={s.input} value={businessName} onChangeText={setBusinessName} />
            <TextInput placeholder="Ghana Pharmacy Council number" placeholderTextColor="#748089" style={s.input} value={gpcNumber} onChangeText={setGpcNumber} />
            <TextInput placeholder="District" placeholderTextColor="#748089" style={s.input} value={pharmacyDistrict} onChangeText={setPharmacyDistrict} />
            <TextInput placeholder="Region" placeholderTextColor="#748089" style={s.input} value={pharmacyRegion} onChangeText={setPharmacyRegion} />
            <Pressable style={s.outlineBtn} onPress={() => void registerPharmacy()}><Text style={s.outlineBtnText}>Register Pharmacy</Text></Pressable>

            <Text style={s.formSection}>Add Drug Record</Text>
            <TextInput placeholder="Drug name" placeholderTextColor="#748089" style={s.input} value={drugName} onChangeText={setDrugName} />
            <TextInput placeholder="Generic name" placeholderTextColor="#748089" style={s.input} value={drugGenericName} onChangeText={setDrugGenericName} />
            <TextInput placeholder="Manufacturer" placeholderTextColor="#748089" style={s.input} value={drugManufacturer} onChangeText={setDrugManufacturer} />
            <TextInput placeholder="FDA drug reg. number" placeholderTextColor="#748089" style={s.input} value={drugFdaNumber} onChangeText={setDrugFdaNumber} />
            <TextInput placeholder="Drug class (e.g. antibiotic)" placeholderTextColor="#748089" style={s.input} value={drugClass} onChangeText={setDrugClass} />
            <TextInput placeholder="Dosage form (capsule/tablet/syrup)" placeholderTextColor="#748089" style={s.input} value={drugDosageForm} onChangeText={setDrugDosageForm} />
            <TextInput placeholder="Strength (e.g. 500mg)" placeholderTextColor="#748089" style={s.input} value={drugStrength} onChangeText={setDrugStrength} />
            <TextInput placeholder="Storage conditions" placeholderTextColor="#748089" style={s.input} value={drugStorage} onChangeText={setDrugStorage} />
            <TextInput placeholder="Side effects summary" placeholderTextColor="#748089" style={s.input} value={drugSideEffects} onChangeText={setDrugSideEffects} />
            <View style={s.actionRow}>
              <Pressable style={[s.langBtn, drugRequiresPrescription && s.langBtnActive]} onPress={() => setDrugRequiresPrescription(true)}><Text style={[s.langBtnText, drugRequiresPrescription && s.langBtnTextActive]}>Prescription</Text></Pressable>
              <Pressable style={[s.langBtn, !drugRequiresPrescription && s.langBtnActive]} onPress={() => setDrugRequiresPrescription(false)}><Text style={[s.langBtnText, !drugRequiresPrescription && s.langBtnTextActive]}>OTC</Text></Pressable>
              <Pressable style={[s.langBtn, drugIsControlled && s.langBtnActive]} onPress={() => setDrugIsControlled(true)}><Text style={[s.langBtnText, drugIsControlled && s.langBtnTextActive]}>Controlled</Text></Pressable>
            </View>
            <View style={s.actionRow}>
              {(["approved", "restricted", "banned", "under_review", "not_approved"] as const).map((v) => (
                <Pressable key={v} style={[s.langBtn, drugApprovalStatus === v && s.langBtnActive]} onPress={() => setDrugApprovalStatus(v)}>
                  <Text style={[s.langBtnText, drugApprovalStatus === v && s.langBtnTextActive]}>{v}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={s.outlineBtn} onPress={() => void createDrugRecord()}><Text style={s.outlineBtnText}>Add Drug Record</Text></Pressable>

            <Text style={s.formSection}>Add Drug Batch</Text>
            <TextInput placeholder="Batch number" placeholderTextColor="#748089" style={s.input} value={drugBatchNumber} onChangeText={setDrugBatchNumber} />
            <TextInput placeholder="Manufacture date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={drugManufactureDate} onChangeText={setDrugManufactureDate} />
            <TextInput placeholder="Expiry date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={drugExpiryDate} onChangeText={setDrugExpiryDate} />
            <TextInput placeholder="Quantity received" placeholderTextColor="#748089" style={s.input} value={drugQuantityReceived} onChangeText={setDrugQuantityReceived} keyboardType="numeric" />
            <TextInput placeholder="Quantity remaining" placeholderTextColor="#748089" style={s.input} value={drugQuantityRemaining} onChangeText={setDrugQuantityRemaining} keyboardType="numeric" />
            <TextInput placeholder="Supplier name" placeholderTextColor="#748089" style={s.input} value={drugSupplierName} onChangeText={setDrugSupplierName} />
            <Pressable style={s.outlineBtn} onPress={() => void createDrugBatch()}><Text style={s.outlineBtnText}>Add Batch & Generate QR</Text></Pressable>

            <Text style={s.formSection}>Scan Drug QR Code</Text>
            <TextInput placeholder="Drug QR code" placeholderTextColor="#748089" style={s.input} value={drugScanCode} onChangeText={setDrugScanCode} />
            <Pressable style={s.outlineBtn} onPress={() => void scanDrugProduct()}><Text style={s.outlineBtnText}>Scan Drug</Text></Pressable>
            {drugScanStatus ? <Text style={s.statusOk}>{drugScanStatus}</Text> : null}
            {drugScanResult ? (
              <View style={s.metricBox}>
                <View style={[s.badge, badgeStyle(drugScanResult.status)]}>
                  <Text style={s.badgeText}>{drugScanResult.status.toUpperCase()}</Text>
                </View>
                <Text style={s.metricTitle}>{drugScanResult.title}</Text>
                <Text style={s.metric}>{drugScanResult.summary}</Text>
                <Text style={s.metric}>Drug: {drugScanResult.drugName ?? "N/A"}</Text>
                <Text style={s.metric}>Batch: {drugScanResult.batchNumber ?? "N/A"}</Text>
                <Text style={s.metric}>Expiry: {drugScanResult.expiryDate ?? "N/A"}</Text>
                <Text style={s.metric}>{drugScanResult.recommendedAction}</Text>
              </View>
            ) : null}

            <Text style={s.formSection}>Issue Drug Recall</Text>
            <TextInput placeholder="Drug batch ID to recall" placeholderTextColor="#748089" style={s.input} value={drugRecallBatchId} onChangeText={setDrugRecallBatchId} />
            <TextInput placeholder="Recall reason" placeholderTextColor="#748089" style={s.input} value={drugRecallReason} onChangeText={setDrugRecallReason} />
            <Pressable style={[s.outlineBtn, { borderColor: "#f87171" }]} onPress={() => void createDrugRecall()}><Text style={[s.outlineBtnText, { color: "#f87171" }]}>Issue Recall</Text></Pressable>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── utilities ─────────────────────────────────────────────────────────────────

function badgeStyle(status: ProductScanResult["status"]) {
  switch (status) {
    case "safe": return { backgroundColor: "#c4f1db" };
    case "caution": return { backgroundColor: "#f6e7b5" };
    case "recalled": return { backgroundColor: "#f7c2c2" };
    default: return { backgroundColor: "#d1d5db" };
  }
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#05080b" },

  // auth
  authScroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, gap: 20 },
  authHeader: { alignItems: "center", marginBottom: 8 },
  appName: { color: "#77c7a2", fontSize: 32, fontWeight: "800", letterSpacing: 1 },
  appTagline: { color: "#748089", marginTop: 6, fontSize: 15 },

  card: { backgroundColor: "#10161b", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 14 },

  segmented: { flexDirection: "row", gap: 8, marginBottom: 18 },
  seg: { flex: 1, backgroundColor: "#1a2228", borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
  segActive: { flex: 1, backgroundColor: "#c4f1db", borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
  segText: { color: "#e8ecea", fontWeight: "600" },
  segTextActive: { color: "#113629", fontWeight: "700" },

  input: { backgroundColor: "#0b0f13", borderRadius: 14, minHeight: 54, paddingHorizontal: 16, paddingVertical: 12, color: "#f4f4ef", fontSize: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 10 },

  roleLabel: { color: "#93b9ac", fontWeight: "700", marginBottom: 10, marginTop: 6, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 },
  roleRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 8, gap: 14 },
  roleRowActive: { borderColor: "#77c7a2", backgroundColor: "rgba(119,199,162,0.06)" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#748089", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: "#77c7a2" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#77c7a2" },
  roleTextBlock: { flex: 1 },
  roleRowName: { color: "#d5e4dd", fontWeight: "600", fontSize: 15 },
  roleRowNameActive: { color: "#77c7a2" },
  roleRowDesc: { color: "#748089", fontSize: 13, marginTop: 2 },

  primaryBtn: { backgroundColor: "#77c7a2", borderRadius: 14, minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 6, paddingHorizontal: 20 },
  primaryBtnText: { color: "#062014", fontSize: 16, fontWeight: "700" },

  outlineBtn: { borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8, paddingHorizontal: 20, borderWidth: 1, borderColor: "#77c7a2" },
  outlineBtnText: { color: "#77c7a2", fontSize: 15, fontWeight: "600" },

  statusLoading: { color: "#748089", marginTop: 12, textAlign: "center" },
  statusError: { color: "#f87171", marginTop: 10, lineHeight: 20 },
  statusOk: { color: "#77c7a2", marginTop: 10 },

  // dashboard
  dashScroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  dashHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#071a10", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  dashLogo: { color: "#77c7a2", fontWeight: "800", fontSize: 18 },
  dashHeaderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  dashUser: { color: "#d5e4dd", fontSize: 14, maxWidth: 120 },
  signOutBtn: { backgroundColor: "#182028", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  signOutText: { color: "#93b9ac", fontSize: 13, fontWeight: "600" },

  // consumer tab bar
  tabBar: { marginBottom: 12 },
  tabBarContent: { paddingHorizontal: 4, gap: 8, flexDirection: "row" },
  tab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: "#10161b", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  tabActive: { backgroundColor: "#c4f1db", borderColor: "#77c7a2" },
  tabText: { color: "#93b9ac", fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: "#062014" },

  // section content
  sectionTitle: { color: "#f4f4ef", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  sectionBody: { color: "#748089", lineHeight: 20, marginBottom: 16 },
  formSection: { color: "#93b9ac", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },

  metricBox: { backgroundColor: "#0b0f13", borderRadius: 16, padding: 14, marginTop: 16 },
  metricTitle: { color: "#f4f4ef", fontWeight: "700", fontSize: 16, marginBottom: 10 },
  metric: { color: "#d0dbd7", marginBottom: 4 },

  // lang / toggle buttons
  langRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  langBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#182028", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  langBtnActive: { backgroundColor: "#c4f1db", borderColor: "#77c7a2" },
  langBtnText: { color: "#93b9ac", fontWeight: "600", fontSize: 13 },
  langBtnTextActive: { color: "#062014" },

  // scan result badge
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#12392d", fontWeight: "700", fontSize: 13 },

  // ai chat
  chatBox: { backgroundColor: "#0b0f13", borderRadius: 16, padding: 14, minHeight: 180, marginBottom: 12 },
  chatEmpty: { gap: 10 },
  chatEmptyText: { color: "#748089", marginBottom: 4 },
  suggestion: { backgroundColor: "#182028", borderRadius: 12, padding: 12 },
  suggestionText: { color: "#d5e4dd", fontSize: 14, lineHeight: 20 },
  bubble: { borderRadius: 14, padding: 12, marginBottom: 8, maxWidth: "85%" },
  bubbleUser: { backgroundColor: "#c4f1db", alignSelf: "flex-end" },
  bubbleAI: { backgroundColor: "#182028", alignSelf: "flex-start" },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: "#062014" },
  bubbleTextAI: { color: "#d5e4dd" },
  chatInputRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  chatInput: { flex: 1, backgroundColor: "#0b0f13", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: "#f4f4ef", fontSize: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", minHeight: 48, maxHeight: 120 },
  sendBtn: { backgroundColor: "#77c7a2", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#062014", fontWeight: "700", fontSize: 15 },
});
