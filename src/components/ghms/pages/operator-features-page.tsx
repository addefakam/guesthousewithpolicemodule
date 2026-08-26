"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { apiGetOperatorFeatures, apiUpdateOperatorFeatures } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  LayoutDashboard,
  DoorOpen,
  Wrench,
  UserCog,
  BarChart3,
  Users,
  MessageSquare,
  ScrollText,
  CreditCard,
  Settings,
  AlertTriangle,
} from "lucide-react";

interface FeaturePage {
  key: string;
  label: string;
  icon: string;
  category: string;
  enabled: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  DoorOpen,
  Wrench,
  UserCog,
  BarChart3,
  Users,
  MessageSquare,
  ScrollText,
  CreditCard,
  Settings,
};

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  management: "Management",
  operations: "Operations",
  billing: "Billing",
};

export default function OperatorFeaturesPage() {
  const { t } = useTranslation("operatorFeatures");
  const { refreshKey } = useAppStore();
  const [pages, setPages] = useState<FeaturePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetOperatorFeatures();
      if (res?.pages && Array.isArray(res.pages)) {
        setPages(res.pages);
      }
    } catch {
      toast.error(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const togglePage = (key: string) => {
    if (key === "dashboard") return;
    setPages((prev) =>
      prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p))
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const disabledPages = pages.filter((p) => !p.enabled).map((p) => p.key);
      await apiUpdateOperatorFeatures(disabledPages);
      setHasChanges(false);
      toast.success(t("saved"));
    } catch {
      toast.error(t("errorSave"));
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = pages.filter((p) => p.enabled).length;
  const disabledCount = pages.length - enabledCount;
  const categories = Array.from(new Set(pages.map((p) => p.category)));

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("pageSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchData(); setHasChanges(false); }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t("btnRefresh")}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            <Save className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
            {t("btnSave")}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800">{t("unsavedWarning")}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
          {t("enabledCount", { count: enabledCount })}
        </Badge>
        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0">
          {t("disabledCount", { count: disabledCount })}
        </Badge>
      </div>

      {categories.map((cat) => (
        <Card key={cat}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">
              {CATEGORY_LABELS[cat] || cat}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pages
              .filter((p) => p.category === cat)
              .map((page) => {
                const Icon = ICON_MAP[page.icon] || LayoutDashboard;
                const isProtected = page.key === "dashboard";
                return (
                  <div
                    key={page.key}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      page.enabled
                        ? "border-slate-200 bg-white"
                        : "border-rose-200 bg-rose-50/50"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        page.enabled
                          ? "bg-slate-100 text-slate-600"
                          : "bg-rose-100 text-rose-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${page.enabled ? "text-slate-800" : "text-slate-400 line-through"}`}>
                        {t(`page_${page.key}`) || page.label}
                      </p>
                      <p className="text-xs text-slate-400">{page.key}</p>
                    </div>
                    {isProtected ? (
                      <Badge variant="outline" className="border-slate-200 text-slate-400 text-xs">
                        <Shield className="mr-1 h-3 w-3" />
                        {t("required")}
                      </Badge>
                    ) : page.enabled ? (
                      <button
                        onClick={() => togglePage(page.key)}
                        className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t("visible")}
                      </button>
                    ) : (
                      <button
                        onClick={() => togglePage(page.key)}
                        className="flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-100"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        {t("hidden")}
                      </button>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
