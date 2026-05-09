export type UserRole = "consumer" | "farmer" | "manufacturer" | "regulator" | "pharmacist";

export const USER_ROLES: UserRole[] = [
  "consumer",
  "farmer",
  "manufacturer",
  "regulator",
  "pharmacist",
];

export interface SessionUser {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  role: UserRole;
  language: string;
  isVerified: boolean;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
}

export interface RegisterRequest {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  password: string;
  role: UserRole;
  language?: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RequestOtpRequest {
  identifier: string;
  purpose?: "login" | "verify";
}

export interface RequestOtpResponse {
  sent: boolean;
  otp?: string;
  expiresAt: string;
}

export interface VerifyOtpRequest {
  identifier: string;
  token: string;
  purpose?: "login" | "verify";
}

export interface VerifyOtpResponse extends AuthResponse {}

export interface AuthUserClaims {
  sub: string;
  role: UserRole;
  fullName: string;
}

export type ProductScanStatus = "safe" | "caution" | "recalled" | "not_found";

export interface ProductScanRequest {
  codeString: string;
}

export interface ProductScanResult {
  codeString: string;
  status: ProductScanStatus;
  statusLabel?: "GREEN" | "YELLOW" | "RED" | "NOT_FOUND";
  title: string;
  summary: string;
  productName?: string;
  farmOrigin?: string;
  batchNumber?: string;
  manufacturerName?: string;
  packagingDate?: string;
  expiryDate?: string;
  recallStatus?: "active" | "recalled" | "under_investigation";
  qrStatus?: "active" | "recalled" | "invalidated" | "under_investigation";
  scanCount?: number;
  reason?: string | null;
  recommendedAction?: string;
}

export type SpeechLanguage = "en" | "tw";

export interface SpeechSummaryRequest {
  text: string;
  language: SpeechLanguage;
}

export interface SpeechSummaryResponse {
  provider: "google";
  language: SpeechLanguage;
  text: string;
  audioBase64: string;
  mimeType: "audio/mpeg";
}

export interface UssdRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
}

export interface UssdResponse {
  response: string;
}

export interface SmsRequest {
  from: string;
  text: string;
}

export interface SmsResponse {
  response: string;
}

export interface ConsumerReportSummary {
  id: string;
  qrCodeId?: string | null;
  reporterId: string;
  description: string;
  photoUrl?: string | null;
  district?: string | null;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  createdAt?: string;
}

export interface SubmitConsumerReportRequest {
  description: string;
  district?: string | null;
  photoUrl?: string | null;
}

export interface SubmitConsumerReportResponse {
  report: ConsumerReportSummary;
}

export interface FlagConsumerReportRequest {
  reportId: string;
  status: "reviewing" | "resolved" | "dismissed";
}

export interface FlagConsumerReportResponse {
  report: ConsumerReportSummary;
}

export interface FoodFarmSummary {
  id: string;
  name: string;
  district: string;
  region: string;
  cropTypes: string[];
  verificationStatus: "pending" | "verified" | "rejected" | "suspended";
  badgeStatus: "none" | "certified";
}

export interface FoodCycleSummary {
  id: string;
  farmId: string;
  cropType: string;
  plantingDate: string;
  harvestDate?: string | null;
  marketReady: boolean;
  safeHarvestDate?: string | null;
  daysToSafeHarvest?: number | null;
}

export interface FoodInputSummary {
  id: string;
  cropCycleId: string;
  inputType: "pesticide" | "fertilizer" | "seed" | "irrigation" | "other";
  productName: string;
  applicationDate: string;
  withdrawalPeriodDays: number;
  safeHarvestDate?: string | null;
  epaApprovalStatus: "approved" | "banned" | "restricted" | "unverified";
}

export interface FoodDashboardResponse {
  farms: FoodFarmSummary[];
  cropCycles: FoodCycleSummary[];
  inputLogs: FoodInputSummary[];
  metrics: {
    farms: number;
    cropCycles: number;
    readyCycles: number;
    pendingWithdrawalCycles: number;
    overdueWithdrawalCycles: number;
  };
}

export interface CreateFarmRequest {
  name: string;
  district: string;
  region: string;
  cropTypes: string[];
  sizeAcres?: number | null;
  epaRegistrationNumber?: string | null;
}

export interface CreateCropCycleRequest {
  farmId: string;
  cropType: string;
  plantingDate: string;
  notes?: string | null;
}

export interface CreateInputLogRequest {
  cropCycleId: string;
  inputType: "pesticide" | "fertilizer" | "seed" | "irrigation" | "other";
  productName: string;
  applicationDate: string;
  concentration?: number | null;
  unit?: string | null;
  withdrawalPeriodDays?: number | null;
  epaApprovalStatus?: "approved" | "banned" | "restricted" | "unverified";
}

export interface PesticideCrossCheckResult {
  found: boolean;
  productName: string;
  epaStatus: "approved" | "banned" | "restricted" | "unverified";
  approvedCrops: string[];
  withdrawalDays: number;
  message: string;
}

export interface MarkCropCycleReadyRequest {
  cropCycleId: string;
  marketReady: boolean;
  harvestDate?: string | null;
}

