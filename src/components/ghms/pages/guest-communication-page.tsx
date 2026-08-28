"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  apiGetMessageTemplates,
  apiCreateMessageTemplate,
  apiUpdateMessageTemplate,
  apiDeleteMessageTemplate,
  apiSendMessage,
  apiBulkSendMessages,
  apiGetMessageLogs,
} from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Send,
  Megaphone,
  History,
  Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

// ─── Types ─────────────────────────────────────────────────────────────────

interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject: string;
  body: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MessageLog {
  id: string;
  templateId: string;
  recipient: string;
  channel: string;
  message: string;
  status: string;
  errorMessage: string;
  reservationId: string;
  guestId: string;
  providerId: string;
  sentAt: string;
  createdAt: string;
  template?: { id: string; name: string; type: string };
}

interface PaginatedLogs {
  data: MessageLog[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PLACEHOLDERS = [
  "{{guestName}}",
  "{{roomNumber}}",
  "{{roomName}}",
  "{{nights}}",
  "{{checkIn}}",
  "{{checkOut}}",
  "{{totalCost}}",
  "{{guestHouseName}}",
  "{{guestHousePhone}}",
  "{{checkInTime}}",
  "{{checkOutTime}}",
];

// TYPE_LABELS moved inside component for t() access

const CHANNEL_BADGE: Record<string, string> = {
  SMS: "bg-blue-100 text-blue-700 border-blue-200",
  WHATSAPP: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_BADGE: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DELIVERED: "bg-blue-100 text-blue-700 border-blue-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
};

const TYPE_BADGE: Record<string, string> = {
  CHECKIN_REMINDER: "bg-violet-100 text-violet-700 border-violet-200",
  WELCOME: "bg-pink-100 text-pink-700 border-pink-200",
  CHECKOUT_REMINDER: "bg-orange-100 text-orange-700 border-orange-200",
  CONFIRMATION: "bg-cyan-100 text-cyan-700 border-cyan-200",
  CUSTOM: "bg-gray-100 text-gray-600 border-gray-200",
};

const emptyTemplateForm = {
  name: "",
  type: "CUSTOM" as string,
  channel: "SMS" as string,
  body: "",
};

const emptySingleForm = {
  recipient: "",
  channel: "SMS" as string,
  templateId: "",
  message: "",
};

const emptyBulkForm = {
  templateId: "",
  status: "UPCOMING" as string,
  channel: "SMS" as string,
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function GuestCommunicationPage() {
  const { t } = useTranslation("messages");
  const { refreshKey } = useAppStore();

  const TYPE_LABELS: Record<string, string> = {
    CHECKIN_REMINDER: t("typeCHECKIN_REMINDER"),
    WELCOME: t("typeWELCOME"),
    CHECKOUT_REMINDER: t("typeCHECKOUT_REMINDER"),
    CONFIRMATION: t("typeCONFIRMATION"),
    CUSTOM: t("typeCUSTOM"),
  };
  const CHANNEL_LABELS: Record<string, string> = {
    SMS: t("channelSMS"),
    WHATSAPP: t("channelWHATSAPP"),
  };
  const STATUS_LABELS: Record<string, string> = {
    SENT: t("statusSENT"),
    DELIVERED: t("statusDELIVERED"),
    PENDING: t("statusPENDING"),
    FAILED: t("statusFAILED"),
  };
  const [activeTab, setActiveTab] = useState("templates");

  // ── Templates State ──
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<MessageTemplate | null>(null);
  const [tplForm, setTplForm] = useState(emptyTemplateForm);
  const [tplSaving, setTplSaving] = useState(false);
  const [tplDeleteTarget, setTplDeleteTarget] = useState<MessageTemplate | null>(null);
  const [tplDeleting, setTplDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Single Message State ──
  const [singleForm, setSingleForm] = useState(emptySingleForm);
  const [sendingSingle, setSendingSingle] = useState(false);

  // ── Bulk Send State ──
  const [bulkForm, setBulkForm] = useState(emptyBulkForm);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // ── Message History State ──
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterChannel, setFilterChannel] = useState<string>("ALL");

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setTplLoading(true);
    try {
      const data = await apiGetMessageTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t("toastFailedLoadTemplates"));
    } finally {
      setTplLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params: Record<string, string | number> = { page: logsPage, limit: 10 };
      if (filterStatus !== "ALL") params.status = filterStatus;
      if (filterChannel !== "ALL") params.channel = filterChannel;
      const result: PaginatedLogs = await apiGetMessageLogs(Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&"));
      setLogs(result.data ?? []);
      setLogsTotal(result.total ?? 0);
      setLogsPage(result.page ?? 1);
      setLogsTotalPages(result.totalPages ?? 1);
    } catch {
      toast.error(t("toastFailedLoadHistory"));
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage, filterStatus, filterChannel]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates, refreshKey]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setLogsPage(1);
  }, [filterStatus, filterChannel]);

