const navItems = document.querySelectorAll(".nav-item");
const roleButtons = document.querySelectorAll(".role-chip");
const workspace = document.querySelector(".workspace");
const title = document.getElementById("screen-title");
const subtitle = document.getElementById("screen-subtitle");
const statusChip = document.getElementById("status-chip");
const statusRing = document.getElementById("status-ring");
const alertBanner = document.getElementById("alert-banner");
const scanInput = document.getElementById("scan-input");
const scanButton = document.getElementById("scan-button");
const lookupButton = document.getElementById("lookup-button");
const scanNote = document.getElementById("scan-note");
const historyPills = document.querySelectorAll(".history-pill");
const farmOrigin = document.getElementById("farm-origin");
const pesticides = document.getElementById("pesticides");
const drugResidue = document.getElementById("drug-residue");
const qualityChecks = document.getElementById("quality-checks");
const packaged = document.getElementById("packaged");
const expiry = document.getElementById("expiry");
const recallStatus = document.getElementById("recall-status");
const authStatus = document.getElementById("auth-status");
const identityInput = document.getElementById("identity-input");
const passwordInput = document.getElementById("password-input");
const otpInput = document.getElementById("otp-input");
const languageSelect = document.getElementById("language-select");
const signInButton = document.getElementById("sign-in-button");
const requestOtpButton = document.getElementById("request-otp-button");
const foodModule = document.getElementById("food-module");
const foodModuleTitle = document.getElementById("food-module-title");
const foodModuleSubtitle = document.getElementById("food-module-subtitle");
const foodModuleChip = document.getElementById("food-module-chip");
const farmName = document.getElementById("farm-name");
const farmStatus = document.getElementById("farm-status");
const farmDistrict = document.getElementById("farm-district");
const cropType = document.getElementById("crop-type");
const cycleStage = document.getElementById("cycle-stage");
const marketReady = document.getElementById("market-ready");
const withdrawalCheck = document.getElementById("withdrawal-check");
const inputModeChip = document.getElementById("input-mode-chip");
const inputTypeSelect = document.getElementById("input-type-select");
const inputName = document.getElementById("input-name");
const inputDate = document.getElementById("input-date");
const inputNotes = document.getElementById("input-notes");
const saveInputButton = document.getElementById("save-input-button");
const withdrawalButton = document.getElementById("withdrawal-button");
const cycleTitle = document.getElementById("cycle-title");
const cycleChip = document.getElementById("cycle-chip");
const cycleCopy = document.getElementById("cycle-copy");
const foodStatusTitle = document.getElementById("food-status-title");
const foodStatusCopy = document.getElementById("food-status-copy");
const manufacturerModule = document.getElementById("manufacturer-module");
const manufacturerModuleTitle = document.getElementById("manufacturer-module-title");
const manufacturerModuleSubtitle = document.getElementById("manufacturer-module-subtitle");
const manufacturerModuleChip = document.getElementById("manufacturer-module-chip");
const batchWizardTitle = document.getElementById("batch-wizard-title");
const batchWizardChip = document.getElementById("batch-wizard-chip");
const batchProductName = document.getElementById("batch-product-name");
const batchNumber = document.getElementById("batch-number");
const batchSource = document.getElementById("batch-source");
const batchExpiry = document.getElementById("batch-expiry");
const saveBatchButton = document.getElementById("save-batch-button");
const generateQrButton = document.getElementById("generate-qr-button");
const batchCountChip = document.getElementById("batch-count-chip");
const batchList = document.getElementById("batch-list");
const qrLabelTitle = document.getElementById("qr-label-title");
const qrLabelCopy = document.getElementById("qr-label-copy");
const recallTitle = document.getElementById("recall-title");
const recallChip = document.getElementById("recall-chip");
const recallCopy = document.getElementById("recall-copy");
const regulatorModule = document.getElementById("regulator-module");
const regulatorModuleTitle = document.getElementById("regulator-module-title");
const regulatorModuleSubtitle = document.getElementById("regulator-module-subtitle");
const regulatorModuleChip = document.getElementById("regulator-module-chip");
const regulatorOverviewTitle = document.getElementById("regulator-overview-title");
const regulatorOverviewChip = document.getElementById("regulator-overview-chip");
const regFarms = document.getElementById("reg-farms");
const regManufacturers = document.getElementById("reg-manufacturers");
const regRecalls = document.getElementById("reg-recalls");
const regReports = document.getElementById("reg-reports");
const regQueueTitle = document.getElementById("reg-queue-title");
const regQueueChip = document.getElementById("reg-queue-chip");
const regList = document.getElementById("reg-list");
const regRecallTitle = document.getElementById("reg-recall-title");
const regRecallChip = document.getElementById("reg-recall-chip");
const regRecallCopy = document.getElementById("reg-recall-copy");
const regAnalyticsTitle = document.getElementById("reg-analytics-title");
const regAnalyticsCopy = document.getElementById("reg-analytics-copy");
const assistantModule = document.getElementById("assistant-module");
const assistantModuleTitle = document.getElementById("assistant-module-title");
const assistantModuleSubtitle = document.getElementById("assistant-module-subtitle");
const assistantModuleChip = document.getElementById("assistant-module-chip");
const assistantSourceChip = document.getElementById("assistant-source-chip");
const assistantInput = document.getElementById("assistant-input");
const askAiButton = document.getElementById("ask-ai-button");
const aiExampleButton = document.getElementById("ai-example-button");
const assistantAnswerTitle = document.getElementById("assistant-answer-title");
const assistantAnswerCopy = document.getElementById("assistant-answer-copy");
const assistantPrompts = document.getElementById("assistant-prompts");
const assistantRulesCopy = document.getElementById("assistant-rules-copy");
const connectivityTitle = document.getElementById("connectivity-title");
const connectivitySubtitle = document.getElementById("connectivity-subtitle");
const connectivityChip = document.getElementById("connectivity-chip");
const connectivityStateTitle = document.getElementById("connectivity-state-title");
const connectivityStateChip = document.getElementById("connectivity-state-chip");
const connectivityStateCopy = document.getElementById("connectivity-state-copy");
const queueCount = document.getElementById("queue-count");
const smsCount = document.getElementById("sms-count");
const toggleConnectivityButton = document.getElementById("toggle-connectivity-button");
const queueDemoButton = document.getElementById("queue-demo-button");
const sendSmsButton = document.getElementById("send-sms-button");
const syncNowButton = document.getElementById("sync-now-button");
const offlineQueueTitle = document.getElementById("offline-queue-title");
const offlineQueueChip = document.getElementById("offline-queue-chip");
const offlineQueueList = document.getElementById("offline-queue-list");
const smsTitle = document.getElementById("sms-title");
const smsChip = document.getElementById("sms-chip");
const smsCopy = document.getElementById("sms-copy");
const smsTemplateList = document.getElementById("sms-template-list");
const lastSmsTitle = document.getElementById("last-sms-title");
const lastSmsCopy = document.getElementById("last-sms-copy");
const syncState = document.getElementById("sync-state");
const syncDetail = document.getElementById("sync-detail");
const recallCount = document.getElementById("recall-count");
const recallDetail = document.getElementById("recall-detail");
const auditTitle = document.getElementById("audit-title");
const auditSubtitle = document.getElementById("audit-subtitle");
const auditChip = document.getElementById("audit-chip");
const auditCountChip = document.getElementById("audit-count-chip");
const auditList = document.getElementById("audit-list");
const auditCopy = document.getElementById("audit-copy");

