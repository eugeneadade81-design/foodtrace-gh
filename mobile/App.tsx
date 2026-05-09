import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
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
  type SubmitConsumerReportResponse,
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

const defaultApiBase =
  Platform.OS === "android"
    ? "http://10.0.2.2:3000/api" // Android emulator -> host machine loopback
    : "http://localhost:3000/api";
const sampleCodes = ["FT-QR-1001", "FT-QR-2002", "FT-QR-4004"];
const consumerHistoryKey = "foodtrace.consumer.history.v1";
const apiBaseKey = "foodtrace.apiBase.v1";

type Mode = "login" | "register";
type ConsumerScreen = "home" | "food" | "drug" | "history";
type ScannerTarget = {
  kind: "food" | "drug";
  codeString: string;
};
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

export default function App() {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("consumer");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState("Ready");
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [apiBaseDraft, setApiBaseDraft] = useState(defaultApiBase);
  const [consumerScreen, setConsumerScreen] = useState<ConsumerScreen>("home");
  const [scanCode, setScanCode] = useState("FT-QR-1001");
  const [scanResult, setScanResult] = useState<ProductScanResult | null>(null);
  const [scanStatus, setScanStatus] = useState("Ready to scan");
  const [scanLoading, setScanLoading] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerPaused, setScannerPaused] = useState(false);
  const [consumerHistory, setConsumerHistory] = useState<HistoryEntry[]>([]);
  const [reportDescription, setReportDescription] = useState("The product looks damaged and the label is unclear.");
  const [reportDistrict, setReportDistrict] = useState("Accra");
  const [reportPhotoUrl, setReportPhotoUrl] = useState("");
  const [reportStatusText, setReportStatusText] = useState("Ready to submit a consumer report");
  const [scanLanguage, setScanLanguage] = useState<"en" | "tw">("en");
  const [foodDashboard, setFoodDashboard] = useState<FoodDashboardResponse | null>(null);
  const [foodStatus, setFoodStatus] = useState("Food module ready");
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
  const [farmerStatus, setFarmerStatus] = useState("Farmer portal ready");
  const [manufacturerDashboard, setManufacturerDashboard] = useState<ManufacturerDashboardResponse | null>(null);
  const [manufacturerStatus, setManufacturerStatus] = useState("Manufacturer portal ready");
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
  const [regulatorDashboard, setRegulatorDashboard] = useState<RegulatorDashboardResponse | null>(null);
  const [regulatorStatus, setRegulatorStatus] = useState("Regulator portal ready");
  const [reportId, setReportId] = useState("");
  const [reportStatus, setReportStatus] = useState<"reviewing" | "resolved" | "dismissed">("reviewing");
  const [regulatorRecallBatchId, setRegulatorRecallBatchId] = useState("");
  const [regulatorRecallReason, setRegulatorRecallReason] = useState("Public safety issue");
  const [regulatorRecallDistricts, setRegulatorRecallDistricts] = useState("Accra,Kumasi");
  const [regulatorRecallDomain, setRegulatorRecallDomain] = useState<"food" | "drug">("food");
  const [drugScanCode, setDrugScanCode] = useState("DR-QR-1001");
  const [drugScanResult, setDrugScanResult] = useState<DrugScanResult | null>(null);
  const [drugScanStatus, setDrugScanStatus] = useState("Drug scan ready");
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
  const cameraResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roleList = useMemo(() => USER_ROLES, []);
  const currentRole = session?.user.role ?? null;
  const isConsumer = currentRole === "consumer";
  const isFarmer = currentRole === "farmer";
  const isManufacturer = currentRole === "manufacturer";
  const isRegulator = currentRole === "regulator";
  const isPharmacist = currentRole === "pharmacist";
  const showConsumerApp = !session || isConsumer || isPharmacist;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(apiBaseKey);
        if (cancelled) return;
        const next = saved?.trim() ? saved.trim() : defaultApiBase;
        setApiBase(next);
        setApiBaseDraft(next);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(consumerHistoryKey);
        if (stored) {
          setConsumerHistory(JSON.parse(stored) as HistoryEntry[]);
        }
      } catch {
        // best effort offline cache
      }
    })();
  }, []);

  async function saveApiBase() {
    const next = apiBaseDraft.trim();
    if (!next) return;
    setApiBase(next);
    await AsyncStorage.setItem(apiBaseKey, next);
    setStatus(`API set to ${next}`);
  }

  useEffect(() => {
    if (consumerScreen === "food" && cameraPermission === null) {
      void requestCameraPermission();
    }
  }, [cameraPermission, consumerScreen, requestCameraPermission]);

  useEffect(() => {
    return () => {
      if (cameraResumeTimerRef.current) {
        clearTimeout(cameraResumeTimerRef.current);
      }
    };
  }, []);

  async function persistConsumerHistory(next: HistoryEntry[]) {
    setConsumerHistory(next);
    try {
      await AsyncStorage.setItem(consumerHistoryKey, JSON.stringify(next.slice(0, 25)));
    } catch {
      // best effort offline cache
    }
  }

  function pushConsumerHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
    const next = [
      {
        ...entry,
        id: `${entry.kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
      },
      ...consumerHistory,
    ].slice(0, 25);
    void persistConsumerHistory(next);
  }

  function buildScanSummaryText() {
    const result = scanResult
      ? `${scanResult.title}. ${scanResult.summary}. ${scanResult.recommendedAction ?? ""}`
      : "No scan result available.";
    return result.trim();
  }

  function clearCameraResumeTimer() {
    if (cameraResumeTimerRef.current) {
      clearTimeout(cameraResumeTimerRef.current);
      cameraResumeTimerRef.current = null;
    }
  }

  function scheduleCameraResume(delayMs = 2200) {
    clearCameraResumeTimer();
    cameraResumeTimerRef.current = setTimeout(() => {
      setScannerPaused(false);
      cameraResumeTimerRef.current = null;
    }, delayMs);
  }

  function parseScannerTarget(raw: string): ScannerTarget | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.replace(/\s+/g, "");

    try {
      const url = new URL(normalized);
      const pathSegments = url.pathname
        .split("/")
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => decodeURIComponent(segment));
      const queryCode =
        url.searchParams.get("batchId") ??
        url.searchParams.get("drugBatchId") ??
        url.searchParams.get("code") ??
        url.searchParams.get("id") ??
        url.searchParams.get("qr");
      const lowerSegments = pathSegments.map((segment) => segment.toLowerCase());
      const kind: ScannerTarget["kind"] = lowerSegments.some((segment) => segment.includes("drug"))
        ? "drug"
        : "food";
      const lastSegment = pathSegments[pathSegments.length - 1] ?? "";
      const codeString = (queryCode ?? lastSegment).trim();

      if (!codeString) {
        return null;
      }

      return {
        kind,
        codeString: codeString.toUpperCase(),
      };
    } catch {
      const upper = normalized.toUpperCase();
      if (upper.startsWith("DR-") || upper.includes("/DRUGS/") || upper.includes("DR-QR-")) {
        return { kind: "drug", codeString: upper };
      }
      return { kind: "food", codeString: upper };
    }
  }

  async function playGoogleSpeech(text: string) {
    const response = await fetch(`${apiBase}/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: scanLanguage }),
    });

    const data = (await response.json()) as SpeechSummaryResponse & { error?: unknown; fallback?: boolean };
    if (!response.ok || !data.audioBase64) {
      throw new Error(typeof data.error === "string" ? data.error : "Google TTS unavailable");
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:${data.mimeType};base64,${data.audioBase64}` },
      { shouldPlay: true }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if ("didJustFinish" in status && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  }

  function speakScanSummary(text: string) {
    Speech.stop();
    Speech.speak(text, { language: scanLanguage === "tw" ? "tw" : "en-US", rate: 0.95 });
  }

  async function playScanSummary() {
    const text = buildScanSummaryText();
    if (!text) {
      return;
    }

    try {
      await playGoogleSpeech(text);
    } catch {
      speakScanSummary(text);
    }
  }

  async function submit() {
    setStatus("Sending...");
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
      const data = (await response.json()) as AuthResponse & { error?: unknown };

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Authentication failed");
      }

      setSession(data);
      setStatus(`Signed in as ${data.user.role}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  async function scanFoodProduct(code = scanCode) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setScanStatus("Enter a batch code first.");
      return;
    }

    setScanLoading(true);
    setScanStatus("Looking up product...");
    try {
      const response = await fetch(`${apiBase}/scan/${encodeURIComponent(normalized)}`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      });
      const data = (await response.json()) as { result: ProductScanResult };
      setScanResult(data.result);
      setScanStatus(`Scan complete: ${data.result.status}`);
      pushConsumerHistory({
        kind: "food",
        codeString: data.result.codeString,
        status: data.result.status,
        title: data.result.title,
        summary: data.result.summary,
        recommendedAction: data.result.recommendedAction,
      });
    } catch (error) {
      setScanStatus(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setScanLoading(false);
    }
  }

  async function scanProduct(code = scanCode) {
    return scanFoodProduct(code);
  }

  async function scanDrugProduct(code = drugScanCode) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setDrugScanStatus("Enter a drug QR code first.");
      return;
    }

    setDrugScanStatus("Looking up drug...");
    try {
      const response = await fetch(`${apiBase}/drug/scan/${encodeURIComponent(normalized)}`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      });
      const data = (await response.json()) as { result: DrugScanResult };
      setDrugScanResult(data.result);
      setDrugScanStatus(`Drug scan complete: ${data.result.status}`);
      pushConsumerHistory({
        kind: "drug",
        codeString: data.result.codeString,
        status: data.result.status,
        title: data.result.title,
        summary: data.result.summary,
        recommendedAction: data.result.recommendedAction,
      });
    } catch (error) {
      setDrugScanStatus(error instanceof Error ? error.message : "Drug scan failed");
    }
  }

  async function scanDrug(code = drugScanCode) {
    return scanDrugProduct(code);
  }

  async function handleCameraScan(rawValue: string) {
    if (scanLoading || scannerPaused) {
      return;
    }

    const target = parseScannerTarget(rawValue);
    if (!target) {
      setScanStatus("Could not read a QR code.");
      return;
    }

    setScannerPaused(true);
    if (target.kind === "drug") {
      setDrugScanCode(target.codeString);
      setScanStatus(`Drug QR detected: ${target.codeString}`);
      await scanDrugProduct(target.codeString);
    } else {
      setScanCode(target.codeString);
      setScanStatus(`Food QR detected: ${target.codeString}`);
      await scanFoodProduct(target.codeString);
    }

    scheduleCameraResume();
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    await handleCameraScan(data);
  }

  async function submitConsumerReport() {
    const code = (scanResult?.codeString ?? scanCode).trim();
    if (!session?.token) {
      setReportStatusText("Log in as a consumer first.");
      return;
    }

    if (!code) {
      setReportStatusText("Scan a product before reporting.");
      return;
    }

    setReportStatusText("Submitting report...");
    try {
      const response = await fetch(`${apiBase}/scan/${encodeURIComponent(code)}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          description: reportDescription,
          district: reportDistrict,
          photoUrl: reportPhotoUrl || null,
        }),
      });

      const data = (await response.json()) as SubmitConsumerReportResponse & { error?: unknown };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not submit report");
      }

      setReportStatusText(`Report submitted: ${data.report.status}`);
      setReportPhotoUrl("");
    } catch (error) {
      setReportStatusText(error instanceof Error ? error.message : "Could not submit report");
    }
  }

  async function loadFoodDashboard() {
    if (!session?.token) {
      setFoodStatus("Log in first to view the food dashboard.");
      return;
    }

    setFoodStatus("Loading food dashboard...");
    try {
      const response = await fetch(`${apiBase}/food/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await response.json()) as { dashboard: FoodDashboardResponse; error?: unknown };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load dashboard");
      }

      setFoodDashboard(data.dashboard);
      setFoodStatus("Food dashboard loaded.");
      if (!cycleFarmId && data.dashboard.farms[0]?.id) setCycleFarmId(data.dashboard.farms[0].id);
      if (!inputCycleId && data.dashboard.cropCycles[0]?.id) setInputCycleId(data.dashboard.cropCycles[0].id);
    } catch (error) {
      setFoodStatus(error instanceof Error ? error.message : "Could not load dashboard");
    }
  }

  async function createFarm() {
    if (!session?.token) return setFoodStatus("Log in first.");
    const payload: CreateFarmRequest = {
      name: farmName,
      district: farmDistrict,
      region: farmRegion,
      cropTypes: farmCrops.split(",").map((item) => item.trim()).filter(Boolean),
    };
    setFoodStatus("Creating farm...");
    const response = await fetch(`${apiBase}/food/farms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create farm");
    await loadFoodDashboard();
  }

  async function createCropCycle() {
    if (!session?.token) return setFoodStatus("Log in first.");
    const payload: CreateCropCycleRequest = {
      farmId: cycleFarmId,
      cropType: cycleCropType,
      plantingDate: cyclePlantingDate,
    };
    setFoodStatus("Creating crop cycle...");
    const response = await fetch(`${apiBase}/food/crop-cycles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create crop cycle");
    await loadFoodDashboard();
  }

  async function createInputLog() {
    if (!session?.token) return setFoodStatus("Log in first.");
    const payload: CreateInputLogRequest = {
      cropCycleId: inputCycleId,
      inputType,
      productName: inputProductName,
      applicationDate: inputApplicationDate,
      withdrawalPeriodDays: Number(inputWithdrawalDays),
      epaApprovalStatus: inputEpaStatus as CreateInputLogRequest["epaApprovalStatus"],
    };
    setFoodStatus("Saving input log...");
    const response = await fetch(`${apiBase}/food/input-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save input log");
    await loadFoodDashboard();
  }

  async function markMarketReady() {
    if (!session?.token) return setFoodStatus("Log in first.");
    const response = await fetch(`${apiBase}/food/crop-cycles/market-ready`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        cropCycleId: marketReadyCycleId,
        marketReady: marketReadyValue,
      }),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not update market-ready flag");
    await loadFoodDashboard();
  }

  async function syncOfflineQueue() {
    if (!session?.token) return setFoodStatus("Log in first.");
    const payload = JSON.parse(offlineQueue) as OfflineSyncRequest;
    const response = await fetch(`${apiBase}/food/offline-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { results?: unknown; error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not sync offline queue");
    setFoodStatus(`Offline queue synced: ${JSON.stringify(data.results)}`);
    await loadFoodDashboard();
  }

  async function loadManufacturerDashboard() {
    if (!session?.token) {
      setManufacturerStatus("Log in first to view the manufacturer portal.");
      return;
    }

    setManufacturerStatus("Loading manufacturer dashboard...");
    try {
      const response = await fetch(`${apiBase}/manufacturer/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await response.json()) as { dashboard: ManufacturerDashboardResponse; error?: unknown };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load manufacturer dashboard");
      }

      setManufacturerDashboard(data.dashboard);
      setManufacturerStatus(data.dashboard.profile ? "Manufacturer dashboard loaded." : "Create a manufacturer profile to continue.");
      if (!recallBatchId && data.dashboard.batches[0]?.id) {
        setRecallBatchId(data.dashboard.batches[0].id);
      }
    } catch (error) {
      setManufacturerStatus(error instanceof Error ? error.message : "Could not load manufacturer dashboard");
    }
  }

  async function createManufacturerProfile() {
    if (!session?.token) return setManufacturerStatus("Log in first.");
    const payload: CreateManufacturerProfileRequest = {
      companyName,
      fdaRegistrationNumber: fdaRegNumber || null,
      sector: manufacturerSector,
      subscriptionTier,
    };
    setManufacturerStatus("Creating manufacturer profile...");
    const response = await fetch(`${apiBase}/manufacturer/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create manufacturer profile");
    await loadManufacturerDashboard();
  }

  async function createManufacturerBatch() {
    if (!session?.token) return setManufacturerStatus("Log in first.");
    const payload: CreateProductBatchRequest = {
      batchNumber,
      ingredientSources: [ingredientSources],
      processingSteps: processingSteps.split(",").map((item) => item.trim()).filter(Boolean),
      qualityChecks: [qualityChecks],
      packagingDate,
      expiryDate,
    };
    setManufacturerStatus("Creating batch and QR...");
    const response = await fetch(`${apiBase}/manufacturer/batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as CreateProductBatchResponse & { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create batch");
    setManufacturerStatus(`Batch created. QR: ${data.qrCode.codeString}`);
    await loadManufacturerDashboard();
  }

  async function createManufacturerRecall() {
    if (!session?.token) return setManufacturerStatus("Log in first.");
    const payload: CreateRecallRequest = {
      batchId: recallBatchId,
      recallType,
      reason: recallReason,
      scopeDistricts: recallScopeDistricts.split(",").map((item) => item.trim()).filter(Boolean),
    };
    setManufacturerStatus("Creating recall...");
    const response = await fetch(`${apiBase}/manufacturer/recalls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create recall");
    await loadManufacturerDashboard();
  }

  async function loadRegulatorDashboard() {
    if (!session?.token) {
      setRegulatorStatus("Log in first to view the regulator portal.");
      return;
    }

    setRegulatorStatus("Loading regulator dashboard...");
    try {
      const response = await fetch(`${apiBase}/regulator/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await response.json()) as { dashboard: RegulatorDashboardResponse; error?: unknown };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load regulator dashboard");
      }

      setRegulatorDashboard(data.dashboard);
      setRegulatorStatus("Regulator dashboard loaded.");
      if (!reportId && data.dashboard.reports[0]?.id) setReportId(data.dashboard.reports[0].id);
      if (!regulatorRecallBatchId && data.dashboard.recalls[0]?.batchId) setRegulatorRecallBatchId(data.dashboard.recalls[0].batchId);
    } catch (error) {
      setRegulatorStatus(error instanceof Error ? error.message : "Could not load regulator dashboard");
    }
  }

  async function reviewRegulatorReport() {
    if (!session?.token) return setRegulatorStatus("Log in first.");
    const payload: ReviewReportRequest = {
      reportId,
      status: reportStatus,
    };
    setRegulatorStatus("Updating report...");
    const response = await fetch(`${apiBase}/regulator/reports`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not update report");
    await loadRegulatorDashboard();
  }

  async function createRegulatorRecall() {
    if (!session?.token) return setRegulatorStatus("Log in first.");
    const payload: RegulatorRecallRequest = {
      batchId: regulatorRecallBatchId,
      reason: regulatorRecallReason,
      scopeDistricts: regulatorRecallDistricts.split(",").map((item) => item.trim()).filter(Boolean),
      domain: regulatorRecallDomain,
    };
    setRegulatorStatus("Issuing regulator recall...");
    const response = await fetch(`${apiBase}/regulator/recalls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not issue regulator recall");
    await loadRegulatorDashboard();
  }

  async function loadPharmacyDashboard() {
    if (!session?.token) {
      setPharmacyStatus("Log in first to view the pharmacy portal.");
      return;
    }

    setPharmacyStatus("Loading pharmacy dashboard...");
    try {
      const response = await fetch(`${apiBase}/drug/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await response.json()) as { dashboard: DrugDashboardResponse; error?: unknown };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load pharmacy dashboard");
      }

      setPharmacyDashboard(data.dashboard);
      setPharmacyStatus(data.dashboard.pharmacy ? "Pharmacy dashboard loaded." : "Register a pharmacy to continue.");
    } catch (error) {
      setPharmacyStatus(error instanceof Error ? error.message : "Could not load pharmacy dashboard");
    }
  }

  async function registerPharmacy() {
    if (!session?.token) return setPharmacyStatus("Log in first.");

    const payload: RegisterPharmacyRequest = {
      businessName,
      ghanaPharmacyCouncilNumber: gpcNumber,
      district: pharmacyDistrict,
      region: pharmacyRegion,
    };

    setPharmacyStatus("Registering pharmacy...");
    const response = await fetch(`${apiBase}/drug/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not register pharmacy");
    await loadPharmacyDashboard();
  }

  async function createDrugRecord() {
    if (!session?.token) return setPharmacyStatus("Log in first.");

    const payload: CreateDrugRecordRequest = {
      name: drugName,
      genericName: drugGenericName || null,
      manufacturerName: drugManufacturer || null,
      fdaDrugRegistrationNumber: drugFdaNumber || null,
      drugClass: drugClass || null,
      dosageForm: drugDosageForm || null,
      strength: drugStrength || null,
      requiresPrescription: drugRequiresPrescription,
      isControlled: drugIsControlled,
      fdaApprovalStatus: drugApprovalStatus,
      storageConditions: drugStorage || null,
      sideEffectsSummary: drugSideEffects || null,
    };

    setPharmacyStatus("Creating drug record...");
    const response = await fetch(`${apiBase}/drug/drugs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create drug record");
    await loadPharmacyDashboard();
  }

  async function createDrugBatch() {
    if (!session?.token) return setPharmacyStatus("Log in first.");

    const firstDrugId = pharmacyDashboard?.drugs[0]?.id ?? "";
    if (!firstDrugId) {
      setPharmacyStatus("Create a drug record first.");
      return;
    }

    const payload: CreateDrugBatchRequest = {
      drugId: firstDrugId,
      batchNumber: drugBatchNumber,
      manufactureDate: drugManufactureDate,
      expiryDate: drugExpiryDate,
      quantityReceived: Number(drugQuantityReceived),
      quantityRemaining: Number(drugQuantityRemaining),
      supplierName: drugSupplierName || null,
    };

    setPharmacyStatus("Creating drug batch...");
    const response = await fetch(`${apiBase}/drug/batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as CreateDrugBatchResponse & { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create drug batch");
    setPharmacyStatus(`Drug batch created. QR: ${data.qrCode.codeString}`);
    await loadPharmacyDashboard();
  }

  async function createDrugRecall() {
    if (!session?.token) return setPharmacyStatus("Log in first.");

    const payload: CreateDrugRecallRequest = {
      batchId: drugRecallBatchId,
      reason: drugRecallReason,
    };

    setPharmacyStatus("Creating drug recall...");
    const response = await fetch(`${apiBase}/drug/recalls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create drug recall");
    await loadPharmacyDashboard();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>FoodTrace GH</Text>
        <Text style={styles.title}>Identity and consumer scan flow.</Text>
        <Text style={styles.body}>
          The first mobile experience lets people register, log in, and check a batch or QR code instantly.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.meta}>API base URL</Text>
        <Text style={styles.metaSmall}>
          Android emulator: use {`http://10.0.2.2:3000/api`}. Real phone: use your PC IP like {`http://192.168.x.x:3000/api`}.
        </Text>
        <TextInput
          style={styles.input}
          value={apiBaseDraft}
          onChangeText={setApiBaseDraft}
          placeholder={defaultApiBase}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.primaryButton} onPress={saveApiBase}>
          <Text style={styles.primaryButtonText}>Save API URL</Text>
        </Pressable>

        <Text style={styles.scanKicker}>Consumer app</Text>
        <Text style={styles.scanTitle}>Home, scanner, report, and history.</Text>
        <Text style={styles.scanBody}>
          Scan results are cached locally for offline review and can be spoken aloud in a simple audio summary.
        </Text>
        <View style={styles.rowWrap}>
          <Pressable style={consumerScreen === "home" ? styles.chipActive : styles.chip} onPress={() => setConsumerScreen("home")}>
            <Text style={consumerScreen === "home" ? styles.chipTextActive : styles.chipText}>Home</Text>
          </Pressable>
          <Pressable style={consumerScreen === "food" ? styles.chipActive : styles.chip} onPress={() => setConsumerScreen("food")}>
            <Text style={consumerScreen === "food" ? styles.chipTextActive : styles.chipText}>Scan Food</Text>
          </Pressable>
          <Pressable style={consumerScreen === "drug" ? styles.chipActive : styles.chip} onPress={() => setConsumerScreen("drug")}>
            <Text style={consumerScreen === "drug" ? styles.chipTextActive : styles.chipText}>Scan Drug</Text>
          </Pressable>
          <Pressable style={consumerScreen === "history" ? styles.chipActive : styles.chip} onPress={() => setConsumerScreen("history")}>
            <Text style={consumerScreen === "history" ? styles.chipTextActive : styles.chipText}>History</Text>
          </Pressable>
        </View>
        <View style={styles.rowWrap}>
          <Pressable style={styles.sampleButton} onPress={() => setScanLanguage("en")}>
            <Text style={styles.sampleButtonText}>English</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => setScanLanguage("tw")}>
            <Text style={styles.sampleButtonText}>Twi</Text>
          </Pressable>
        </View>
        {consumerScreen === "home" ? (
          <>
            <Text style={styles.meta}>Welcome: {session?.user.fullName || session?.user.email || "Guest"}</Text>
            <Text style={styles.meta}>Scan It. Trace It. Trust It.</Text>
            <View style={styles.rowWrap}>
              <Pressable style={styles.button} onPress={() => setConsumerScreen("food")}>
                <Text style={styles.buttonText}>Scan Food</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => setConsumerScreen("drug")}>
                <Text style={styles.buttonText}>Scan Drug</Text>
              </Pressable>
            </View>
            <Text style={styles.meta}>Food result: {scanResult?.status ?? "None yet"}</Text>
            <Text style={styles.meta}>Drug result: {drugScanResult?.status ?? "None yet"}</Text>
            <Text style={styles.meta}>Saved scans: {consumerHistory.length}</Text>
          </>
        ) : null}
        {consumerScreen === "history" ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Scan history</Text>
            {consumerHistory.length ? (
              consumerHistory.slice(0, 5).map((entry) => (
                <Text key={entry.id} style={styles.meta}>
                  [{entry.kind}] {entry.codeString} - {entry.status.toUpperCase()}
                </Text>
              ))
            ) : (
              <Text style={styles.meta}>No scans saved yet.</Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.segmented}>
          <Pressable style={mode === "login" ? styles.segmentActive : styles.segment} onPress={() => setMode("login")}>
            <Text style={mode === "login" ? styles.segmentTextActive : styles.segmentText}>Log in</Text>
          </Pressable>
          <Pressable style={mode === "register" ? styles.segmentActive : styles.segment} onPress={() => setMode("register")}>
            <Text style={mode === "register" ? styles.segmentTextActive : styles.segmentText}>Register</Text>
          </Pressable>
        </View>

        {mode === "register" ? (
          <>
            <TextInput placeholder="Full name" placeholderTextColor="#748089" style={styles.input} value={fullName} onChangeText={setFullName} />
            <TextInput placeholder="Phone" placeholderTextColor="#748089" style={styles.input} value={phone} onChangeText={setPhone} />
            <TextInput placeholder="Email" placeholderTextColor="#748089" style={styles.input} value={email} onChangeText={setEmail} />
            <TextInput placeholder="Password" placeholderTextColor="#748089" style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
            <TextInput placeholder="Language" placeholderTextColor="#748089" style={styles.input} value={language} onChangeText={setLanguage} />
            <View style={styles.chipsRow}>
              {roleList.map((item) => (
                <Pressable key={item} style={role === item ? styles.chipActive : styles.chip} onPress={() => setRole(item)}>
                  <Text style={role === item ? styles.chipTextActive : styles.chipText}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.button} onPress={submit}>
              <Text style={styles.buttonText}>Create account</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput placeholder="Phone or email" placeholderTextColor="#748089" style={styles.input} value={identifier} onChangeText={setIdentifier} />
            <TextInput placeholder="Password" placeholderTextColor="#748089" style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
            <View style={styles.chipsRow}>
              {roleList.map((item) => (
                <Pressable key={item} style={role === item ? styles.chipActive : styles.chip} onPress={() => setRole(item)}>
                  <Text style={role === item ? styles.chipTextActive : styles.chipText}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.button} onPress={submit}>
              <Text style={styles.buttonText}>Log in</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.status}>{status}</Text>
        {session ? (
          <View style={styles.sessionBox}>
            <Text style={styles.sessionText}>Role: {session.user.role}</Text>
            <Text style={styles.sessionText}>Name: {session.user.fullName}</Text>
            <Text style={styles.sessionText}>Token preview: {session.token.slice(0, 18)}...</Text>
          </View>
        ) : null}
      </View>

      {showConsumerApp && consumerScreen === "food" ? (
      <View style={styles.scanCard}>
        <Text style={styles.scanKicker}>Consumer scan</Text>
        <Text style={styles.scanTitle}>Scan a QR code with the camera.</Text>
        <Text style={styles.scanBody}>
          Point the camera at a FoodTrace GH QR code. If the camera cannot read it, use the text fallback below.
        </Text>
        <View style={styles.cameraFrame}>
          {cameraPermission?.granted ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scannerPaused || scanLoading ? undefined : handleBarcodeScanned}
            />
          ) : (
            <View style={styles.cameraPermissionBox}>
              <Text style={styles.cameraPermissionText}>
                {cameraPermission === null
                  ? "Requesting camera permission..."
                  : "Camera permission is needed to scan QR codes."}
              </Text>
              <Pressable style={styles.sampleButton} onPress={() => void requestCameraPermission()}>
                <Text style={styles.sampleButtonText}>Grant camera access</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraOverlayTitle}>
              {scannerPaused ? "Scanner paused" : scanLoading ? "Scanning..." : "Live camera ready"}
            </Text>
            <Text style={styles.cameraOverlayText}>
              {scannerPaused
                ? "We paused the camera briefly after a successful scan."
                : "Hold the QR code inside the frame to read it."}
            </Text>
          </View>
        </View>
        <View style={styles.rowWrap}>
          <Pressable style={styles.sampleButton} onPress={() => setScannerPaused((value) => !value)}>
            <Text style={styles.sampleButtonText}>{scannerPaused ? "Resume scanner" : "Pause scanner"}</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void requestCameraPermission()}>
            <Text style={styles.sampleButtonText}>Refresh permission</Text>
          </Pressable>
        </View>
        <TextInput
          placeholder="Fallback code or QR URL"
          placeholderTextColor="#748089"
          style={styles.scanInput}
          value={scanCode}
          onChangeText={setScanCode}
        />
        <Pressable style={[styles.button, { marginTop: 12 }]} onPress={() => void scanProduct()} disabled={scanLoading}>
          <Text style={styles.buttonText}>{scanLoading ? "Scanning..." : "Use fallback scan"}</Text>
        </Pressable>
        <View style={styles.sampleRow}>
          {sampleCodes.map((code) => (
            <Pressable key={code} style={styles.sampleButton} onPress={() => void scanProduct(code)}>
              <Text style={styles.sampleButtonText}>{code}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.status}>{scanStatus}</Text>
        {scanResult ? (
          <View style={styles.resultCard}>
            <View style={[styles.badge, badgeStyle(scanResult.status)]}>
              <Text style={styles.badgeText}>{scanResult.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.resultTitle}>{scanResult.title}</Text>
            <Text style={styles.resultSummary}>{scanResult.summary}</Text>
            <Text style={styles.meta}>Batch: {scanResult.batchNumber ?? "N/A"}</Text>
            <Text style={styles.meta}>Manufacturer: {scanResult.manufacturerName ?? "N/A"}</Text>
            <Text style={styles.meta}>Expiry: {scanResult.expiryDate ?? "N/A"}</Text>
            <Text style={styles.meta}>{scanResult.recommendedAction}</Text>
            <View style={styles.rowWrap}>
              <Pressable style={styles.sampleButton} onPress={() => void playScanSummary()}>
                <Text style={styles.sampleButtonText}>Play audio</Text>
              </Pressable>
              <Pressable style={styles.sampleButton} onPress={() => setConsumerScreen("history")}>
                <Text style={styles.sampleButtonText}>View history</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Report concern</Text>
          <Text style={styles.resultSummary}>
            Add a short description and an optional photo URL so the report can be reviewed.
          </Text>
          <TextInput
            placeholder="Describe the issue"
            placeholderTextColor="#748089"
            style={[styles.input, { minHeight: 110 }]}
            value={reportDescription}
            onChangeText={setReportDescription}
            multiline
          />
          <TextInput
            placeholder="District"
            placeholderTextColor="#748089"
            style={styles.input}
            value={reportDistrict}
            onChangeText={setReportDistrict}
          />
          <TextInput
            placeholder="Photo URL"
            placeholderTextColor="#748089"
            style={styles.input}
            value={reportPhotoUrl}
            onChangeText={setReportPhotoUrl}
          />
          <Pressable style={styles.button} onPress={() => void submitConsumerReport()}>
            <Text style={styles.buttonText}>Submit consumer report</Text>
          </Pressable>
          <Text style={styles.status}>{reportStatusText}</Text>
        </View>
      </View>
      ) : null}

      {isFarmer ? (
      <View style={styles.foodCard}>
        <Text style={styles.scanKicker}>Food module</Text>
        <Text style={styles.scanTitle}>Farmer portal and logging.</Text>
        <Text style={styles.scanBody}>
          Create a farm, begin a crop cycle, log pesticide or fertilizer inputs, cross-check EPA status, and watch withdrawal timing.
        </Text>
        <View style={styles.rowWrap}>
          <Pressable style={styles.button} onPress={() => void loadFoodDashboard()}>
            <Text style={styles.buttonText}>Load dashboard</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createFarm()}>
            <Text style={styles.sampleButtonText}>Create farm</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createCropCycle()}>
            <Text style={styles.sampleButtonText}>Create cycle</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createInputLog()}>
            <Text style={styles.sampleButtonText}>Log input</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void markMarketReady()}>
            <Text style={styles.sampleButtonText}>Mark ready</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void syncOfflineQueue()}>
            <Text style={styles.sampleButtonText}>Sync offline</Text>
          </Pressable>
        </View>
        <TextInput placeholder="Farm name" placeholderTextColor="#748089" style={styles.input} value={farmName} onChangeText={setFarmName} />
        <TextInput placeholder="District" placeholderTextColor="#748089" style={styles.input} value={farmDistrict} onChangeText={setFarmDistrict} />
        <TextInput placeholder="Region" placeholderTextColor="#748089" style={styles.input} value={farmRegion} onChangeText={setFarmRegion} />
        <TextInput placeholder="Crop types comma separated" placeholderTextColor="#748089" style={styles.input} value={farmCrops} onChangeText={setFarmCrops} />
        <TextInput placeholder="Crop cycle farm ID" placeholderTextColor="#748089" style={styles.input} value={cycleFarmId} onChangeText={setCycleFarmId} />
        <TextInput placeholder="Crop type" placeholderTextColor="#748089" style={styles.input} value={cycleCropType} onChangeText={setCycleCropType} />
        <TextInput placeholder="Planting date YYYY-MM-DD" placeholderTextColor="#748089" style={styles.input} value={cyclePlantingDate} onChangeText={setCyclePlantingDate} />
        <TextInput placeholder="Input log crop cycle ID" placeholderTextColor="#748089" style={styles.input} value={inputCycleId} onChangeText={setInputCycleId} />
        <TextInput placeholder="Input product name" placeholderTextColor="#748089" style={styles.input} value={inputProductName} onChangeText={setInputProductName} />
        <TextInput placeholder="Application date YYYY-MM-DD" placeholderTextColor="#748089" style={styles.input} value={inputApplicationDate} onChangeText={setInputApplicationDate} />
        <TextInput placeholder="Withdrawal days" placeholderTextColor="#748089" style={styles.input} value={inputWithdrawalDays} onChangeText={setInputWithdrawalDays} />
        <TextInput placeholder="EPA status" placeholderTextColor="#748089" style={styles.input} value={inputEpaStatus} onChangeText={setInputEpaStatus} />
        <TextInput placeholder="Market-ready crop cycle ID" placeholderTextColor="#748089" style={styles.input} value={marketReadyCycleId} onChangeText={setMarketReadyCycleId} />
        <TextInput
          placeholder="Market ready true/false"
          placeholderTextColor="#748089"
          style={styles.input}
          value={String(marketReadyValue)}
          onChangeText={(value) => setMarketReadyValue(value === "true")}
        />
        <TextInput
          placeholder='Offline queue JSON {"actions":[]}'
          placeholderTextColor="#748089"
          style={[styles.input, { minHeight: 110 }]}
          value={offlineQueue}
          onChangeText={setOfflineQueue}
          multiline
        />
        <Text style={styles.status}>{farmerStatus}</Text>
        <Text style={styles.status}>{foodStatus}</Text>
        {foodDashboard ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Food metrics</Text>
            <Text style={styles.meta}>Farms: {foodDashboard.metrics.farms}</Text>
            <Text style={styles.meta}>Crop cycles: {foodDashboard.metrics.cropCycles}</Text>
            <Text style={styles.meta}>Ready: {foodDashboard.metrics.readyCycles}</Text>
            <Text style={styles.meta}>Pending withdrawal: {foodDashboard.metrics.pendingWithdrawalCycles}</Text>
            <Text style={styles.meta}>Overdue: {foodDashboard.metrics.overdueWithdrawalCycles}</Text>
            <Text style={styles.meta}>Latest farm: {foodDashboard.farms[0]?.name ?? "None yet"}</Text>
            <Text style={styles.meta}>Latest crop cycle: {foodDashboard.cropCycles[0]?.cropType ?? "None yet"}</Text>
            <Text style={styles.meta}>Latest input: {foodDashboard.inputLogs[0]?.productName ?? "None yet"}</Text>
            <Text style={styles.meta}>Latest input EPA status: {foodDashboard.inputLogs[0]?.epaApprovalStatus ?? "N/A"}</Text>
          </View>
        ) : null}
      </View>
      ) : null}

      {isManufacturer ? (
      <View style={styles.foodCard}>
        <Text style={styles.scanKicker}>Manufacturer portal</Text>
        <Text style={styles.scanTitle}>Batch creation and recall controls.</Text>
        <Text style={styles.scanBody}>
          Create a manufacturer profile, make a batch, generate a QR label, and issue a recall when necessary.
        </Text>
        <View style={styles.rowWrap}>
          <Pressable style={styles.button} onPress={() => void loadManufacturerDashboard()}>
            <Text style={styles.buttonText}>Load manufacturer</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createManufacturerProfile()}>
            <Text style={styles.sampleButtonText}>Create profile</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createManufacturerBatch()}>
            <Text style={styles.sampleButtonText}>Create batch</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createManufacturerRecall()}>
            <Text style={styles.sampleButtonText}>Issue recall</Text>
          </Pressable>
        </View>
        <TextInput placeholder="Company name" placeholderTextColor="#748089" style={styles.input} value={companyName} onChangeText={setCompanyName} />
        <TextInput placeholder="FDA registration number" placeholderTextColor="#748089" style={styles.input} value={fdaRegNumber} onChangeText={setFdaRegNumber} />
        <TextInput placeholder="Sector" placeholderTextColor="#748089" style={styles.input} value={manufacturerSector} onChangeText={setManufacturerSector} />
        <TextInput placeholder="Subscription tier" placeholderTextColor="#748089" style={styles.input} value={subscriptionTier} onChangeText={(value) => setSubscriptionTier(value as typeof subscriptionTier)} />
        <TextInput placeholder="Batch number" placeholderTextColor="#748089" style={styles.input} value={batchNumber} onChangeText={setBatchNumber} />
        <TextInput placeholder="Packaging date YYYY-MM-DD" placeholderTextColor="#748089" style={styles.input} value={packagingDate} onChangeText={setPackagingDate} />
        <TextInput placeholder="Expiry date YYYY-MM-DD" placeholderTextColor="#748089" style={styles.input} value={expiryDate} onChangeText={setExpiryDate} />
        <TextInput placeholder="Ingredient sources" placeholderTextColor="#748089" style={styles.input} value={ingredientSources} onChangeText={setIngredientSources} />
        <TextInput placeholder="Processing steps comma separated" placeholderTextColor="#748089" style={styles.input} value={processingSteps} onChangeText={setProcessingSteps} />
        <TextInput placeholder="Quality checks" placeholderTextColor="#748089" style={styles.input} value={qualityChecks} onChangeText={setQualityChecks} />
        <TextInput placeholder="Recall batch ID" placeholderTextColor="#748089" style={styles.input} value={recallBatchId} onChangeText={setRecallBatchId} />
        <TextInput placeholder="Recall reason" placeholderTextColor="#748089" style={styles.input} value={recallReason} onChangeText={setRecallReason} />
        <TextInput placeholder="Recall scope districts comma separated" placeholderTextColor="#748089" style={styles.input} value={recallScopeDistricts} onChangeText={setRecallScopeDistricts} />
        <TextInput placeholder="Recall type manufacturer/regulator" placeholderTextColor="#748089" style={styles.input} value={recallType} onChangeText={(value) => setRecallType(value as typeof recallType)} />
        <Text style={styles.status}>{manufacturerStatus}</Text>
        {manufacturerDashboard ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Manufacturer metrics</Text>
            <Text style={styles.meta}>Batches: {manufacturerDashboard.metrics.batches}</Text>
            <Text style={styles.meta}>QR codes: {manufacturerDashboard.metrics.qrCodes}</Text>
            <Text style={styles.meta}>Recalls: {manufacturerDashboard.metrics.recalls}</Text>
            <Text style={styles.meta}>Active recalls: {manufacturerDashboard.metrics.activeRecalls}</Text>
            <Text style={styles.meta}>Profile: {manufacturerDashboard.profile?.companyName ?? "No profile yet"}</Text>
            <Text style={styles.meta}>Latest batch: {manufacturerDashboard.batches[0]?.batchNumber ?? "None yet"}</Text>
            <Text style={styles.meta}>Latest QR: {manufacturerDashboard.batches[0]?.qrCode ?? "None yet"}</Text>
            <Text style={styles.meta}>Latest recall: {manufacturerDashboard.recalls[0]?.reason ?? "None yet"}</Text>
          </View>
        ) : null}
      </View>
      ) : null}

      {isRegulator ? (
      <View style={styles.foodCard}>
        <Text style={styles.scanKicker}>Regulator dashboard</Text>
        <Text style={styles.scanTitle}>Oversight and emergency recall.</Text>
        <Text style={styles.scanBody}>
          Review consumer reports, monitor recalls, and issue regulator-led recall actions from one view.
        </Text>
        <View style={styles.rowWrap}>
          <Pressable style={styles.button} onPress={() => void loadRegulatorDashboard()}>
            <Text style={styles.buttonText}>Load regulator</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void reviewRegulatorReport()}>
            <Text style={styles.sampleButtonText}>Review report</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createRegulatorRecall()}>
            <Text style={styles.sampleButtonText}>Issue recall</Text>
          </Pressable>
        </View>
        <TextInput placeholder="Report ID" placeholderTextColor="#748089" style={styles.input} value={reportId} onChangeText={setReportId} />
        <TextInput placeholder="Report status reviewing/resolved/dismissed" placeholderTextColor="#748089" style={styles.input} value={reportStatus} onChangeText={(value) => setReportStatus(value as typeof reportStatus)} />
        <TextInput placeholder="Regulator batch ID" placeholderTextColor="#748089" style={styles.input} value={regulatorRecallBatchId} onChangeText={setRegulatorRecallBatchId} />
        <TextInput placeholder="Regulator recall reason" placeholderTextColor="#748089" style={styles.input} value={regulatorRecallReason} onChangeText={setRegulatorRecallReason} />
        <TextInput placeholder="Regulator recall districts comma separated" placeholderTextColor="#748089" style={styles.input} value={regulatorRecallDistricts} onChangeText={setRegulatorRecallDistricts} />
        <View style={styles.rowWrap}>
          <Pressable style={regulatorRecallDomain === "food" ? styles.chipActive : styles.chip} onPress={() => setRegulatorRecallDomain("food")}>
            <Text style={regulatorRecallDomain === "food" ? styles.chipTextActive : styles.chipText}>Food recall</Text>
          </Pressable>
          <Pressable style={regulatorRecallDomain === "drug" ? styles.chipActive : styles.chip} onPress={() => setRegulatorRecallDomain("drug")}>
            <Text style={regulatorRecallDomain === "drug" ? styles.chipTextActive : styles.chipText}>Drug recall</Text>
          </Pressable>
        </View>
        <Text style={styles.status}>{regulatorStatus}</Text>
        {regulatorDashboard ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Compliance overview</Text>
            <Text style={styles.meta}>Farms: {regulatorDashboard.compliance.farms}</Text>
            <Text style={styles.meta}>Manufacturers: {regulatorDashboard.compliance.manufacturers}</Text>
            <Text style={styles.meta}>Pharmacies: {regulatorDashboard.compliance.pharmacies}</Text>
            <Text style={styles.meta}>Food recalls: {regulatorDashboard.compliance.foodRecalls}</Text>
            <Text style={styles.meta}>Drug recalls: {regulatorDashboard.compliance.drugRecalls}</Text>
            <Text style={styles.meta}>Pending reports: {regulatorDashboard.compliance.pendingReports}</Text>
            <Text style={styles.meta}>Reviewing reports: {regulatorDashboard.compliance.reviewingReports}</Text>
            <Text style={styles.meta}>Resolved reports: {regulatorDashboard.compliance.resolvedReports}</Text>
            <Text style={styles.meta}>Safe scans: {regulatorDashboard.compliance.safeScans}</Text>
            <Text style={styles.meta}>Caution scans: {regulatorDashboard.compliance.cautionScans}</Text>
            <Text style={styles.meta}>Recalled scans: {regulatorDashboard.compliance.recalledScans}</Text>
            <Text style={styles.meta}>Total scans: {regulatorDashboard.analytics.totalScans}</Text>
            <Text style={styles.meta}>High risk alerts: {regulatorDashboard.analytics.highRiskAlerts}</Text>
            <Text style={styles.meta}>Top districts: {regulatorDashboard.analytics.topDistricts.join(", ") || "None yet"}</Text>
            <Text style={styles.meta}>Latest report: {regulatorDashboard.reports[0]?.description ?? "None yet"}</Text>
            <Text style={styles.meta}>Latest recall: {regulatorDashboard.recalls[0]?.reason ?? "None yet"}</Text>
            <Text style={styles.meta}>Recent alerts: {regulatorDashboard.alerts.slice(0, 2).map((alert) => alert.title).join(" | ") || "None yet"}</Text>
          </View>
        ) : null}
      </View>
      ) : null}

      {(showConsumerApp && consumerScreen === "drug") || isPharmacist ? (
      <View style={styles.foodCard}>
        <Text style={styles.scanKicker}>Drug module</Text>
        <Text style={styles.scanTitle}>{isPharmacist ? "Pharmacy registration, batches, and drug scans." : "Drug QR scan."}</Text>
        <Text style={styles.scanBody}>
          {isPharmacist
            ? "Register the pharmacy, log drug records and batches, generate QR codes, and scan public drug QR labels."
            : "Scan a medicine QR code to check approval, expiry, recall status, and the recommended action."}
        </Text>
        {isPharmacist ? (
        <>
        <View style={styles.rowWrap}>
          <Pressable style={styles.button} onPress={() => void loadPharmacyDashboard()}>
            <Text style={styles.buttonText}>Load pharmacy</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void registerPharmacy()}>
            <Text style={styles.sampleButtonText}>Register pharmacy</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createDrugRecord()}>
            <Text style={styles.sampleButtonText}>Create drug</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createDrugBatch()}>
            <Text style={styles.sampleButtonText}>Create batch</Text>
          </Pressable>
          <Pressable style={styles.sampleButton} onPress={() => void createDrugRecall()}>
            <Text style={styles.sampleButtonText}>Issue recall</Text>
          </Pressable>
        </View>
        </>
        ) : null}
        <TextInput placeholder="Drug QR code" placeholderTextColor="#748089" style={styles.input} value={drugScanCode} onChangeText={setDrugScanCode} />
        <Pressable style={styles.button} onPress={() => void scanDrug()}>
          <Text style={styles.buttonText}>Scan drug</Text>
        </Pressable>
        <Text style={styles.status}>{drugScanStatus}</Text>
        {drugScanResult ? (
          <View style={styles.resultCard}>
            <View style={[styles.badge, badgeStyle(drugScanResult.status)]}>
              <Text style={styles.badgeText}>{drugScanResult.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.resultTitle}>{drugScanResult.title}</Text>
            <Text style={styles.resultSummary}>{drugScanResult.summary}</Text>
            <Text style={styles.meta}>Drug: {drugScanResult.drugName ?? "N/A"}</Text>
            <Text style={styles.meta}>Batch: {drugScanResult.batchNumber ?? "N/A"}</Text>
            <Text style={styles.meta}>Manufacturer: {drugScanResult.manufacturerName ?? "N/A"}</Text>
            <Text style={styles.meta}>Expiry: {drugScanResult.expiryDate ?? "N/A"}</Text>
            <Text style={styles.meta}>{drugScanResult.recommendedAction}</Text>
          </View>
        ) : null}
        {isPharmacist ? <Text style={styles.status}>{pharmacyStatus}</Text> : null}
        {isPharmacist ? (
        <>
        <TextInput placeholder="Business name" placeholderTextColor="#748089" style={styles.input} value={businessName} onChangeText={setBusinessName} />
        <TextInput placeholder="Pharmacy council number" placeholderTextColor="#748089" style={styles.input} value={gpcNumber} onChangeText={setGpcNumber} />
        <TextInput placeholder="District" placeholderTextColor="#748089" style={styles.input} value={pharmacyDistrict} onChangeText={setPharmacyDistrict} />
        <TextInput placeholder="Region" placeholderTextColor="#748089" style={styles.input} value={pharmacyRegion} onChangeText={setPharmacyRegion} />
        <TextInput placeholder="Drug name" placeholderTextColor="#748089" style={styles.input} value={drugName} onChangeText={setDrugName} />
        <TextInput placeholder="Generic name" placeholderTextColor="#748089" style={styles.input} value={drugGenericName} onChangeText={setDrugGenericName} />
        <TextInput placeholder="Drug manufacturer" placeholderTextColor="#748089" style={styles.input} value={drugManufacturer} onChangeText={setDrugManufacturer} />
        <TextInput placeholder="FDA drug number" placeholderTextColor="#748089" style={styles.input} value={drugFdaNumber} onChangeText={setDrugFdaNumber} />
        <TextInput placeholder="Drug class" placeholderTextColor="#748089" style={styles.input} value={drugClass} onChangeText={setDrugClass} />
        <TextInput placeholder="Dosage form" placeholderTextColor="#748089" style={styles.input} value={drugDosageForm} onChangeText={setDrugDosageForm} />
        <TextInput placeholder="Strength" placeholderTextColor="#748089" style={styles.input} value={drugStrength} onChangeText={setDrugStrength} />
        <TextInput placeholder="Storage conditions" placeholderTextColor="#748089" style={styles.input} value={drugStorage} onChangeText={setDrugStorage} />
        <TextInput placeholder="Side effects summary" placeholderTextColor="#748089" style={styles.input} value={drugSideEffects} onChangeText={setDrugSideEffects} />
        <TextInput placeholder="Batch number" placeholderTextColor="#748089" style={styles.input} value={drugBatchNumber} onChangeText={setDrugBatchNumber} />
        <TextInput placeholder="Manufacture date YYYY-MM-DD" placeholderTextColor="#748089" style={styles.input} value={drugManufactureDate} onChangeText={setDrugManufactureDate} />
        <TextInput placeholder="Expiry date YYYY-MM-DD" placeholderTextColor="#748089" style={styles.input} value={drugExpiryDate} onChangeText={setDrugExpiryDate} />
        <TextInput placeholder="Quantity received" placeholderTextColor="#748089" style={styles.input} value={drugQuantityReceived} onChangeText={setDrugQuantityReceived} />
        <TextInput placeholder="Quantity remaining" placeholderTextColor="#748089" style={styles.input} value={drugQuantityRemaining} onChangeText={setDrugQuantityRemaining} />
        <TextInput placeholder="Supplier name" placeholderTextColor="#748089" style={styles.input} value={drugSupplierName} onChangeText={setDrugSupplierName} />
        <TextInput placeholder="Drug recall batch ID" placeholderTextColor="#748089" style={styles.input} value={drugRecallBatchId} onChangeText={setDrugRecallBatchId} />
        <TextInput placeholder="Drug recall reason" placeholderTextColor="#748089" style={styles.input} value={drugRecallReason} onChangeText={setDrugRecallReason} />
        <View style={styles.rowWrap}>
          <Pressable style={drugRequiresPrescription ? styles.chipActive : styles.chip} onPress={() => setDrugRequiresPrescription(true)}>
            <Text style={drugRequiresPrescription ? styles.chipTextActive : styles.chipText}>Prescription</Text>
          </Pressable>
          <Pressable style={!drugRequiresPrescription ? styles.chipActive : styles.chip} onPress={() => setDrugRequiresPrescription(false)}>
            <Text style={!drugRequiresPrescription ? styles.chipTextActive : styles.chipText}>OTC</Text>
          </Pressable>
          <Pressable style={drugIsControlled ? styles.chipActive : styles.chip} onPress={() => setDrugIsControlled(true)}>
            <Text style={drugIsControlled ? styles.chipTextActive : styles.chipText}>Controlled</Text>
          </Pressable>
          <Pressable style={!drugIsControlled ? styles.chipActive : styles.chip} onPress={() => setDrugIsControlled(false)}>
            <Text style={!drugIsControlled ? styles.chipTextActive : styles.chipText}>Not controlled</Text>
          </Pressable>
        </View>
        <Text style={styles.meta}>Approval status: {drugApprovalStatus}</Text>
        <View style={styles.rowWrap}>
          {(["approved", "restricted", "banned", "under_review", "not_approved"] as const).map((value) => (
            <Pressable key={value} style={drugApprovalStatus === value ? styles.chipActive : styles.chip} onPress={() => setDrugApprovalStatus(value)}>
              <Text style={drugApprovalStatus === value ? styles.chipTextActive : styles.chipText}>{value}</Text>
            </Pressable>
          ))}
        </View>
        </>
        ) : null}
        {isPharmacist && pharmacyDashboard ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Pharmacy metrics</Text>
            <Text style={styles.meta}>Drugs: {pharmacyDashboard.metrics.drugs}</Text>
            <Text style={styles.meta}>Batches: {pharmacyDashboard.metrics.batches}</Text>
            <Text style={styles.meta}>QR codes: {pharmacyDashboard.metrics.qrCodes}</Text>
            <Text style={styles.meta}>Recalls: {pharmacyDashboard.metrics.recalls}</Text>
            <Text style={styles.meta}>Pharmacy: {pharmacyDashboard.pharmacy?.businessName ?? "No pharmacy yet"}</Text>
            <Text style={styles.meta}>Latest batch: {pharmacyDashboard.batches[0]?.batchNumber ?? "None yet"}</Text>
            <Text style={styles.meta}>Latest QR: {pharmacyDashboard.batches[0]?.qrCode ?? "None yet"}</Text>
            <Text style={styles.meta}>Latest recall: {pharmacyDashboard.recalls[0]?.reason ?? "None yet"}</Text>
          </View>
        ) : null}
      </View>
      ) : null}
    </ScrollView>
  );
}

function badgeStyle(status: ProductScanResult["status"]) {
  switch (status) {
    case "safe":
      return { backgroundColor: "#c4f1db" };
    case "caution":
      return { backgroundColor: "#f6e7b5" };
    case "recalled":
      return { backgroundColor: "#f7c2c2" };
    default:
      return { backgroundColor: "#d1d5db" };
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#05080b",
    gap: 16,
  },
  hero: {
    backgroundColor: "#0d3428",
    borderRadius: 24,
    padding: 20,
  },
  kicker: {
    color: "#b6cfc3",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#f4f4ef",
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 8,
  },
  body: {
    color: "#d5e4dd",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#10161b",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  segmented: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    backgroundColor: "#1a2228",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentActive: {
    flex: 1,
    backgroundColor: "#c4f1db",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentText: {
    color: "#e8ecea",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#113629",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#0b0f13",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f4f4ef",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  chip: {
    backgroundColor: "#182028",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: "#c4f1db",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: {
    color: "#d5ddd9",
  },
  chipTextActive: {
    color: "#113629",
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#77c7a2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#062014",
    fontWeight: "700",
  },
  status: {
    marginTop: 12,
    color: "#a8c1b6",
  },
  sessionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#0b0f13",
  },
  sessionText: {
    color: "#e5ebe7",
    marginBottom: 6,
  },
  scanCard: {
    backgroundColor: "#10161b",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  foodCard: {
    backgroundColor: "#10161b",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  scanKicker: {
    color: "#93b9ac",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  scanTitle: {
    color: "#f4f4ef",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  scanBody: {
    color: "#b4c3be",
    lineHeight: 20,
    marginBottom: 12,
  },
  scanInput: {
    backgroundColor: "#0b0f13",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f4f4ef",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cameraFrame: {
    marginTop: 10,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#05080b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minHeight: 280,
  },
  camera: {
    width: "100%",
    height: 280,
  },
  cameraPermissionBox: {
    minHeight: 280,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#0b0f13",
  },
  cameraPermissionText: {
    color: "#d0dbd7",
    textAlign: "center",
    lineHeight: 20,
  },
  cameraOverlay: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(5,8,11,0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  cameraOverlayTitle: {
    color: "#f4f4ef",
    fontWeight: "700",
    marginBottom: 4,
  },
  cameraOverlayText: {
    color: "#b4c3be",
    lineHeight: 18,
  },
  sampleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  sampleButton: {
    backgroundColor: "#182028",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sampleButtonText: {
    color: "#ecf2ef",
  },
  resultCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#0b0f13",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  badgeText: {
    color: "#12392d",
    fontWeight: "700",
  },
  resultTitle: {
    color: "#f4f4ef",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  resultSummary: {
    color: "#d0dbd7",
    lineHeight: 20,
    marginBottom: 10,
  },
  meta: {
    color: "#d0dbd7",
    marginBottom: 4,
  },
  metaSmall: {
    color: "rgba(208,219,215,0.75)",
    marginBottom: 10,
    lineHeight: 18,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: "#c4f1db",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#113629",
    fontWeight: "700",
  },
});
