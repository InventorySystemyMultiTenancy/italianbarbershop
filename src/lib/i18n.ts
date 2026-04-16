import { API_BASE_URL, hasApiBaseUrl } from "@/lib/api";

export type TranslationEntries = Record<string, string>;
export type Translations = Record<string, string>;

interface TranslateRequestBody {
  provider: string;
  source: "pt";
  target: string;
  entries: TranslationEntries;
}

interface TranslateApiResponse {
  translations?: Translations;
  data?: {
    translations?: Translations;
  };
}

export async function translateEntries(
  targetLanguage: string,
  entries: TranslationEntries,
  provider = "libretranslate",
): Promise<Translations> {
  const safeTarget = String(targetLanguage || "").trim().toLowerCase();
  if (!safeTarget) {
    throw new Error("Idioma alvo e obrigatorio para traducao.");
  }

  if (!hasApiBaseUrl) {
    throw new Error("URL da API nao configurada.");
  }

  const payload: TranslateRequestBody = {
    provider,
    source: "pt",
    target: safeTarget,
    entries,
  };

  const response = await fetch(`${API_BASE_URL}/api/i18n/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Falha ao traduzir interface (status ${response.status}).`);
  }

  const body = (await response.json().catch(() => null)) as TranslateApiResponse | null;
  const translations = body?.translations || body?.data?.translations || {};

  if (!translations || typeof translations !== "object") {
    return {};
  }

  return translations;
}

export function t(translations: Translations, key: string, fallback: string) {
  const translated = translations[key];
  if (typeof translated === "string" && translated.trim().length > 0) {
    return translated;
  }
  return fallback;
}