const STORAGE_KEY = "foodtrace-gh-state-v1";

function readSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentRole,
        currentTab,
        signedIn,
        activeCode,
        isOnline,
        offlineQueue,
        smsHistory,
        auditEvents,
        identity: identityInput.value,
        language: languageSelect.value,
        scanInput: scanInput.value,
        inputType: inputTypeSelect.value,
        inputName: inputName.value,
        inputDate: inputDate.value,
        inputNotes: inputNotes.value,
        batchProductName: batchProductName.value,
        batchNumber: batchNumber.value,
        batchSource: batchSource.value,
        batchExpiry: batchExpiry.value,
        assistantInput: assistantInput.value,
      })
    );
  } catch {
    // Local storage can be full or unavailable; keep the prototype functional.
  }
}

const savedState = readSavedState();

const batches = {
  "FT-2026-00124": {
    code: "FT-2026-00124",
    title: "Verified Safe",
    subtitle: "Tomato Paste - Afram Foods Ltd",
    chip: { text: "All clear", variant: "success" },
    ring: "var(--accent)",
    farmOrigin: "Agyemang Farm, Ashanti",
    pesticides: "EPA approved",
    drugResidue: "Clear",
    qualityChecks: "3 / 3 passed",
    packaged: "Apr 22, 2026",
    expiry: "May 2027",
    recallStatus: "None",
    showAlert: false,
    note: "This batch is verified and ready for the shelf.",
  },
  "BS-0199": {
    code: "BS-0199",
    title: "Recalled",
    subtitle: "Palace Beef Sausage - Palace Foods",
    chip: { text: "Recall", variant: "warning" },
    ring: "var(--danger)",
    farmOrigin: "Batch under investigation",
    pesticides: "Food-source review pending",
    drugResidue: "Drug residue violation",
    qualityChecks: "2 / 3 passed",
    packaged: "Apr 24, 2026",
    expiry: "Nov 2026",
    recallStatus: "Recalled",
    showAlert: true,
    alertTitle: "Recalled product detected",
    alertBody:
      "This batch has been recalled because a drug residue violation was flagged. Do not consume it.",
    alertTag: "Recall",
    consumerAction: "If you bought this product, return it or dispose of it safely.",
  },
  "FT-2026-00488": {
    code: "FT-2026-00488",
    title: "Under Review",
    subtitle: "Mango Juice - Sunrise Brands",
    chip: { text: "Caution", variant: "warning" },
    ring: "var(--warning)",
    farmOrigin: "Eastern Region cooperative",
    pesticides: "One input not fully verified",
    drugResidue: "Clear",
    qualityChecks: "3 / 4 passed",
    packaged: "May 02, 2026",
    expiry: "Jun 2027",
    recallStatus: "Under review",
    showAlert: true,
    alertTitle: "Caution",
    alertBody:
      "This batch has a pending verification item. It is not recalled, but the record is not fully complete yet.",
    alertTag: "Review",
    consumerAction: "Review the details carefully before buying.",
  },
};

const screens = {
  consumer: {
    title: "Verified Safe",
    subtitle: "Tomato Paste - Afram Foods Ltd",
    chip: { text: "All clear", variant: "success" },
    ring: "var(--accent)",
    farmOrigin: "Agyemang Farm, Ashanti",
    pesticides: "EPA approved",
    drugResidue: "Clear",
    qualityChecks: "3 / 3 passed",
    packaged: "Apr 22, 2026",
    expiry: "May 2027",
    recallStatus: "None",
    showAlert: true,
    alertTitle: "Recalled product nearby",
    alertBody:
      "Palace Beef Sausage (Batch BS-0199) was flagged for a drug residue violation. Do not consume it.",
    alertTag: "Alert",
  },
  farmer: {
    title: "Farmer Portal",
    subtitle: "Withdrawal periods, input logs, and offline sync",
    chip: { text: "Pending harvest", variant: "warning" },
    ring: "var(--warning)",
    farmOrigin: "Ejisu Demo Farm, Ashanti",
    pesticides: "2 inputs logged",
    drugResidue: "N/A",
    qualityChecks: "Cycle in progress",
    packaged: "Planting week 4",
    expiry: "Harvest in 9 days",
    recallStatus: "No blocked crops",
    showAlert: false,
  },
  manufacturer: {
    title: "Manufacturer Portal",
    subtitle: "Batch records, QR labels, and recall controls",
    chip: { text: "Active batch", variant: "success" },
    ring: "#4b88c8",
    farmOrigin: "Supplier-linked ingredients",
    pesticides: "Traceable source chain",
    drugResidue: "Declaration complete",
    qualityChecks: "4 / 4 passed",
    packaged: "Today",
    expiry: "Dec 2027",
    recallStatus: "One active recall",
    showAlert: false,
  },
  regulator: {
    title: "FDA Dashboard",
    subtitle: "Violations, recalls, and compliance watch",
    chip: { text: "Investigation", variant: "warning" },
    ring: "var(--danger)",
    farmOrigin: "National traceability view",
    pesticides: "3 flagged batches",
    drugResidue: "2 recall cases",
    qualityChecks: "Review queue active",
    packaged: "Updated 5 min ago",
    expiry: "Live analytics",
    recallStatus: "3 open recalls",
    showAlert: true,
    alertTitle: "High-risk batch broadcast",
    alertBody:
      "Consumers who scanned affected batches in the past 90 days have been notified. Review the live recall trail for more detail.",
    alertTag: "Broadcast",
  },
  ai: {
    title: "Safety Assistant",
    subtitle: "Ask for a plain-language explanation of the scan",
    chip: { text: "Assistant mode", variant: "success" },
    ring: "#8c63ff",
    farmOrigin: "Natural language explanation",
    pesticides: "Summarized for humans",
    drugResidue: "Context-aware",
    qualityChecks: "Explains what changed",
    packaged: "Can translate results",
    expiry: "Can answer follow-ups",
    recallStatus: "Supports triage only",
    showAlert: false,
  },
};

const roleDefaults = {
  consumer: { tab: "consumer", label: "Consumer access" },
  farmer: { tab: "farmer", label: "Farmer access" },
  manufacturer: { tab: "manufacturer", label: "Manufacturer access" },
  regulator: { tab: "regulator", label: "Regulator access" },
  agent: { tab: "farmer", label: "Agent access" },
  admin: { tab: "regulator", label: "Admin access" },
};

