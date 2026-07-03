import { useMemo, useState } from "react";
import { USER_ROLES, type AuthResponse, type DrugScanResult, type ProductScanResult, type UserRole } from "@foodtrace/shared";
import { apiBase, enableDrugModule, getFriendlyErrorMessage, readJsonResponse, showDemoMode } from "./lib/api";
import { styles } from "./lib/styles";
import { demoPassword } from "./lib/constants";
import { AuthCard } from "./components/AuthCard";
import { DemoPanel } from "./components/DemoPanel";
import { ConsumerScanSection } from "./components/ConsumerScanSection";
import { FarmerSection } from "./components/FarmerSection";
import { ManufacturerSection } from "./components/ManufacturerSection";
import { RegulatorSection } from "./components/RegulatorSection";
import { DrugSection } from "./components/DrugSection";
import { MarketplaceSection } from "./components/MarketplaceSection";
import { AiAssistantSection } from "./components/AiAssistantSection";

function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [role, setRole] = useState<UserRole>("consumer");
  const [scanCode, setScanCode] = useState("FT-QR-1001");
  const [scanResult, setScanResult] = useState<ProductScanResult | null>(null);
  const [scanStatus, setScanStatus] = useState("Ready to scan");
  const [scanLoading, setScanLoading] = useState(false);
  const [drugScanCode, setDrugScanCode] = useState("DR-QR-1001");
  const [drugScanResult, setDrugScanResult] = useState<DrugScanResult | null>(null);
  const [drugScanStatus, setDrugScanStatus] = useState("Drug scan ready");

  const roleList = useMemo(() => (enableDrugModule ? USER_ROLES : USER_ROLES.filter((r) => r !== "pharmacist")), []);
  const currentRole = session?.user.role ?? null;
  const isFarmer = currentRole === "farmer";
  const isManufacturer = currentRole === "manufacturer";
  const isRegulator = currentRole === "regulator";
  const isPharmacist = currentRole === "pharmacist";
  const canUseConsumerScan = !session || currentRole === "consumer" || isPharmacist;

  async function scanProduct(code = scanCode) {
    const normalized = code.trim();
    if (!normalized) { setScanStatus("Enter a batch code first."); return; }
    setScanLoading(true);
    setScanStatus("Looking up product...");
    try {
      const response = await fetch(`${apiBase}/scan/${encodeURIComponent(normalized)}`, {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      });
      const data = (await readJsonResponse(response)) as { result: ProductScanResult };
      setScanResult(data.result);
      setScanStatus(`Scan complete: ${data.result.status}`);
    } catch (error) {
      setScanStatus(getFriendlyErrorMessage(error, "Scan failed"));
    } finally {
      setScanLoading(false);
    }
  }

  async function scanDrug(code = drugScanCode) {
    const normalized = code.trim();
    if (!normalized) { setDrugScanStatus("Enter a drug QR code first."); return; }
    setDrugScanStatus("Looking up drug...");
    try {
      const response = await fetch(`${apiBase}/drug/scan/${encodeURIComponent(normalized)}`);
      const data = (await readJsonResponse(response)) as { result: DrugScanResult; error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not scan drug");
      setDrugScanResult(data.result);
      setDrugScanStatus(`Scan complete: ${data.result.status}`);
    } catch (error) {
      setDrugScanStatus(error instanceof Error ? error.message : "Drug scan failed");
    }
  }

  function handleUseDemoAccount(account: { role: UserRole; email: string; name: string; purpose: string }) {
    setRole(account.role);
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.kicker}>FoodTrace GH</p>
        <h1 style={styles.title}>Scan It. Trace It. Trust It.</h1>
        <p style={styles.body}>
          FoodTrace GH connects consumers, farmers, manufacturers, and FDA regulators in one traceability platform for safer local food.
        </p>
        {!session ? (
          <div style={styles.foodButtons}>
            <span style={{ ...styles.primaryButton, pointerEvents: "none", opacity: 0.5 }}>Log in</span>
            <span style={{ ...styles.sampleButton, pointerEvents: "none", opacity: 0.5 }}>Create account</span>
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

      <AuthCard
        session={session}
        role={role}
        setRole={setRole}
        roleList={roleList}
        onSignIn={setSession}
        onSignOut={() => setSession(null)}
      />

      {session ? <MarketplaceSection session={session} /> : null}

      {showDemoMode ? (
        <DemoPanel
          onScanFood={(code) => { setScanCode(code); void scanProduct(code); }}
          onScanDrug={(code) => { setDrugScanCode(code); void scanDrug(code); }}
          onUseDemoAccount={handleUseDemoAccount}
        />
      ) : null}

      {canUseConsumerScan ? (
        <ConsumerScanSection
          session={session}
          scanCode={scanCode}
          setScanCode={setScanCode}
          scanResult={scanResult}
          scanLoading={scanLoading}
          scanStatus={scanStatus}
          onScan={() => void scanProduct()}
        />
      ) : null}

      {isFarmer ? <FarmerSection session={session!} /> : null}
      {isManufacturer ? <ManufacturerSection session={session!} /> : null}
      {isRegulator ? <RegulatorSection session={session!} /> : null}

      {enableDrugModule && (canUseConsumerScan || isPharmacist) ? (
        <DrugSection
          session={session}
          isPharmacist={isPharmacist}
          drugScanCode={drugScanCode}
          setDrugScanCode={setDrugScanCode}
          drugScanResult={drugScanResult}
          drugScanStatus={drugScanStatus}
          onScanDrug={() => void scanDrug()}
        />
      ) : null}

      <AiAssistantSection />
    </main>
  );
}

export default App;
