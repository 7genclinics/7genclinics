"use client";

import { Languages } from "lucide-react";
import { useOptionalLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";

/** Patient portal EN ↔ UR toggle. Hidden outside LocaleProvider. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useOptionalLocale();
  if (!locale) return null;

  const { locale: current, setLocale, t } = locale;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5",
        className,
      )}
      role="group"
      aria-label={t("language.label")}
    >
      <Languages className="mx-1.5 hidden h-3.5 w-3.5 text-muted-foreground sm:block" aria-hidden />
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "rounded-md px-2 py-1 text-xs font-semibold transition-colors cursor-pointer",
          current === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={current === "en"}
        title={t("language.switchToEn")}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("ur")}
        className={cn(
          "rounded-md px-2 py-1 text-xs font-semibold transition-colors cursor-pointer",
          current === "ur"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={current === "ur"}
        title={t("language.switchToUr")}
      >
        اردو
      </button>
    </div>
  );
}
