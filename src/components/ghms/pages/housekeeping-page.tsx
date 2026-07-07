'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Loader2,
  Clock,
  PlayCircle,
  CircleCheck,
  ListTodo,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getHousekeeping,
  createHousekeepingTask,
  updateHousekeepingTask,
  deleteHousekeepingTask,
  getRooms,
} from '@/lib/api';
import { toast } from 'sonner';

interface RoomItem {
  id: string;
  number: string;
  name: string;
  type: string;
}

interface HKTask {
  id: string;
  roomId: string;
  type: string;
  status: string;
  assignedTo: string | null;
  scheduledDate: string;
  notes: string;
  completedAt: string | null;
  createdAt: string;
  room: RoomItem;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const TYPE_STYLES: Record<string, string> = {
  CLEANING: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  MAINTENANCE: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  INSPECTION: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const FILTERS = ['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HKTask[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<HKTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    roomId: '',
    type: 'CLEANING',
    scheduledDate: '',
    assignedTo: '',
    notes: '',
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      if (dateFilter) params.date = dateFilter;
      const data = await getHousekeeping(params);
      setTasks(data);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filter, dateFilter]);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchRooms();
  }, [fetchTasks, fetchRooms]);

  const pending = tasks.filter((t) => t.status === 'PENDING').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedToday = tasks.filter(
    (t) => t.status === 'COMPLETED' && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length;

  const openCreate = () => {
    setEditingTask(null);
    setForm({
      roomId: rooms[0]?.id || '',
      type: 'CLEANING',
      scheduledDate: new Date().toISOString().slice(0, 10),
      assignedTo: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (task: HKTask) => {
    setEditingTask(task);
    setForm({
      roomId: task.roomId,
      type: task.type,
      scheduledDate: task.scheduledDate,
      assignedTo: task.assignedTo || '',
      notes: task.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.roomId || !form.type || !form.scheduledDate) {
      toast.error('Room, Task Type, and Scheduled Date are required');
      return;
    }
    setSaving(true);
    try {
      if (editingTask) {
        await updateHousekeepingTask(editingTask.id, form);
        toast.success('Task updated');
      } else {
        await createHousekeepingTask(form);
        toast.success('Task created');
      }
      setDialogOpen(false);
      fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (task: HKTask) => {
    if (!confirm(`Delete housekeeping task for Room ${task.room.number}?`)) return;
    try {
      await deleteHousekeepingTask(task.id);
      toast.success('Task deleted');
      fetchTasks();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleComplete = async (task: HKTask) => {
    try {
      await updateHousekeepingTask(task.id, { status: 'COMPLETED' });
      toast.success('Task marked as completed');
      fetchTasks();
    } catch {
      toast.error('Failed to complete task');
    }
  };

  const statCards = [
    { label: 'Pending Tasks', value: pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'In Progress', value: inProgress, icon: PlayCircle, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Completed Today', value: completedToday, icon: CircleCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Total Tasks', value: tasks.length, icon: ListTodo, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tasks Table */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Housekeeping Tasks</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All' : f.replace('_', ' ')}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full sm:w-[160px]"
                  placeholder="Filter by date"
                />
                {dateFilter && (
                  <Button variant="ghost" size="icon" onClick={() => setDateFilter('')} title="Clear date filter">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button onClick={openCreate} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No tasks found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Room</TableHead>
                    <TableHead className="text-muted-foreground">Task Type</TableHead>
                    <TableHead className="text-muted-foreground">Scheduled Date</TableHead>
                    <TableHead className="text-muted-foreground">Assigned To</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Notes</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="border-border/50">
                      <TableCell className="font-medium text-foreground">
                        {task.room.name || task.room.number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_STYLES[task.type] || ''}>
                          {task.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{task.scheduledDate}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {task.assignedTo || <span className="text-muted-foreground/50">Unassigned</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[task.status] || ''}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {task.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleComplete(task)}
                              title="Complete"
                              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(task)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(task)}
                            title="Delete"
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border/50 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Housekeeping Task'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="hk-room">Room *</Label>
              <Select value={form.roomId} onValueChange={(v) => setForm({ ...form, roomId: v })}>
                <SelectTrigger id="hk-room">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.number} — {r.name} ({r.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hk-type">Task Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger id="hk-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLEANING">Cleaning</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="INSPECTION">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hk-date">Scheduled Date *</Label>
              <Input
                id="hk-date"
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hk-assign">Assigned To</Label>
              <Input
                id="hk-assign"
                placeholder="Staff name"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hk-notes">Notes</Label>
              <Textarea
                id="hk-notes"
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}