"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiGetTasks, apiCreateTask, apiUpdateTask, apiDeleteTask } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Trash2,
  Play,
  Check,
  Loader2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
} from "lucide-react";

// ── Types ──

interface TaskUser {
  id: string;
  name: string;
  username: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category: string;
  dueDate: string;
  assignedToUserId: string | null;
  assignedToUser: TaskUser | null;
  assignedByUser: TaskUser | null;
  completedByUser: TaskUser | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StaffUser {
  id: string;
  name: string;
  username: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-600 border-slate-200",
  MEDIUM: "bg-sky-50 text-sky-700 border-sky-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  URGENT: "bg-rose-50 text-rose-700 border-rose-200",
};

const TODAY = new Date().toISOString().slice(0, 10);

export default function TasksPage() {
  const { t } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const currentUser = useAppStore((s) => s.currentUser);

  // STAFF can view tasks (and complete ones assigned to them), but only
  // OPERATOR / SUPERUSER can create or delete tasks. Server enforces the
  // same restrictions — UI gating is just for clarity.
  const canManage = currentUser?.role === "OPERATOR" || currentUser?.role === "SUPERUSER";
  const isStaff = currentUser?.role === "STAFF";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "MINE">("ALL");

  // New task dialog
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as Task["priority"],
    category: "General",
    dueDate: "",
    assignedToUserId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Build the filter query
      const params = new URLSearchParams();
      if (filter === "MINE") {
        params.set("mine", "1");
      } else if (filter !== "ALL") {
        params.set("status", filter);
      }
      const res = (await apiGetTasks(params.toString())) as { data: Task[] };
      setTasks(res.data || []);

      // Fetch staff list (for the assign-to dropdown) — only operators need this
      if (canManage) {
        const staffRes = (await fetch("/api/users?role=STAFF").then((r) => r.json())) as { data: StaffUser[] };
        setStaff(staffRes.data || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load tasks";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filter, canManage]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleCreate() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setCreating(true);
    try {
      await apiCreateTask({
        title: form.title,
        description: form.description,
        priority: form.priority,
        category: form.category || "General",
        dueDate: form.dueDate,
        assignedToUserId: form.assignedToUserId || null,
      });
      toast.success(t("taskCreated", { defaultValue: "Task created" }));
      setShowCreate(false);
      setForm({ title: "", description: "", priority: "MEDIUM", category: "General", dueDate: "", assignedToUserId: "" });
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create task";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(task: Task, newStatus: Task["status"]) {
    try {
      await apiUpdateTask(task.id, { status: newStatus });
      toast.success(
        newStatus === "COMPLETED"
          ? t("taskCompleted", { defaultValue: "Task marked complete" })
          : t("taskUpdated", { defaultValue: "Task updated" })
      );
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update task";
      toast.error(msg);
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Cancel task "${task.title}"? This cannot be undone.`)) return;
    try {
      await apiDeleteTask(task.id);
      toast.success(t("taskDeleted", { defaultValue: "Task cancelled" }));
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete task";
      toast.error(msg);
    }
  }

  const filteredTasks = tasks; // server already filters

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-500" />
            {t("tasksTitle", { defaultValue: "Tasks" })}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isStaff
              ? t("tasksSubtitleStaff", { defaultValue: "Tasks assigned to you. Mark them in progress or complete." })
              : t("tasksSubtitleOperator", { defaultValue: "Assign work to your staff and track completion." })}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("btnNewTask", { defaultValue: "New Task" })}
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "MINE", "PENDING", "IN_PROGRESS", "COMPLETED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
            }`}
          >
            {f === "ALL" && (t("filterAll", { defaultValue: "All" }))}
            {f === "MINE" && (t("filterMine", { defaultValue: "Mine" }))}
            {f === "PENDING" && (t("filterPending", { defaultValue: "Pending" }))}
            {f === "IN_PROGRESS" && (t("filterInProgress", { defaultValue: "In Progress" }))}
            {f === "COMPLETED" && (t("filterCompleted", { defaultValue: "Completed" }))}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              {t("tasksEmpty", { defaultValue: "No tasks here yet." })}
            </p>
            {canManage && (
              <Button onClick={() => setShowCreate(true)} variant="outline" size="sm" className="mt-3">
                <Plus className="h-4 w-4 mr-1.5" />
                {t("btnNewTask", { defaultValue: "Create the first task" })}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isOverdue =
              task.dueDate &&
              task.dueDate < TODAY &&
              task.status !== "COMPLETED" &&
              task.status !== "CANCELLED";
            return (
              <Card key={task.id} className={`overflow-hidden ${isOverdue ? "border-rose-300" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title + priority */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {task.title}
                        </h3>
                        <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      {/* Status badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[task.status]}`}>
                          {task.status === "IN_PROGRESS" ? "IN PROGRESS" : task.status}
                        </Badge>
                        {task.category && task.category !== "General" && (
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                            {task.category}
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            OVERDUE
                          </Badge>
                        )}
                      </div>
                      {/* Description */}
                      {task.description && (
                        <p className="text-xs text-slate-600 mb-2 whitespace-pre-wrap">
                          {task.description}
                        </p>
                      )}
                      {/* Meta row */}
                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                        {task.assignedToUser && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {t("assignedTo", { defaultValue: "Assigned to" })}:{" "}
                            <strong className="text-slate-700">{task.assignedToUser.name}</strong>
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t("due", { defaultValue: "Due" })}: <strong className={isOverdue ? "text-rose-700" : "text-slate-700"}>{task.dueDate}</strong>
                          </span>
                        )}
                        {task.completedByUser && task.completedAt && (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <Check className="h-3 w-3" />
                            {t("completedBy", { defaultValue: "Completed by" })}{" "}
                            <strong>{task.completedByUser.name}</strong>{" "}
                            {t("on", { defaultValue: "on" })}{" "}
                            {new Date(task.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {task.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(task, "IN_PROGRESS")}
                          className="h-8 text-xs"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {t("btnStart", { defaultValue: "Start" })}
                        </Button>
                      )}
                      {(task.status === "PENDING" || task.status === "IN_PROGRESS") && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(task, "COMPLETED")}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {t("btnComplete", { defaultValue: "Complete" })}
                        </Button>
                      )}
                      {canManage && task.status !== "CANCELLED" && task.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(task)}
                          className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("createTask", { defaultValue: "Create Task" })}
            </DialogTitle>
            <DialogDescription>
              {t("createTaskDesc", { defaultValue: "Assign work to a staff member. They'll see it in their Tasks list." })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">{t("titleLabel", { defaultValue: "Title" })} *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("titlePlaceholder", { defaultValue: "e.g. Clean room 101" })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">{t("descriptionLabel", { defaultValue: "Description" })}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("descriptionPlaceholder", { defaultValue: "Optional details or instructions" })}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("priorityLabel", { defaultValue: "Priority" })}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task["priority"] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("categoryLabel", { defaultValue: "Category" })}</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Cleaning"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("dueDateLabel", { defaultValue: "Due Date" })}</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">{t("assignToLabel", { defaultValue: "Assign To" })}</Label>
                <Select
                  value={form.assignedToUserId}
                  onValueChange={(v) => setForm({ ...form, assignedToUserId: v })}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t("unassigned", { defaultValue: "Unassigned" })} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("unassigned", { defaultValue: "— Unassigned —" })}</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
              {t("btnCancel", { defaultValue: "Cancel" })}
            </Button>
            <Button onClick={handleCreate} disabled={creating || !form.title.trim()}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  {t("creating", { defaultValue: "Creating..." })}
                </>
              ) : (
                t("btnCreate", { defaultValue: "Create Task" })
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
