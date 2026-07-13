import { useEffect, useState } from "react";
import type {
  AuthResponse,
  CreateCropCycleRequest,
  CreateFarmRequest,
  CreateInputLogRequest,
  FoodDashboardResponse,
  OfflineSyncRequest,
  WeatherResponse,
} from "@foodtrace/shared";
import { apiBase, readJsonResponse } from "../lib/api";
import { styles } from "../lib/styles";

interface Props {
  session: AuthResponse;
}

export function FarmerSection({ session }: Props) {
  const [foodDashboard, setFoodDashboard] = useState<FoodDashboardResponse | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [foodStatus, setFoodStatus] = useState("Food module ready");
  const [farmerStatus, setFarmerStatus] = useState("Farmer portal ready");
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

  useEffect(() => { void loadFoodDashboard(); }, []);

  async function loadFoodDashboard() {
    setFoodStatus("Loading food dashboard...");
    try {
      const response = await fetch(`${apiBase}/food/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await readJsonResponse(response)) as { dashboard: FoodDashboardResponse; error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load dashboard");

      setFoodDashboard(data.dashboard);
      setFoodStatus("Food dashboard loaded.");
      if (!cycleFarmId && data.dashboard.farms[0]?.id) setCycleFarmId(data.dashboard.farms[0].id);
      if (!inputCycleId && data.dashboard.cropCycles[0]?.id) setInputCycleId(data.dashboard.cropCycles[0].id);
      void loadWeather(data.dashboard.farms[0]?.region);
    } catch (error) {
      setFoodStatus(error instanceof Error ? error.message : "Could not load dashboard");
    }
  }

  async function loadWeather(region?: string) {
    try {
      const qs = region ? `?region=${encodeURIComponent(region)}` : "";
      const response = await fetch(`${apiBase}/food/weather${qs}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!response.ok) return;
      const data = (await readJsonResponse(response)) as WeatherResponse;
      setWeather(data);
    } catch {
      // weather is a nice-to-have — dashboard still works without it
    }
  }

  async function createFarm() {
    const payload: CreateFarmRequest = {
      name: farmName,
      district: farmDistrict,
      region: farmRegion,
      cropTypes: farmCrops.split(",").map((s) => s.trim()).filter(Boolean),
    };
    setFoodStatus("Creating farm...");
    const response = await fetch(`${apiBase}/food/farms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create farm");
    await loadFoodDashboard();
  }

  async function createCropCycle() {
    const payload: CreateCropCycleRequest = { farmId: cycleFarmId, cropType: cycleCropType, plantingDate: cyclePlantingDate };
    setFoodStatus("Creating crop cycle...");
    const response = await fetch(`${apiBase}/food/crop-cycles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create crop cycle");
    await loadFoodDashboard();
  }

  async function createInputLog() {
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save input log");
    await loadFoodDashboard();
  }

  async function markMarketReady() {
    const response = await fetch(`${apiBase}/food/crop-cycles/market-ready`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ cropCycleId: marketReadyCycleId, marketReady: marketReadyValue }),
    });
    const data = (await readJsonResponse(response)) as { error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not update market-ready flag");
    await loadFoodDashboard();
  }

  async function syncOfflineQueue() {
    const payload = JSON.parse(offlineQueue) as OfflineSyncRequest;
    const response = await fetch(`${apiBase}/food/offline-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(payload),
    });
    const data = (await readJsonResponse(response)) as { results?: unknown; error?: unknown };
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not sync offline queue");
    setFoodStatus(`Offline queue synced: ${JSON.stringify(data.results)}`);
    await loadFoodDashboard();
  }

  return (
    <section style={styles.foodCard}>
      <p style={styles.scanKicker}>Food module</p>
      <h2 style={styles.scanTitle}>Farmer portal and input logging.</h2>
      <p style={styles.scanBody}>
        Create a farm, start a crop cycle, log a pesticide or fertilizer input, cross-check EPA status, and watch withdrawal timing.
      </p>
      <div style={styles.foodButtons}>
        <button type="button" style={styles.primaryButton} onClick={() => void loadFoodDashboard()}>Load food dashboard</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createFarm()}>Create farm</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createCropCycle()}>Create crop cycle</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createInputLog()}>Log input</button>
        <button type="button" style={styles.sampleButton} onClick={() => void markMarketReady()}>Mark ready</button>
        <button type="button" style={styles.sampleButton} onClick={() => void syncOfflineQueue()}>Sync offline</button>
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
      {weather ? (
        <article style={styles.weatherCard}>
          <p style={styles.scanKicker}>{weather.region} · Weather</p>
          <div style={styles.weatherNow}>
            <div>
              <p style={styles.weatherTemp}>{Math.round(weather.current.temperatureC)}°C</p>
              <p style={styles.weatherCondition}>{weather.current.condition}</p>
            </div>
            <div style={styles.weatherStatsCol}>
              <span>Humidity {Math.round(weather.current.humidityPercent)}%</span>
              <span>Wind {Math.round(weather.current.windSpeedKmh)} km/h</span>
              <span>Rain {weather.current.precipitationMm} mm</span>
            </div>
          </div>
          <div style={styles.weatherForecastRow}>
            {weather.forecast.time.map((day, i) => (
              <div key={day} style={styles.weatherDayTile}>
                <p style={styles.weatherDayLabel}>
                  {i === 0 ? "Today" : new Date(day).toLocaleDateString("en-GB", { weekday: "short" })}
                </p>
                <p style={styles.weatherDayTemp}>
                  {Math.round(weather.forecast.temperature_2m_max[i])}°/{Math.round(weather.forecast.temperature_2m_min[i])}°
                </p>
                <p style={styles.weatherDayRain}>{weather.forecast.precipitation_probability_max[i]}% rain</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