const foodStates = {
  overview: {
    moduleTitle: "Food traceability overview",
    moduleSubtitle: "The food module keeps the farm, crop cycle, and product handoff in one clear chain.",
    moduleChip: { text: "Food chain live", variant: "success" },
    farmName: "Agyemang Farm",
    farmStatus: { text: "Pending harvest", variant: "warning" },
    farmDistrict: "Ejisu, Ashanti",
    cropType: "Tomato",
    cycleStage: "Week 4 of 8",
    marketReady: "In 3 days",
    withdrawalCheck: "Not yet cleared",
    inputMode: { text: "Offline ready", variant: "success" },
    cycleTitle: "Tomato cycle",
    cycleChip: { text: "Growing", variant: "success" },
    cycleCopy: "Logs are tracked against this crop cycle. Pesticide entries update the market-ready date.",
    foodStatusTitle: "Chain status",
    foodStatusCopy: "Inputs, withdrawal periods, and batch handoff feed the same traceability chain.",
  },
  farmer: {
    moduleTitle: "Farmer dashboard",
    moduleSubtitle: "Register a farm, log inputs, and see withdrawal periods before harvest.",
    moduleChip: { text: "Farmer view", variant: "warning" },
    farmName: "Agyemang Farm",
    farmStatus: { text: "Week 4", variant: "warning" },
    farmDistrict: "Ejisu, Ashanti",
    cropType: "Tomato",
    cycleStage: "Growing",
    marketReady: "3 days left",
    withdrawalCheck: "Pending pesticide window",
    inputMode: { text: "Offline ready", variant: "success" },
    cycleTitle: "Active crop cycle",
    cycleChip: { text: "Growing", variant: "success" },
    cycleCopy: "Every log updates the safe harvest date and the market-ready status.",
    foodStatusTitle: "What matters now",
    foodStatusCopy: "Farmers need clear input logging, simple withdrawal guidance, and a calm red/yellow/green result.",
  },
  manufacturer: {
    moduleTitle: "Manufacturer handoff",
    moduleSubtitle: "Use verified ingredients from the food module when creating a product batch.",
    moduleChip: { text: "Batch ready", variant: "success" },
    farmName: "Supplier-linked ingredients",
    farmStatus: { text: "Traceable", variant: "success" },
    farmDistrict: "Multiple sourcing districts",
    cropType: "Tomato + spice blend",
    cycleStage: "Inputs cleared",
    marketReady: "Ready for batch use",
    withdrawalCheck: "Linked crops cleared",
    inputMode: { text: "Batch handoff", variant: "warning" },
    cycleTitle: "Food source summary",
    cycleChip: { text: "Verified", variant: "success" },
    cycleCopy: "Manufacturers can pull from cleared crop cycles and build auditable batches from them.",
    foodStatusTitle: "Batch connection",
    foodStatusCopy: "When the food module is clean, manufacturers can generate QR labels with confidence.",
  },
};

const manufacturerStates = {
  overview: {
    title: "Manufacturer batch flow",
    subtitle: "Create a batch from cleared food inputs, then generate a QR label.",
    chip: { text: "Batch flow", variant: "success" },
    wizardTitle: "Create batch",
    wizardChip: { text: "Step 1 of 5", variant: "warning" },
    countChip: "3 active",
    qrTitle: "Ready to generate",
    qrCopy: "Complete the batch record, then generate the QR label for print and scan.",
    recallTitle: "Recall center",
    recallChip: { text: "Monitoring", variant: "success" },
    recallCopy:
      "Manufacturers can flag a batch immediately, and every scan of the QR code updates right away.",
    batchList: [
      { name: "Tomato Paste 400g", code: "TP-2026-0341", status: "Active", warning: false },
      { name: "Palace Beef Sausage", code: "BS-2026-0199", status: "Recalled", warning: true },
      { name: "Mango Juice", code: "MJ-2026-0048", status: "Under review", warning: false },
    ],
  },
  manufacturer: {
    title: "Manufacturer dashboard",
    subtitle: "Build batch records, issue QR labels, and manage recalls.",
    chip: { text: "Manufacturer view", variant: "success" },
    wizardTitle: "New batch form",
    wizardChip: { text: "Step 2 of 5", variant: "warning" },
    countChip: "3 active",
    qrTitle: "QR label preview",
    qrCopy: "A batch QR is produced once the record is complete and verified.",
    recallTitle: "Active recall controls",
    recallChip: { text: "Ready", variant: "warning" },
    recallCopy:
      "The manufacturer can trigger a recall, and the product scan state updates across the app.",
    batchList: [
      { name: "Tomato Paste 400g", code: "TP-2026-0341", status: "Active", warning: false },
      { name: "Palace Beef Sausage", code: "BS-2026-0199", status: "Recalled", warning: true },
      { name: "Mango Juice", code: "MJ-2026-0048", status: "Under review", warning: false },
    ],
  },
};

const regulatorStates = {
  overview: {
    title: "FDA review dashboard",
    subtitle: "Track recalls, reports, and the traceability chain in one view.",
    chip: { text: "Review mode", variant: "warning" },
    overviewTitle: "Compliance status",
    overviewChip: { text: "Live", variant: "success" },
    farms: "428",
    manufacturers: "62",
    recalls: "3",
    reports: "14",
    queueTitle: "Consumer reports",
    queueChip: { text: "Pending", variant: "warning" },
    queueItems: [
      { name: "Palace Beef Sausage", detail: "2 reports Â· Drug residue violation", warning: true },
      { name: "Tomato Paste 400g", detail: "1 report Â· Under review", warning: false },
      { name: "Mango Juice", detail: "0 reports Â· Monitoring", warning: false },
    ],
    recallTitle: "Broadcast log",
    recallChip: { text: "3 open", variant: "warning" },
    recallCopy: "Every recall update is reflected in the product scan result and the review trail.",
    analyticsTitle: "Regional view",
    analyticsCopy: "Later, this panel can expand into charts and heatmaps for compliance and recall trends.",
  },
  regulator: {
    title: "Regulator dashboard",
    subtitle: "Human review, recall management, and live compliance monitoring.",
    chip: { text: "FDA access", variant: "warning" },
    overviewTitle: "National compliance",
    overviewChip: { text: "Updated now", variant: "success" },
    farms: "428",
    manufacturers: "62",
    recalls: "3",
    reports: "14",
    queueTitle: "Review queue",
    queueChip: { text: "Needs action", variant: "warning" },
    queueItems: [
      { name: "Palace Beef Sausage", detail: "2 reports Â· Drug residue violation", warning: true },
      { name: "Tomato Paste 400g", detail: "1 report Â· Under review", warning: false },
      { name: "Mango Juice", detail: "0 reports Â· Monitoring", warning: false },
    ],
    recallTitle: "Recall trail",
    recallChip: { text: "Broadcast", variant: "warning" },
    recallCopy: "Regulators can issue or review recalls, and every scan reflects the current status immediately.",
    analyticsTitle: "Analytics placeholder",
    analyticsCopy: "Charts and district heatmaps can be added after the first stable release.",
  },
};

