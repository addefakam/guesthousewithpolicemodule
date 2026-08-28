"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import {
  apiGetHousekeeping,
  apiCreateHousekeeping,
  apiUpdateHousekeeping,
  apiDeleteHousekeeping,
  apiGetRooms,
} from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  Sparkles,
  Wrench,
  ClipboardCheck,
  BedDouble,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  number: string;
  name: string;
  type: string;
  status: string;
}

interface Task {
  id: string;
  roomId: string;
  type: string;
  status: string;
  assignedTo: string | null;
  scheduledDate: string;
  notes: string;
  completedAt: string | null;
  room?: { id: string; number: string; name: string };
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TASK_TYPES = ["CLEANING", "MAINTENANCE", "INSPECTION"] as const;

const TASK_TYPE_STYLES: Record<string, { badge: string; icon: React.ReactNode }> = {
  CLEANING: { badge: "bg-sky-100 text-sky-800 border-sky-200", icon: <Sparkles className="h-3.5 w-3.5" /> },
  MAINTENANCE: { badge: "bg-amber-100 text-amber-800 border-amber-200", icon: <Wrench className="h-3.5 w-3.5" /> },
  INSPECTION: { badge: "bg-violet-100 text-violet-800 border-violet-200", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800 border-gray-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const STATUS_TABS = ["all", "PENDING", "IN_PROGRESS", "COMPLETED"] as const;

// ─── Component ─────────────────────────────────────────────────────────────

export default function HousekeepingPage() {
  const { t } = useTranslation(["operations", "common"]);
  const { refreshKey, triggerRefresh } = useAppStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({
    roomId: "", type: "CLEANING", assignedTo: "", scheduledDate: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [taskData, roomData] = await Promise.all([
        apiGetHousekeeping(),
        apiGetRooms(),
      ]);
      setTasks(Array.isArray(taskData.tasks) ? taskData.tasks : []);
      setRooms(Array.isArray(roomData) ? roomData : roomData.rooms || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastDataLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return tasks;
    return tasks.filter((x) => x.status === statusFilter);
  }, [tasks, statusFilter]);

  const getRoomLabel = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) return room.name ? t("roomLabelWithName", { number: room.number, name: room.name }) : t("roomLabel", { number: room.number });
    return t("unknownRoom");
  };

  const taskTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      CLEANING: t("taskTypeCleaning"),
      MAINTENANCE: t("taskTypeMaintenance"),
      INSPECTION: t("taskTypeInspection"),
    };
    return map[type] || type;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      PENDING: t("statusPending"),
      IN_PROGRESS: t("statusInProgress"),
      COMPLETED: t("statusCompleted"),
    };
    return map[s] || s.replace("_", " ");
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm({
      roomId: rooms[0]?.id || "",
      type: "CLEANING",
      assignedTo: "",
      scheduledDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      roomId: task.roomId,
      type: task.type,
      assignedTo: task.assignedTo || "",
      scheduledDate: task.scheduledDate,
      notes: task.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.roomId || !form.type || !form.scheduledDate) {
      toast.error(t("toastHkRequiredFields"));
      return;
    }
    try {
      setSaving(true);
      const payload = {
        roomId: form.roomId,
        type: form.type,
        assignedTo: form.assignedTo || null,
        scheduledDate: form.scheduledDate,
        notes: form.notes,
      };
      if (editing) {
        await apiUpdateHousekeeping(editing.id, payload);
        toast.success(t("toastTaskUpdated"));
      } else {
        await apiCreateHousekeeping(payload);
        toast.success(t("toastTaskCreated"));
      }
      setDialogOpen(false);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastTaskSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiDeleteHousekeeping(deleteTarget.id);
      toast.success(t("toastTaskDeleted"));
      setDeleteTarget(null);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastTaskDeleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: string) => {
    try {
      await apiUpdateHousekeeping(task.id, { status: newStatus });
      toast.success(t("toastTaskMarked", { status: newStatus.replace("_", " ") }));
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastStatusUpdateFailed"));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-48" /><Skeleton className="mt-1 h-4 w-64" /></div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-md" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("housekeepingTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("housekeepingDesc")}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t("addTask")}
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((status) => {
          const count = status === "all" ? tasks.length : tasks.filter((x) => x.status === status).length;
          return (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="gap-1.5"
            >
              {status === "all" ? t("all") : statusLabel(status)}
              <Badge
                variant={statusFilter === status ? "secondary" : "outline"}
                className="ml-1 h-5 min-w-[1.5rem] px-1.5 text-xs"
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Table */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <BedDouble className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-500">
            {statusFilter === "all" ? t("noTasksYet") : t("noFilteredTasks", { status: statusLabel(statusFilter).toLowerCase() })}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {statusFilter === "all"
              ? t("createTaskToStart")
              : t("tryDifferentStatus")}
          </p>
          {statusFilter === "all" && (
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> {t("addTask")}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('throom')}</TableHead>
                  <TableHead>{t('thtype')}</TableHead>
                  <TableHead>{t('thstatus')}</TableHead>
                  <TableHead>{t('thassignedTo')}</TableHead>
                  <TableHead>{t('thscheduledDate')}</TableHead>
                  <TableHead>{t('thnotes')}</TableHead>
                  <TableHead>{t('thactions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className={task.status === "COMPLETED" ? "opacity-60" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {task.room?.number ? t("roomLabel", { number: task.room.number }) : getRoomLabel(task.roomId)}
                          </p>
                          {task.room?.name && (
                            <p className="text-xs text-gray-500">{task.room.name}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`gap-1 ${TASK_TYPE_STYLES[task.type]?.badge || TASK_TYPE_STYLES.CLEANING.badge}`}
                      >
                        {TASK_TYPE_STYLES[task.type]?.icon}
                        {taskTypeLabel(task.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[task.status] || STATUS_STYLES.PENDING}>
                        {statusLabel(task.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {task.assignedTo || <span className="text-gray-400">{t("unassigned")}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{task.scheduledDate}</TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="text-sm text-gray-500 truncate">{task.notes || "—"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {task.status !== "COMPLETED" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task, "COMPLETED")}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> {t("markComplete")}
                            </DropdownMenuItem>
                          )}
                          {task.status !== "COMPLETED" && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(task, "PENDING")} disabled={task.status === "PENDING"}>
                                {t("setPending")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(task, "IN_PROGRESS")} disabled={task.status === "IN_PROGRESS"}>
                                {t("setInProgress")}
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => openEdit(task)}>
                            <Pencil className="mr-2 h-4 w-4" /> {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-600"
                            onClick={() => setDeleteTarget(task)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("editTask") : t("addNewTask")}</DialogTitle>
            <DialogDescription>
              {editing ? t("updateTaskDesc") : t("addNewTaskDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("throom")} <span className="text-rose-500">*</span></Label>
              <Select value={form.roomId} onValueChange={(v) => setForm({ ...form, roomId: v })}>
                <SelectTrigger><SelectValue placeholder={t("selectRoomPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {t("roomLabel", { number: room.number })}{room.name ? ` — ${room.name}` : ""} ({room.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("thtype")} <span className="text-rose-500">*</span></Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((x) => (
                      <SelectItem key={x} value={x} className="gap-1.5">
                        <span className="mr-1">
                          {TASK_TYPE_STYLES[x]?.icon}
                        </span>
                        {taskTypeLabel(x)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("thscheduledDate")} <span className="text-rose-500">*</span></Label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('lblassignedTo')}</Label>
              <Input
                placeholder={t("staffPlaceholder")}
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('lblnotes')}</Label>
              <Textarea
                placeholder={t("notesPlaceholder")}
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("saving") : editing ? t("updateTask") : t("createTask")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Alert ──────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTaskTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteTaskDesc", { type: deleteTarget?.type?.toLowerCase(), room: deleteTarget?.room?.number ? t("roomLabel", { number: deleteTarget.room.number }) : "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
