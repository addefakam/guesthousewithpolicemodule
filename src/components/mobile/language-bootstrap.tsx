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
    // CRITICAL: dependency array is [] (empty) — must only run ONCE on
    // mount. If [i18n] is used, every time the user switches language,
    // this effect re-runs and forces it back to English, preventing
    // any language switch from working.
    if (!i18n || typeof i18n.changeLanguage !== "function") return;
    if (i18n.language !== "en") {
      i18n.changeLanguage("en");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // ← EMPTY ARRAY: run once on mount only

  // Renders nothing — this is a side-effect-only component.
  return null;
}
