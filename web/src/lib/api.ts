export function resolveApiBase(): string {
  const configured = (import.meta as any).env?.VITE_API_BASE_URL?.trim();
  if (configured) return configured;
  if (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost") {
    return `${window.location.origin}/api`;
  }
  return "http://localhost:3000/api";
}

export const apiBase = resolveApiBase();
export const showDemoMode = (import.meta as any).env?.VITE_SHOW_DEMO_MODE === "true";
export const enableDrugModule = (import.meta as any).env?.VITE_ENABLE_DRUG_MODULE === "true";
export const apiRoot = apiBase.replace(/\/api\/?$/, "");

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "The server returned an empty response."
        : `The server returned ${response.status} ${response.statusText || "without details"}. Check the API URL and backend logs.`
    );
  }
  try {
    const data = JSON.parse(text) as T & { error?: unknown; message?: unknown; detail?: unknown; title?: unknown };
    if (!response.ok) {
      const message = [data.error, data.message, data.detail, data.title].find((v) => typeof v === "string");
      throw new Error(typeof message === "string" ? message : `Request failed with status ${response.status}.`);
    }
    return data;
  } catch (error) {
    if (error instanceof Error && !error.message.includes("Unexpected")) throw error;
    throw new Error(`The server returned a response the app could not read. Status: ${response.status}.`);
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const f = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const fieldMessage = f.fieldErrors ? Object.values(f.fieldErrors).flat()[0] : undefined;
    return fieldMessage ?? f.formErrors?.[0] ?? fallback;
  }
  return fallback;
}

export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TypeError) {
    return "Could not reach FoodTrace right now. Check your internet connection or try again shortly.";
  }
  return error instanceof Error ? error.message : fallback;
}

export function resolveAssetUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiRoot}${url.startsWith("/") ? url : `/${url}`}`;
}
