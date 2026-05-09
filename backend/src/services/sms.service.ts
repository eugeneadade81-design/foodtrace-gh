import type { SmsRequest, SmsResponse } from "@foodtrace/shared";
import { logFarmInputByPhone } from "./traceability.service";
import { lookupDrugProduct, lookupFoodProduct } from "./traceability.service";

function parsePesticideMessage(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^PESTICIDE\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const parts = match[1].trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) {
    return null;
  }

  const dateToken = parts[parts.length - 1];
  const cropType = parts[parts.length - 2];
  const pesticideName = parts.slice(0, -2).join(" ");
  return { pesticideName, cropType, dateToken };
}

function normalizeDateInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) {
    return null;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export async function handleSmsCallback(request: SmsRequest): Promise<SmsResponse> {
  const trimmed = request.text.trim();
  const directCode = trimmed.replace(/^CHECK\s+/i, "").trim().toUpperCase();
  if (/^FT-QR-[A-Z0-9-]+$/.test(directCode)) {
    const lookup = await lookupFoodProduct(directCode);
    return { response: lookup.found ? lookup.plainText ?? lookup.result.summary : lookup.result.summary };
  }

  if (/^DR-QR-[A-Z0-9-]+$/.test(directCode)) {
    const lookup = await lookupDrugProduct(directCode);
    return { response: lookup.found ? lookup.plainText ?? lookup.result.summary : lookup.result.summary };
  }

  const parsed = parsePesticideMessage(request.text);
  if (!parsed) {
    return {
      response: "Format: PESTICIDE [name] [crop] [date DDMMYYYY]. Example: PESTICIDE Aldrin Maize 20042026",
    };
  }

  const applicationDate = normalizeDateInput(parsed.dateToken);
  if (!applicationDate) {
    return { response: "Format: PESTICIDE [name] [crop] [date DDMMYYYY]. Example: PESTICIDE Aldrin Maize 20042026" };
  }

  const outcome = await logFarmInputByPhone({
    phoneNumber: request.from,
    pesticideName: parsed.pesticideName,
    cropType: parsed.cropType,
    applicationDate,
  });

  if (!outcome.ok) {
    return { response: outcome.message };
  }

  const warning = outcome.warning ? `${outcome.warning} ` : "";
  return {
    response: `${warning}Logged for ${outcome.cropType}. Safe harvest date: ${outcome.safeHarvestDate}. FoodTrace GH.`,
  };
}
