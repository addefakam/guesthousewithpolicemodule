'use client';

import { useState, useEffect } from 'react';
import { Menu, Bell, Building2 } from 'lucide-react';
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
  providers: 'Providers',
  'police-guests': 'Guest Monitoring',
  'police-dashboard': 'Police Dashboard',
};

export default function AppPage() {
  const { currentUser, currentPage, setCurrentPage, setSidebarOpen } = useAppStore();
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

  // Role-based page access guard
  const policeOnlyPages: Page[] = ['police-dashboard', 'police-guests', 'providers'];
  const superuserOnlyPages: Page[] = ['users', 'settings'];
  const operatorOrAbovePages: Page[] = ['expenses', 'resources', 'reports'];

  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role as string;

    // Police can only see police pages
    if (role !== 'POLICE' && policeOnlyPages.includes(currentPage)) {
      setCurrentPage('dashboard');
      return;
    }
    // Non-police cannot see police pages
    if (role === 'POLICE' && !policeOnlyPages.includes(currentPage) && currentPage !== 'notifications') {
      setCurrentPage('police-dashboard');
      return;
    }
    // Superuser-only pages
    if (role !== 'SUPERUSER' && superuserOnlyPages.includes(currentPage)) {
      setCurrentPage('dashboard');
      return;
    }
    // Operator+ pages (not STAFF)
    if (role === 'STAFF' && operatorOrAbovePages.includes(currentPage)) {
      setCurrentPage('dashboard');
      return;
    }
  }, [currentUser, currentPage, setCurrentPage]);

  // Redirect police to their dashboard on login
  useEffect(() => {
    if (currentUser?.role === 'POLICE' && currentPage === 'dashboard') {
      setCurrentPage('police-dashboard');
    }
  }, [currentUser, currentPage, setCurrentPage]);

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

          {/* Provider workspace indicator */}
          {currentUser?.provider?.name && (
            <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-normal border-primary/20 text-primary bg-primary/5 px-2.5 py-0.5">
              <Building2 className="h-3 w-3" />
              {currentUser.provider.name}
            </Badge>
          )}

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