"use client";

import { useState } from "react";
import { Bed, Sun, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import RoomsPage from "./rooms-page";
import DaytimePage from "./daytime-page";
import AccommodationGuestsPage from "./accommodation-guests-page";

type TabType = "guests" | "rooms" | "daytime";

export default function AccommodationPage() {
  const { t } = useTranslation("accommodation");
  const [activeTab, setActiveTab] = useState<TabType>("guests");

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: "guests", label: t("guestsTab", "Guests"), icon: Users },
    { key: "rooms", label: t("roomsTab", "Rooms"), icon: Bed },
    { key: "daytime", label: t("daytimeTab", "Daytime Services"), icon: Sun },
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
              {t("subtitle", "Manage guests, room inventory and daytime service bookings.")}
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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
        {activeTab === "guests" && <AccommodationGuestsPage />}
        {activeTab === "rooms" && <RoomsPage />}
        {activeTab === "daytime" && <DaytimePage />}
      </div>
    </div>
  );
}