const assistantStates = {
  overview: {
    title: "Ask FoodTrace AI",
    subtitle: "Get plain-language explanations, report summaries, and helpful guidance.",
    chip: { text: "Assistant mode", variant: "success" },
    sourceChip: { text: "AI support", variant: "warning" },
    answerTitle: "Ready to help",
    answerCopy:
      "Ask about the scan result, a withdrawal period, a recall, or how to read the status.",
    prompts: [
      { title: "Why is this yellow?", detail: "Explains caution states in plain language." },
      { title: "What does withdrawal mean?", detail: "Gives a simple answer for farmers." },
      { title: "Summarize this recall.", detail: "Turns a recall into a short summary." },
    ],
    rules:
      "AI can explain, summarize, and guide. It must never replace the rules engine or regulator review.",
  },
  consumer: {
    title: "Scan explanation",
    subtitle: "AI can explain the current product state in simple language.",
    chip: { text: "Consumer help", variant: "success" },
    sourceChip: { text: "Based on scan", variant: "warning" },
    answerTitle: "Consumer answer",
    answerCopy:
      "This product is green because the logged inputs are approved and there is no active recall flag.",
    prompts: [
      { title: "Why is this yellow?", detail: "Explains caution states in plain language." },
      { title: "Is this recalled?", detail: "Looks at the current status and recalls." },
      { title: "What does the color mean?", detail: "Explains green, yellow, and red." },
    ],
    rules:
      "AI can explain the scan, but the color state still comes from the rules engine.",
  },
  farmer: {
    title: "Farmer help",
    subtitle: "Ask about withdrawal periods, inputs, or market-ready timing.",
    chip: { text: "Farmer help", variant: "warning" },
    sourceChip: { text: "Farm guidance", variant: "success" },
    answerTitle: "Farmer answer",
    answerCopy:
      "Withdrawal period means the safe waiting time after a pesticide before harvesting the crop.",
    prompts: [
      { title: "What is withdrawal?", detail: "Simple farmer-friendly explanation." },
      { title: "Can I harvest now?", detail: "Checks the market-ready idea." },
      { title: "How do I log inputs?", detail: "Explains the logging flow." },
    ],
    rules:
      "AI can guide farmers, but the withdrawal date is still determined by the pesticide rules database.",
  },
  manufacturer: {
    title: "Report summary",
    subtitle: "Ask AI to explain a batch, a report, or a recall trail.",
    chip: { text: "Batch help", variant: "success" },
    sourceChip: { text: "Batch context", variant: "warning" },
    answerTitle: "Manufacturer answer",
    answerCopy:
      "A recall should be issued when a batch has a confirmed risk, and every linked QR scan should update immediately.",
    prompts: [
      { title: "Summarize this batch", detail: "Turns a batch record into plain language." },
      { title: "Why was this recalled?", detail: "Explains the recall reason." },
      { title: "What is missing?", detail: "Highlights incomplete batch data." },
    ],
    rules:
      "AI can summarize batch data, but recall issuance remains a human and rules-based action.",
  },
  regulator: {
    title: "Regulator triage",
    subtitle: "Use AI to summarize reports and highlight patterns for review.",
    chip: { text: "Triage help", variant: "warning" },
    sourceChip: { text: "Review support", variant: "success" },
    answerTitle: "Regulator answer",
    answerCopy:
      "This queue groups consumer reports around a product so regulators can review repeated complaints faster.",
    prompts: [
      { title: "Summarize this queue", detail: "Shortens multiple reports into one view." },
      { title: "What looks suspicious?", detail: "Highlights repeated issues." },
      { title: "Draft a recall note", detail: "Helps write a clear recall summary." },
    ],
    rules:
      "AI can assist with triage, but the regulator still makes the final review and recall decisions.",
  },
};

let currentRole = savedState.currentRole || "consumer";
let currentTab = savedState.currentTab || "consumer";
let signedIn = Boolean(savedState.signedIn);
let activeCode = savedState.activeCode || "FT-2026-00124";
let isOnline = savedState.isOnline !== undefined ? Boolean(savedState.isOnline) : true;
let offlineQueue = Array.isArray(savedState.offlineQueue) ? savedState.offlineQueue : [];
let smsHistory = Array.isArray(savedState.smsHistory) ? savedState.smsHistory : [];
let auditEvents = Array.isArray(savedState.auditEvents) ? savedState.auditEvents : [];

function setChip(chip) {
  statusChip.textContent = chip.text;
  statusChip.className = `chip ${chip.variant}`;
}

function updateAuthStatus(message, extra) {
  authStatus.innerHTML = `
    <strong>${message}</strong>
    <span>${extra}</span>
  `;
}

function updateRoleButtons(role) {
  roleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.role === role);
  });
}

function updateActiveNav(tab) {
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.tab === tab));
}

function updateHistoryActive(code) {
  historyPills.forEach((pill) => pill.classList.toggle("active", pill.dataset.code === code));
}

function getCurrentSmsMessage() {
  if (currentTab === "regulator") {
    return `Recall alert: review batch ${activeCode} in the FDA dashboard.`;
  }

  if (currentTab === "manufacturer") {
    return `Batch ${batchNumber.value.trim() || activeCode} is ready for QR and recall tracking.`;
  }

  if (currentTab === "farmer") {
    return "Reminder: check the withdrawal period before harvest.";
  }

  return `FoodTrace GH status for ${activeCode}: ${statusChip.textContent}.`;
}

