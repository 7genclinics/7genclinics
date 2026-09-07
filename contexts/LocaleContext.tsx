"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { patientMessagesByLocale } from "@/lib/i18n/patient-messages";
import {
  getMessage,
  LOCALE_STORAGE_KEY,
  type AppLocale,
} from "@/lib/i18n/types";

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
  t: TranslateFn;
  dir: "ltr" | "rtl";
  isUrdu: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return raw === "ur" ? "ur" : "en";
  } catch {
    return "en";
  }
}

export function LocaleProvider({
  children,
  scope = "patient",
}: {
  children: ReactNode;
  scope?: "patient";
}) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setReady(true);
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ur" : "en");
  }, [locale, setLocale]);

  useEffect(() => {
    if (!ready || scope !== "patient") return;
    const root = document.documentElement;
    root.lang = locale === "ur" ? "ur" : "en";
    root.dir = locale === "ur" ? "rtl" : "ltr";
    return () => {
      root.lang = "en";
      root.dir = "ltr";
    };
  }, [locale, ready, scope]);

  const t = useCallback<TranslateFn>(
    (key, vars) => getMessage(patientMessagesByLocale[locale], key, vars),
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      dir: locale === "ur" ? "rtl" : "ltr",
      isUrdu: locale === "ur",
    }),
    [locale, setLocale, toggleLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

/** Safe for shared chrome that may render outside patient LocaleProvider. */
export function useOptionalLocale() {
  return useContext(LocaleContext);
}
