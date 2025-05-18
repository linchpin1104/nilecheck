
"use client";

import type { Locale } from "date-fns";
import { ko as koLocale } from "date-fns/locale";
import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from "react";

interface LanguageContextType {
  language: string; // Will always be 'ko'
  t: (key: string, replacements?: Record<string, string | number>) => string;
  dateLocale: Locale;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
}

type Translations = Record<string, string>;

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language] = useState<string>("ko"); // Always Korean
  const [translations, setTranslations] = useState<Translations>({});
  const [dateLocale, setDateLocale] = useState<Locale>(koLocale); // Always Korean locale
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(true);

  useEffect(() => {
    // Load Korean translations
    const loadKoreanTranslations = async () => {
      setIsLoadingTranslations(true);
      try {
        const langModule = await import(`@/locales/ko.json`);
        setTranslations(langModule.default);
        setDateLocale(koLocale);
        if (typeof window !== 'undefined') {
          document.documentElement.lang = "ko";
        }
      } catch (error) {
        console.error(`Could not load ko.json:`, error);
        setTranslations({}); // Fallback to empty if Korean fails
      } finally {
        setIsLoadingTranslations(false);
      }
    };
    
    loadKoreanTranslations();
  }, []); // Empty dependency array, runs once

  const t = useCallback(
    (key: string, replacements?: Record<string, string | number>): string => {
      let translation = translations[key] || key; // Fallback to key if translation not found
      if (replacements) {
        Object.entries(replacements).forEach(([placeholder, value]) => {
          translation = translation.replace(
            new RegExp(`{${placeholder}}`, "g"),
            String(value)
          );
        });
      }
      return translation;
    },
    [translations]
  );

  if (isLoadingTranslations && Object.keys(translations).length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, t, dateLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};

    