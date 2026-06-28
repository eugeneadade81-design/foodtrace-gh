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
  MarketplaceFeedScreen,
  MarketplaceComposeScreen,
} from "./src/screens";

// ─── helpers ─────────────────────────────────────────────────────────────────

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

/** Error that carries the HTTP status so callers can tailor the message. */
function httpError(message: string, status: number): Error {
  const err = new Error(message);
  (err as Error & { status?: number }).status = status;
  return err;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    if (response.ok) throw new Error("Empty server response.");
    throw httpError(`Server error ${response.status}.`, response.status);
  }
  let data: T & { error?: unknown; message?: unknown; detail?: unknown };
  try {
    data = JSON.parse(text);
  } catch {
    throw httpError(`Could not read server response (${response.status}).`, response.status);
  }
  if (!response.ok) {
    const msg = [data.error, data.message, data.detail].find((v) => typeof v === "string");
    throw httpError(typeof msg === "string" ? msg : `Request failed (${response.status}).`, response.status);
  }
  return data;
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

// ─── types ───────────────────────────────────────────────────────────────────

type Mode = "login" | "register";
type ConsumerTab = "home" | "scanner" | "result" | "report" | "history" | "account" | "market";
type ChatMessage = { role: "user" | "assistant"; content: string };
type HistoryEntry = {
  id: string; kind: "food" | "drug"; codeString: string;
  status: ProductScanResult["status"]; title: string; summary: string;
  recommendedAction?: string; createdAt: string;
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
  const [authStatus, setAuthStatus] = useState("");
  const [session, setSession] = useState<AuthResponse | null>(null);

  // api
  const [apiBase, setApiBase] = useState(defaultApiBase);

  // consumer
  const [consumerTab, setConsumerTab] = useState<ConsumerTab>("home");
  // seller/regulator portal: dashboard vs marketplace
  const [portalView, setPortalView] = useState<"portal" | "market" | "compose" | "result">("portal");
  const [scanCode, setScanCode] = useState("FT-QR-1001");
  const [scanResult, setScanResult] = useState<ProductScanResult | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [consumerHistory, setConsumerHistory] = useState<HistoryEntry[]>([]);
  const [scanLanguage, setScanLanguage] = useState<"en" | "tw">("en");
  const [lastScanResult, setLastScanResult] = useState<ProductScanResult | DrugScanResult | null>(null);
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
        if (saved?.trim()) setApiBase(saved.trim());
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
    setApiBase((cur) => (!cur || cur === "http://localhost:3000/api" || cur === "http://10.0.2.2:3000/api") ? detected : cur);
  }, []);

  useEffect(() => {
    return () => { if (cameraResumeTimerRef.current) clearTimeout(cameraResumeTimerRef.current); };
  }, []);

  // ── helpers ────────────────────────────────────────────────────────────────

  function getFriendlyError(error: unknown) {
    // A failed fetch (no response at all) throws TypeError — almost always a
    // connectivity problem on the device side.
    if (error instanceof TypeError) return "Could not reach the server. Check your connection.";
    const status = (error as { status?: number })?.status;
    // Gateway/unavailable codes are what Render returns while the free instance
    // is spinning back up from sleep.
    if (status === 502 || status === 503 || status === 504) {
      return "Server is waking up. Please try again shortly.";
    }
    // A genuine 500 means the request reached an awake server that then failed.
    if (typeof status === "number" && status >= 500) {
      return "Server error. Please try again later.";
    }
    // 4xx and everything else: surface the backend's own message (e.g. validation).
    return error instanceof Error ? error.message : "Something went wrong. Please try again.";
  }

  function isErrorMsg(msg: string) {
    return /error|fail|could not|server|wrong|denied|unauthori/i.test(msg);
  }

  // Retries once after a short delay — handles Render cold start
  async function fetchWithRetry(url: string, options?: RequestInit, retries = 1): Promise<Response> {
    try {
      const res = await fetch(url, options);
      if (!res.ok && res.status >= 500 && retries > 0) {
        await new Promise(r => setTimeout(r, 4000));
        return fetchWithRetry(url, options, retries - 1);
      }
      return res;
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 4000));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  }

  async function persistHistory(next: HistoryEntry[]) {
    setConsumerHistory(next);
    try { await AsyncStorage.setItem(consumerHistoryKey, JSON.stringify(next.slice(0, 25))); } catch { /* best effort */ }
  }

  function pushHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
    const next = [
      { ...entry, id: `${entry.kind}-${Date.now()}`, createdAt: new Date().toISOString() },
      ...consumerHistory,
    ].slice(0, 25);
    void persistHistory(next);
  }

  function clearResumeTimer() {
    if (cameraResumeTimerRef.current) { clearTimeout(cameraResumeTimerRef.current); cameraResumeTimerRef.current = null; }
  }

  function scheduleCameraResume(ms = 2200) {
    clearResumeTimer();
    cameraResumeTimerRef.current = setTimeout(() => { setScannerPaused(false); cameraResumeTimerRef.current = null; }, ms);
  }

  function parseScannerTarget(raw: string): ScannerTarget | null {
    const normalized = raw.trim().replace(/\s+/g, "");
    if (!normalized) return null;
    try {
      const url = new URL(normalized);
      const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      const queryCode = url.searchParams.get("batchId") ?? url.searchParams.get("code") ?? url.searchParams.get("id");
      const kind: ScannerTarget["kind"] = segments.some((s) => s.toLowerCase().includes("drug")) ? "drug" : "food";
      const codeString = (queryCode ?? segments[segments.length - 1] ?? "").trim();
      return codeString ? { kind, codeString: codeString.toUpperCase() } : null;
    } catch {
      const upper = normalized.toUpperCase();
      if (upper.startsWith("DR-") || upper.includes("DR-QR-")) return { kind: "drug", codeString: upper };
      return { kind: "food", codeString: upper };
    }
  }

  // ── auth ──────────────────────────────────────────────────────────────────

  async function submit() {
    if (mode === "register") {
      if (!fullName.trim()) { setAuthStatus("Please enter your full name."); return; }
      if (!phone.trim() && !email.trim()) { setAuthStatus("Please enter a phone number or email address."); return; }
      if (!password.trim()) { setAuthStatus("Please enter a password."); return; }
    } else {
      if (!identifier.trim()) { setAuthStatus("Please enter your phone or email."); return; }
      if (!password.trim()) { setAuthStatus("Please enter your password."); return; }
    }
    setAuthStatus("Please wait…");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login"
        ? { identifier, password }
        : { fullName, phone: phone.trim() || null, email: email.trim() || null, password, role, language: "en" };
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await readJsonResponse<AuthResponse>(response);
      setSession(data);
      setAuthStatus("");
    } catch (error) {
      const msg = getFriendlyError(error);
      // Surface duplicate-phone error clearly
      const isDuplicate = msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already") || msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("exists");
      setAuthStatus(isDuplicate
        ? "That phone number or email is already registered. Use a different one, or log in instead."
        : msg);
    }
  }

  function signOut() {
    setSession(null);
    setAuthStatus("");
    setConsumerTab("home");
    setPortalView("portal");
    setFoodDashboard(null);
    setManufacturerDashboard(null);
    setRegulatorDashboard(null);
    setPharmacyDashboard(null);
    setAiMessages([]);
  }

  // ── scan ──────────────────────────────────────────────────────────────────

  const handleScanResult = useCallback(
    (result: ProductScanResult | DrugScanResult, kind: "food" | "drug") => {
      setLastScanResult(result);
      if (kind === "drug") setDrugScanResult(result as DrugScanResult);
      else setScanResult(result as ProductScanResult);
      pushHistory({ kind, codeString: result.codeString, status: result.status, title: result.title, summary: result.summary, recommendedAction: result.recommendedAction });
      setConsumerTab("result");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [consumerHistory]
  );

  // Verify a marketplace post's QR code: scan it and jump to the result screen.
  async function verifyMarketplaceCode(code: string, domain: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    const kind: "food" | "drug" = domain === "drug" ? "drug" : "food";
    const path = kind === "drug" ? "drug/scan" : "scan";
    try {
      const response = await fetch(`${apiBase}/${path}/${encodeURIComponent(normalized)}`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      });
      const data = await readJsonResponse<{ result: ProductScanResult | DrugScanResult }>(response);
      handleScanResult(data.result, kind);
    } catch {
      setConsumerTab("scanner");
    }
  }

  // Verify a marketplace QR from the seller/regulator portal: show the result
  // screen inside the portal (these roles have no consumer bottom-nav).
  async function verifyMarketplaceCodePortal(code: string, domain: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    const kind: "food" | "drug" = domain === "drug" ? "drug" : "food";
    const path = kind === "drug" ? "drug/scan" : "scan";
    try {
      const response = await fetch(`${apiBase}/${path}/${encodeURIComponent(normalized)}`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      });
      const data = await readJsonResponse<{ result: ProductScanResult | DrugScanResult }>(response);
      setLastScanResult(data.result);
      setPortalView("result");
    } catch { /* stay on feed */ }
  }

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
      pushHistory({ kind: "food", codeString: data.result.codeString, status: data.result.status, title: data.result.title, summary: data.result.summary, recommendedAction: data.result.recommendedAction });
    } catch { /* silent */ } finally { setScanLoading(false); }
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
      pushHistory({ kind: "drug", codeString: data.result.codeString, status: data.result.status, title: data.result.title, summary: data.result.summary, recommendedAction: data.result.recommendedAction });
    } catch (error) { setDrugScanStatus(getFriendlyError(error)); }
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scanLoading || scannerPaused) return;
    const target = parseScannerTarget(data);
    if (!target) return;
    setScannerPaused(true);
    if (target.kind === "drug") { setDrugScanCode(target.codeString); await scanDrugProduct(target.codeString); }
    else { setScanCode(target.codeString); await scanFoodProduct(target.codeString); }
    scheduleCameraResume();
  }

  // ── speech ────────────────────────────────────────────────────────────────

  async function playGoogleSpeech(text: string) {
    const response = await fetch(`${apiBase}/audio/speech`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: scanLanguage }),
    });
    const data = (await readJsonResponse(response)) as SpeechSummaryResponse & { error?: unknown };
    if (!response.ok || !data.audioBase64) throw new Error("TTS unavailable");
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync({ uri: `data:${data.mimeType};base64,${data.audioBase64}` }, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((s) => { if ("didJustFinish" in s && s.didJustFinish) void sound.unloadAsync(); });
  }

  // ── food / farmer ─────────────────────────────────────────────────────────

  async function loadFoodDashboard() {
    if (!session?.token) return;
    setFoodStatus("Loading…");
    try {
      const response = await fetchWithRetry(`${apiBase}/food/dashboard`, { headers: { Authorization: `Bearer ${session.token}` } });
      const data = await readJsonResponse<{ dashboard: FoodDashboardResponse }>(response);
      setFoodDashboard(data.dashboard);
      setFoodStatus("Dashboard loaded.");
      if (!cycleFarmId && data.dashboard.farms[0]?.id) setCycleFarmId(data.dashboard.farms[0].id);
      if (!inputCycleId && data.dashboard.cropCycles[0]?.id) setInputCycleId(data.dashboard.cropCycles[0].id);
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  async function createFarm() {
    if (!session?.token) return;
    setFoodStatus("Creating farm…");
    try {
      const payload: CreateFarmRequest = { name: farmName, district: farmDistrict, region: farmRegion, cropTypes: farmCrops.split(",").map((s) => s.trim()).filter(Boolean) };
      await readJsonResponse(await fetch(`${apiBase}/food/farms`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  async function createCropCycle() {
    if (!session?.token) return;
    setFoodStatus("Creating cycle…");
    try {
      const payload: CreateCropCycleRequest = { farmId: cycleFarmId, cropType: cycleCropType, plantingDate: cyclePlantingDate };
      await readJsonResponse(await fetch(`${apiBase}/food/crop-cycles`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  async function createInputLog() {
    if (!session?.token) return;
    setFoodStatus("Saving input log…");
    try {
      const payload: CreateInputLogRequest = { cropCycleId: inputCycleId, inputType, productName: inputProductName, applicationDate: inputApplicationDate, withdrawalPeriodDays: Number(inputWithdrawalDays), epaApprovalStatus: inputEpaStatus as CreateInputLogRequest["epaApprovalStatus"] };
      await readJsonResponse(await fetch(`${apiBase}/food/input-logs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  async function markMarketReady() {
    if (!session?.token) return;
    try {
      await readJsonResponse(await fetch(`${apiBase}/food/crop-cycles/market-ready`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ cropCycleId: marketReadyCycleId, marketReady: marketReadyValue }) }));
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  async function syncOfflineQueue() {
    if (!session?.token) return;
    try {
      const payload = JSON.parse(offlineQueue) as OfflineSyncRequest;
      const data = await readJsonResponse<{ results?: unknown }>(await fetch(`${apiBase}/food/offline-sync`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      setFoodStatus(`Synced: ${JSON.stringify(data.results)}`);
      await loadFoodDashboard();
    } catch (error) { setFoodStatus(getFriendlyError(error)); }
  }

  // ── manufacturer ──────────────────────────────────────────────────────────

  async function loadManufacturerDashboard() {
    if (!session?.token) return;
    setManufacturerStatus("Loading…");
    try {
      const data = await readJsonResponse<{ dashboard: ManufacturerDashboardResponse }>(await fetchWithRetry(`${apiBase}/manufacturer/dashboard`, { headers: { Authorization: `Bearer ${session.token}` } }));
      setManufacturerDashboard(data.dashboard);
      setManufacturerStatus(data.dashboard.profile ? "Dashboard loaded." : "Create a profile to continue.");
      if (!recallBatchId && data.dashboard.batches[0]?.id) setRecallBatchId(data.dashboard.batches[0].id);
    } catch (error) { setManufacturerStatus(getFriendlyError(error)); }
  }

  async function createManufacturerProfile() {
    if (!session?.token) return;
    setManufacturerStatus("Creating profile…");
    try {
      const payload: CreateManufacturerProfileRequest = { companyName, fdaRegistrationNumber: fdaRegNumber || null, sector: manufacturerSector, subscriptionTier };
      await readJsonResponse(await fetch(`${apiBase}/manufacturer/profile`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      await loadManufacturerDashboard();
    } catch (error) { setManufacturerStatus(getFriendlyError(error)); }
  }

  async function createManufacturerBatch() {
    if (!session?.token) return;
    setManufacturerStatus("Creating batch…");
    try {
      const payload: CreateProductBatchRequest = { batchNumber, ingredientSources: [ingredientSources], processingSteps: processingSteps.split(",").map((s) => s.trim()).filter(Boolean), qualityChecks: [qualityChecks], packagingDate, expiryDate };
      const data = await readJsonResponse<CreateProductBatchResponse>(await fetch(`${apiBase}/manufacturer/batches`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      setManufacturerStatus(`Batch created. QR: ${data.qrCode.codeString}`);
      await loadManufacturerDashboard();
    } catch (error) { setManufacturerStatus(getFriendlyError(error)); }
  }

  async function createManufacturerRecall() {
    if (!session?.token) return;
    setManufacturerStatus("Issuing recall…");
    try {
      const payload: CreateRecallRequest = { batchId: recallBatchId, recallType, reason: recallReason, scopeDistricts: recallScopeDistricts.split(",").map((s) => s.trim()).filter(Boolean) };
      await readJsonResponse(await fetch(`${apiBase}/manufacturer/recalls`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      await loadManufacturerDashboard();
    } catch (error) { setManufacturerStatus(getFriendlyError(error)); }
  }

  // ── regulator ─────────────────────────────────────────────────────────────

  async function loadRegulatorDashboard() {
    if (!session?.token) return;
    setRegulatorStatus("Loading…");
    try {
      const data = await readJsonResponse<{ dashboard: RegulatorDashboardResponse }>(await fetchWithRetry(`${apiBase}/regulator/dashboard`, { headers: { Authorization: `Bearer ${session.token}` } }));
      setRegulatorDashboard(data.dashboard);
      setRegulatorStatus("Dashboard loaded.");
      if (!reportId && data.dashboard.reports[0]?.id) setReportId(data.dashboard.reports[0].id);
      if (!regulatorRecallBatchId && data.dashboard.recalls[0]?.batchId) setRegulatorRecallBatchId(data.dashboard.recalls[0].batchId);
    } catch (error) { setRegulatorStatus(getFriendlyError(error)); }
  }

  async function reviewRegulatorReport() {
    if (!session?.token) return;
    try {
      await readJsonResponse(await fetch(`${apiBase}/regulator/reports`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ reportId, status: reportStatus }) }));
      await loadRegulatorDashboard();
    } catch (error) { setRegulatorStatus(getFriendlyError(error)); }
  }

  async function createRegulatorRecall() {
    if (!session?.token) return;
    setRegulatorStatus("Issuing recall…");
    try {
      const payload: RegulatorRecallRequest = { batchId: regulatorRecallBatchId, reason: regulatorRecallReason, scopeDistricts: regulatorRecallDistricts.split(",").map((s) => s.trim()).filter(Boolean), domain: regulatorRecallDomain };
      await readJsonResponse(await fetch(`${apiBase}/regulator/recalls`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      await loadRegulatorDashboard();
    } catch (error) { setRegulatorStatus(getFriendlyError(error)); }
  }

  // ── pharmacist ────────────────────────────────────────────────────────────

  async function loadPharmacyDashboard() {
    if (!session?.token) return;
    setPharmacyStatus("Loading…");
    try {
      const data = await readJsonResponse<{ dashboard: DrugDashboardResponse }>(await fetchWithRetry(`${apiBase}/drug/dashboard`, { headers: { Authorization: `Bearer ${session.token}` } }));
      setPharmacyDashboard(data.dashboard);
      setPharmacyStatus(data.dashboard.pharmacy ? "Dashboard loaded." : "Register your pharmacy to continue.");
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  async function registerPharmacy() {
    if (!session?.token) return;
    setPharmacyStatus("Registering…");
    try {
      const payload: RegisterPharmacyRequest = { businessName, ghanaPharmacyCouncilNumber: gpcNumber, district: pharmacyDistrict, region: pharmacyRegion };
      await readJsonResponse(await fetch(`${apiBase}/drug/register`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      await loadPharmacyDashboard();
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  async function createDrugRecord() {
    if (!session?.token) return;
    setPharmacyStatus("Creating drug record…");
    try {
      const payload: CreateDrugRecordRequest = { name: drugName, genericName: drugGenericName || null, manufacturerName: drugManufacturer || null, fdaDrugRegistrationNumber: drugFdaNumber || null, drugClass: drugClass || null, dosageForm: drugDosageForm || null, strength: drugStrength || null, requiresPrescription: drugRequiresPrescription, isControlled: drugIsControlled, fdaApprovalStatus: drugApprovalStatus, storageConditions: drugStorage || null, sideEffectsSummary: drugSideEffects || null };
      await readJsonResponse(await fetch(`${apiBase}/drug/drugs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      await loadPharmacyDashboard();
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  async function createDrugBatch() {
    if (!session?.token) return;
    const firstDrugId = pharmacyDashboard?.drugs[0]?.id ?? "";
    if (!firstDrugId) { setPharmacyStatus("Create a drug record first."); return; }
    setPharmacyStatus("Creating batch…");
    try {
      const payload: CreateDrugBatchRequest = { drugId: firstDrugId, batchNumber: drugBatchNumber, manufactureDate: drugManufactureDate, expiryDate: drugExpiryDate, quantityReceived: Number(drugQuantityReceived), quantityRemaining: Number(drugQuantityRemaining), supplierName: drugSupplierName || null };
      const data = await readJsonResponse<CreateDrugBatchResponse>(await fetch(`${apiBase}/drug/batches`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      setPharmacyStatus(`Batch created. QR: ${data.qrCode.codeString}`);
      await loadPharmacyDashboard();
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  async function createDrugRecall() {
    if (!session?.token) return;
    setPharmacyStatus("Creating recall…");
    try {
      const payload: CreateDrugRecallRequest = { batchId: drugRecallBatchId, reason: drugRecallReason };
      await readJsonResponse(await fetch(`${apiBase}/drug/recalls`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(payload) }));
      await loadPharmacyDashboard();
    } catch (error) { setPharmacyStatus(getFriendlyError(error)); }
  }

  // ── AI assistant ──────────────────────────────────────────────────────────

  async function sendAiMessage() {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiInput("");
    const updatedMessages = [...aiMessages, { role: "user" as const, content: text }];
    setAiMessages(updatedMessages);
    setAiLoading(true);
    try {
      // Send last 10 messages as history so Claude remembers the conversation
      const history = updatedMessages.slice(-10).slice(0, -1);
      const response = await fetch(`${apiBase}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await readJsonResponse<{ reply: string }>(response);
      setAiMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setAiMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I could not respond. Please check your connection and try again." }]);
    } finally { setAiLoading(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: AUTH SCREEN
  // ─────────────────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#071a10" />
        <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={s.hero}>
            <Text style={s.heroKicker}>FOODTRACE GH</Text>
            <Text style={s.heroTitle}>Scan It. Trace It. Trust It.</Text>
            <Text style={s.heroBody}>Ghana's food & drug safety platform.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rolePills}>
              {USER_ROLES.map((r) => (
                <Pressable key={r} style={[s.rolePill, role === r && s.rolePillActive]} onPress={() => setRole(r)}>
                  <Text style={[s.rolePillText, role === r && s.rolePillTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Auth card */}
          <View style={s.authCard}>
            <View style={s.segmented}>
              <Pressable style={mode === "login" ? s.segActive : s.seg} onPress={() => { setMode("login"); setAuthStatus(""); }}>
                <Text style={mode === "login" ? s.segTextActive : s.segText}>Log in</Text>
              </Pressable>
              <Pressable style={mode === "register" ? s.segActive : s.seg} onPress={() => { setMode("register"); setAuthStatus(""); }}>
                <Text style={mode === "register" ? s.segTextActive : s.segText}>Create account</Text>
              </Pressable>
            </View>

            {mode === "register" ? (
              <>
                <View style={s.roleHint}>
                  <Text style={s.roleHintText}>Creating as: <Text style={s.roleHintBold}>{roleLabels[role]}</Text></Text>
                  <Text style={s.roleHintSub}>Select a role above first, then fill in your details.</Text>
                </View>
                <TextInput placeholder="Full name" placeholderTextColor="#748089" style={s.input} value={fullName} onChangeText={setFullName} />
                <TextInput placeholder="Phone number (+233...)" placeholderTextColor="#748089" style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <TextInput placeholder="Email (optional)" placeholderTextColor="#748089" style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput placeholder="Password" placeholderTextColor="#748089" style={s.input} value={password} onChangeText={setPassword} secureTextEntry />
                <Text style={s.hint}>Each account needs a unique phone number or email. To test a different role, use a different number.</Text>
                <Pressable style={s.primaryBtn} onPress={() => void submit()}>
                  <Text style={s.primaryBtnText}>Create account as {roleLabels[role]}</Text>
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

            {authStatus === "Please wait…" ? (
              <Text style={s.statusLoading}>Please wait…</Text>
            ) : authStatus ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{authStatus}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: LOGGED-IN — CONSUMER (bottom nav layout)
  // ─────────────────────────────────────────────────────────────────────────

  if (isConsumer) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#071a10" />

        {/* Top header */}
        <View style={s.topBar}>
          <Text style={s.topBarLogo}>FOODTRACE GH</Text>
          <Text style={s.topBarUser} numberOfLines={1}>{session.user.fullName || "Account"}</Text>
        </View>

        {/* Screen content */}
        <View style={s.screenArea}>
          {consumerTab === "market" ? (
            <MarketplaceFeedScreen
              apiBase={apiBase}
              token={session.token}
              currentUserRole={session.user.role}
              onVerifyCode={(code, domain) => void verifyMarketplaceCode(code, domain)}
              onCompose={() => setConsumerTab("scanner")}
            />
          ) : consumerTab === "scanner" ? (
            <QRScannerScreen apiBase={apiBase} token={session.token} scanLanguage={scanLanguage} onScanResult={handleScanResult} />
          ) : consumerTab === "result" && lastScanResult ? (
            <SafetyResultScreen
              result={lastScanResult}
              scanLanguage={scanLanguage}
              apiBase={apiBase}
              onBack={() => setConsumerTab("scanner")}
              onViewHistory={() => setConsumerTab("history")}
              onReport={() => setConsumerTab("report")}
              onAskAI={(prefill) => { setAiInput(prefill); setConsumerTab("account"); }}
            />
          ) : consumerTab === "report" ? (
            <ConsumerReportScreen
              apiBase={apiBase}
              token={session.token}
              scannedCode={lastScanResult?.codeString ?? null}
              onBack={() => setConsumerTab(lastScanResult ? "result" : "scanner")}
              onGoToScanner={() => setConsumerTab("scanner")}
            />
          ) : consumerTab === "history" ? (
            <ScanHistoryScreen
              history={consumerHistory}
              onClear={() => void persistHistory([])}
              onBack={() => setConsumerTab("home")}
            />
          ) : consumerTab === "account" ? (
            <ScrollView contentContainerStyle={s.scrollPad} keyboardShouldPersistTaps="handled">
              {/* User card */}
              <View style={s.card}>
                <Text style={s.cardKicker}>ACCOUNT</Text>
                <Text style={s.cardTitle}>{session.user.fullName || "FoodTrace User"}</Text>
                <Text style={s.cardSub}>Role: {session.user.role}</Text>
                <View style={s.langRow}>
                  <Pressable style={[s.chip, scanLanguage === "en" && s.chipActive]} onPress={() => setScanLanguage("en")}>
                    <Text style={[s.chipText, scanLanguage === "en" && s.chipTextActive]}>English</Text>
                  </Pressable>
                  <Pressable style={[s.chip, scanLanguage === "tw" && s.chipActive]} onPress={() => setScanLanguage("tw")}>
                    <Text style={[s.chipText, scanLanguage === "tw" && s.chipTextActive]}>Twi</Text>
                  </Pressable>
                </View>
                <Pressable style={s.outlineBtn} onPress={signOut}>
                  <Text style={s.outlineBtnText}>Sign out</Text>
                </Pressable>
              </View>

              {/* AI assistant */}
              <View style={s.card}>
                <Text style={s.cardKicker}>AI HELPER</Text>
                <Text style={s.cardTitle}>Food & Drug Assistant</Text>
                <Text style={s.cardSub}>Ask about food safety, medicine storage, recalls, or how to use FoodTrace.</Text>

                <View style={s.chatBox}>
                  {aiMessages.length === 0 ? (
                    <View style={{ gap: 8 }}>
                      <Text style={s.chatEmptyText}>Try one of these:</Text>
                      {["Is it safe to eat food past the expiry date?", "What should I do if a product is recalled?", "How do I store medicines properly?"].map((q) => (
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

                <View style={s.chatInputRow}>
                  <TextInput style={s.chatInput} placeholder="Ask a question…" placeholderTextColor="#748089" value={aiInput} onChangeText={setAiInput} multiline />
                  <Pressable style={[s.sendBtn, (!aiInput.trim() || aiLoading) && s.sendBtnOff]} onPress={() => void sendAiMessage()} disabled={!aiInput.trim() || aiLoading}>
                    <Text style={s.sendBtnText}>Send</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          ) : (
            /* HOME */
            <ScrollView contentContainerStyle={s.scrollPad}>
              <View style={s.homeHero}>
                <Text style={s.homeKicker}>WELCOME BACK</Text>
                <Text style={s.homeTitle}>{session.user.fullName || "FoodTrace User"}</Text>
                <Text style={s.homeBody}>Scan a QR code on food or medicine packaging to instantly check its safety status.</Text>
              </View>
              <Pressable style={[s.primaryBtn, { marginHorizontal: 0 }]} onPress={() => setConsumerTab("scanner")}>
                <Text style={s.primaryBtnText}>Open Scanner</Text>
              </Pressable>
              {lastScanResult ? (
                <Pressable style={[s.card, { marginTop: 12 }]} onPress={() => setConsumerTab("result")}>
                  <Text style={s.cardKicker}>LAST SCAN</Text>
                  <Text style={s.cardTitle}>{lastScanResult.title}</Text>
                  <View style={[s.statusBadge, statusBadgeStyle(lastScanResult.status)]}>
                    <Text style={s.statusBadgeText}>{lastScanResult.status.toUpperCase()}</Text>
                  </View>
                  <Text style={s.cardSub}>Tap to view full result</Text>
                </Pressable>
              ) : (
                <View style={[s.card, { marginTop: 12, alignItems: "center", paddingVertical: 32 }]}>
                  <Text style={s.chatEmptyText}>No scans yet. Tap the Scan tab to get started.</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Bottom nav */}
        <View style={s.bottomNav}>
          {([
            { tab: "home" as ConsumerTab, icon: "⌂", label: "Home" },
            { tab: "market" as ConsumerTab, icon: "▤", label: "Market" },
            { tab: "scanner" as ConsumerTab, icon: "⊡", label: "Scan" },
            { tab: "history" as ConsumerTab, icon: "◷", label: "History" },
            { tab: "account" as ConsumerTab, icon: "○", label: "Account" },
          ] as const).map(({ tab, icon, label }) => {
            const isActive = tab === "home"
              ? (consumerTab === "home" || consumerTab === "result" || consumerTab === "report")
              : consumerTab === tab;
            return (
              <Pressable key={tab} style={s.navItem} onPress={() => setConsumerTab(tab)}>
                <Text style={[s.navIcon, isActive && s.navActive]}>{icon}</Text>
                <Text style={[s.navLabel, isActive && s.navActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: LOGGED-IN — OTHER ROLES (farmer / manufacturer / regulator / pharmacist)
  // ─────────────────────────────────────────────────────────────────────────

  const portalTitle = roleLabels[currentRole ?? ""] ?? "Portal";

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#071a10" />
      <View style={s.topBar}>
        <Text style={s.topBarLogo}>FOODTRACE GH</Text>
        <Pressable onPress={signOut} style={s.signOutBtn}>
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      {portalView !== "compose" && portalView !== "result" ? (
        <View style={s.portalTabs}>
          <Pressable style={[s.portalTab, portalView === "portal" && s.portalTabOn]} onPress={() => setPortalView("portal")}>
            <Text style={[s.portalTabText, portalView === "portal" && s.portalTabTextOn]}>My Portal</Text>
          </Pressable>
          <Pressable style={[s.portalTab, portalView === "market" && s.portalTabOn]} onPress={() => setPortalView("market")}>
            <Text style={[s.portalTabText, portalView === "market" && s.portalTabTextOn]}>Marketplace</Text>
          </Pressable>
        </View>
      ) : null}

      {portalView === "market" ? (
        <MarketplaceFeedScreen
          apiBase={apiBase}
          token={session.token}
          currentUserRole={session.user.role}
          onVerifyCode={(code, domain) => void verifyMarketplaceCodePortal(code, domain)}
          onCompose={() => setPortalView("compose")}
        />
      ) : portalView === "compose" ? (
        <MarketplaceComposeScreen
          apiBase={apiBase}
          token={session.token}
          role={session.user.role}
          onPosted={() => setPortalView("market")}
          onCancel={() => setPortalView("market")}
        />
      ) : portalView === "result" && lastScanResult ? (
        <SafetyResultScreen
          result={lastScanResult}
          scanLanguage={scanLanguage}
          apiBase={apiBase}
          onBack={() => setPortalView("market")}
          onViewHistory={() => setPortalView("market")}
          onReport={() => setPortalView("market")}
        />
      ) : (
      <ScrollView contentContainerStyle={s.scrollPad} keyboardShouldPersistTaps="handled">
        <View style={s.portalHero}>
          <Text style={s.heroKicker}>{portalTitle.toUpperCase()} PORTAL</Text>
          <Text style={s.heroTitle}>{session.user.fullName || portalTitle}</Text>
        </View>

        {/* FARMER */}
        {isFarmer ? (
          <>
            <View style={s.card}>
              <Text style={s.cardKicker}>DASHBOARD</Text>
              <Pressable style={s.primaryBtn} onPress={() => void loadFoodDashboard()}>
                <Text style={s.primaryBtnText}>Load Dashboard</Text>
              </Pressable>
              {foodStatus ? <Text style={[s.statusMsg, isErrorMsg(foodStatus) ? s.statusErr : s.statusOk]}>{foodStatus}</Text> : null}
              {foodDashboard ? (
                <View style={s.metricGrid}>
                  {[
                    ["Farms", foodDashboard.metrics.farms],
                    ["Crop cycles", foodDashboard.metrics.cropCycles],
                    ["Market-ready", foodDashboard.metrics.readyCycles],
                    ["Pending withdrawal", foodDashboard.metrics.pendingWithdrawalCycles],
                    ["Overdue", foodDashboard.metrics.overdueWithdrawalCycles],
                  ].map(([label, val]) => (
                    <View key={String(label)} style={s.metricItem}>
                      <Text style={s.metricVal}>{val}</Text>
                      <Text style={s.metricLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <FormCard title="Create Farm">
              <TextInput placeholder="Farm name" placeholderTextColor="#748089" style={s.input} value={farmName} onChangeText={setFarmName} />
              <TextInput placeholder="District" placeholderTextColor="#748089" style={s.input} value={farmDistrict} onChangeText={setFarmDistrict} />
              <TextInput placeholder="Region" placeholderTextColor="#748089" style={s.input} value={farmRegion} onChangeText={setFarmRegion} />
              <TextInput placeholder="Crop types (comma-separated)" placeholderTextColor="#748089" style={s.input} value={farmCrops} onChangeText={setFarmCrops} />
              <Pressable style={s.outlineBtn} onPress={() => void createFarm()}><Text style={s.outlineBtnText}>Create Farm</Text></Pressable>
            </FormCard>

            <FormCard title="Start Crop Cycle">
              <TextInput placeholder="Farm ID (auto-filled after load)" placeholderTextColor="#748089" style={s.input} value={cycleFarmId} onChangeText={setCycleFarmId} />
              <TextInput placeholder="Crop type" placeholderTextColor="#748089" style={s.input} value={cycleCropType} onChangeText={setCycleCropType} />
              <TextInput placeholder="Planting date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={cyclePlantingDate} onChangeText={setCyclePlantingDate} />
              <Pressable style={s.outlineBtn} onPress={() => void createCropCycle()}><Text style={s.outlineBtnText}>Start Cycle</Text></Pressable>
            </FormCard>

            <FormCard title="Log Input">
              <TextInput placeholder="Crop cycle ID (auto-filled after load)" placeholderTextColor="#748089" style={s.input} value={inputCycleId} onChangeText={setInputCycleId} />
              <TextInput placeholder="Product name" placeholderTextColor="#748089" style={s.input} value={inputProductName} onChangeText={setInputProductName} />
              <TextInput placeholder="Application date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={inputApplicationDate} onChangeText={setInputApplicationDate} />
              <TextInput placeholder="Withdrawal days" placeholderTextColor="#748089" style={s.input} value={inputWithdrawalDays} onChangeText={setInputWithdrawalDays} keyboardType="numeric" />
              <TextInput placeholder="EPA status" placeholderTextColor="#748089" style={s.input} value={inputEpaStatus} onChangeText={setInputEpaStatus} />
              <Pressable style={s.outlineBtn} onPress={() => void createInputLog()}><Text style={s.outlineBtnText}>Save Input Log</Text></Pressable>
            </FormCard>

            <FormCard title="Mark Market-Ready">
              <TextInput placeholder="Crop cycle ID" placeholderTextColor="#748089" style={s.input} value={marketReadyCycleId} onChangeText={setMarketReadyCycleId} />
              <View style={s.langRow}>
                <Pressable style={[s.chip, marketReadyValue && s.chipActive]} onPress={() => setMarketReadyValue(true)}><Text style={[s.chipText, marketReadyValue && s.chipTextActive]}>Ready</Text></Pressable>
                <Pressable style={[s.chip, !marketReadyValue && s.chipActive]} onPress={() => setMarketReadyValue(false)}><Text style={[s.chipText, !marketReadyValue && s.chipTextActive]}>Not ready</Text></Pressable>
              </View>
              <Pressable style={s.outlineBtn} onPress={() => void markMarketReady()}><Text style={s.outlineBtnText}>Update Status</Text></Pressable>
            </FormCard>
          </>
        ) : null}

        {/* MANUFACTURER */}
        {isManufacturer ? (
          <>
            <View style={s.card}>
              <Text style={s.cardKicker}>DASHBOARD</Text>
              <Pressable style={s.primaryBtn} onPress={() => void loadManufacturerDashboard()}><Text style={s.primaryBtnText}>Load Dashboard</Text></Pressable>
              {manufacturerStatus ? <Text style={[s.statusMsg, isErrorMsg(manufacturerStatus) ? s.statusErr : s.statusOk]}>{manufacturerStatus}</Text> : null}
              {manufacturerDashboard ? (
                <View style={s.metricGrid}>
                  {[
                    ["Profile", manufacturerDashboard.profile?.companyName ?? "—"],
                    ["Batches", manufacturerDashboard.metrics.batches],
                    ["QR codes", manufacturerDashboard.metrics.qrCodes],
                    ["Active recalls", manufacturerDashboard.metrics.activeRecalls],
                  ].map(([l, v]) => (
                    <View key={String(l)} style={s.metricItem}>
                      <Text style={s.metricVal} numberOfLines={1}>{v}</Text>
                      <Text style={s.metricLabel}>{l}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <FormCard title="Company Profile">
              <TextInput placeholder="Company name" placeholderTextColor="#748089" style={s.input} value={companyName} onChangeText={setCompanyName} />
              <TextInput placeholder="FDA registration number" placeholderTextColor="#748089" style={s.input} value={fdaRegNumber} onChangeText={setFdaRegNumber} />
              <TextInput placeholder="Sector" placeholderTextColor="#748089" style={s.input} value={manufacturerSector} onChangeText={setManufacturerSector} />
              <Pressable style={s.outlineBtn} onPress={() => void createManufacturerProfile()}><Text style={s.outlineBtnText}>Create Profile</Text></Pressable>
            </FormCard>

            <FormCard title="New Batch & QR">
              <TextInput placeholder="Batch number" placeholderTextColor="#748089" style={s.input} value={batchNumber} onChangeText={setBatchNumber} />
              <TextInput placeholder="Packaging date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={packagingDate} onChangeText={setPackagingDate} />
              <TextInput placeholder="Expiry date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={expiryDate} onChangeText={setExpiryDate} />
              <TextInput placeholder="Ingredient sources" placeholderTextColor="#748089" style={s.input} value={ingredientSources} onChangeText={setIngredientSources} />
              <TextInput placeholder="Processing steps (comma-separated)" placeholderTextColor="#748089" style={s.input} value={processingSteps} onChangeText={setProcessingSteps} />
              <TextInput placeholder="Quality checks" placeholderTextColor="#748089" style={s.input} value={qualityChecks} onChangeText={setQualityChecks} />
              <Pressable style={s.outlineBtn} onPress={() => void createManufacturerBatch()}><Text style={s.outlineBtnText}>Create Batch & Generate QR</Text></Pressable>
            </FormCard>

            <FormCard title="Issue Recall">
              <TextInput placeholder="Batch ID" placeholderTextColor="#748089" style={s.input} value={recallBatchId} onChangeText={setRecallBatchId} />
              <TextInput placeholder="Reason" placeholderTextColor="#748089" style={s.input} value={recallReason} onChangeText={setRecallReason} />
              <TextInput placeholder="Affected districts (comma-separated)" placeholderTextColor="#748089" style={s.input} value={recallScopeDistricts} onChangeText={setRecallScopeDistricts} />
              <Pressable style={[s.outlineBtn, { borderColor: "#f87171" }]} onPress={() => void createManufacturerRecall()}><Text style={[s.outlineBtnText, { color: "#f87171" }]}>Issue Recall</Text></Pressable>
            </FormCard>
          </>
        ) : null}

        {/* REGULATOR */}
        {isRegulator ? (
          <>
            <View style={s.card}>
              <Text style={s.cardKicker}>DASHBOARD</Text>
              <Pressable style={s.primaryBtn} onPress={() => void loadRegulatorDashboard()}><Text style={s.primaryBtnText}>Load Dashboard</Text></Pressable>
              {regulatorStatus ? <Text style={[s.statusMsg, isErrorMsg(regulatorStatus) ? s.statusErr : s.statusOk]}>{regulatorStatus}</Text> : null}
              {regulatorDashboard ? (
                <View style={s.metricGrid}>
                  {[
                    ["Farms", regulatorDashboard.compliance.farms],
                    ["Manufacturers", regulatorDashboard.compliance.manufacturers],
                    ["Pharmacies", regulatorDashboard.compliance.pharmacies],
                    ["Food recalls", regulatorDashboard.compliance.foodRecalls],
                    ["Drug recalls", regulatorDashboard.compliance.drugRecalls],
                    ["Pending reports", regulatorDashboard.compliance.pendingReports],
                    ["Total scans", regulatorDashboard.analytics.totalScans],
                    ["High-risk alerts", regulatorDashboard.analytics.highRiskAlerts],
                  ].map(([l, v]) => (
                    <View key={String(l)} style={s.metricItem}>
                      <Text style={s.metricVal}>{v}</Text>
                      <Text style={s.metricLabel}>{l}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <FormCard title="Review Report">
              <TextInput placeholder="Report ID" placeholderTextColor="#748089" style={s.input} value={reportId} onChangeText={setReportId} />
              <TextInput placeholder="Status (reviewing/resolved/dismissed)" placeholderTextColor="#748089" style={s.input} value={reportStatus} onChangeText={(v) => setReportStatus(v as typeof reportStatus)} />
              <Pressable style={s.outlineBtn} onPress={() => void reviewRegulatorReport()}><Text style={s.outlineBtnText}>Update Report</Text></Pressable>
            </FormCard>

            <FormCard title="Issue Emergency Recall">
              <TextInput placeholder="Batch ID" placeholderTextColor="#748089" style={s.input} value={regulatorRecallBatchId} onChangeText={setRegulatorRecallBatchId} />
              <TextInput placeholder="Reason" placeholderTextColor="#748089" style={s.input} value={regulatorRecallReason} onChangeText={setRegulatorRecallReason} />
              <TextInput placeholder="Districts (comma-separated)" placeholderTextColor="#748089" style={s.input} value={regulatorRecallDistricts} onChangeText={setRegulatorRecallDistricts} />
              <View style={s.langRow}>
                <Pressable style={[s.chip, regulatorRecallDomain === "food" && s.chipActive]} onPress={() => setRegulatorRecallDomain("food")}><Text style={[s.chipText, regulatorRecallDomain === "food" && s.chipTextActive]}>Food</Text></Pressable>
                <Pressable style={[s.chip, regulatorRecallDomain === "drug" && s.chipActive]} onPress={() => setRegulatorRecallDomain("drug")}><Text style={[s.chipText, regulatorRecallDomain === "drug" && s.chipTextActive]}>Drug</Text></Pressable>
              </View>
              <Pressable style={[s.outlineBtn, { borderColor: "#f87171" }]} onPress={() => void createRegulatorRecall()}><Text style={[s.outlineBtnText, { color: "#f87171" }]}>Issue Recall</Text></Pressable>
            </FormCard>
          </>
        ) : null}

        {/* PHARMACIST */}
        {isPharmacist ? (
          <>
            <View style={s.card}>
              <Text style={s.cardKicker}>DASHBOARD</Text>
              <Pressable style={s.primaryBtn} onPress={() => void loadPharmacyDashboard()}><Text style={s.primaryBtnText}>Load Dashboard</Text></Pressable>
              {pharmacyStatus ? <Text style={[s.statusMsg, isErrorMsg(pharmacyStatus) ? s.statusErr : s.statusOk]}>{pharmacyStatus}</Text> : null}
              {pharmacyDashboard ? (
                <View style={s.metricGrid}>
                  {[
                    ["Pharmacy", pharmacyDashboard.pharmacy?.businessName ?? "—"],
                    ["Drugs", pharmacyDashboard.metrics.drugs],
                    ["Batches", pharmacyDashboard.metrics.batches],
                    ["QR codes", pharmacyDashboard.metrics.qrCodes],
                    ["Recalls", pharmacyDashboard.metrics.recalls],
                  ].map(([l, v]) => (
                    <View key={String(l)} style={s.metricItem}>
                      <Text style={s.metricVal} numberOfLines={1}>{v}</Text>
                      <Text style={s.metricLabel}>{l}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <FormCard title="Register Pharmacy">
              <TextInput placeholder="Business name" placeholderTextColor="#748089" style={s.input} value={businessName} onChangeText={setBusinessName} />
              <TextInput placeholder="Ghana Pharmacy Council number" placeholderTextColor="#748089" style={s.input} value={gpcNumber} onChangeText={setGpcNumber} />
              <TextInput placeholder="District" placeholderTextColor="#748089" style={s.input} value={pharmacyDistrict} onChangeText={setPharmacyDistrict} />
              <TextInput placeholder="Region" placeholderTextColor="#748089" style={s.input} value={pharmacyRegion} onChangeText={setPharmacyRegion} />
              <Pressable style={s.outlineBtn} onPress={() => void registerPharmacy()}><Text style={s.outlineBtnText}>Register Pharmacy</Text></Pressable>
            </FormCard>

            <FormCard title="Add Drug Record">
              <TextInput placeholder="Drug name" placeholderTextColor="#748089" style={s.input} value={drugName} onChangeText={setDrugName} />
              <TextInput placeholder="Generic name" placeholderTextColor="#748089" style={s.input} value={drugGenericName} onChangeText={setDrugGenericName} />
              <TextInput placeholder="Manufacturer" placeholderTextColor="#748089" style={s.input} value={drugManufacturer} onChangeText={setDrugManufacturer} />
              <TextInput placeholder="FDA drug reg. number" placeholderTextColor="#748089" style={s.input} value={drugFdaNumber} onChangeText={setDrugFdaNumber} />
              <TextInput placeholder="Drug class" placeholderTextColor="#748089" style={s.input} value={drugClass} onChangeText={setDrugClass} />
              <TextInput placeholder="Dosage form" placeholderTextColor="#748089" style={s.input} value={drugDosageForm} onChangeText={setDrugDosageForm} />
              <TextInput placeholder="Strength (e.g. 500mg)" placeholderTextColor="#748089" style={s.input} value={drugStrength} onChangeText={setDrugStrength} />
              <TextInput placeholder="Storage conditions" placeholderTextColor="#748089" style={s.input} value={drugStorage} onChangeText={setDrugStorage} />
              <View style={s.langRow}>
                {(["approved", "restricted", "banned", "under_review"] as const).map((v) => (
                  <Pressable key={v} style={[s.chip, drugApprovalStatus === v && s.chipActive]} onPress={() => setDrugApprovalStatus(v)}>
                    <Text style={[s.chipText, drugApprovalStatus === v && s.chipTextActive]}>{v}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={s.outlineBtn} onPress={() => void createDrugRecord()}><Text style={s.outlineBtnText}>Add Drug Record</Text></Pressable>
            </FormCard>

            <FormCard title="Add Drug Batch & QR">
              <TextInput placeholder="Batch number" placeholderTextColor="#748089" style={s.input} value={drugBatchNumber} onChangeText={setDrugBatchNumber} />
              <TextInput placeholder="Manufacture date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={drugManufactureDate} onChangeText={setDrugManufactureDate} />
              <TextInput placeholder="Expiry date (YYYY-MM-DD)" placeholderTextColor="#748089" style={s.input} value={drugExpiryDate} onChangeText={setDrugExpiryDate} />
              <TextInput placeholder="Quantity received" placeholderTextColor="#748089" style={s.input} value={drugQuantityReceived} onChangeText={setDrugQuantityReceived} keyboardType="numeric" />
              <TextInput placeholder="Supplier name" placeholderTextColor="#748089" style={s.input} value={drugSupplierName} onChangeText={setDrugSupplierName} />
              <Pressable style={s.outlineBtn} onPress={() => void createDrugBatch()}><Text style={s.outlineBtnText}>Add Batch & Generate QR</Text></Pressable>
            </FormCard>

            <FormCard title="Scan Drug QR">
              <TextInput placeholder="Drug QR code" placeholderTextColor="#748089" style={s.input} value={drugScanCode} onChangeText={setDrugScanCode} />
              <Pressable style={s.outlineBtn} onPress={() => void scanDrugProduct()}><Text style={s.outlineBtnText}>Scan Drug</Text></Pressable>
              {drugScanStatus ? <Text style={[s.statusMsg, isErrorMsg(drugScanStatus) ? s.statusErr : s.statusOk]}>{drugScanStatus}</Text> : null}
              {drugScanResult ? (
                <View style={[s.metricGrid, { marginTop: 10 }]}>
                  <View style={[s.statusBadge, statusBadgeStyle(drugScanResult.status), { alignSelf: "flex-start" }]}>
                    <Text style={s.statusBadgeText}>{drugScanResult.status.toUpperCase()}</Text>
                  </View>
                  <Text style={s.metricLabel}>{drugScanResult.summary}</Text>
                </View>
              ) : null}
            </FormCard>

            <FormCard title="Issue Drug Recall">
              <TextInput placeholder="Drug batch ID" placeholderTextColor="#748089" style={s.input} value={drugRecallBatchId} onChangeText={setDrugRecallBatchId} />
              <TextInput placeholder="Recall reason" placeholderTextColor="#748089" style={s.input} value={drugRecallReason} onChangeText={setDrugRecallReason} />
              <Pressable style={[s.outlineBtn, { borderColor: "#f87171" }]} onPress={() => void createDrugRecall()}><Text style={[s.outlineBtnText, { color: "#f87171" }]}>Issue Recall</Text></Pressable>
            </FormCard>
          </>
        ) : null}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardKicker}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

// ── utilities ──────────────────────────────────────────────────────────────

function statusBadgeStyle(status: string) {
  switch (status) {
    case "safe":     return { backgroundColor: "#c4f1db" };
    case "caution":  return { backgroundColor: "#f6e7b5" };
    case "recalled": return { backgroundColor: "#f7c2c2" };
    default:         return { backgroundColor: "#d1d5db" };
  }
}

// ── styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05080b" },

  // auth
  authScroll: { flexGrow: 1, paddingBottom: 40 },
  hero: { backgroundColor: "#0d3428", paddingHorizontal: 20, paddingTop: 48, paddingBottom: 28 },
  heroKicker: { color: "#93b9ac", fontSize: 11, fontWeight: "700", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 },
  heroTitle: { color: "#f4f4ef", fontSize: 28, fontWeight: "800", marginBottom: 6, lineHeight: 34 },
  heroBody: { color: "#b6cfc3", fontSize: 14, marginBottom: 20 },
  rolePills: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  rolePill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  rolePillActive: { backgroundColor: "#c4f1db" },
  rolePillText: { color: "#d5e4dd", fontWeight: "600", fontSize: 14 },
  rolePillTextActive: { color: "#062014" },

  authCard: { backgroundColor: "#10161b", marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },

  segmented: { flexDirection: "row", gap: 8, marginBottom: 18 },
  seg: { flex: 1, backgroundColor: "#1a2228", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  segActive: { flex: 1, backgroundColor: "#c4f1db", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  segText: { color: "#93b9ac", fontWeight: "600" },
  segTextActive: { color: "#113629", fontWeight: "700" },

  roleHint: { backgroundColor: "rgba(119,199,162,0.1)", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(119,199,162,0.2)" },
  roleHintText: { color: "#b6cfc3", fontSize: 13 },
  roleHintBold: { color: "#77c7a2", fontWeight: "700" },
  roleHintSub: { color: "#748089", fontSize: 12, marginTop: 4 },

  input: { backgroundColor: "#0b0f13", borderRadius: 12, minHeight: 52, paddingHorizontal: 16, color: "#f4f4ef", fontSize: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 10 },
  hint: { color: "#748089", fontSize: 12, lineHeight: 18, marginBottom: 12 },

  primaryBtn: { backgroundColor: "#77c7a2", borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, marginBottom: 4 },
  primaryBtnText: { color: "#062014", fontSize: 15, fontWeight: "700" },

  outlineBtn: { borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, borderWidth: 1, borderColor: "#77c7a2", marginTop: 6 },
  outlineBtnText: { color: "#77c7a2", fontSize: 15, fontWeight: "600" },

  statusLoading: { color: "#748089", textAlign: "center", marginTop: 10 },
  errorBox: { backgroundColor: "rgba(248,113,113,0.1)", borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: "rgba(248,113,113,0.3)" },
  errorText: { color: "#f87171", fontSize: 14, lineHeight: 20 },

  // logged-in layout
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14, backgroundColor: "#071a10", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  topBarLogo: { color: "#77c7a2", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  topBarUser: { color: "#93b9ac", fontSize: 13, maxWidth: 140 },
  signOutBtn: { backgroundColor: "#182028", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  signOutText: { color: "#93b9ac", fontSize: 13, fontWeight: "600" },

  screenArea: { flex: 1 },
  scrollPad: { flexGrow: 1, padding: 16, gap: 12 },

  // bottom nav
  bottomNav: { flexDirection: "row", backgroundColor: "#10161b", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingBottom: Platform.OS === "ios" ? 20 : 8, paddingTop: 10 },
  navItem: { flex: 1, alignItems: "center", gap: 3 },
  navIcon: { fontSize: 20, color: "#748089" },
  navLabel: { fontSize: 11, color: "#748089", fontWeight: "600" },
  navActive: { color: "#77c7a2" },

  // cards
  card: { backgroundColor: "#10161b", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  cardKicker: { color: "#93b9ac", fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  cardTitle: { color: "#f4f4ef", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  cardSub: { color: "#748089", fontSize: 13, marginBottom: 12 },

  // home hero
  homeHero: { backgroundColor: "#0d3428", borderRadius: 20, padding: 20, marginBottom: 4 },
  homeKicker: { color: "#93b9ac", fontSize: 11, letterSpacing: 3, fontWeight: "700", marginBottom: 6 },
  homeTitle: { color: "#f4f4ef", fontSize: 24, fontWeight: "800", marginBottom: 8 },
  homeBody: { color: "#b6cfc3", lineHeight: 22 },

  // portal hero
  portalHero: { backgroundColor: "#0d3428", borderRadius: 20, padding: 20, marginBottom: 4 },
  portalTabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  portalTab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, borderWidth: 0.5, borderColor: "rgba(119,199,162,0.3)" },
  portalTabOn: { backgroundColor: "#77c7a2", borderColor: "#77c7a2" },
  portalTabText: { color: "#a9b8b1", fontSize: 13, fontWeight: "600" },
  portalTabTextOn: { color: "#05080b" },

  // metrics
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  metricItem: { backgroundColor: "#0b0f13", borderRadius: 12, padding: 12, minWidth: 90, alignItems: "center" },
  metricVal: { color: "#f4f4ef", fontWeight: "700", fontSize: 18, marginBottom: 2 },
  metricLabel: { color: "#748089", fontSize: 11, textAlign: "center" },
  statusMsg: { marginTop: 10, fontSize: 13 },
  statusOk: { color: "#77c7a2" },
  statusErr: { color: "#f87171" },

  // chips / lang toggle
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#182028", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  chipActive: { backgroundColor: "#c4f1db", borderColor: "#77c7a2" },
  chipText: { color: "#93b9ac", fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#062014" },

  // status badge (inline)
  statusBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8 },
  statusBadgeText: { color: "#12392d", fontWeight: "700", fontSize: 12 },

  // ai chat
  chatBox: { backgroundColor: "#0b0f13", borderRadius: 14, padding: 12, minHeight: 140, marginVertical: 12, gap: 8 },
  chatEmptyText: { color: "#748089", fontSize: 13, marginBottom: 8 },
  suggestion: { backgroundColor: "#182028", borderRadius: 10, padding: 10 },
  suggestionText: { color: "#d5e4dd", fontSize: 13, lineHeight: 18 },
  bubble: { borderRadius: 14, padding: 12, maxWidth: "85%" },
  bubbleUser: { backgroundColor: "#c4f1db", alignSelf: "flex-end" },
  bubbleAI: { backgroundColor: "#182028", alignSelf: "flex-start" },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: "#062014" },
  bubbleTextAI: { color: "#d5e4dd" },
  chatInputRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  chatInput: { flex: 1, backgroundColor: "#0b0f13", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#f4f4ef", fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", minHeight: 46, maxHeight: 110 },
  sendBtn: { backgroundColor: "#77c7a2", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: "center" },
  sendBtnOff: { opacity: 0.4 },
  sendBtnText: { color: "#062014", fontWeight: "700", fontSize: 14 },
});