function renderConnectivityModule() {
  const queueSize = offlineQueue.length;
  const sentCount = smsHistory.filter((entry) => entry.sent).length;

  connectivityTitle.textContent = isOnline ? "Field support" : "Offline capture";
  connectivitySubtitle.textContent = isOnline
    ? "Keep logs moving when internet is weak and send short status alerts by SMS."
    : "Actions are stored on the device until the connection returns.";
  connectivityChip.textContent = isOnline ? "Online" : "Offline";
  connectivityChip.className = `chip ${isOnline ? "success" : "warning"}`;
  connectivityStateTitle.textContent = isOnline ? "Ready to sync" : "Working offline";
  connectivityStateChip.textContent = isOnline ? "Live" : "Queued";
  connectivityStateChip.className = `chip ${isOnline ? "success" : "warning"}`;
  connectivityStateCopy.textContent = isOnline
    ? "When the connection drops, new actions stay on the device and sync later."
    : "The app is holding recent actions locally so the workflow can continue.";
  queueCount.textContent = String(queueSize);
  smsCount.textContent = `${sentCount} sent`;
  toggleConnectivityButton.textContent = isOnline ? "Go offline" : "Go online";
  offlineQueueTitle.textContent = queueSize ? "Saved locally" : "No queued items";
  offlineQueueChip.textContent = queueSize ? `${queueSize} waiting` : "Empty";
  offlineQueueChip.className = `chip ${queueSize ? "warning" : "success"}`;
  syncState.textContent = isOnline ? "Online" : "Offline";
  syncDetail.textContent = queueSize ? `${queueSize} items waiting` : "1,204 scans today";
  recallCount.textContent = "3 open";
  recallDetail.textContent = "2 drug-related";

  offlineQueueList.innerHTML = queueSize
    ? offlineQueue
        .map(
          (item) => `
            <article class="batch-item${item.warning ? " warning" : ""}">
              <strong>${item.title}</strong>
              <span>${item.detail}</span>
            </article>
          `
        )
        .join("")
    : `
        <article class="batch-item">
          <strong>No queued items</strong>
          <span>Actions added while offline will appear here.</span>
        </article>
      `;

  smsTemplateList.innerHTML = `
    <article class="batch-item">
      <strong>Recall alert</strong>
      <span>Product code, reason, and next action.</span>
    </article>
    <article class="batch-item">
      <strong>Offline sync note</strong>
      <span>Lets users know that the device is storing actions locally.</span>
    </article>
  `;

  if (smsHistory.length) {
    const last = smsHistory[0];
    lastSmsTitle.textContent = last.title;
    lastSmsCopy.textContent = last.copy;
    smsTitle.textContent = last.sent ? "Alert sent" : "Alert queued";
    smsChip.textContent = last.sent ? "Sent" : "Queued";
    smsChip.className = `chip ${last.sent ? "success" : "warning"}`;
    smsCopy.textContent = last.copy;
  } else {
    lastSmsTitle.textContent = "No message sent yet";
    lastSmsCopy.textContent =
      "Use the preview button to test the wording before a real broadcast flow is built.";
    smsTitle.textContent = "Alert preview";
    smsChip.textContent = "Ready";
    smsChip.className = "chip warning";
    smsCopy.textContent =
      "A recall message can be shortened into a simple SMS for farmers, retailers, and consumers.";
  }
}

function queueOfflineAction(title, detail) {
  offlineQueue.unshift({
    title,
    detail,
    warning: /recall|risk|flag/i.test(title + detail),
  });
  offlineQueue = offlineQueue.slice(0, 5);
  addAuditEvent("Offline queued", title);
  renderConnectivityModule();
}

function addSmsHistory(title, copy, sent) {
  smsHistory.unshift({
    title,
    copy,
    sent,
  });
  smsHistory = smsHistory.slice(0, 3);
  addAuditEvent(sent ? "SMS sent" : "SMS queued", title);
  renderConnectivityModule();
}

