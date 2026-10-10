"use client";

import { useAppStore } from "@/lib/store";

import RoomsPage from "./rooms-page";
import AccommodationGuestsPage from "./accommodation-guests-page";
import GroupBookingsPage from "./group-bookings-page";

export default function AccommodationPage() {
  // The active tab is sourced directly from the global store — set by
  // the sidebar's Accommodation sub-items (Rooms / Reservations / Group Bookings).
  //
  // The page-level header (title + subtitle + tab bar) was removed —
  // the sidebar's expandable Accommodation section now provides the
  // only way to switch between the three tabs, so duplicating
  // it here was redundant.
  //
  // We deliberately do NOT copy accommodationTab into local useState —
  // doing so would freeze the tab on first render and miss subsequent
  // sidebar clicks (since the page doesn't unmount/remount when
  // navigating between sibling tabs on the same page). Reading directly
  // from the store ensures the page re-renders when the tab changes.
  const accommodationTab = useAppStore((s) => s.accommodationTab);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        {accommodationTab === "rooms" && <RoomsPage />}
        {accommodationTab === "reservations" && <AccommodationGuestsPage />}
        {accommodationTab === "group-bookings" && <GroupBookingsPage />}
      </div>
    </div>
  );
}
