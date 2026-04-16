import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TranslationEntries, Translations } from "@/lib/i18n";
import { t as translateText, translateEntries } from "@/lib/i18n";

interface UseI18nOptions {
  entries: TranslationEntries;
  defaultLanguage?: string;
  provider?: string;
  debounceMs?: number;
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
const CACHE_PREFIX = "app_i18n_cache_";

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
    defaultLanguage = "pt",
    provider = import.meta.env.VITE_TRANSLATION_PROVIDER || "libretranslate",
    debounceMs = 300,
  } = options;

  const [currentLanguage, setCurrentLanguage] = useState(() => readStoredLanguage(defaultLanguage));
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const setLanguage = useCallback((langCode: string) => {
    const safe = String(langCode || "").trim().toLowerCase();
    if (!safe) return;
    setCurrentLanguage(safe);
  }, []);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  }, [currentLanguage]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (currentLanguage === "pt") {
      setTranslations({});
      setLoading(false);
      setError(null);
      return;
    }

    const cached = readCachedTranslations(currentLanguage);
    if (cached) {
      setTranslations(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const requestId = ++requestIdRef.current;
    debounceTimerRef.current = window.setTimeout(() => {
      void translateEntries(currentLanguage, entries, provider)
        .then((nextTranslations) => {
          if (requestIdRef.current !== requestId) return;
          setTranslations(nextTranslations || {});
          writeCachedTranslations(currentLanguage, nextTranslations || {});
          setError(null);
        })
        .catch((translateError) => {
          if (requestIdRef.current !== requestId) return;
          setTranslations({});
          setError(translateError instanceof Error ? translateError.message : "Falha ao traduzir interface.");
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setLoading(false);
        });
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [currentLanguage, entries, provider, debounceMs]);

  const t = useCallback(
    (key: string, fallback: string) => translateText(translations, key, fallback),
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
