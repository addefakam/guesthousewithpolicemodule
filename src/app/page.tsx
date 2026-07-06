'use client';

import { useState, useEffect } from 'react';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppStore, type Page } from '@/lib/store';
import LoginPage from '@/components/ghms/login-page';
import Sidebar from '@/components/ghms/sidebar';
import PageRenderer from '@/components/ghms/page-renderer';

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  rooms: 'Rooms',
  guests: 'Guests',
  reservations: 'Reservations',
  daytime: 'Daytime Services',
  expenses: 'Expenses',
  resources: 'Resources',
  reports: 'Reports',
  housekeeping: 'Housekeeping',
  users: 'Users',
  notifications: 'Notifications',
  settings: 'Settings',
};

export default function AppPage() {
  const { currentUser, currentPage, setSidebarOpen } = useAppStore();
  const [currentDate, setCurrentDate] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    import('@/lib/api')
      .then(({ getNotifications }) => getNotifications(true))
      .then((data) => setUnreadCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, [currentUser, useAppStore.getState().refreshKey]);

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-md px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          <h1 className="text-base font-semibold text-foreground">
            {pageTitles[currentPage]}
          </h1>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {currentDate}
            </span>

            <Separator orientation="vertical" className="h-5 bg-border/50 hidden sm:block" />

            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              onClick={() => useAppStore.getState().setCurrentPage('notifications')}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <PageRenderer />
        </main>
      </div>
    </div>
  );
}