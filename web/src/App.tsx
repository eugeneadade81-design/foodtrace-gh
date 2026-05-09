import React, { useEffect, useMemo, useState } from "react";
import {
  USER_ROLES,
  type AuthResponse,
  type CreateDrugBatchRequest,
  type CreateDrugBatchResponse,
  type CreateDrugRecordRequest,
  type CreateDrugRecallRequest,
  type CreateCropCycleRequest,
  type CreateFarmRequest,
  type CreateInputLogRequest,
  type CreateManufacturerProfileRequest,
  type CreateProductBatchRequest,
  type CreateProductBatchResponse,
  type CreateRecallRequest,
  type FoodDashboardResponse,
  type SubmitConsumerReportResponse,
  type ManufacturerDashboardResponse,
  type OfflineSyncRequest,
  type ProductScanResult,
  type DrugDashboardResponse,
  type DrugScanResult,
  type RegisterPharmacyRequest,
  type RegulatorDashboardResponse,
  type RegulatorRecallRequest,
  type ReviewReportRequest,
  type UserRole,
} from "@foodtrace/shared";

const apiBase = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:3000/api";
const sampleCodes = ["FT-QR-1001", "FT-QR-2002", "FT-QR-4004"];

type Mode = "login" | "register";

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const flattened = error as {
      formErrors?: string[];
      fieldErrors?: Record<string, string[]>;
    };
    const fieldMessage = flattened.fieldErrors ? Object.values(flattened.fieldErrors).flat()[0] : undefined;
    return fieldMessage ?? flattened.formErrors?.[0] ?? fallback;
  }

  return fallback;
}

