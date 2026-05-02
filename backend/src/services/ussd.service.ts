import type { UssdRequest, UssdResponse } from "@foodtrace/shared";
import { lookupDrugProduct, lookupFoodProduct, logFarmerPesticideInput } from "./traceability.service";

function formatMainMenu() {
  return [
    "CON FoodTrace GH",
    "1. Check food product safety",
    "2. Check drug / medicine",
    "3. Log pesticide (farmers only)",
    "4. About FoodTrace GH",
  ].join("\n");
}

function normalizeDateInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export async function handleUssdCallback(request: UssdRequest): Promise<UssdResponse> {
  const text = request.text?.trim() ?? "";
  if (!text) {
    return { response: formatMainMenu() };
  }

  const parts = text.split("*").map((part) => part.trim()).filter(Boolean);
  const [choice] = parts;

  if (choice === "1") {
    const code = parts[1];
    if (!code) {
      return { response: "CON Enter the 8-digit batch number printed on the product:" };
    }

    const lookup = await lookupFoodProduct(code);
    return { response: `END ${lookup.plainText}` };
  }

  if (choice === "2") {
    const code = parts[1];
    if (!code) {
      return { response: "CON Enter the 8-digit drug batch number on the packaging:" };
    }

    const lookup = await lookupDrugProduct(code);
    return { response: `END ${lookup.plainText}` };
  }

  if (choice === "3") {
    if (parts.length === 1) {
      return { response: "CON Enter your FoodTrace Farmer ID:" };
    }

    if (parts.length === 2) {
      return { response: "CON Enter pesticide name:" };
    }

    if (parts.length === 3) {
      return { response: "CON Enter crop type:" };
    }

    if (parts.length >= 5) {
      const farmerId = parts[1];
      const pesticideName = parts[2];
      const cropType = parts[3];
      const applicationDate = normalizeDateInput(parts[4] ?? "");

      if (!applicationDate) {
        return { response: "END Invalid date. Use DDMMYYYY." };
      }

      const outcome = await logFarmerPesticideInput({
        farmerId,
        pesticideName,
        cropType,
        applicationDate,
      });

      if (!outcome.ok) {
        return { response: `END ${outcome.message}` };
      }

      const warning = outcome.warning ? `${outcome.warning}\n` : "";
      return {
        response: `END ${warning}Logged. Safe harvest date: ${outcome.safeHarvestDate}. Do not sell before this date.`,
      };
    }
  }

  if (choice === "4") {
    return {
      response:
        "END FoodTrace GH helps check food and drug safety, track farming inputs, and support public health through QR scanning and traceability.",
    };
  }

  return { response: "END Invalid choice. Dial again to try the menu." };
}