function addAuditEvent(action, detail) {
  auditEvents.unshift({
    action,
    detail,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
  auditEvents = auditEvents.slice(0, 8);
  renderAuditModule();
  persistState();
}

function renderAuditModule() {
  const count = auditEvents.length;
  auditTitle.textContent = currentTab === "regulator" ? "Regulator history" : "Activity history";
  auditSubtitle.textContent =
    currentTab === "regulator"
      ? "Track what changed, when it changed, and who reviewed it."
      : "The app keeps a visible record of scans, saves, syncs, and review actions.";
  auditChip.textContent = count ? "Tracked" : "Empty";
  auditChip.className = `chip ${count ? "success" : "warning"}`;
  auditCountChip.textContent = `${count} event${count === 1 ? "" : "s"}`;
  auditCopy.textContent =
    currentTab === "regulator"
      ? "This trail helps the FDA review product changes, recalls, and consumer reports in one place."
      : "Every scan, save, or sync can be audited later to support traceability and regulatory review.";

  auditList.innerHTML = count
    ? auditEvents
        .map(
          (entry) => `
            <article class="batch-item">
              <strong>${entry.action}</strong>
              <span>${entry.detail} Â· ${entry.time}</span>
            </article>
          `
        )
        .join("")
    : `
        <article class="batch-item">
          <strong>No activity yet</strong>
          <span>Important actions will appear here as they happen.</span>
        </article>
      `;
}

function restoreSavedValues() {
  if (savedState.identity) identityInput.value = savedState.identity;
  if (savedState.language) languageSelect.value = savedState.language;
  if (savedState.scanInput) scanInput.value = savedState.scanInput;
  if (savedState.inputType) inputTypeSelect.value = savedState.inputType;
  if (savedState.inputName) inputName.value = savedState.inputName;
  if (savedState.inputDate) inputDate.value = savedState.inputDate;
  if (savedState.inputNotes) inputNotes.value = savedState.inputNotes;
  if (savedState.batchProductName) batchProductName.value = savedState.batchProductName;
  if (savedState.batchNumber) batchNumber.value = savedState.batchNumber;
  if (savedState.batchSource) batchSource.value = savedState.batchSource;
  if (savedState.batchExpiry) batchExpiry.value = savedState.batchExpiry;
  if (savedState.assistantInput) assistantInput.value = savedState.assistantInput;
}

function renderFoodModule() {
  const state =
    currentRole === "manufacturer"
      ? foodStates.manufacturer
      : currentRole === "farmer" || currentRole === "agent"
        ? foodStates.farmer
        : foodStates.overview;

  foodModuleTitle.textContent = state.moduleTitle;
  foodModuleSubtitle.textContent = state.moduleSubtitle;
  foodModuleChip.textContent = state.moduleChip.text;
  foodModuleChip.className = `chip ${state.moduleChip.variant}`;

  farmName.textContent = state.farmName;
  farmStatus.textContent = state.farmStatus.text;
  farmStatus.className = `chip ${state.farmStatus.variant}`;
  farmDistrict.textContent = state.farmDistrict;
  cropType.textContent = state.cropType;
  cycleStage.textContent = state.cycleStage;
  marketReady.textContent = state.marketReady;
  withdrawalCheck.textContent = state.withdrawalCheck;

  inputModeChip.textContent = state.inputMode.text;
  inputModeChip.className = `chip ${state.inputMode.variant}`;
  cycleTitle.textContent = state.cycleTitle;
  cycleChip.textContent = state.cycleChip.text;
  cycleChip.className = `chip ${state.cycleChip.variant}`;
  cycleCopy.textContent = state.cycleCopy;
  foodStatusTitle.textContent = state.foodStatusTitle;
  foodStatusCopy.textContent = state.foodStatusCopy;

  if (!inputDate.value) {
    inputDate.value = new Date().toISOString().slice(0, 10);
  }
}

function renderManufacturerModule() {
  const state = currentRole === "manufacturer" ? manufacturerStates.manufacturer : manufacturerStates.overview;

  manufacturerModuleTitle.textContent = state.title;
  manufacturerModuleSubtitle.textContent = state.subtitle;
  manufacturerModuleChip.textContent = state.chip.text;
  manufacturerModuleChip.className = `chip ${state.chip.variant}`;
  batchWizardTitle.textContent = state.wizardTitle;
  batchWizardChip.textContent = state.wizardChip.text;
  batchWizardChip.className = `chip ${state.wizardChip.variant}`;
  batchCountChip.textContent = state.countChip;
  qrLabelTitle.textContent = state.qrTitle;
  qrLabelCopy.textContent = state.qrCopy;
  recallTitle.textContent = state.recallTitle;
  recallChip.textContent = state.recallChip.text;
  recallChip.className = `chip ${state.recallChip.variant}`;
  recallCopy.textContent = state.recallCopy;

  batchList.innerHTML = state.batchList
    .map(
      (item) => `
        <article class="batch-item${item.warning ? " warning" : ""}">
          <strong>${item.name}</strong>
          <span>${item.code} Â· ${item.status}</span>
        </article>
      `
    )
    .join("");

  if (!batchExpiry.value) {
    batchExpiry.value = new Date().toISOString().slice(0, 10);
  }
}

function renderRegulatorModule() {
  const state = currentRole === "regulator" || currentRole === "admin"
    ? regulatorStates.regulator
    : regulatorStates.overview;

  regulatorModuleTitle.textContent = state.title;
  regulatorModuleSubtitle.textContent = state.subtitle;
  regulatorModuleChip.textContent = state.chip.text;
  regulatorModuleChip.className = `chip ${state.chip.variant}`;
  regulatorOverviewTitle.textContent = state.overviewTitle;
  regulatorOverviewChip.textContent = state.overviewChip.text;
  regulatorOverviewChip.className = `chip ${state.overviewChip.variant}`;
  regFarms.textContent = state.farms;
  regManufacturers.textContent = state.manufacturers;
  regRecalls.textContent = state.recalls;
  regReports.textContent = state.reports;
  regQueueTitle.textContent = state.queueTitle;
  regQueueChip.textContent = state.queueChip.text;
  regQueueChip.className = `chip ${state.queueChip.variant}`;
  regList.innerHTML = state.queueItems
    .map(
      (item) => `
        <article class="batch-item${item.warning ? " warning" : ""}">
          <strong>${item.name}</strong>
          <span>${item.detail}</span>
        </article>
      `
    )
    .join("");
  regRecallTitle.textContent = state.recallTitle;
  regRecallChip.textContent = state.recallChip.text;
  regRecallChip.className = `chip ${state.recallChip.variant}`;
  regRecallCopy.textContent = state.recallCopy;
  regAnalyticsTitle.textContent = state.analyticsTitle;
  regAnalyticsCopy.textContent = state.analyticsCopy;
}

function renderAssistantModule() {
  const state =
    currentRole === "farmer" || currentRole === "agent"
      ? assistantStates.farmer
      : currentRole === "manufacturer"
        ? assistantStates.manufacturer
        : currentRole === "regulator" || currentRole === "admin"
          ? assistantStates.regulator
          : currentRole === "consumer"
            ? assistantStates.consumer
            : assistantStates.overview;

  assistantModuleTitle.textContent = state.title;
  assistantModuleSubtitle.textContent = state.subtitle;
  assistantModuleChip.textContent = state.chip.text;
  assistantModuleChip.className = `chip ${state.chip.variant}`;
  assistantSourceChip.textContent = state.sourceChip.text;
  assistantSourceChip.className = `chip ${state.sourceChip.variant}`;
  assistantAnswerTitle.textContent = state.answerTitle;
  assistantAnswerCopy.textContent = state.answerCopy;
  assistantRulesCopy.textContent = state.rules;
  assistantPrompts.innerHTML = state.prompts
    .map(
      (prompt) => `
        <article class="batch-item">
          <strong>${prompt.title}</strong>
          <span>${prompt.detail}</span>
        </article>
      `
    )
    .join("");

  if (!assistantInput.value.trim()) {
    assistantInput.value =
      currentRole === "farmer"
        ? "What does withdrawal mean?"
        : currentRole === "manufacturer"
          ? "Summarize this batch"
          : currentRole === "regulator"
            ? "Summarize this queue"
            : currentRole === "consumer"
              ? "Why is this batch yellow?"
              : "How can I help?";
  }
}

function applyBatch(code) {
  const batch = batches[code];
  if (!batch) {
    scanNote.textContent = "No matching batch found. Try FT-2026-00124, BS-0199, or FT-2026-00488.";
    return;
  }

  activeCode = code;
  scanInput.value = code;
  updateHistoryActive(code);
  applyScreen("consumer");

  title.textContent = batch.title;
  subtitle.textContent = batch.subtitle;
  setChip(batch.chip);
  statusRing.style.background =
    batch.ring === "var(--danger)"
      ? "#ffeaea"
      : batch.ring === "var(--warning)"
        ? "#fff4d9"
        : "#eff6e1";
  statusRing.querySelector(".status-dot").style.background =
    batch.ring === "var(--danger)"
      ? "var(--danger)"
      : batch.ring === "var(--warning)"
        ? "var(--warning)"
        : "var(--accent)";

  farmOrigin.textContent = batch.farmOrigin;
  pesticides.textContent = batch.pesticides;
  drugResidue.textContent = batch.drugResidue;
  qualityChecks.textContent = batch.qualityChecks;
  packaged.textContent = batch.packaged;
  expiry.textContent = batch.expiry;
  recallStatus.textContent = batch.recallStatus;

  alertBanner.style.display = batch.showAlert ? "flex" : "none";
  if (batch.showAlert) {
    alertBanner.querySelector(".alert-title").textContent = batch.alertTitle;
    alertBanner.querySelector(".alert-body").textContent = batch.alertBody;
    alertBanner.querySelector(".alert-tag").textContent = batch.alertTag;
  }

  scanNote.textContent = batch.consumerAction || batch.note;
  addAuditEvent("Batch scanned", `Loaded ${code} in consumer view.`);
  persistState();
}

function applyScreen(key) {
  const screen = screens[key];
  currentTab = key;
  workspace.dataset.tab = key;
  title.textContent = screen.title;
  subtitle.textContent = screen.subtitle;
  statusRing.style.background =
    key === "consumer"
      ? "#eff6e1"
      : key === "regulator"
        ? "#ffeaea"
        : "#edf0ff";
  statusRing.querySelector(".status-dot").style.background = screen.ring;
  setChip(screen.chip);

  farmOrigin.textContent = screen.farmOrigin;
  pesticides.textContent = screen.pesticides;
  drugResidue.textContent = screen.drugResidue;
  qualityChecks.textContent = screen.qualityChecks;
  packaged.textContent = screen.packaged;
  expiry.textContent = screen.expiry;
  recallStatus.textContent = screen.recallStatus;

  alertBanner.style.display = screen.showAlert ? "flex" : "none";
  if (screen.showAlert) {
    alertBanner.querySelector(".alert-title").textContent = screen.alertTitle;
    alertBanner.querySelector(".alert-body").textContent = screen.alertBody;
    alertBanner.querySelector(".alert-tag").textContent = screen.alertTag;
  }

  updateActiveNav(key);
  renderFoodModule();
  renderManufacturerModule();
  renderRegulatorModule();
  renderAssistantModule();
  renderConnectivityModule();
  renderAuditModule();
  persistState();
}

function signIn() {
  const identity = identityInput.value.trim() || "demo@foodtrace.gh";
  const language = languageSelect.value;
  const role = currentRole;
  const roleInfo = roleDefaults[role];

  signedIn = true;
  applyScreen(roleInfo.tab);

  updateAuthStatus(
    `Signed in as ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    `${identity} | ${roleInfo.label} | Language: ${language.toUpperCase()}`
  );

  document.querySelector(".sidebar-card strong").textContent = roleInfo.label;
  document.querySelector(".sidebar-card span").textContent = `${identity}`;
  renderFoodModule();
  renderManufacturerModule();
  renderRegulatorModule();
  renderAssistantModule();
  renderConnectivityModule();
  renderAuditModule();
  addAuditEvent("Signed in", `${identity} used ${roleInfo.label}.`);
  persistState();
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    applyScreen(item.dataset.tab);
    if (!signedIn) {
      updateAuthStatus(
        "Not signed in",
        "You can preview screens, but role-specific access will appear after sign in."
      );
    }
  });
});

historyPills.forEach((pill) => {
  pill.addEventListener("click", () => applyBatch(pill.dataset.code));
});

scanButton.addEventListener("click", () => {
  const code = scanInput.value.trim().toUpperCase();
  applyBatch(code);
  if (batches[code]) {
    updateAuthStatus("Consumer scan loaded", `Batch ${code} is now on screen.`);
  }
});

lookupButton.addEventListener("click", () => {
  const code = scanInput.value.trim().toUpperCase();
  if (!code) {
    scanNote.textContent = "Enter a batch code first, then search it.";
    return;
  }
  applyBatch(code);
});

roleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentRole = button.dataset.role;
    updateRoleButtons(currentRole);
    renderFoodModule();
    renderManufacturerModule();
    renderRegulatorModule();
    renderAssistantModule();
    renderConnectivityModule();
    addAuditEvent("Role selected", `Switched to ${roleDefaults[currentRole].label}.`);
    persistState();

    const roleInfo = roleDefaults[currentRole];
    updateAuthStatus(
      "Role selected",
      `${roleInfo.label} is ready. Request OTP, then sign in.`
    );
  });
});

requestOtpButton.addEventListener("click", () => {
  const target = identityInput.value.trim() || "your phone or email";
  updateAuthStatus("OTP requested", `We would send a 6-digit code to ${target}.`);
  otpInput.value = "";
  addAuditEvent("OTP requested", `Target: ${target}.`);
});

signInButton.addEventListener("click", signIn);

saveInputButton.addEventListener("click", () => {
  const activity = inputTypeSelect.value;
  const name = inputName.value.trim() || "Unnamed input";
  const date = inputDate.value || new Date().toISOString().slice(0, 10);
  const note = inputNotes.value.trim();

  if (!isOnline) {
    queueOfflineAction(
      "Farm input queued",
      `${name} (${activity}) stored locally on ${date}. ${note || "No extra notes."}`
    );
    updateAuthStatus(
      "Saved offline",
      `${name} is stored locally and will sync when the connection returns.`
    );
    return;
  }

  withdrawalCheck.textContent =
    activity === "pesticide" ? "Withdrawal date updated" : "Input logged";
  marketReady.textContent = activity === "pesticide" ? "Updated from log" : "In progress";
  cycleStage.textContent = activity === "pesticide" ? "Safety window refreshed" : "Input recorded";

  updateAuthStatus(
    "Food input saved",
    `${name} logged for ${inputTypeSelect.value} on ${date}. ${note || "No extra notes."}`
  );
  addAuditEvent("Food input saved", `${name} on ${date}.`);
  renderFoodModule();
  persistState();
});

withdrawalButton.addEventListener("click", () => {
  const date = inputDate.value || new Date().toISOString().slice(0, 10);
  updateAuthStatus("Withdrawal checked", `Safe harvest date reviewed using the current crop cycle and ${date}.`);
  withdrawalCheck.textContent = "Check complete";
  addAuditEvent("Withdrawal checked", `Reviewed using ${date}.`);
  persistState();
});

saveBatchButton.addEventListener("click", () => {
  const product = batchProductName.value.trim() || "Untitled product";
  const code = batchNumber.value.trim() || "NEW-BATCH";
  const source = batchSource.value.trim() || "Cleared ingredient source";
  const expiryDate = batchExpiry.value || new Date().toISOString().slice(0, 10);

  if (!isOnline) {
    queueOfflineAction(
      "Batch draft queued",
      `${product} (${code}) stored locally until sync returns.`
    );
    updateAuthStatus("Saved offline", `${product} is waiting to sync from local storage.`);
    return;
  }

  manufacturerModuleTitle.textContent = "Batch saved";
  manufacturerModuleSubtitle.textContent = `${product} has been added to the batch workspace.`;
  qrLabelTitle.textContent = "Batch saved";
  qrLabelCopy.textContent = `${product} (${code}) is ready for QR generation once the record is fully complete.`;
  batchCountChip.textContent = "Draft saved";
  recallChip.textContent = "Monitoring";
  recallCopy.textContent = `Source: ${source}. Expiry: ${expiryDate}. Recall controls remain available.`;

  addAuditEvent("Batch saved", `${product} (${code}).`);
  updateAuthStatus("Batch saved", `${product} · ${code} · Source: ${source}`);
  persistState();
});

generateQrButton.addEventListener("click", () => {
  const product = batchProductName.value.trim() || "Untitled product";
  const code = batchNumber.value.trim() || "NEW-BATCH";

  qrLabelTitle.textContent = "QR ready";
  qrLabelCopy.textContent = `The QR label for ${product} (${code}) is ready for print and scan.`;
  batchCountChip.textContent = "QR generated";
  recallChip.textContent = "Broadcast ready";
  recallCopy.textContent = "If a recall is issued, all scans will reflect the new status immediately.";

  addAuditEvent("QR generated", `${product} (${code}).`);
  updateAuthStatus("QR generated", `${product} · ${code} is now tied to the batch record.`);
  persistState();
});

toggleConnectivityButton.addEventListener("click", () => {
  isOnline = !isOnline;
  updateAuthStatus(
    isOnline ? "Connection restored" : "Offline mode enabled",
    isOnline
      ? "You can sync queued actions or continue online."
      : "New actions will be queued locally until sync returns."
  );
  renderConnectivityModule();
  addAuditEvent("Connectivity changed", isOnline ? "Switched to online mode." : "Switched to offline mode.");
  persistState();
});

queueDemoButton.addEventListener("click", () => {
  queueOfflineAction(
    "Demo offline item",
    `Example ${offlineQueue.length + 1} captured while the app is in ${isOnline ? "online" : "offline"} mode.`
  );
  if (isOnline) {
    updateAuthStatus("Offline queue demo", "This item shows how the app would store work locally.");
  }
  addAuditEvent("Offline demo added", "Created a sample queued item.");
  persistState();
});

sendSmsButton.addEventListener("click", () => {
  const message = getCurrentSmsMessage();
  addSmsHistory(isOnline ? "SMS preview sent" : "SMS preview queued", message, isOnline);
  updateAuthStatus(isOnline ? "SMS preview sent" : "SMS preview queued", message);
  addAuditEvent("SMS preview", message);
  persistState();
});

syncNowButton.addEventListener("click", () => {
  if (offlineQueue.length === 0 && isOnline) {
    updateAuthStatus("Already synced", "There are no queued items waiting.");
    renderConnectivityModule();
    return;
  }

  if (!isOnline) {
    isOnline = true;
  }

  if (offlineQueue.length) {
    const count = offlineQueue.length;
    offlineQueue = [];
    addSmsHistory("Sync completed", `${count} queued item(s) were sent from local storage.`, true);
    updateAuthStatus("Sync complete", `${count} queued item(s) moved from local storage.`);
    addAuditEvent("Sync completed", `${count} queued item(s) flushed.`);
  } else {
    updateAuthStatus("Connection online", "No queued items were waiting to sync.");
    addAuditEvent("Sync checked", "No queued items were waiting.");
  }

  renderConnectivityModule();
  persistState();
});

regList.addEventListener("click", (event) => {
  const card = event.target.closest(".batch-item");
  if (!card) return;
  updateAuthStatus("Review opened", `${card.querySelector("strong").textContent} is now in the regulator review queue.`);
});

function generateAssistantAnswer(question) {
  const text = question.trim().toLowerCase();

  if (!text) {
    return {
      title: "Ask something first",
      answer: "Type a question and I will explain the scan, suggest ingredients, or give general sourcing guidance in plain language.",
    };
  }

  if (text.includes("yellow") || text.includes("caution")) {
    return {
      title: "Why it is yellow",
      answer:
        "Yellow means the record is not fully clear yet. It could be waiting on verification, review, or a missing detail.",
    };
  }

  if (text.includes("withdraw")) {
    return {
      title: "Withdrawal period",
      answer:
        "Withdrawal period is the waiting time after using a pesticide or drug before the product can be safely harvested or sold.",
    };
  }

  if (text.includes("recall")) {
    return {
      title: "Recall summary",
      answer:
        "A recall means the product should be removed or avoided because a confirmed risk was found. The scan state should turn red.",
    };
  }

  if (text.includes("ingredient") || text.includes("ingredients") || text.includes("need")) {
    return {
      title: "Ingredient ideas",
      answer:
        "A useful first draft is to list the main item, a base, a seasoning group, and a finishing ingredient. For example: tomatoes, onions, pepper, oil, salt, and stock for a simple sauce. If you want, I can suggest a fuller ingredient list for a specific dish or food product.",
    };
  }

  if (text.includes("where can i get") || text.includes("where do i get") || text.includes("where to buy") || text.includes("source") || text.includes("supplier")) {
    return {
      title: "General sourcing guidance",
      answer:
        "I cannot check live store inventory here, but I can suggest the usual places to look: local markets for fresh produce, wholesalers for bulk items, supermarkets for packaged goods, and farms or cooperatives for direct sourcing. If you name the item, I can help you narrow the best source type.",
    };
  }

  if (text.includes("replace") || text.includes("substitut") || text.includes("swap")) {
    return {
      title: "Substitution ideas",
      answer:
        "I can suggest common substitutions based on the role of the ingredient. For example, onions add sweetness and aroma, tomatoes add acidity and body, and oil adds richness. If you tell me the item you want to replace, I can suggest a practical swap.",
    };
  }

  if (text.includes("batch") || text.includes("summar")) {
    return {
      title: "Batch summary",
      answer:
        "The batch record combines ingredients, checks, and traceability details so regulators and consumers can review it quickly.",
    };
  }

  if (text.includes("green")) {
    return {
      title: "Green status",
      answer:
        "Green means the current record is verified safe under the rules engine and has no active recall flag.",
    };
  }

  if (text.includes("cook") || text.includes("recipe") || text.includes("meal")) {
    return {
      title: "Meal planning help",
      answer:
        "I can help outline a simple recipe by grouping ingredients into base, protein, seasoning, and finishing items. If you tell me the dish, I will suggest a clean ingredient list and a simple prep order.",
    };
  }

  return {
    title: "Plain-language help",
    answer:
      "FoodTrace AI can explain the current status, help with logging, summarize a report, suggest ingredients, and give general sourcing guidance. The safety decision still comes from the rules engine.",
  };
}

function askAssistant() {
  const question = assistantInput.value;
  const response = generateAssistantAnswer(question);
  assistantAnswerTitle.textContent = response.title;
  assistantAnswerCopy.textContent = response.answer;
  updateAuthStatus("AI asked", response.title);
  addAuditEvent("AI asked", response.title);
  persistState();
}

assistantInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    askAssistant();
  }
});

languageSelect.addEventListener("change", () => {
  const roleInfo = roleDefaults[currentRole];
  const selected = languageSelect.value.toUpperCase();

  if (signedIn) {
    updateAuthStatus(
      `Signed in as ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}`,
      `${identityInput.value.trim() || "demo@foodtrace.gh"} | ${roleInfo.label} | Language: ${selected}`
    );
  } else {
    updateAuthStatus("Language selected", `Preferred language set to ${selected}.`);
  }
  persistState();
});

restoreSavedValues();
updateRoleButtons(currentRole);
if (signedIn) {
  updateAuthStatus(
    `Signed in as ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}`,
    `${identityInput.value.trim() || "demo@foodtrace.gh"} | ${roleDefaults[currentRole].label} | Language: ${(languageSelect.value || "en").toUpperCase()}`
  );
  document.querySelector(".sidebar-card strong").textContent = roleDefaults[currentRole].label;
  document.querySelector(".sidebar-card span").textContent = `${identityInput.value.trim() || "demo@foodtrace.gh"}`;
} else {
  updateAuthStatus("Not signed in", "Access is limited until a role is selected and verified.");
}
applyScreen(currentTab);
if (currentTab === "consumer") {
  applyBatch(activeCode);
}
renderFoodModule();
renderManufacturerModule();
renderRegulatorModule();
renderAssistantModule();
renderConnectivityModule();
persistState();


