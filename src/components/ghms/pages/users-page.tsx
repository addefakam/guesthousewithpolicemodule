'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Shield, Loader2, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface UserRecord {
  id: string;
  username: string;
  role: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const ROLE_STYLES: Record<string, string> = {
  SUPERUSER: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  OPERATOR: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  STAFF: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export default function UsersPage() {
  const { currentUser } = useAppStore();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'STAFF', name: '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', role: 'STAFF', name: '' });
    setDialogOpen(true);
  };

  const openEdit = (user: UserRecord) => {
    setEditingUser(user);
    setForm({ username: user.username, password: '', role: user.role, name: user.name });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.username.trim() || !form.name.trim()) {
      toast.error('Username and Name are required');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      toast.error('Password is required for new users');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const data: Record<string, string> = {
          id: editingUser.id,
          username: form.username,
          role: form.role,
          name: form.name,
        };
        if (form.password.trim()) data.password = form.password;
        await updateUser(editingUser.id, data);
        toast.success('User updated');
      } else {
        await createUser(form);
        toast.success('User created');
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserRecord) => {
    if (user.id === currentUser?.id) {
      toast.error('Cannot delete your own account');
      return;
    }
    if (!confirm(`Delete user "${user.name}" (${user.username})?`)) return;
    try {
      await deleteUser(user.id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  if (currentUser?.role !== 'SUPERUSER') {
    return (
      <div className="space-y-6">
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Only superusers can manage user accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCog className="h-5 w-5 text-primary" />
              User Management
            </CardTitle>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Username</TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    <TableHead className="text-muted-foreground">Created Date</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-border/50">
                      <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ROLE_STYLES[user.role] || ''}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user)}
                            disabled={user.id === currentUser?.id}
                            title={user.id === currentUser?.id ? 'Cannot delete yourself' : 'Delete'}
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
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user-name">Name *</Label>
              <Input
                id="user-name"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-username">Username *</Label>
              <Input
                id="user-username"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-password">
                Password {editingUser ? '(leave blank to keep)' : '*'}
              </Label>
              <Input
                id="user-password"
                type="password"
                placeholder={editingUser ? 'New password (optional)' : 'Password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-role">Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPERUSER">SUPERUSER</SelectItem>
                  <SelectItem value="OPERATOR">OPERATOR</SelectItem>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}