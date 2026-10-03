/**
 * Bishoftu City administrative divisions.
 *
 * Used by:
 * - Provider registration form (sub-city + woreda dropdowns)
 * - Police account creation (jurisdiction selection)
 * - Police API routes (jurisdiction-based filtering)
 *
 * Source: User-provided data for Bishoftu (Debre Zeit), Ethiopia.
 */

export interface BishoftuSubCity {
  name: string;
  woredas: string[];
}

export const BISHOFTU_SUB_CITIES: BishoftuSubCity[] = [
  {
    name: "Debaayyuu",
    woredas: ["Dhakaa Boora", "Dirree", "Horaa", "Biiftuu"],
  },
  {
    name: "Chalaleka",
    woredas: ["Erere", "Arsedee", "Kilolee"],
  },
  {
    name: "Dukem",
    woredas: ["Odaa Nabee", "Xaddachaa", "Malkaa", "Abbuu Seeraa"],
  },
];

/** Quick lookup: subCity name → array of woredas */
export const SUB_CITY_WOREDAS: Record<string, string[]> = Object.fromEntries(
  BISHOFTU_SUB_CITIES.map((sc) => [sc.name, sc.woredas])
);

/** Get all sub-city names as a flat array */
export const SUB_CITY_NAMES: string[] = BISHOFTU_SUB_CITIES.map((sc) => sc.name);

/** Get woredas for a specific sub-city */
export function getWoredasForSubCity(subCity: string): string[] {
  return SUB_CITY_WOREDAS[subCity] || [];
}

/** Police jurisdiction types */
export type JurisdictionType = "CITY" | "SUBCITY" | "WOREDA";

export const JURISDICTION_LABELS: Record<JurisdictionType, string> = {
  CITY: "City Level (Full Access)",
  SUBCITY: "Sub-City Level",
  WOREDA: "Woreda Level",
};
