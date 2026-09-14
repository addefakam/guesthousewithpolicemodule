"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * MobileLanguageBootstrap — forces English as the default language for
 * the operator mobile app (/m route) on every fresh page load.
 *
 * The user can still tap the language button in the header to switch to
 * Amharic for the current session, but the next time the app is loaded
 * (refresh, app restart, new PWA session), it resets to English.
 *
 * This is a deliberate UX choice for the operator app: it's used in a
 * fast-paced operational setting where most operators prefer English,
 * and the previous behavior (persisting Amharic across sessions via
 * i18next's localStorage cache) was confusing for operators who
 * accidentally toggled to Amharic and couldn't navigate back.
 *
 * The police app (/police-app) keeps its own 2-way EN<->OM toggle and
 * is unaffected by this bootstrap (it has its own layout file).
 */
export function MobileLanguageBootstrap() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Force English on every fresh mount of the mobile app.
    // i18next.changeLanguage() also writes to localStorage which
    // persists across session — but this bootstrap runs again on
    // every reload and resets it, so the operator always starts in
    // English. (If they toggled to Amharic, then refreshed, the
    // refresh re-runs this bootstrap → English again.)
    if (i18n.language !== "en") {
      i18n.changeLanguage("en");
    }
  }, [i18n]);

  // Renders nothing — this is a side-effect-only component.
  return null;
}
