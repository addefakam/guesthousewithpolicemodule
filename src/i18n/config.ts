"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import am from "./locales/am.json";
import om from "./locales/om.json";

// Each locale JSON has top-level namespace keys (common, login, sidebar, dashboard, policeDashboard, settings…)
// We spread them so each key becomes its own i18next namespace.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { ...en },
      am: { ...am },
      om: { ...om },
    },
    fallbackLng: "en",
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