function App() {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("consumer");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState<string>("Ready");
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [scanCode, setScanCode] = useState("FT-QR-1001");
  const [scanResult, setScanResult] = useState<ProductScanResult | null>(null);
  const [scanStatus, setScanStatus] = useState("Ready to scan");
  const [scanLoading, setScanLoading] = useState(false);
  const [reportDescription, setReportDescription] = useState("The product looks damaged and the label is unclear.");
  const [reportDistrict, setReportDistrict] = useState("Accra");
  const [reportPhoto, setReportPhoto] = useState<File | null>(null);
  const [reportStatusText, setReportStatusText] = useState("Ready to submit a consumer report");
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

  const roleList = useMemo(() => USER_ROLES, []);
  const currentRole = session?.user.role ?? null;
  const isConsumer = currentRole === "consumer";
  const isFarmer = currentRole === "farmer";
  const isManufacturer = currentRole === "manufacturer";
  const isRegulator = currentRole === "regulator";
  const isPharmacist = currentRole === "pharmacist";
  const canUseConsumerScan = !session || isConsumer || isPharmacist;

  const displayName = session?.user.fullName || session?.user.email || session?.user.phone || "Account";
  const avatarLabel = useMemo(() => {
    const raw = (session?.user.fullName || session?.user.email || session?.user.phone || "").trim();
    if (!raw) return "FT";
    const parts = raw
      .replace(/@.*/, "")
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2);
    const initials = parts.map((part) => part[0]?.toUpperCase()).join("");
    return initials || "FT";
  }, [session?.user.email, session?.user.fullName, session?.user.phone]);

  function signOut() {
    setSession(null);
    setIdentifier("");
    setPassword("");
    setStatus("Signed out.");
  }

  async function submit() {
    setStatus("Sending request...");
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
        throw new Error(getApiErrorMessage(data.error, "Authentication failed"));
      }

      setSession(data);
      setStatus(`Signed in as ${data.user.role}. Opening your portal...`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  useEffect(() => {
    if (!session?.token) return;

    if (session.user.role === "farmer") void loadFoodDashboard();
    if (session.user.role === "manufacturer") void loadManufacturerDashboard();
    if (session.user.role === "regulator") void loadRegulatorDashboard();
    if (session.user.role === "pharmacist") void loadPharmacyDashboard();
  }, [session?.token, session?.user.role]);

  async function scanProduct(code = scanCode) {
    const normalized = code.trim();
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
    } catch (error) {
      setScanStatus(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setScanLoading(false);
    }
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
      const body = new FormData();
      body.append("description", reportDescription);
      body.append("district", reportDistrict);
      if (reportPhoto) {
        body.append("photo", reportPhoto);
      }

      const response = await fetch(`${apiBase}/scan/${encodeURIComponent(code)}/report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        body,
      });
      const data = (await response.json()) as SubmitConsumerReportResponse & { error?: unknown };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not submit report");
      }

      setReportStatusText(`Report submitted: ${data.report.status}`);
      setReportPhoto(null);
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
      if (!cycleFarmId && data.dashboard.farms[0]?.id) {
        setCycleFarmId(data.dashboard.farms[0].id);
      }
      if (!inputCycleId && data.dashboard.cropCycles[0]?.id) {
        setInputCycleId(data.dashboard.cropCycles[0].id);
      }
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
      cropTypes: farmCrops
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
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
    if (!response.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not create farm");
    }
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
    if (!response.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not create crop cycle");
    }
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
    if (!response.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not save input log");
    }
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
    if (!response.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not create manufacturer profile");
    }
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
    if (!response.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not create batch");
    }
    setManufacturerStatus(`Batch created. QR: ${data.qrCode.codeString}`);
    await loadManufacturerDashboard();
  }

  async function createManufacturerRecall() {
    if (!session?.token) return setManufacturerStatus("Log in first.");

    const payload: CreateRecallRequest = {
      batchId: recallBatchId,
      recallType,
      reason: recallReason,
      scopeDistricts: recallScopeDistricts
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
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
    if (!response.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not create recall");
    }
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
      if (!reportId && data.dashboard.reports[0]?.id) {
        setReportId(data.dashboard.reports[0].id);
      }
      if (!regulatorRecallBatchId && data.dashboard.recalls[0]?.batchId) {
        setRegulatorRecallBatchId(data.dashboard.recalls[0].batchId);
      }
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

  async function scanDrug(code = drugScanCode) {
    const normalized = code.trim();
    if (!normalized) {
      setDrugScanStatus("Enter a drug QR code first.");
      return;
    }

    setDrugScanStatus("Looking up drug...");
    try {
      const response = await fetch(`${apiBase}/drug/scan/${encodeURIComponent(normalized)}`);
      const data = (await response.json()) as { result: DrugScanResult; error?: unknown };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not scan drug");
      }
      setDrugScanResult(data.result);
      setDrugScanStatus(`Scan complete: ${data.result.status}`);
    } catch (error) {
      setDrugScanStatus(error instanceof Error ? error.message : "Drug scan failed");
    }
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
      if (!drugRecallBatchId && data.dashboard.batches[0]?.id) {
        setDrugRecallBatchId(data.dashboard.batches[0].id);
      }
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
    const pharmacyDrugId = pharmacyDashboard?.drugs[0]?.id;
    if (!pharmacyDrugId) {
      setPharmacyStatus("Create or load a drug record first.");
      return;
    }
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
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.kicker}>FoodTrace GH</p>
        <h1 style={styles.title}>Scan It. Trace It. Trust It.</h1>
        <p style={styles.body}>
          FoodTrace GH connects consumers, farmers, manufacturers, pharmacists, and FDA regulators in one traceability platform for safer food and medicine.
        </p>
        {!session ? (
          <div style={styles.foodButtons}>
            <button type="button" style={styles.primaryButton} onClick={() => setMode("login")}>
              Log in
            </button>
            <button type="button" style={styles.sampleButton} onClick={() => setMode("register")}>
              Create account
            </button>
          </div>
        ) : null}
        <div style={styles.roleGrid}>
          {roleList.map((item) => (
            <button key={item} style={role === item ? styles.roleActive : styles.rolePill} onClick={() => setRole(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        {session ? (
          <div style={styles.signedIn}>
            <div style={styles.userRow}>
              <div style={styles.avatar}>{avatarLabel}</div>
              <div style={styles.userMeta}>
                <p style={styles.userName}>{displayName}</p>
                <p style={styles.userSub}>{session.user.role}</p>
              </div>
              <button type="button" onClick={signOut} style={styles.secondaryButton}>
                Log out
              </button>
            </div>
            <p style={styles.status}>{status}</p>
          </div>
        ) : (
          <>
            <div style={styles.segmented}>
              <button style={mode === "login" ? styles.segmentActive : styles.segment} onClick={() => setMode("login")} type="button">
                Log in
              </button>
              <button style={mode === "register" ? styles.segmentActive : styles.segment} onClick={() => setMode("register")} type="button">
                Create account
              </button>
            </div>

            {mode === "register" ? (
              <div style={styles.form}>
                <label style={styles.label}>
                  Full name
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={styles.input} />
                </label>
                <label style={styles.label}>
                  Phone
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />
                </label>
                <label style={styles.label}>
                  Email
                  <input value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
                </label>
                <label style={styles.label}>
                  Password
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
                </label>
                <label style={styles.label}>
                  Role
                  <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={styles.input}>
                    {roleList.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={styles.label}>
                  Language
                  <input value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.input} />
                </label>
                <button type="button" onClick={submit} style={styles.primaryButton}>
                  Create account
                </button>
              </div>
            ) : (
              <div style={styles.form}>
                <label style={styles.label}>
                  Phone or email
                  <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} style={styles.input} />
                </label>
                <label style={styles.label}>
                  Password
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
                </label>
                <button type="button" onClick={submit} style={styles.primaryButton}>
                  Log in
                </button>
              </div>
            )}

            <p style={styles.status}>{status}</p>
          </>
        )}
      </section>

      {canUseConsumerScan ? (
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
          <button type="button" style={styles.primaryButton} onClick={() => void scanProduct()} disabled={scanLoading}>
            {scanLoading ? "Scanning..." : "Scan"}
          </button>
        </div>
        <div style={styles.sampleRow}>
          {sampleCodes.map((code) => (
            <button key={code} type="button" style={styles.sampleButton} onClick={() => void scanProduct(code)}>
              {code}
            </button>
          ))}
        </div>
        <p style={styles.status}>{scanStatus}</p>
        {scanResult ? (
          <article style={styles.resultCard}>
            <div style={scanBadgeStyle(scanResult.status)}>{scanResult.status.toUpperCase()}</div>
            <h3 style={styles.resultTitle}>{scanResult.title}</h3>
            <p style={styles.resultSummary}>{scanResult.summary}</p>
            <dl style={styles.resultGrid}>
              <div>
                <dt>Batch</dt>
                <dd>{scanResult.batchNumber ?? "N/A"}</dd>
              </div>
              <div>
                <dt>Manufacturer</dt>
                <dd>{scanResult.manufacturerName ?? "N/A"}</dd>
              </div>
              <div>
                <dt>Packaging</dt>
                <dd>{scanResult.packagingDate ?? "N/A"}</dd>
              </div>
              <div>
                <dt>Expiry</dt>
                <dd>{scanResult.expiryDate ?? "N/A"}</dd>
              </div>
            </dl>
            <p style={styles.action}>{scanResult.recommendedAction}</p>
          </article>
        ) : null}
        <article style={styles.resultCard}>
          <h3 style={styles.resultTitle}>Report concern</h3>
          <p style={styles.resultSummary}>
            Add a description and attach a photo so the consumer report is ready for review.
          </p>
          <div style={styles.foodFormGrid}>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              style={{ ...styles.scanInput, minHeight: 110, gridColumn: "1 / -1" }}
              placeholder="Describe the issue"
            />
            <input
              value={reportDistrict}
              onChange={(e) => setReportDistrict(e.target.value)}
              style={styles.scanInput}
              placeholder="District"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setReportPhoto(e.target.files?.[0] ?? null)}
              style={styles.scanInput}
            />
          </div>
          <button type="button" style={styles.primaryButton} onClick={() => void submitConsumerReport()}>
            Submit consumer report
          </button>
          <p style={styles.status}>{reportStatusText}</p>
        </article>
      </section>
      ) : null}

      {isFarmer ? (
      <section style={styles.foodCard}>
        <p style={styles.scanKicker}>Food module</p>
        <h2 style={styles.scanTitle}>Farmer portal and input logging.</h2>
        <p style={styles.scanBody}>
          This is the farmer-only workflow: create a farm, start a crop cycle, log a pesticide or fertilizer input, cross-check EPA status, and watch withdrawal timing.
        </p>
        <div style={styles.foodButtons}>
          <button type="button" style={styles.primaryButton} onClick={() => void loadFoodDashboard()}>
            Load food dashboard
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createFarm()}>
            Create farm
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createCropCycle()}>
            Create crop cycle
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createInputLog()}>
            Log input
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void markMarketReady()}>
            Mark ready
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void syncOfflineQueue()}>
            Sync offline
          </button>
        </div>
        <div style={styles.foodFormGrid}>
          <input value={farmName} onChange={(e) => setFarmName(e.target.value)} style={styles.scanInput} placeholder="Farm name" />
          <input value={farmDistrict} onChange={(e) => setFarmDistrict(e.target.value)} style={styles.scanInput} placeholder="District" />
          <input value={farmRegion} onChange={(e) => setFarmRegion(e.target.value)} style={styles.scanInput} placeholder="Region" />
          <input value={farmCrops} onChange={(e) => setFarmCrops(e.target.value)} style={styles.scanInput} placeholder="Crop types comma separated" />
          <input value={cycleFarmId} onChange={(e) => setCycleFarmId(e.target.value)} style={styles.scanInput} placeholder="Crop cycle farm ID" />
          <input value={cycleCropType} onChange={(e) => setCycleCropType(e.target.value)} style={styles.scanInput} placeholder="Crop type" />
          <input value={cyclePlantingDate} onChange={(e) => setCyclePlantingDate(e.target.value)} style={styles.scanInput} placeholder="Planting date YYYY-MM-DD" />
          <input value={inputCycleId} onChange={(e) => setInputCycleId(e.target.value)} style={styles.scanInput} placeholder="Input log crop cycle ID" />
          <input value={inputProductName} onChange={(e) => setInputProductName(e.target.value)} style={styles.scanInput} placeholder="Input product name" />
          <input value={inputApplicationDate} onChange={(e) => setInputApplicationDate(e.target.value)} style={styles.scanInput} placeholder="Application date YYYY-MM-DD" />
          <input value={inputWithdrawalDays} onChange={(e) => setInputWithdrawalDays(e.target.value)} style={styles.scanInput} placeholder="Withdrawal days" />
          <select value={inputType} onChange={(e) => setInputType(e.target.value as typeof inputType)} style={styles.scanInput}>
            <option value="pesticide">pesticide</option>
            <option value="fertilizer">fertilizer</option>
            <option value="seed">seed</option>
            <option value="irrigation">irrigation</option>
            <option value="other">other</option>
          </select>
          <select value={inputEpaStatus} onChange={(e) => setInputEpaStatus(e.target.value)} style={styles.scanInput}>
            <option value="approved">approved</option>
            <option value="restricted">restricted</option>
            <option value="banned">banned</option>
            <option value="unverified">unverified</option>
          </select>
          <input value={marketReadyCycleId} onChange={(e) => setMarketReadyCycleId(e.target.value)} style={styles.scanInput} placeholder="Market-ready crop cycle ID" />
          <select value={String(marketReadyValue)} onChange={(e) => setMarketReadyValue(e.target.value === "true")} style={styles.scanInput}>
            <option value="true">market ready</option>
            <option value="false">not ready</option>
          </select>
          <textarea
            value={offlineQueue}
            onChange={(e) => setOfflineQueue(e.target.value)}
            style={{ ...styles.scanInput, minHeight: 110, gridColumn: "1 / -1" }}
            placeholder='{"actions":[...]}'
          />
        </div>
        <p style={styles.status}>{farmerStatus}</p>
        <p style={styles.status}>{foodStatus}</p>
        {foodDashboard ? (
          <article style={styles.resultCard}>
            <h3 style={styles.resultTitle}>Food metrics</h3>
            <p style={styles.resultSummary}>
              Farms: {foodDashboard.metrics.farms} | Crop cycles: {foodDashboard.metrics.cropCycles} | Ready: {foodDashboard.metrics.readyCycles}
            </p>
            <p style={styles.resultSummary}>
              Pending withdrawal: {foodDashboard.metrics.pendingWithdrawalCycles} | Overdue: {foodDashboard.metrics.overdueWithdrawalCycles}
            </p>
            <p style={styles.resultSummary}>Latest farm: {foodDashboard.farms[0]?.name ?? "None yet"}</p>
            <p style={styles.resultSummary}>Latest crop cycle: {foodDashboard.cropCycles[0]?.cropType ?? "None yet"}</p>
            <p style={styles.resultSummary}>Latest input: {foodDashboard.inputLogs[0]?.productName ?? "None yet"}</p>
            <p style={styles.resultSummary}>Latest input EPA status: {foodDashboard.inputLogs[0]?.epaApprovalStatus ?? "N/A"}</p>
          </article>
        ) : null}
      </section>
      ) : null}

      {isManufacturer ? (
      <section style={styles.foodCard}>
        <p style={styles.scanKicker}>Manufacturer portal</p>
        <h2 style={styles.scanTitle}>Batch creation, QR generation, and recalls.</h2>
        <p style={styles.scanBody}>
          The manufacturer flow creates a profile first, then builds batches, produces QR labels, and issues recalls when needed.
        </p>
        <div style={styles.foodButtons}>
          <button type="button" style={styles.primaryButton} onClick={() => void loadManufacturerDashboard()}>
            Load manufacturer dashboard
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createManufacturerProfile()}>
            Create profile
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createManufacturerBatch()}>
            Create batch
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createManufacturerRecall()}>
            Issue recall
          </button>
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
        {manufacturerDashboard ? (
          <article style={styles.resultCard}>
            <h3 style={styles.resultTitle}>Manufacturer metrics</h3>
            <p style={styles.resultSummary}>
              Batches: {manufacturerDashboard.metrics.batches} | QR codes: {manufacturerDashboard.metrics.qrCodes} | Recalls: {manufacturerDashboard.metrics.recalls}
            </p>
            <p style={styles.resultSummary}>
              Active recalls: {manufacturerDashboard.metrics.activeRecalls}
            </p>
            <p style={styles.resultSummary}>Profile: {manufacturerDashboard.profile?.companyName ?? "No profile yet"}</p>
            <p style={styles.resultSummary}>Latest batch: {manufacturerDashboard.batches[0]?.batchNumber ?? "None yet"}</p>
            <p style={styles.resultSummary}>Latest QR: {manufacturerDashboard.batches[0]?.qrCode ?? "None yet"}</p>
            <p style={styles.resultSummary}>Latest recall: {manufacturerDashboard.recalls[0]?.reason ?? "None yet"}</p>
          </article>
        ) : null}
      </section>
      ) : null}

      {isRegulator ? (
      <section style={styles.foodCard}>
        <p style={styles.scanKicker}>Regulator dashboard</p>
        <h2 style={styles.scanTitle}>FDA oversight, report review, and emergency recall.</h2>
        <p style={styles.scanBody}>
          This dashboard shows traceability health across farms, manufacturers, reports, and recalls, with direct regulator actions.
        </p>
        <div style={styles.foodButtons}>
          <button type="button" style={styles.primaryButton} onClick={() => void loadRegulatorDashboard()}>
            Load regulator dashboard
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void reviewRegulatorReport()}>
            Review report
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createRegulatorRecall()}>
            Issue recall
          </button>
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
            <option value="drug">drug recall</option>
          </select>
        </div>
        <p style={styles.status}>{regulatorStatus}</p>
        {regulatorDashboard ? (
          <article style={styles.resultCard}>
            <h3 style={styles.resultTitle}>Compliance overview</h3>
            <p style={styles.resultSummary}>
              Farms: {regulatorDashboard.compliance.farms} | Manufacturers: {regulatorDashboard.compliance.manufacturers} | Pharmacies: {regulatorDashboard.compliance.pharmacies}
            </p>
            <p style={styles.resultSummary}>
              Food recalls: {regulatorDashboard.compliance.foodRecalls} | Drug recalls: {regulatorDashboard.compliance.drugRecalls}
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
      ) : null}

      {(canUseConsumerScan || isPharmacist) ? (
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
          <button type="button" style={styles.primaryButton} onClick={() => void loadPharmacyDashboard()}>
            Load pharmacy dashboard
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void registerPharmacy()}>
            Register pharmacy
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createDrugRecord()}>
            Create drug
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createDrugBatch()}>
            Create batch
          </button>
          <button type="button" style={styles.sampleButton} onClick={() => void createDrugRecall()}>
            Issue recall
          </button>
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
          <button type="button" style={styles.primaryButton} onClick={() => void scanDrug()}>
            Scan drug
          </button>
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
      ) : null}
    </main>
  );
}

function scanBadgeStyle(status: ProductScanResult["status"]): React.CSSProperties {
  const palette: Record<ProductScanResult["status"], React.CSSProperties> = {
    safe: { ...styles.badge, background: "#c4f1db", color: "#12392d" },
    caution: { ...styles.badge, background: "#f6e7b5", color: "#594400" },
    recalled: { ...styles.badge, background: "#f7c2c2", color: "#7a1b1b" },
    not_found: { ...styles.badge, background: "#d1d5db", color: "#25303b" },
  };
  return palette[status];
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 24,
    padding: 32,
    background: "radial-gradient(circle at top, #0f5d49 0%, #08131b 45%, #05070a 100%)",
    color: "#f4f4ef",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  hero: {
    padding: 28,
    borderRadius: 28,
    background: "rgba(7, 17, 22, 0.7)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  kicker: {
    margin: 0,
    letterSpacing: 3,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  title: {
    fontSize: 56,
    lineHeight: 1.02,
    maxWidth: 560,
    margin: "16px 0",
  },
  body: {
    maxWidth: 580,
    fontSize: 18,
    lineHeight: 1.6,
    opacity: 0.88,
  },
  roleGrid: {
    marginTop: 32,
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  rolePill: {
    padding: "12px 16px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "transparent",
    color: "#f4f4ef",
    cursor: "pointer",
  },
  roleActive: {
    padding: "12px 16px",
    borderRadius: 999,
    border: "1px solid #c4f1db",
    background: "#c4f1db",
    color: "#12392d",
    cursor: "pointer",
  },
  card: {
    padding: 24,
    borderRadius: 28,
    background: "#11161b",
    border: "1px solid rgba(255,255,255,0.08)",
    alignSelf: "start",
  },
  segmented: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 20,
  },
  segment: {
    padding: 14,
    borderRadius: 16,
    background: "#192027",
    color: "#f4f4ef",
    border: "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer",
  },
  segmentActive: {
    padding: 14,
    borderRadius: 16,
    background: "#c4f1db",
    color: "#12392d",
    border: "1px solid #c4f1db",
    cursor: "pointer",
  },
  form: {
    display: "grid",
    gap: 14,
  },
  label: {
    display: "grid",
    gap: 8,
    fontSize: 14,
    color: "rgba(244,244,239,0.85)",
  },
  input: {
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#0d1216",
    color: "#f4f4ef",
    outline: "none",
  },
  primaryButton: {
    padding: "14px 16px",
    borderRadius: 16,
    border: "none",
    background: "#77c7a2",
    color: "#062014",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "transparent",
    color: "#f4f4ef",
    fontWeight: 600,
    cursor: "pointer",
  },
  status: {
    marginTop: 18,
    marginBottom: 0,
    color: "#a9c7b8",
  },
  signedIn: {
    display: "grid",
    gap: 14,
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "#c4f1db",
    color: "#12392d",
    fontWeight: 800,
    letterSpacing: 0.5,
    flex: "0 0 auto",
  },
  userMeta: {
    minWidth: 0,
    flex: "1 1 auto",
  },
  userName: {
    margin: 0,
    color: "#f4f4ef",
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userSub: {
    margin: 0,
    marginTop: 4,
    color: "rgba(169,199,184,0.9)",
    textTransform: "capitalize",
    fontSize: 13,
  },
  scanCard: {
    gridColumn: "1 / -1",
    padding: 28,
    borderRadius: 28,
    background: "#10161b",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  foodCard: {
    gridColumn: "1 / -1",
    padding: 28,
    borderRadius: 28,
    background: "#10161b",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  scanKicker: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: 2.5,
    color: "#93b9ac",
  },
  scanTitle: {
    marginTop: 12,
    fontSize: 32,
    marginBottom: 8,
  },
  scanBody: {
    margin: 0,
    maxWidth: 680,
    lineHeight: 1.6,
    color: "#b4c3be",
  },
  scanInputRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    marginTop: 20,
  },
  foodButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  foodFormGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 20,
  },
  scanInput: {
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#0b0f13",
    color: "#f4f4ef",
  },
  sampleRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
  },
  sampleButton: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#182028",
    color: "#ecf2ef",
    cursor: "pointer",
  },
  resultCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: 24,
    background: "#0b0f13",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  badge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 14,
  },
  resultTitle: {
    margin: "0 0 8px",
    fontSize: 28,
  },
  resultSummary: {
    margin: 0,
    color: "#c5d1cd",
    lineHeight: 1.6,
  },
  resultGrid: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  action: {
    marginTop: 18,
    color: "#dce7e2",
    fontWeight: 600,
  },
};

export default App;
