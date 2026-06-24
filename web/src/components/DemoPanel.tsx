import { styles } from "../lib/styles";
import { demoAccounts, demoFoodCodes, demoDrugCodes, demoPassword } from "../lib/constants";
import { enableDrugModule } from "../lib/api";
import type { AuthResponse, UserRole } from "@foodtrace/shared";

interface Props {
  onScanFood: (code: string) => void;
  onScanDrug: (code: string) => void;
  onUseDemoAccount: (account: { role: UserRole; name: string; email: string; purpose: string }) => void;
}

export function DemoPanel({ onScanFood, onScanDrug, onUseDemoAccount }: Props) {
  const visibleAccounts = enableDrugModule ? demoAccounts : demoAccounts.filter((a) => a.role !== "pharmacist");

  return (
    <section style={styles.demoCard}>
      <div style={styles.demoHeader}>
        <div>
          <p style={styles.scanKicker}>Demo mode</p>
          <h2 style={styles.demoTitle}>Presentation shortcuts</h2>
        </div>
        <span style={styles.demoPassword}>Password: {demoPassword}</span>
      </div>
      <div style={styles.demoGrid}>
        {visibleAccounts.map((account) => (
          <article key={account.email} style={styles.demoItem}>
            <div>
              <p style={styles.demoName}>{account.name}</p>
              <p style={styles.demoMeta}>{account.role} | {account.email}</p>
              <p style={styles.demoPurpose}>{account.purpose}</p>
            </div>
            <button type="button" style={styles.sampleButton} onClick={() => onUseDemoAccount(account)}>
              Use login
            </button>
          </article>
        ))}
      </div>
      <div style={styles.demoCodeGrid}>
        <div>
          <h3 style={styles.demoSubTitle}>Food QR codes</h3>
          <div style={styles.sampleRow}>
            {demoFoodCodes.map((item) => (
              <button key={item.code} type="button" style={styles.demoCodeButton} onClick={() => onScanFood(item.code)}>
                <strong>{item.code}</strong>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 style={styles.demoSubTitle}>Drug QR codes</h3>
          <div style={styles.sampleRow}>
            {demoDrugCodes.map((item) => (
              <button key={item.code} type="button" style={styles.demoCodeButton} onClick={() => onScanDrug(item.code)}>
                <strong>{item.code}</strong>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