  // ─── Template Helpers ─────────────────────────────────────────────────────

  const openCreateTpl = () => {
    setEditingTpl(null);
    setTplForm(emptyTemplateForm);
    setTplDialogOpen(true);
  };

  const openEditTpl = (tpl: MessageTemplate) => {
    setEditingTpl(tpl);
    setTplForm({
      name: tpl.name,
      type: tpl.type,
      channel: tpl.channel,
      body: tpl.body,
    });
    setTplDialogOpen(true);
  };

  const handleSaveTpl = async () => {
    if (!tplForm.name.trim() || !tplForm.body.trim()) {
      toast.error(t("toastNameBodyRequired"));
      return;
    }
    setTplSaving(true);
    try {
      if (editingTpl) {
        await apiUpdateMessageTemplate(editingTpl.id, tplForm);
        toast.success(t("toastTemplateUpdated"));
      } else {
        await apiCreateMessageTemplate(tplForm);
        toast.success(t("toastTemplateCreated"));
      }
      setTplDialogOpen(false);
      fetchTemplates();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedSaveTemplate"));
    } finally {
      setTplSaving(false);
    }
  };

  const handleDeleteTpl = async () => {
    if (!tplDeleteTarget) return;
    setTplDeleting(true);
    try {
      await apiDeleteMessageTemplate(tplDeleteTarget.id);
      toast.success(t("toastTemplateDeleted"));
      setTplDeleteTarget(null);
      fetchTemplates();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedDeleteTemplate"));
    } finally {
      setTplDeleting(false);
    }
  };

