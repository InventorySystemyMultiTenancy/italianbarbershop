import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "date-fns";
import { arSA, it as itLocale } from "date-fns/locale";

export type AppLanguage = "it" | "ma";

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  dateFnsLocale: Locale;
  currencyLocale: string;
}

const LANGUAGE_STORAGE_KEY = "app-language";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLanguage(): AppLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "it" || stored === "ma") return stored;
  return "it";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => getInitialLanguage());

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const value = useMemo<LanguageContextType>(() => {
    return {
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((prev) => (prev === "it" ? "ma" : "it")),
      dateFnsLocale: language === "it" ? itLocale : arSA,
      currencyLocale: language === "it" ? "it-IT" : "ar-MA",
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
