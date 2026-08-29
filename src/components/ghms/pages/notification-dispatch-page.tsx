"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  apiGetBroadcastProviders,
  apiSendBroadcast,
  apiGetBroadcastHistory,
} from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Megaphone,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  ShieldCheck,
  Building2,
  MessageSquare,
  Smartphone,
  Bell,
  AlertTriangle,
  Radio,
  CheckCheck,
  History,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Types ─────────────────────────────────────────────────────────────────

interface BroadcastProvider {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  type: string;
  status: string;
  telegramChatId: string;
  hasPhone: boolean;
  hasTelegram: boolean;
  roomCount: number;
  guestCount: number;
  userCount: number;
}

interface BroadcastRecord {
  id: string;
  title: string;
  message: string;
  channel: string;
  priority: string;
  targetType: string;
  targetIds: string;
  sentBy: string;
  sentByName: string;
  totalSent: number;
  totalFailed: number;
  status: string;
  createdAt: string;
}

// ─── Channel config ─────────────────────────────────────────────────────────

const CHANNELS = [
  { value: "IN_APP", icon: Bell, color: "text-blue-500" },
  { value: "SMS", icon: Smartphone, color: "text-green-500" },
  { value: "WHATSAPP", icon: MessageSquare, color: "text-emerald-500" },
  { value: "TELEGRAM", icon: Send, color: "text-sky-500" },
];

const PRIORITIES = [
  { value: "LOW", color: "bg-slate-100 text-slate-600" },
  { value: "NORMAL", color: "bg-blue-100 text-blue-600" },
  { value: "HIGH", color: "bg-amber-100 text-amber-600" },
  { value: "URGENT", color: "bg-rose-100 text-rose-600" },
];

function getPriorityBadge(priority: string) {
  const p = PRIORITIES.find((pr) => pr.value === priority);
  return p ? p : PRIORITIES[1];
}

