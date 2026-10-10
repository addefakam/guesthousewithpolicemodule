"use client";

import { useAppStore } from "@/lib/store";

import RoomsPage from "./rooms-page";
import AccommodationGuestsPage from "./accommodation-guests-page";
import GroupBookingsPage from "./group-bookings-page";

export default function AccommodationPage() {
  // The active tab is sourced directly from the global store — set by
  // the sidebar's Accommodation sub-items (Rooms / Reservations / Group Bookings).
  //
  // PERFORMANCE: All 3 tabs are kept mounted at all times and toggled with
  // CSS 'hidden' instead of conditional rendering ({tab === "rooms" && <RoomsPage />}).
  // This prevents full unmount/remount + API refetch on every tab switch.
  // The initial load fetches all 3 tabs' data in parallel, but subsequent
  // switches are instant (no network, no re-render).
  const accommodationTab = useAppStore((s) => s.accommodationTab);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <div className={accommodationTab === "rooms" ? "" : "hidden"}>
          <RoomsPage />
        </div>
        <div className={accommodationTab === "reservations" ? "" : "hidden"}>
          <AccommodationGuestsPage />
        </div>
        <div className={accommodationTab === "group-bookings" ? "" : "hidden"}>
          <GroupBookingsPage />
        </div>
      </div>
    </div>
  );
}
