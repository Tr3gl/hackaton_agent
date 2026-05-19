"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/lib/types";

interface LanguageToggleProps {
  language: Language;
  label: string;
  englishLabel: string;
  turkishLabel: string;
  onChange?: (lang: Language) => void;
}

const COOKIE_NAME = "lang";
const STORAGE_KEY = "lang";

function persistLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore storage failures (private mode, etc.)
  }
  document.cookie = `${COOKIE_NAME}=${language}; path=/; max-age=31536000`;
  document.documentElement.lang = language;
}

export function LanguageToggle({
  language,
  label,
  englishLabel,
  turkishLabel,
  onChange,
}: LanguageToggleProps) {
  const router = useRouter();

  const handleChange = (next: Language) => {
    if (next === language) return;
    persistLanguage(next);
    onChange?.(next);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-sand-200 bg-white px-3 py-2 text-xs text-ink-700 shadow-sm">
      <span className="uppercase tracking-[0.2em] text-[10px] text-ink-500">{label}</span>
      <div className="flex items-center rounded-full border border-sand-200 bg-sand-50 p-1">
        <button
          type="button"
          onClick={() => handleChange("en")}
          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
            language === "en"
              ? "bg-ink-900 text-sand-50"
              : "text-ink-600 hover:text-ink-900"
          }`}
        >
          {englishLabel}
        </button>
        <button
          type="button"
          onClick={() => handleChange("tr")}
          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
            language === "tr"
              ? "bg-ink-900 text-sand-50"
              : "text-ink-600 hover:text-ink-900"
          }`}
        >
          {turkishLabel}
        </button>
      </div>
    </div>
  );
}