export interface OfflineSyncAction {
  actionId: string;
  type: "createFarm" | "createCropCycle" | "createInputLog" | "markMarketReady";
  payload: unknown;
}

export interface OfflineSyncRequest {
  actions: OfflineSyncAction[];
}

export interface OfflineSyncItemResult {
  actionId: string;
  type: OfflineSyncAction["type"];
  ok: boolean;
  entityId?: string | null;
  message?: string;
}

export interface OfflineSyncResponse {
  results: OfflineSyncItemResult[];
}

export interface ManufacturerProfile {
  id: string;
  userId: string;
  companyName: string;
  fdaRegistrationNumber?: string | null;
  sector?: string | null;
  isVerified: boolean;
  subscriptionTier: "micro" | "small" | "medium" | "large";
}

export interface ManufacturerBatchSummary {
  id: string;
  manufacturerId: string;
  batchNumber: string;
  productName?: string | null;
  farmOrigin?: string | null;
  packagingDate: string;
  expiryDate: string;
  recallStatus: "active" | "recalled" | "under_investigation" | "expired";
  qrCode?: string | null;
  scanCount?: number;
}

export interface ManufacturerRecallSummary {
  id: string;
  batchId: string;
  recallType: string;
  reason: string;
  createdAt?: string;
}

export interface ManufacturerDashboardResponse {
  profile?: ManufacturerProfile | null;
  metrics: {
    batches: number;
    qrCodes: number;
    recalls: number;
    activeRecalls: number;
  };
  batches: ManufacturerBatchSummary[];
  recalls: ManufacturerRecallSummary[];
}

export interface CreateManufacturerProfileRequest {
  companyName: string;
  fdaRegistrationNumber?: string | null;
  sector?: string | null;
  subscriptionTier?: "micro" | "small" | "medium" | "large";
}

export interface CreateProductBatchRequest {
  batchNumber: string;
  productName?: string | null;
  farmOrigin?: string | null;
  ingredientSources?: unknown;
  processingSteps?: unknown;
  qualityChecks?: unknown;
  packagingDate: string;
  expiryDate: string;
}

export interface CreateProductBatchResponse {
  batch: ManufacturerBatchSummary;
  qrCode: {
    id: string;
    codeString: string;
    status: "active" | "recalled" | "invalidated" | "under_investigation";
    url?: string | null;
  };
}

export interface CreateRecallRequest {
  batchId: string;
  recallType: "manufacturer" | "regulator";
  reason: string;
  scopeDistricts?: string[];
}

export interface RegulatorReportSummary {
  id: string;
  qrCodeId?: string | null;
  reporterId: string;
  description: string;
  district?: string | null;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  createdAt?: string;
}

export interface RegulatorRecallSummary {
  id: string;
  batchId: string;
  recallType: string;
  reason: string;
  scopeDistricts?: string[];
  createdAt?: string;
}

export interface RegulatorViolationAlertSummary {
  id: string;
  source: "food" | "drug" | "report";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  district?: string | null;
  createdAt?: string;
}

export interface RegulatorComplianceOverview {
  farms: number;
  manufacturers: number;
  pharmacies: number;
  foodRecalls: number;
  drugRecalls: number;
  pendingReports: number;
  reviewingReports: number;
  resolvedReports: number;
  safeScans: number;
  cautionScans: number;
  recalledScans: number;
}

export interface RegulatorAnalyticsSummary {
  totalScans: number;
  foodScans: number;
  drugScans: number;
  activeRecallCount: number;
  topDistricts: string[];
  highRiskAlerts: number;
}

export interface RegulatorDashboardResponse {
  compliance: RegulatorComplianceOverview;
  alerts: RegulatorViolationAlertSummary[];
  reports: RegulatorReportSummary[];
  recalls: RegulatorRecallSummary[];
  analytics: RegulatorAnalyticsSummary;
}

export interface ReviewReportRequest {
  reportId: string;
  status: "reviewing" | "resolved" | "dismissed";
}

export interface RegulatorRecallRequest {
  batchId: string;
  reason: string;
  scopeDistricts?: string[];
  domain?: "food" | "drug";
}

export interface PharmacyProfile {
  id: string;
  userId: string;
  businessName: string;
  ghanaPharmacyCouncilNumber: string;
  district: string;
  region: string;
  isVerified: boolean;
}

export interface DrugSummary {
  id: string;
  name: string;
  genericName?: string | null;
  manufacturerName?: string | null;
  drugClass?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  fdaApprovalStatus: "approved" | "banned" | "restricted" | "under_review" | "not_approved";
}

export interface DrugBatchSummary {
  id: string;
  drugId: string;
  pharmacyId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantityReceived: number;
  quantityRemaining: number;
  recallStatus: "active" | "recalled" | "under_investigation" | "expired";
  qrCode?: string | null;
  scanCount?: number;
}

export interface DrugRecallSummary {
  id: string;
  drugBatchId: string;
  reason: string;
  createdAt?: string;
}

