import { useMemo, useState } from "react";
import type { AuthResponse, UserRole } from "@foodtrace/shared";
import { apiBase, readJsonResponse, getApiErrorMessage, getFriendlyErrorMessage } from "../lib/api";
import { styles } from "../lib/styles";

type Mode = "login" | "register";

interface Props {
  session: AuthResponse | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleList: UserRole[];
  onSignIn: (session: AuthResponse) => void;
  onSignOut: () => void;
}

export function AuthCard({ session, role, setRole, roleList, onSignIn, onSignOut }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState("Ready");

  const displayName = session?.user.fullName || session?.user.email || session?.user.phone || "Account";
  const avatarLabel = useMemo(() => {
    const raw = (session?.user.fullName || session?.user.email || session?.user.phone || "").trim();
    if (!raw) return "FT";
    const parts = raw.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("") || "FT";
  }, [session?.user.email, session?.user.fullName, session?.user.phone]);

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
      const data = (await readJsonResponse(response)) as AuthResponse & { error?: unknown };
      if (!response.ok) throw new Error(getApiErrorMessage(data.error, "Authentication failed"));

      onSignIn(data);
      setStatus(`Signed in as ${data.user.role}. Opening your portal...`);
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, "Authentication failed"));
    }
  }

  if (session) {
    return (
      <section style={styles.card}>
        <div style={styles.signedIn}>
          <div style={styles.userRow}>
            <div style={styles.avatar}>{avatarLabel}</div>
            <div style={styles.userMeta}>
              <p style={styles.userName}>{displayName}</p>
              <p style={styles.userSub}>{session.user.role}</p>
            </div>
            <button type="button" onClick={onSignOut} style={styles.secondaryButton}>
              Log out
            </button>
          </div>
          <p style={styles.status}>{status}</p>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.card}>
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
          <label style={styles.label}>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>Email<input value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={styles.input}>
              {roleList.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label style={styles.label}>Language<input value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.input} /></label>
          <button type="button" onClick={submit} style={styles.primaryButton}>Create account</button>
        </div>
      ) : (
        <div style={styles.form}>
          <label style={styles.label}>Phone or email<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} /></label>
          <button type="button" onClick={submit} style={styles.primaryButton}>Log in</button>
        </div>
      )}

      <p style={styles.status}>{status}</p>
    </section>
  );
}
