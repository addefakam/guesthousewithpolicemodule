'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  Building2,
  LayoutDashboard,
  BedDouble,
  Users,
  CalendarDays,
  Sun,
  Receipt,
  Package,
  BarChart3,
  Sparkles,
  UserCog,
  Bell,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  Shield,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore, type Page } from '@/lib/store';

interface NavGroup {
  label: string;
  items: {
    page: Page;
    label: string;
    icon: React.ReactNode;
    superuserOnly?: boolean;
    operatorAndAbove?: boolean;  // SUPERUSER + OPERATOR, not STAFF
    operatorOnly?: boolean;      // OPERATOR only, not SUPERUSER (operational tasks)
    staffOnly?: boolean;         // STAFF only (guest operations)
    badge?: React.ReactNode;
  }[];
}

const providerNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { page: 'rooms', label: 'Rooms', icon: <BedDouble className="h-4 w-4" /> },
      { page: 'reservations', label: 'Reservations', icon: <CalendarDays className="h-4 w-4" />, staffOnly: true },
      { page: 'daytime', label: 'Daytime Services', icon: <Sun className="h-4 w-4" />, staffOnly: true },
      { page: 'housekeeping', label: 'Housekeeping', icon: <Sparkles className="h-4 w-4" />, operatorOnly: true },
    ],
  },
  {
    label: 'Finance',
    items: [
      { page: 'expenses', label: 'Expenses', icon: <Receipt className="h-4 w-4" />, operatorOnly: true },
      { page: 'resources', label: 'Resources', icon: <Package className="h-4 w-4" />, operatorOnly: true },
      { page: 'reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" />, operatorAndAbove: true },
    ],
  },
  {
    label: 'Management',
    items: [
      { page: 'guests', label: 'Guests', icon: <Users className="h-4 w-4" />, staffOnly: true },
      { page: 'users', label: 'Users', icon: <UserCog className="h-4 w-4" />, operatorAndAbove: true },
      { page: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    ],
  },
  {
    label: 'System',
    items: [
      { page: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, operatorAndAbove: true },
    ],
  },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, currentUser, setCurrentUser, sidebarOpen, setSidebarOpen } =
    useAppStore();
  const isSuperuser = currentUser?.role === 'SUPERUSER';
  const isOperator = currentUser?.role === 'OPERATOR';
  const isStaff = currentUser?.role === 'STAFF';
  const isPolice = currentUser?.role === 'POLICE';
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending provider count for police badge
  useEffect(() => {
    if (!isPolice) return;
    import('@/lib/api')
      .then(({ getProviders }) => getProviders())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setPendingCount(list.filter((p: any) => p.status === 'PENDING').length);
      })
      .catch(() => {});
  }, [isPolice, useAppStore.getState().refreshKey]);

  const getNavGroups = useCallback((): NavGroup[] => {
    if (isPolice) {
      return [
        {
          label: 'Overview',
          items: [
            {
              page: 'police-dashboard',
              label: 'Police Dashboard',
              icon: <Shield className="h-4 w-4" />,
            },
            {
              page: 'police-guests',
              label: 'Guest Monitoring',
              icon: <Eye className="h-4 w-4" />,
            },
          ],
        },
        {
          label: 'Authority',
          items: [
            {
              page: 'providers',
              label: 'Providers',
              icon: <Building2 className="h-4 w-4" />,
              badge:
                pendingCount > 0 ? (
                  <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-amber-500 text-white hover:bg-amber-500">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </Badge>
                ) : undefined,
            },
          ],
        },
        {
          label: 'System',
          items: [
            {
              page: 'notifications',
              label: 'Notifications',
              icon: <Bell className="h-4 w-4" />,
            },
          ],
        },
      ];
    }
    return providerNavGroups;
  }, [isPolice, pendingCount]);

  const navGroups = getNavGroups();

  const handleNavigate = useCallback(
    (page: Page) => {
      setCurrentPage(page);
      setSidebarOpen(false);
    },
    [setCurrentPage, setSidebarOpen]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  const handleLogout = () => {
    setCurrentUser(null);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-gray-200/80">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {isPolice ? (
            <Shield className="h-5 w-5 text-primary" />
          ) : (
            <Building2 className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground tracking-tight">
            {isPolice ? 'GHMS Police' : 'GHMS'}
          </span>
          <span className="text-[11px] text-muted-foreground leading-none">
            {isPolice ? 'Guest House Monitoring' : 'Guest House Management'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="space-y-6">
          {navGroups.map((group) => {
            // Parse STAFF user permissions
            let staffPermissions: string[] = [];
            if (isStaff && currentUser?.permissions) {
              try { staffPermissions = JSON.parse(currentUser.permissions); } catch { staffPermissions = []; }
            }

            const visibleItems = group.items.filter(
              (item) => {
                if (item.superuserOnly && !isSuperuser) return false;
                // operatorAndAbove: SUPERUSER + OPERATOR, and STAFF with matching permission
                if (item.operatorAndAbove) {
                  if (isSuperuser || isOperator) return true;
                  if (isStaff && staffPermissions.includes(item.page)) return true;
                  return false;
                }
                // operatorOnly: OPERATOR, and STAFF with matching permission (not SUPERUSER)
                if (item.operatorOnly) {
                  if (isOperator) return true;
                  if (isStaff && staffPermissions.includes(item.page)) return true;
                  return false;
                }
                if (item.staffOnly) {
                  if (!isStaff) return false;
                  // STAFF must have this page in their permissions
                  if (!staffPermissions.includes(item.page)) return false;
                  return true;
                }
                // No flag = visible to all provider roles
                return true;
              }
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label}>
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = currentPage === item.page;
                    return (
                      <button
                        key={item.page}
                        onClick={() => handleNavigate(item.page)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <span className={isActive ? 'text-primary' : 'text-muted-foreground/70'}>{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge}
                        {isActive && !item.badge && (
                          <ChevronLeft className="ml-auto h-3.5 w-3.5 text-primary/70" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {currentUser?.name || 'User'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {{ POLICE: 'Police Officer', SUPERUSER: 'Admin', OPERATOR: 'Operator', STAFF: 'Staff' }[currentUser?.role as string] || currentUser?.role?.toLowerCase() || 'role'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}