export interface DrugDashboardResponse {
  pharmacy?: PharmacyProfile | null;
  metrics: {
    drugs: number;
    batches: number;
    qrCodes: number;
    recalls: number;
  };
  drugs: DrugSummary[];
  batches: DrugBatchSummary[];
  recalls: DrugRecallSummary[];
}

export interface RegisterPharmacyRequest {
  businessName: string;
  ghanaPharmacyCouncilNumber: string;
  district: string;
  region: string;
}

export interface CreateDrugRecordRequest {
  name: string;
  genericName?: string | null;
  manufacturerName?: string | null;
  fdaDrugRegistrationNumber?: string | null;
  drugClass?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  requiresPrescription?: boolean;
  isControlled?: boolean;
  fdaApprovalStatus?: "approved" | "banned" | "restricted" | "under_review" | "not_approved";
  storageConditions?: string | null;
  sideEffectsSummary?: string | null;
}

export interface CreateDrugBatchRequest {
  drugId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantityReceived: number;
  quantityRemaining?: number;
  supplierName?: string | null;
}

export interface CreateDrugBatchResponse {
  batch: DrugBatchSummary;
  qrCode: {
    id: string;
    codeString: string;
    status: "active" | "recalled" | "invalidated" | "under_investigation";
  };
}

export interface CreateDrugRecallRequest {
  batchId: string;
  reason: string;
}

export interface DrugScanResult {
  codeString: string;
  status: ProductScanStatus;
  statusLabel?: "GREEN" | "YELLOW" | "RED" | "NOT_FOUND";
  title: string;
  summary: string;
  drugName?: string;
  batchNumber?: string;
  manufacturerName?: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantityRemaining?: number;
  fdaApprovalStatus?: string;
  recallStatus?: string;
  scanCount?: number;
  reason?: string | null;
  recommendedAction?: string;
}

export interface User {
  id: string;
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  role: UserRole;
  language?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Farm {
  id: string;
  ownerId: string;
  name: string;
  district: string;
  region: string;
  cropTypes: string[];
  epaRegistrationNumber?: string | null;
  isVerified: boolean;
  createdAt?: string;
}

export interface CropCycle {
  id: string;
  farmId: string;
  cropType: string;
  season?: string | null;
  startDate: string;
  harvestDate?: string | null;
  marketReady: boolean;
  marketReadyAt?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface InputLog {
  id: string;
  cropCycleId: string;
  inputType: "pesticide" | "fertilizer" | "seed" | "irrigation" | "other";
  productName: string;
  applicationDate: string;
  concentration?: string | null;
  unit?: string | null;
  withdrawalPeriodDays?: number | null;
  safeHarvestDate?: string | null;
  createdAt?: string;
}

export interface Manufacturer {
  id: string;
  userId: string;
  companyName: string;
  fdaRegistrationNumber?: string | null;
  sector?: string | null;
  isVerified: boolean;
  subscriptionTier?: "micro" | "small" | "medium" | "large";
  createdAt?: string;
}

export interface ProductBatch {
  id: string;
  manufacturerId: string;
  batchNumber: string;
  ingredientSources: unknown;
  processingSteps: unknown;
  qualityChecks: unknown;
  packagingDate: string;
  expiryDate: string;
  recallStatus: "active" | "recalled" | "under_investigation";
  createdAt?: string;
}

export interface QRCodeRecord {
  id: string;
  batchId: string;
  codeString: string;
  s3Url?: string | null;
  scanCount: number;
  status: "active" | "recalled" | "invalidated" | "under_investigation";
  createdAt?: string;
}

export interface ConsumerReport {
  id: string;
  qrCodeId?: string | null;
  reporterId: string;
  description: string;
  photoUrl?: string | null;
  district?: string | null;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  createdAt?: string;
}

export interface RecallEvent {
  id: string;
  batchId: string;
  issuedBy: string;
  recallType: "manufacturer" | "regulator";
  reason: string;
  scopeDistricts?: string[];
  notificationSentAt?: string | null;
  resolvedAt?: string | null;
  createdAt?: string;
}

export interface Pesticide {
  id: string;
  name: string;
  activeIngredient?: string | null;
  withdrawalPeriodDays?: number | null;
  epaStatus?: "approved" | "banned" | "restricted";
  cropsApplicable?: string[];
  lastUpdated?: string | null;
}

export interface Drug {
  id: string;
  name: string;
  genericName?: string | null;
  manufacturerName?: string | null;
  fdaDrugRegistrationNumber?: string | null;
  drugClass?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  requiresPrescription: boolean;
  isControlled: boolean;
  fdaApprovalStatus?: "approved" | "banned" | "under_review";
  storageConditions?: string | null;
  sideEffectsSummary?: string | null;
  createdAt?: string;
  lastUpdated?: string | null;
}

export interface DrugStock {
  id: string;
  drugId: string;
  pharmacyId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantityReceived: number;
  quantityRemaining: number;
  supplierName?: string | null;
  recallStatus: "active" | "recalled";
  createdAt?: string;
}

export interface DrugSale {
  id: string;
  drugStockId: string;
  quantity: number;
  createdAt?: string;
}
