"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import am from "./locales/am.json";
import om from "./locales/om.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: en,
      am: am,
      om: om,
    },
    fallbackLng: "en",
    defaultNS: "common",
    lng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
