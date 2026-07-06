'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CheckCheck,
  Loader2,
  BellOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getNotifications, markNotificationsRead } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle2,
  ERROR: XCircle,
};

const TYPE_COLORS: Record<string, string> = {
  INFO: 'text-blue-400 bg-blue-400/10',
  WARNING: 'text-amber-400 bg-amber-400/10',
  SUCCESS: 'text-emerald-400 bg-emerald-400/10',
  ERROR: 'text-red-400 bg-red-400/10',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { triggerRefresh } = useAppStore();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) {
      toast.info('All notifications are already read');
      return;
    }
    try {
      await markNotificationsRead(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      triggerRefresh();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications');
    }
  };

  const handleMarkRead = async (notification: NotificationRecord) => {
    if (notification.isRead) return;
    try {
      await markNotificationsRead([notification.id]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      triggerRefresh();
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              {unreadCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-400/20 px-2 text-xs font-semibold text-amber-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                You&apos;ll see alerts and updates here
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Info;
                const iconColor = TYPE_COLORS[n.type] || TYPE_COLORS.INFO;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    className={`relative flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                      !n.isRead
                        ? 'border-l-4 border-l-amber-400 border-t-border/50 border-r-border/50 border-b-border/50 bg-amber-400/5 hover:bg-amber-400/10'
                        : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!n.isRead ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                          {n.title}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                    </div>
                    {!n.isRead && (
                      <div className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}