import type { UserRole } from "@foodtrace/shared";

export const demoPassword = "Password123!";
export const sampleCodes = ["FT-QR-1001", "FT-QR-2002", "FT-QR-4004"];

export const demoAccounts: Array<{ role: UserRole; name: string; email: string; purpose: string }> = [
  { role: "consumer", name: "Demo Consumer", email: "consumer@foodtrace.gh", purpose: "Scan food, scan medicine, submit reports" },
  { role: "farmer", name: "Kwame Asante", email: "kwame.asante@foodtrace.gh", purpose: "Show farm, crops, pesticide input, safe harvest date" },
  { role: "manufacturer", name: "Accra Foods Admin", email: "accra.foods@foodtrace.gh", purpose: "Show batches, QR codes, manufacturer recall" },
  { role: "pharmacist", name: "Kumasi Central Pharmacist", email: "kumasi.pharmacy@foodtrace.gh", purpose: "Show drug batches, pharmacy dashboard, drug QR flow" },
  { role: "regulator", name: "FDA Regulator", email: "regulator@foodtrace.gh", purpose: "Show compliance overview, alerts, reports, recalls" },
];

export const demoFoodCodes = [
  { code: "FT-QR-1001", label: "Safe food", detail: "Accra Foods Tomato Paste 400g" },
  { code: "FT-QR-2002", label: "Safe drink", detail: "GoldCoast Sobolo Drink 500ml" },
  { code: "FT-QR-4004", label: "Recalled food", detail: "GoldCoast Sobolo Drink 500ml - RECALLED" },
];

export const demoDrugCodes = [
  { code: "DR-QR-1001", label: "OTC drug", detail: "Paracetamol 500mg" },
  { code: "DR-QR-2002", label: "Prescription drug", detail: "Artesunate 50mg" },
  { code: "DR-QR-4004", label: "Banned/recalled drug", detail: "Fake Chloroquine" },
];
