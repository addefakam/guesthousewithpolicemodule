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

const TYPE_LABELS: Record<string, string> = {
  CHECKIN_REMINDER: "Check-in Reminder",
  WELCOME: "Welcome",
  CHECKOUT_REMINDER: "Checkout Reminder",
  CONFIRMATION: "Confirmation",
  CUSTOM: "Custom",
};

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
  const { t } = useTranslation();
  const { refreshKey } = useAppStore();
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
      toast.error("Failed to load message templates");
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
      toast.error("Failed to load message history");
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
      toast.error("Template name and body are required");
      return;
    }
    setTplSaving(true);
    try {
      if (editingTpl) {
        await apiUpdateMessageTemplate(editingTpl.id, tplForm);
        toast.success("Template updated");
      } else {
        await apiCreateMessageTemplate(tplForm);
        toast.success("Template created");
      }
      setTplDialogOpen(false);
      fetchTemplates();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setTplSaving(false);
    }
  };

  const handleDeleteTpl = async () => {
    if (!tplDeleteTarget) return;
    setTplDeleting(true);
    try {
      await apiDeleteMessageTemplate(tplDeleteTarget.id);
      toast.success("Template deleted");
      setTplDeleteTarget(null);
      fetchTemplates();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
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
      toast.success(next ? "Template activated" : "Template deactivated");
    } catch {
      toast.error("Failed to toggle template");
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
      toast.error("Recipient phone number is required");
      return;
    }
    if (!singleForm.message.trim()) {
      toast.error("Message body is required");
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
      toast.success("Message sent successfully");
      setSingleForm(emptySingleForm);
      fetchLogs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSendingSingle(false);
    }
  };

  const handleBulkSend = async () => {
    if (!bulkForm.templateId) {
      toast.error("Please select a template");
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
      toast.success(`${sent} messages sent, ${failed} failed`);
      setBulkConfirmOpen(false);
      setBulkForm(emptyBulkForm);
      fetchLogs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bulk send failed");
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
            Guest Communication
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send SMS/WhatsApp messages to guests
          </p>
        </div>
        {activeTab === "templates" && (
          <Button onClick={openCreateTpl} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            Send Message
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Message History
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
                No message templates
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Create your first template to get started
              </p>
              <Button
                onClick={openCreateTpl}
                variant="outline"
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" /> New Template
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
                              {TYPE_LABELS[tpl.type] ?? tpl.type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${channelColor}`}
                            >
                              {tpl.channel}
                            </Badge>
                            {tpl.isDefault && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                              >
                                Default
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
                            {tpl.isActive ? "Active" : "Inactive"}
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
                  Single Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="single-recipient">
                    Recipient Phone <span className="text-rose-500">*</span>
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
                  <Label>{t('lblchannel', 'Channel')}</Label>
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
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('lbltemplateOptional', 'Template (Optional)')}</Label>
                  <Select
                    value={singleForm.templateId}
                    onValueChange={handleSingleTemplateChange}
                  >
                    <SelectTrigger id="single-template">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates
                        .filter((x) => x.isActive)
                        .map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.name} ({x.channel})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="single-message">
                    Message <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="single-message"
                    placeholder="Type your message here..."
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
                      Preview from template &ldquo;{selectedTemplateForSingle.name}
                      &rdquo;. You can edit before sending.
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSendSingle}
                  disabled={sendingSingle}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendingSingle ? "Sending..." : "Send Message"}
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Send */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Bulk Send
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-template">
                    Template <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={bulkForm.templateId}
                    onValueChange={(v) =>
                      setBulkForm((p) => ({ ...p, templateId: v }))
                    }
                  >
                    <SelectTrigger id="bulk-template">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates
                        .filter((x) => x.isActive)
                        .map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.name} ({x.channel})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('lbltargetGuests', 'Target Guests')}</Label>
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
                      <SelectItem value="UPCOMING">Upcoming</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('lblchannel', 'Channel')}</Label>
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
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bulkForm.templateId && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Template Preview
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
                  Send to All {bulkForm.status === "UPCOMING" ? "Upcoming" : bulkForm.status === "ACTIVE" ? "Active" : "Completed"} Guests
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
                <Label>{t('lblstatus', 'Status:')}</Label>
                <Select
                  value={filterStatus}
                  onValueChange={setFilterStatus}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>{t('lblchannel', 'Channel:')}</Label>
                <Select
                  value={filterChannel}
                  onValueChange={setFilterChannel}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                {logsTotal} message{logsTotal !== 1 ? "s" : ""}
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
                  No messages found
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Messages you send will appear here
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('thdate', 'Date')}</TableHead>
                        <TableHead>{t('threcipient', 'Recipient')}</TableHead>
                        <TableHead>{t('thchannel', 'Channel')}</TableHead>
                        <TableHead>{t('thtemplate', 'Template')}</TableHead>
                        <TableHead>{t('thstatus', 'Status')}</TableHead>
                        <TableHead>{t('thmessage', 'Message')}</TableHead>
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
                              {log.channel}
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
                            {log.status}
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
                              {log.channel}
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
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {logsPage} of {logsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logsPage >= logsTotalPages}
                      onClick={() => setLogsPage((p) => p + 1)}
                    >
                      Next
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
              {editingTpl ? "Edit Template" : "New Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTpl
                ? "Update the message template details."
                : "Create a new message template for guest communications."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Check-in Reminder"
                value={tplForm.name}
                onChange={(e) =>
                  setTplForm((p) => ({ ...p, name: e.target.value }))
                }
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('lbltype', 'Type')}</Label>
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
                    <SelectItem value="CHECKIN_REMINDER">
                      Check-in Reminder
                    </SelectItem>
                    <SelectItem value="WELCOME">Welcome</SelectItem>
                    <SelectItem value="CHECKOUT_REMINDER">
                      Checkout Reminder
                    </SelectItem>
                    <SelectItem value="CONFIRMATION">
                      Confirmation
                    </SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('lblchannel', 'Channel')}</Label>
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
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tpl-body">
                Body <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="tpl-body"
                placeholder="Write your message template..."
                rows={6}
                value={tplForm.body}
                onChange={(e) =>
                  setTplForm((p) => ({ ...p, body: e.target.value }))
                }
              />
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  Available Placeholders
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
              Cancel
            </Button>
            <Button onClick={handleSaveTpl} disabled={tplSaving}>
              {tplSaving
                ? "Saving..."
                : editingTpl
                  ? "Update Template"
                  : "Create Template"}
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
              Delete &quot;{tplDeleteTarget?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this template. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleDeleteTpl}
              disabled={tplDeleting}
            >
              {tplDeleting ? "Deleting..." : "Delete"}
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
            <AlertDialogTitle>Confirm Bulk Send</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the selected template to all{" "}
              {bulkForm.status === "UPCOMING"
                ? "upcoming"
                : bulkForm.status === "ACTIVE"
                  ? "active"
                  : "completed"}{" "}
              guests via {bulkForm.channel}. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkSend} disabled={sendingBulk}>
              {sendingBulk ? "Sending..." : "Confirm Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