function getChannelIcon(channel: string) {
  return CHANNELS.find((c) => c.value === channel) || CHANNELS[0];
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function NotificationDispatchPage() {
  const { t } = useTranslation("notificationDispatch");
  const currentUser = useAppStore((s) => s.currentUser);
  const isPolice = currentUser?.role === "POLICE";
  const isAdmin = currentUser?.role === "SUPERUSER";
  const isViewer = isPolice && currentUser?.policeRank === "VIEWER";

  return (
    <div className="flex h-full flex-col gap-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 shadow-sm">
              <Megaphone className="size-5 text-white" />
            </div>
            {t('pageTitle')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isPolice
              ? t('pageSubtitlePolice')
              : t('pageSubtitleAdmin')}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {isPolice && (
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold">
              <Shield className="mr-1 size-3" />
              {t('badgePolice')} {currentUser?.policeRank || ""}
            </Badge>
          )}
          {isAdmin && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold">
              <ShieldCheck className="mr-1 size-3" />
              {t('badgeSystemAdmin')}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="compose" className="flex-1">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Radio className="size-4" />
            {t('tabCompose')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="size-4" />
            {t('tabHistory')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-6">
          <ComposeTab isViewer={isViewer} isPolice={isPolice} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Compose Tab ────────────────────────────────────────────────────────────

function ComposeTab({
  isViewer,
  isPolice,
  isAdmin,
}: {
  isViewer: boolean;
  isPolice: boolean;
  isAdmin: boolean;
}) {
  const { t } = useTranslation("notificationDispatch");

  const getChannelLabel = (val: string) => {
    const map: Record<string, string> = {
      IN_APP: t('channelsInApp'),
      SMS: t('channelsSms'),
      WHATSAPP: t('channelsWhatsapp'),
      TELEGRAM: t('channelsTelegram'),
    };
    return map[val] || val;
  };
  const getPriorityLabel = (val: string) => {
    const map: Record<string, string> = {
      LOW: t('prioritiesLow'),
      NORMAL: t('prioritiesNormal'),
      HIGH: t('prioritiesHigh'),
      URGENT: t('prioritiesUrgent'),
    };
    return map[val] || val;
  };

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("IN_APP");
  const [priority, setPriority] = useState("NORMAL");
  const [targetType, setTargetType] = useState<"ALL_PROVIDERS" | "SELECTED_PROVIDERS">("ALL_PROVIDERS");
  const [providers, setProviders] = useState<BroadcastProvider[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGetBroadcastProviders();
      const arr = Array.isArray(data) ? data : [];
      setProviders(arr);
    } catch (err) {
      console.error("Failed to load providers:", err);
      toast.error(t('errorLoadProviders'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Filter providers by search
  const filteredProviders = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProvider = (id: string) => {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedProviders.size === filteredProviders.length) {
      setSelectedProviders(new Set());
    } else {
      setSelectedProviders(new Set(filteredProviders.map((p) => p.id)));
    }
  };

  const canSend =
    !isViewer && title.trim() && message.trim() &&
    (targetType === "ALL_PROVIDERS" || selectedProviders.size > 0);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const result = await apiSendBroadcast({
        title: title.trim(),
        message: message.trim(),
        channel,
        priority,
        targetType,
        providerIds: targetType === "SELECTED_PROVIDERS" ? Array.from(selectedProviders) : [],
      });
      toast.success(
        t('successSent', { sent: result.sent, failed: result.failed }),
        { description: t('successSentDesc', { channel: getChannelLabel(channel), priority: getPriorityLabel(priority) }) }
      );
      // Reset form
      setTitle("");
      setMessage("");
      setPriority("NORMAL");
      setSelectedProviders(new Set());
      setTargetType("ALL_PROVIDERS");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorSendBroadcast'));
    } finally {
      setSending(false);
    }
  };

  // Check if selected channel is available for selected providers
  const getChannelAvailability = () => {
    if (targetType === "ALL_PROVIDERS") {
      const targetList = filteredProviders;
      if (channel === "SMS" || channel === "WHATSAPP") {
        const withPhone = targetList.filter((p) => p.hasPhone).length;
        return { available: withPhone, total: targetList.length, label: t('availabilityPhone') };
      }
      if (channel === "TELEGRAM") {
        const withTelegram = targetList.filter((p) => p.hasTelegram).length;
        return { available: withTelegram, total: targetList.length, label: t('availabilityTelegram') };
      }
      return { available: targetList.length, total: targetList.length, label: "" };
    }
    const selected = providers.filter((p) => selectedProviders.has(p.id));
    if (channel === "SMS" || channel === "WHATSAPP") {
      const withPhone = selected.filter((p) => p.hasPhone).length;
      return { available: withPhone, total: selected.length, label: t('availabilityPhone') };
    }
    if (channel === "TELEGRAM") {
      const withTelegram = selected.filter((p) => p.hasTelegram).length;
      return { available: withTelegram, total: selected.length, label: t('availabilityTelegram') };
    }
    return { available: selected.length, total: selected.length, label: "" };
  };

  const availability = getChannelAvailability();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column — Compose form */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="size-5 text-primary" />
              {t('composeTitle')}
            </CardTitle>
            <CardDescription>
              {t('composeDescription')}
              {isViewer && (
                <span className="block mt-1 text-amber-600 font-medium">
                  {t('viewerWarning')}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                {t('lblTitle')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder={t('placeholderTitle')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isViewer}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                {t('lblMessage')} <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="message"
                placeholder={t('placeholderMessage')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                disabled={isViewer}
                className="resize-y"
              />
              <p className="text-xs text-slate-400">{message.length} {t('characters')}</p>
            </div>

            {/* Channel & Priority row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('lbldeliveryChannel', 'Delivery Channel')}</Label>
                <Select value={channel} onValueChange={setChannel} disabled={isViewer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((ch) => {
                      const Icon = ch.icon;
                      return (
                        <SelectItem key={ch.value} value={ch.value}>
                          <span className="flex items-center gap-2">
                            <Icon className={`size-4 ${ch.color}`} />
                            {getChannelLabel(ch.value)}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {/* Channel availability warning */}
                {channel !== "IN_APP" && availability.label && (
                  <div className={`text-xs mt-1.5 flex items-center gap-1.5 ${
                    availability.available === 0
                      ? "text-rose-600"
                      : availability.available < availability.total
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}>
                    {availability.available === 0 ? (
                      <XCircle className="size-3" />
                    ) : availability.available < availability.total ? (
                      <AlertTriangle className="size-3" />
                    ) : (
                      <CheckCircle2 className="size-3" />
                    )}
                    {t('availabilityWarning', { available: availability.available, total: availability.total, label: availability.label })}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('lblpriorityLevel', 'Priority Level')}</Label>
                <Select value={priority} onValueChange={setPriority} disabled={isViewer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((pr) => (
                      <SelectItem key={pr.value} value={pr.value}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${
                            pr.value === "URGENT"
                              ? "bg-rose-500"
                              : pr.value === "HIGH"
                              ? "bg-amber-500"
                              : pr.value === "NORMAL"
                              ? "bg-blue-500"
                              : "bg-slate-400"
                          }`} />
                          {getPriorityLabel(pr.value)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Type */}
            <div className="space-y-2">
              <Label>{t('lbltargetAudience', 'Target Audience')}</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="targetType"
                    value="ALL_PROVIDERS"
                    checked={targetType === "ALL_PROVIDERS"}
                    onChange={() => setTargetType("ALL_PROVIDERS")}
                    disabled={isViewer}
                    className="accent-primary"
                  />
                  {t('allApprovedProviders')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="targetType"
                    value="SELECTED_PROVIDERS"
                    checked={targetType === "SELECTED_PROVIDERS"}
                    onChange={() => setTargetType("SELECTED_PROVIDERS")}
                    disabled={isViewer}
                    className="accent-primary"
                  />
                  {t('selectedProvidersOnly')}
                </label>
              </div>
            </div>

            {/* Send button */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSend}
                disabled={!canSend || sending}
                className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-md"
              >
                {sending ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('dispatching')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" />
                    {t('dispatchTo')}{" "}
                    {targetType === "ALL_PROVIDERS"
                      ? t('allCount', { count: providers.length })
                      : t('selectedCount', { count: selectedProviders.size })}{" "}
                    {t('providers')}
                  </>
                )}
              </Button>
              {priority === "URGENT" && (
                <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 animate-pulse">
                  <AlertTriangle className="mr-1 size-3" />
                  {t('urgentBadge')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column — Provider selection */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                {t('providers')}
              </span>
              <Badge variant="secondary" className="text-xs">
                {targetType === "ALL_PROVIDERS"
                  ? providers.length
                  : selectedProviders.size} / {providers.length}
              </Badge>
            </CardTitle>
            {targetType === "SELECTED_PROVIDERS" && (
              <>
                <Input
                  placeholder={t('searchProviders')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-2"
                />
                <div className="flex items-center justify-between mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500">
                    <Checkbox
                      checked={
                        filteredProviders.length > 0 &&
                        selectedProviders.size === filteredProviders.length
                      }
                      onCheckedChange={toggleAll}
                      disabled={isViewer}
                    />
                    {t('selectAll')}
                  </label>
                </div>
              </>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <Building2 className="size-8" />
                <p className="text-sm">{t('emptyProviders')}</p>
              </div>
            ) : (
              <ScrollArea className="h-[420px]">
                <div className="px-4 pb-4 space-y-1">
                  {(targetType === "ALL_PROVIDERS" ? providers : filteredProviders).map(
                    (provider) => {
                      const isSelected =
                        targetType === "ALL_PROVIDERS" ||
                        selectedProviders.has(provider.id);
                      return (
                        <div
                          key={provider.id}
                          className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                            isSelected
                              ? "border-primary/30 bg-primary/5"
                              : "border-transparent hover:bg-slate-50"
                          }`}
                        >
                          {targetType === "SELECTED_PROVIDERS" && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleProvider(provider.id)}
                              disabled={isViewer}
                              className="mt-0.5"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {provider.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {provider.ownerName} · {provider.address}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {provider.type}
                              </Badge>
                              <span className="text-[10px] text-slate-400">
                                {provider.roomCount} {t('rooms')} · {provider.guestCount} {t('guests')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              {provider.hasPhone && (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                                  <Smartphone className="size-3" />
                                  {t('smsWhatsapp')}
                                </span>
                              )}
                              {provider.hasTelegram && (
                                <span className="flex items-center gap-1 text-[10px] text-sky-600">
                                  <Send className="size-3" />
                                  {t('channelsTelegram')}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[10px] text-blue-600">
                                <Bell className="size-3" />
                                {t('inAppUsers', { count: provider.userCount })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────────────

function HistoryTab() {
  const { t } = useTranslation("notificationDispatch");

  const getChannelLabel = (val: string) => {
    const map: Record<string, string> = {
      IN_APP: t('channelsInApp'),
      SMS: t('channelsSms'),
      WHATSAPP: t('channelsWhatsapp'),
      TELEGRAM: t('channelsTelegram'),
    };
    return map[val] || val;
  };
  const getPriorityLabel = (val: string) => {
    const map: Record<string, string> = {
      LOW: t('prioritiesLow'),
      NORMAL: t('prioritiesNormal'),
      HIGH: t('prioritiesHigh'),
      URGENT: t('prioritiesUrgent'),
    };
    return map[val] || val;
  };

  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await apiGetBroadcastHistory(`page=${p}&limit=20`);
      const data = Array.isArray(res?.data) ? res.data : [];
      setBroadcasts(data);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load broadcast history:", err);
      toast.error(t('errorLoadHistory'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchHistory(page);
  }, [page, fetchHistory]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5 text-primary" />
          {t('historyTitle')}
        </CardTitle>
        <CardDescription>
          {t('historyDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <History className="size-12" />
            <div className="text-center">
              <p className="text-sm font-medium">{t('emptyHistory')}</p>
              <p className="text-xs mt-1">{t('emptyHistorySub')}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('thdate', 'Date')}</TableHead>
                    <TableHead>{t('thtitle', 'Title')}</TableHead>
                    <TableHead>{t('thchannel', 'Channel')}</TableHead>
                    <TableHead>{t('thpriority', 'Priority')}</TableHead>
                    <TableHead>{t('thtarget', 'Target')}</TableHead>
                    <TableHead>{t('thdelivery', 'Delivery')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.map((b) => {
                    const ch = getChannelIcon(b.channel);
                    const ChIcon = ch.icon;
                    const pr = getPriorityBadge(b.priority);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3" />
                            {new Date(b.createdAt).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {t('sentBy', { name: b.sentByName || b.sentBy })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-slate-900 line-clamp-1">
                            {b.title}
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-[250px]">
                            {b.message}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1.5 text-xs ${ch.color}`}>
                            <ChIcon className="size-3.5" />
                            {getChannelLabel(b.channel)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${pr.color}`}
                          >
                            {getPriorityLabel(b.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {b.targetType === "ALL_PROVIDERS"
                            ? t('targetAll')
                            : t('targetSelected', { count: JSON.parse(b.targetIds || "[]").length })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCheck className="size-3" />
                              {b.totalSent}
                            </span>
                            {b.totalFailed > 0 && (
                              <span className="flex items-center gap-1 text-xs text-rose-500">
                                <XCircle className="size-3" />
                                {b.totalFailed}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  {t('previous')}
                </Button>
                <span className="text-sm text-slate-500">
                  {t('pageOf', { page, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  {t('next')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
