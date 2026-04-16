import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "date-fns";
import {
  arSA,
  it as itLocale,
  ptBR,
  enGB,
  es as esLocale,
} from "date-fns/locale";
import {
  createAdminSiteLanguage,
  getSiteLanguages,
  type CreateSiteLanguagePayload,
  type SiteLanguage,
} from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";
import {
  UI_TRANSLATION_ENTRIES_PT,
  UI_TRANSLATION_ENTRIES_IT,
  UI_TRANSLATION_ENTRIES_EN,
  UI_TRANSLATION_ENTRIES_ES,
} from "@/lib/i18nEntries";
import type { Translations } from "@/lib/i18n";

export type AppLanguage = string;

export interface AvailableLanguage {
  code: string;
  name: string;
  countryCode: string;
  flag: string;
  enabled: boolean;
}

interface AddLanguageInput {
  code: string;
  name: string;
  countryCode: string;
  flag?: string;
}

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  availableLanguages: AvailableLanguage[];
  selectedLanguage: AvailableLanguage;
  addLanguage: (language: AddLanguageInput) => Promise<AvailableLanguage>;
  reloadLanguages: () => Promise<void>;
  addingLanguage: boolean;
  dateFnsLocale: Locale;
  currencyLocale: string;
  translations: Translations;
  i18nLoading: boolean;
  i18nError: string | null;
  t: (key: string, fallback: string) => string;
}

const LANGUAGE_LIST_STORAGE_KEY = "app-language-list";

const DEFAULT_LANGUAGES: AvailableLanguage[] = [
  {
    code: "pt",
    name: "Português",
    countryCode: "PT",
    flag: "🇵🇹",
    enabled: true,
  },
  {
    code: "it",
    name: "Italiano",
    countryCode: "IT",
    flag: "🇮🇹",
    enabled: true,
  },
  { code: "en", name: "English", countryCode: "GB", flag: "🇬🇧", enabled: true },
  { code: "es", name: "Español", countryCode: "ES", flag: "🇪🇸", enabled: true },
  {
    code: "ma",
    name: "Maroquino (Darija)",
    countryCode: "MA",
    flag: "🇲🇦",
    enabled: true,
  },
];

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

