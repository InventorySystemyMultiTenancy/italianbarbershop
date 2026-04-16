import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TranslationEntries, Translations } from "@/lib/i18n";
import { t as translateText } from "@/lib/i18n";
import { fetchI18nByCode } from "@/lib/api";

interface UseI18nOptions {
  entries: TranslationEntries;
  fallbackEntries?: TranslationEntries;
  defaultLanguage?: string;
  provider?: string;
  debounceMs?: number;
  staticLanguages?: Record<string, TranslationEntries>;
}

interface UseI18nResult {
  currentLanguage: string;
  translations: Translations;
  loading: boolean;
  error: string | null;
  setLanguage: (langCode: string) => void;
  t: (key: string, fallback: string) => string;
}

const LANGUAGE_STORAGE_KEY = "app_language";
const CACHE_PREFIX = "app_i18n_cache_v2_";

function getCacheKey(language: string) {
  return `${CACHE_PREFIX}${language}`;
}

function readCachedTranslations(language: string): Translations | null {
  try {
    const raw = localStorage.getItem(getCacheKey(language));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Translations;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedTranslations(language: string, translations: Translations) {
  localStorage.setItem(getCacheKey(language), JSON.stringify(translations));
}

function readStoredLanguage(defaultLanguage: string) {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored && stored.trim() ? stored : defaultLanguage;
}

export function useI18n(options: UseI18nOptions): UseI18nResult {
  const {
    entries,
    fallbackEntries,
    defaultLanguage = "pt",
    staticLanguages,
  } = options;

  const [currentLanguage, setCurrentLanguage] = useState(() =>
    readStoredLanguage(defaultLanguage),
  );
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const setLanguage = useCallback((langCode: string) => {
    const safe = String(langCode || "")
      .trim()
      .toLowerCase();
    if (!safe) return;
    setCurrentLanguage(safe);
  }, []);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  }, [currentLanguage]);

  useEffect(() => {
    // Static languages: use local entries directly, no network call needed
    if (staticLanguages?.[currentLanguage]) {
      setTranslations(staticLanguages[currentLanguage]);
      setLoading(false);
      setError(null);
      return;
    }

    // Portuguese: use local entries directly, no network call needed
    if (currentLanguage === "pt") {
      setTranslations(entries);
      setLoading(false);
      setError(null);
      return;
    }

    // Italian: use local fallback entries directly when available
    if (currentLanguage === "it" && fallbackEntries) {
      setTranslations(fallbackEntries);
      setLoading(false);
      setError(null);
      return;
    }

    // Other languages: check localStorage cache first
    const cached = readCachedTranslations(currentLanguage);
    if (cached) {
      setTranslations(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // Fetch from DB
    setLoading(true);
    setError(null);

    const requestId = ++requestIdRef.current;

    void fetchI18nByCode(currentLanguage)
      .then((fetched) => {
        if (requestIdRef.current !== requestId) return;
        setTranslations(fetched);
        writeCachedTranslations(currentLanguage, fetched);
        setError(null);
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return;
        // Fallback to Italian when backend is down
        setTranslations(fallbackEntries ?? entries);
        setError(
          err instanceof Error ? err.message : "Falha ao carregar traducoes.",
        );
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoading(false);
      });
  }, [currentLanguage, entries, fallbackEntries]);

  const t = useCallback(
    (key: string, fallback: string) =>
      translateText(translations, key, fallback),
    [translations],
  );

  return useMemo(
    () => ({
      currentLanguage,
      translations,
      loading,
      error,
      setLanguage,
      t,
    }),
    [currentLanguage, translations, loading, error, setLanguage, t],
  );
}
