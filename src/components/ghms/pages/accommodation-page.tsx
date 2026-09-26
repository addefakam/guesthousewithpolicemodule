"use client";

import { useState } from "react";
import { Bed, CalendarCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";

import RoomsPage from "./rooms-page";
import AccommodationGuestsPage from "./accommodation-guests-page";

type TabType = "rooms" | "reservations";

export default function AccommodationPage() {
  const { t } = useTranslation("accommodation");
  const { accommodationTab, setAccommodationTab } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>(accommodationTab);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setAccommodationTab(tab);
  };

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: "rooms", label: t("roomsTab", "Rooms"), icon: Bed },
    { key: "reservations", label: t("reservationsTab", "Reservations"), icon: CalendarCheck },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t("title", "Accommodation")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t("subtitle", "Manage room inventory and reservations.")}
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === "rooms" && <RoomsPage />}
        {activeTab === "reservations" && <AccommodationGuestsPage />}
      </div>
    </div>
  );
}