function toFlagEmoji(countryCode: string) {
  const safe = String(countryCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(safe)) return "🌐";
  const codePoints = [...safe].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function normalizeLanguage(
  raw: Partial<AvailableLanguage>,
): AvailableLanguage | null {
  const code = String(raw.code || "")
    .trim()
    .toLowerCase();
  const name = String(raw.name || "").trim();
  const countryCode = String(raw.countryCode || "")
    .trim()
    .toUpperCase();
  const enabled = raw.enabled ?? true;

  if (!code || !name || !countryCode) return null;
  return {
    code,
    name,
    countryCode,
    flag: String(raw.flag || "").trim() || toFlagEmoji(countryCode),
    enabled,
  };
}

function fromApiLanguage(raw: SiteLanguage): AvailableLanguage | null {
  return normalizeLanguage({
    code: raw.code,
    name: raw.name,
    countryCode: raw.countryCode,
    flag: raw.flag,
    enabled: raw.enabled,
  });
}

function mergeLanguages(languages: AvailableLanguage[]) {
  const byCode = new Map<string, AvailableLanguage>();
  for (const language of DEFAULT_LANGUAGES) {
    byCode.set(language.code, language);
  }
  for (const language of languages) {
    byCode.set(language.code, language);
  }
  return Array.from(byCode.values()).filter(
    (language) => language.enabled !== false,
  );
}

function readStoredLanguages() {
  try {
    const raw = localStorage.getItem(LANGUAGE_LIST_STORAGE_KEY);
    if (!raw) return DEFAULT_LANGUAGES;
    const parsed = JSON.parse(raw) as Partial<AvailableLanguage>[];
    if (!Array.isArray(parsed)) return DEFAULT_LANGUAGES;
    const normalized = parsed
      .map(normalizeLanguage)
      .filter(Boolean) as AvailableLanguage[];
    return mergeLanguages(normalized);
  } catch {
    return DEFAULT_LANGUAGES;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [availableLanguages, setAvailableLanguages] = useState<
    AvailableLanguage[]
  >(() => readStoredLanguages());
  const [addingLanguage, setAddingLanguage] = useState(false);

  const {
    currentLanguage,
    setLanguage,
    translations,
    loading: i18nLoading,
    error: i18nError,
    t,
  } = useI18n({
    entries: UI_TRANSLATION_ENTRIES_PT,
    fallbackEntries: UI_TRANSLATION_ENTRIES_IT,
    defaultLanguage: "pt",
    staticLanguages: {
      pt: UI_TRANSLATION_ENTRIES_PT,
      it: UI_TRANSLATION_ENTRIES_IT,
      en: UI_TRANSLATION_ENTRIES_EN,
      es: UI_TRANSLATION_ENTRIES_ES,
    },
  });

  const reloadLanguages = async () => {
    try {
      const fromApi = await getSiteLanguages();
      const normalized = fromApi
        .map(fromApiLanguage)
        .filter(Boolean) as AvailableLanguage[];
      if (normalized.length > 0) {
        setAvailableLanguages((prev) =>
          mergeLanguages([...prev, ...normalized]),
        );
      }
    } catch {
      // Keep local languages when backend endpoint is unavailable.
    }
  };

  const addLanguage = async (input: AddLanguageInput) => {
    const normalizedInput = normalizeLanguage(input);
    if (!normalizedInput) {
      throw new Error("Codigo, nome e pais sao obrigatorios.");
    }

    setAddingLanguage(true);
    try {
      let nextLanguage = normalizedInput;
      try {
        const created = await createAdminSiteLanguage({
          code: normalizedInput.code,
          name: normalizedInput.name,
          countryCode: normalizedInput.countryCode,
          flag: normalizedInput.flag,
        } as CreateSiteLanguagePayload);
        const fromApi = fromApiLanguage(created);
        if (fromApi) nextLanguage = fromApi;
      } catch {
        // If backend is not ready yet, keep frontend flow working with local persistence.
      }

      setAvailableLanguages((prev) => mergeLanguages([...prev, nextLanguage]));
      return nextLanguage;
    } finally {
      setAddingLanguage(false);
    }
  };

  const selectedLanguage = useMemo(() => {
    return (
      availableLanguages.find((item) => item.code === currentLanguage) ||
      DEFAULT_LANGUAGES[0]
    );
  }, [availableLanguages, currentLanguage]);

  useEffect(() => {
    localStorage.setItem(
      LANGUAGE_LIST_STORAGE_KEY,
      JSON.stringify(availableLanguages),
    );
  }, [availableLanguages]);

  useEffect(() => {
    if (!availableLanguages.some((item) => item.code === currentLanguage)) {
      setLanguage("pt");
    }
  }, [availableLanguages, currentLanguage, setLanguage]);

  useEffect(() => {
    void reloadLanguages();
  }, []);

  const value = useMemo<LanguageContextType>(() => {
    const safeLanguage = currentLanguage.toLowerCase();
    const dateFnsLocale =
      safeLanguage === "ma"
        ? arSA
        : safeLanguage === "it"
          ? itLocale
          : safeLanguage === "en"
            ? enGB
            : safeLanguage === "es"
              ? esLocale
              : ptBR;

    const currencyLocale =
      safeLanguage === "ma"
        ? "ar-MA"
        : safeLanguage === "it"
          ? "it-IT"
          : safeLanguage === "en"
            ? "en-GB"
            : safeLanguage === "es"
              ? "es-ES"
              : "pt-BR";

    return {
      language: currentLanguage,
      setLanguage,
      availableLanguages,
      selectedLanguage,
      addLanguage,
      reloadLanguages,
      addingLanguage,
      dateFnsLocale,
      currencyLocale,
      translations,
      i18nLoading,
      i18nError,
      t,
    };
  }, [
    currentLanguage,
    setLanguage,
    availableLanguages,
    selectedLanguage,
    addingLanguage,
    translations,
    i18nLoading,
    i18nError,
    t,
  ]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
