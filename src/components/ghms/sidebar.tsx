'use client';

import { useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  }[];
}

const navGroups: NavGroup[] = [
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
      { page: 'reservations', label: 'Reservations', icon: <CalendarDays className="h-4 w-4" /> },
      { page: 'daytime', label: 'Daytime Services', icon: <Sun className="h-4 w-4" /> },
      { page: 'housekeeping', label: 'Housekeeping', icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      { page: 'expenses', label: 'Expenses', icon: <Receipt className="h-4 w-4" /> },
      { page: 'resources', label: 'Resources', icon: <Package className="h-4 w-4" /> },
      { page: 'reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Management',
    items: [
      { page: 'guests', label: 'Guests', icon: <Users className="h-4 w-4" /> },
      { page: 'users', label: 'Users', icon: <UserCog className="h-4 w-4" />, superuserOnly: true },
      { page: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    ],
  },
  {
    label: 'System',
    items: [
      { page: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, superuserOnly: true },
    ],
  },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, currentUser, setCurrentUser, sidebarOpen, setSidebarOpen } =
    useAppStore();
  const isSuperuser = currentUser?.role === 'SUPERUSER';

  const handleNavigate = useCallback(
    (page: Page) => {
      setCurrentPage(page);
      setSidebarOpen(false);
    },
    [setCurrentPage, setSidebarOpen]
  );

  // Close sidebar on escape key
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
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white tracking-tight">GHMS</span>
          <span className="text-[11px] text-slate-500 leading-none">Guest House Management</span>
        </div>
        {/* Close button on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 text-slate-500 hover:text-white lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator className="bg-slate-800/50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="space-y-6">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.superuserOnly || isSuperuser
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label}>
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
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
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <span className={isActive ? 'text-primary' : 'text-slate-500'}>{item.icon}</span>
                        {item.label}
                        {isActive && (
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

      <Separator className="bg-slate-800/50" />

      {/* User section */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">
              {currentUser?.name || 'User'}
            </span>
            <span className="text-[11px] text-slate-500 capitalize">
              {currentUser?.role?.toLowerCase() || 'role'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-400/10 shrink-0"
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-800/50">
        {sidebarContent}
      </aside>
    </>
  );
}