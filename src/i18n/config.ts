"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import am from "./locales/am.json";
import or from "./locales/om.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: en,
      am: am,
      or: or,
    },
    fallbackLng: "en",
    defaultNS: "common",
    lng: "en",
    // CRITICAL: Don't try to async-load translations from a backend.
    // All translations are bundled inline — this prevents i18next from
    // falling back to English when it can't find a backend.
    partialBundledLanguages: true,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