  const handleToggleActive = async (tpl: MessageTemplate) => {
    const next = !tpl.isActive;
    setTogglingId(tpl.id);
    setTemplates((prev) =>
      prev.map((x) => (x.id === tpl.id ? { ...x, isActive: next } : x))
    );
    try {
      await apiUpdateMessageTemplate(tpl.id, { isActive: next });
      toast.success(next ? t("toastTemplateActivated") : t("toastTemplateDeactivated"));
    } catch {
      toast.error(t("toastFailedToggle"));
      setTemplates((prev) =>
        prev.map((x) => (x.id === tpl.id ? { ...x, isActive: !next } : x))
      );
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Send Message Helpers ─────────────────────────────────────────────────

  const selectedTemplateForSingle = templates.find(
    (x) => x.id === singleForm.templateId
  );

  const handleSingleTemplateChange = (templateId: string) => {
    const tpl = templates.find((x) => x.id === templateId);
    setSingleForm((prev) => ({
      ...prev,
      templateId,
      message: tpl ? tpl.body : "",
    }));
  };

  const handleSendSingle = async () => {
    if (!singleForm.recipient.trim()) {
      toast.error(t("toastRecipientRequired"));
      return;
    }
    if (!singleForm.message.trim()) {
      toast.error(t("toastMessageRequired"));
      return;
    }
    setSendingSingle(true);
    try {
      const payload: Record<string, string> = {
        recipient: singleForm.recipient.trim(),
        channel: singleForm.channel,
        message: singleForm.message,
      };
      if (singleForm.templateId) payload.templateId = singleForm.templateId;
      await apiSendMessage(payload);
      toast.success(t("toastMessageSent"));
      setSingleForm(emptySingleForm);
      fetchLogs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedSend"));
    } finally {
      setSendingSingle(false);
    }
  };

  const handleBulkSend = async () => {
    if (!bulkForm.templateId) {
      toast.error(t("toastSelectTemplate"));
      return;
    }
    setSendingBulk(true);
    try {
      const result = await apiBulkSendMessages({
        templateId: bulkForm.templateId,
        status: bulkForm.status,
        channel: bulkForm.channel,
      });
      const sent = (result as Record<string, number>)?.sent ?? 0;
      const failed = (result as Record<string, number>)?.failed ?? 0;
      toast.success(t("toastBulkResult", { sent, failed }));
      setBulkConfirmOpen(false);
      setBulkForm(emptyBulkForm);
      fetchLogs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastBulkFailed"));
    } finally {
      setSendingBulk(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
                      {t("pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
                      {t("pageSubtitle")}
          </p>
        </div>
        {activeTab === "templates" && (
          <Button onClick={openCreateTpl} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            {t("btnNewTemplate")}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {t("tabTemplates")} ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            {t("tabSendMessage")}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            {t("tabHistory")}
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Templates ────────────────────────────────────────────── */}
        <TabsContent value="templates">
          {tplLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-500">
                {t("emptyTitle")}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {t("emptySubtitle")}
              </p>
              <Button
                onClick={openCreateTpl}
                variant="outline"
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" /> {t("btnNewTemplate")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => {
                const channelColor =
                  CHANNEL_BADGE[tpl.channel] ?? CHANNEL_BADGE.SMS;
                const typeColor = TYPE_BADGE[tpl.type] ?? TYPE_BADGE.CUSTOM;
                return (
                  <Card
                    key={tpl.id}
                    className={`gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md ${
                      !tpl.isActive ? "opacity-60" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 leading-tight truncate">
                            {tpl.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-xs ${typeColor}`}
                            >
                              {TYPE_LABELS[tpl.type] || tpl.type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${channelColor}`}
                            >
                              {CHANNEL_LABELS[tpl.channel] || tpl.channel}
                            </Badge>
                            {tpl.isDefault && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                              >
                                {t("badgeDefault")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 mb-3 whitespace-pre-line">
                        {tpl.body}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tpl.isActive}
                            disabled={togglingId === tpl.id}
                            onCheckedChange={() => handleToggleActive(tpl)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {tpl.isActive ? t("toggleActive") : t("toggleInactive")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditTpl(tpl)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={tpl.isDefault}
                            onClick={() => setTplDeleteTarget(tpl)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab 2: Send Message ─────────────────────────────────────────── */}
        <TabsContent value="send">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Single Message */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Send className="h-5 w-5 text-primary" />
                  {t("singleTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="single-recipient">
                    {t("lblRecipientPhone")} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="single-recipient"
                    placeholder="+251912345678"
                    value={singleForm.recipient}
                    onChange={(e) =>
                      setSingleForm((p) => ({
                        ...p,
                        recipient: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("lblChannel")}</Label>
                  <Select
                    value={singleForm.channel}
                    onValueChange={(v) =>
                      setSingleForm((p) => ({ ...p, channel: v }))
                    }
                  >
                    <SelectTrigger id="single-channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMS">{t("channelSMS")}</SelectItem>
                      <SelectItem value="WHATSAPP">{t("channelWHATSAPP")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("lblTemplateOptional")}</Label>
                  <Select
                    value={singleForm.templateId}
                    onValueChange={handleSingleTemplateChange}
                  >
                    <SelectTrigger id="single-template">
                      <SelectValue placeholder={t("placeholderSelectTemplate")} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates
                        .filter((x) => x.isActive)
                        .map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.name} ({CHANNEL_LABELS[x.channel] || x.channel})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="single-message">
                    {t("lblMessage")} <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="single-message"
                    placeholder={t("placeholderMessage")}
                    rows={6}
                    value={singleForm.message}
                    onChange={(e) =>
                      setSingleForm((p) => ({
                        ...p,
                        message: e.target.value,
                      }))
                    }
                  />
                  {selectedTemplateForSingle && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {t("templatePreviewInfo", { name: selectedTemplateForSingle.name })}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSendSingle}
                  disabled={sendingSingle}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendingSingle ? t("btnSending") : t("btnSendMessage")}
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Send */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Megaphone className="h-5 w-5 text-primary" />
                  {t("bulkTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-template">
                    {t("lblTemplate")} <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={bulkForm.templateId}
                    onValueChange={(v) =>
                      setBulkForm((p) => ({ ...p, templateId: v }))
                    }
                  >
                    <SelectTrigger id="bulk-template">
                      <SelectValue placeholder={t("placeholderSelectTemplate")} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates
                        .filter((x) => x.isActive)
                        .map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.name} ({CHANNEL_LABELS[x.channel] || x.channel})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("lblTargetGuests")}</Label>
                  <Select
                    value={bulkForm.status}
                    onValueChange={(v) =>
                      setBulkForm((p) => ({ ...p, status: v }))
                    }
                  >
                    <SelectTrigger id="bulk-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPCOMING">{t("targetUPCOMING")}</SelectItem>
                      <SelectItem value="ACTIVE">{t("targetACTIVE")}</SelectItem>
                      <SelectItem value="COMPLETED">{t("targetCOMPLETED")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("lblChannel")}</Label>
                  <Select
                    value={bulkForm.channel}
                    onValueChange={(v) =>
                      setBulkForm((p) => ({ ...p, channel: v }))
                    }
                  >
                    <SelectTrigger id="bulk-channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMS">{t("channelSMS")}</SelectItem>
                      <SelectItem value="WHATSAPP">{t("channelWHATSAPP")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bulkForm.templateId && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {t("templatePreview")}
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-line">
                      {
                        templates.find(
                          (x) => x.id === bulkForm.templateId
                        )?.body ?? ""
                      }
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setBulkConfirmOpen(true)}
                  disabled={!bulkForm.templateId || sendingBulk}
                  className="w-full gap-2"
                >
                  <Megaphone className="h-4 w-4" />
                  {t("btnSendToAll", { status: t("target" + bulkForm.status) })}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tab 3: Message History ──────────────────────────────────────── */}
        <TabsContent value="history">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 flex-1">
                <Label>{t("lblStatus")}</Label>
                <Select
                  value={filterStatus}
                  onValueChange={setFilterStatus}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("statusALL")}</SelectItem>
                    <SelectItem value="SENT">{t("statusSENT")}</SelectItem>
                    <SelectItem value="DELIVERED">{t("statusDELIVERED")}</SelectItem>
                    <SelectItem value="PENDING">{t("statusPENDING")}</SelectItem>
                    <SelectItem value="FAILED">{t("statusFAILED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>{t("lblChannel")}</Label>
                <Select
                  value={filterChannel}
                  onValueChange={setFilterChannel}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("statusALL")}</SelectItem>
                    <SelectItem value="SMS">{t("channelSMS")}</SelectItem>
                    <SelectItem value="WHATSAPP">{t("channelWHATSAPP")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                {t(logsTotal === 1 ? "messagesCount_one" : "messagesCount_other", { count: logsTotal })}
              </span>
            </div>

            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
                <History className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-lg font-medium text-gray-500">
                  {t("historyEmptyTitle")}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {t("historyEmptySubtitle")}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("thDate")}</TableHead>
                        <TableHead>{t("thRecipient")}</TableHead>
                        <TableHead>{t("thChannel")}</TableHead>
                        <TableHead>{t("thTemplate")}</TableHead>
                        <TableHead>{t("thStatus")}</TableHead>
                        <TableHead>{t("thMessage")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {log.sentAt
                              ? new Date(log.sentAt).toLocaleString()
                              : new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {log.recipient}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                CHANNEL_BADGE[log.channel] ??
                                CHANNEL_BADGE.SMS
                              }`}
                            >
                              {CHANNEL_LABELS[log.channel] || log.channel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.template?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                STATUS_BADGE[log.status] ??
                                "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {log.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {logs.map((log) => (
                    <Card key={log.id} className="py-0 gap-0">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {log.recipient}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              STATUS_BADGE[log.status] ??
                              "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {STATUS_LABELS[log.status] || log.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {log.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                CHANNEL_BADGE[log.channel] ??
                                CHANNEL_BADGE.SMS
                              }`}
                            >
                              {CHANNEL_LABELS[log.channel] || log.channel}
                            </Badge>
                            {log.template?.name && (
                              <span className="text-xs text-muted-foreground">
                                {log.template.name}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {log.sentAt
                              ? new Date(log.sentAt).toLocaleDateString()
                              : new Date(log.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {logsTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logsPage <= 1}
                      onClick={() => setLogsPage((p) => p - 1)}
                    >
                      {t("btnPrevious")}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {t("pageOf", { page: logsPage, total: logsTotalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logsPage >= logsTotalPages}
                      onClick={() => setLogsPage((p) => p + 1)}
                    >
                      {t("btnNext")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Template Edit / Create Dialog ──────────────────────────────────── */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent className="mx-4 sm:mx-0 w-[calc(100%-2rem)] sm:w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {editingTpl ? t("dlgEditTitle") : t("dlgNewTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingTpl
                ? t("dlgEditDesc")
                : t("dlgNewDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">
                {t("lblName")} <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="tpl-name"
                placeholder={t("placeholderTemplateName")}
                value={tplForm.name}
                onChange={(e) =>
                  setTplForm((p) => ({ ...p, name: e.target.value }))
                }
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("lblType")}</Label>
                <Select
                  value={tplForm.type}
                  onValueChange={(v) =>
                    setTplForm((p) => ({ ...p, type: v }))
                  }
                >
                  <SelectTrigger id="tpl-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKIN_REMINDER">{t("typeCHECKIN_REMINDER")}</SelectItem>
                    <SelectItem value="WELCOME">{t("typeWELCOME")}</SelectItem>
                    <SelectItem value="CHECKOUT_REMINDER">{t("typeCHECKOUT_REMINDER")}</SelectItem>
                    <SelectItem value="CONFIRMATION">{t("typeCONFIRMATION")}</SelectItem>
                    <SelectItem value="CUSTOM">{t("typeCUSTOM")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("lblChannel")}</Label>
                <Select
                  value={tplForm.channel}
                  onValueChange={(v) =>
                    setTplForm((p) => ({ ...p, channel: v }))
                  }
                >
                  <SelectTrigger id="tpl-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">{t("channelSMS")}</SelectItem>
                    <SelectItem value="WHATSAPP">{t("channelWHATSAPP")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tpl-body">
                {t("lblBody")} <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="tpl-body"
                placeholder={t("placeholderBody")}
                rows={6}
                value={tplForm.body}
                onChange={(e) =>
                  setTplForm((p) => ({ ...p, body: e.target.value }))
                }
              />
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  {t("availablePlaceholders")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDERS.map((p) => (
                    <span
                      key={p}
                      className="inline-block rounded bg-background px-1.5 py-0.5 text-xs font-mono text-muted-foreground border"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTplDialogOpen(false)}
            >
              {t("btnCancel")}
            </Button>
            <Button onClick={handleSaveTpl} disabled={tplSaving}>
              {tplSaving ? t("btnSaving") : editingTpl ? t("btnUpdateTemplate") : t("btnCreateTemplate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Template Alert ──────────────────────────────────────────── */}
      <AlertDialog
        open={!!tplDeleteTarget}
        onOpenChange={() => setTplDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dlgDeleteTitle", { name: tplDeleteTarget?.name || "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dlgDeleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btnCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleDeleteTpl}
              disabled={tplDeleting}
            >
              {tplDeleting ? t("btnDeleting") : t("btnDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk Send Confirmation ─────────────────────────────────────────── */}
      <AlertDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dlgBulkTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dlgBulkDesc", { status: t("target" + bulkForm.status), channel: t("channel" + bulkForm.channel) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btnCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkSend} disabled={sendingBulk}>
              {sendingBulk ? t("btnSending") : t("btnConfirmSend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
