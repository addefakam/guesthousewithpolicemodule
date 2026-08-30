"use client";

import React, { useSyncExternalStore, useState, useEffect } from "react";
import {
  LayoutDashboard,
  Bed,
  BedDouble,
  Users,
  CalendarCheck,
  Sun,
  Receipt,
  Package,
  Sparkles,
  UserCog,
  BarChart3,
  Settings,
  Bell,
  Building2,
  Search,
  Shield,
  Star,
  ChevronLeft,
  Menu,
  UsersRound,
  ShieldAlert,
  UserX,
  CreditCard,
  ShieldCheck,
  Clock,
  AlertTriangle,
  UserCircle,
  UserPlus,
  ChevronDown,
  LogOut,
  BrainCircuit,
  ClipboardList,
  DoorOpen,
  Wrench,
  Hotel,
  MessageSquare,
  ScrollText,
  Megaphone,
} from "lucide-react";

import { useTranslation } from "react-i18next";

import { useAppStore, type CurrentUser } from "@/lib/store";
import { formatDaysRemaining, formatCycle } from "@/lib/subscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { POLICE_RANK_PERMISSIONS, RANK_BADGE_CLASSES, type PoliceRank } from "@/lib/police-permissions";
import { apiLogout, apiGetDisabledPages } from "@/lib/api";
import LanguageSwitcher from "@/components/ghms/language-switcher";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Navigation item definition ──
interface NavItem {
  page: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  section?: string;
}

// ── All available navigation items ──
const ALL_NAV_ITEMS: NavItem[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "accommodation", label: "Accommodation", icon: DoorOpen },
  { page: "operations", label: "Operations", icon: Wrench },
  { page: "users", label: "Account Management", icon: UserCog },
  { page: "reports", label: "Reports", icon: BarChart3 },
  { page: "group-bookings", label: "Group Bookings", icon: Users },
  { page: "guest-communication", label: "Messages", icon: MessageSquare },
  { page: "staff-logs", label: "Staff Activity", icon: ScrollText },
  { page: "my-subscription", label: "Subscription", icon: CreditCard },
  { page: "settings", label: "Settings", icon: Settings },
];

const POLICE_NAV_ITEMS: NavItem[] = [
  {
    page: "police-dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  { page: "providers", label: "Providers", icon: Building2 },
  {
    page: "police-room-availability",
    label: "Room Availability",
    icon: BedDouble,
  },
  {
    page: "police-reports",
    label: "Reports",
    icon: BarChart3,
  },
];

const JOINT_SESSION_POLICE_ITEMS: NavItem[] = [
  {
    page: "police-guests",
    label: "Guest Search",
    icon: Search,
  },
  {
    page: "suspect-alerts",
    label: "Suspect Alerts",
    icon: ShieldAlert,
    badge: "new",
    section: "suspect-watch",
  },
  {
    page: "suspected-persons",
    label: "Watchlist",
    icon: UserX,
    section: "suspect-watch",
  },
  {
    page: "notification-dispatch",
    label: "Dispatch Notification",
    icon: Megaphone,
  },
  {
    page: "police-investigation",
    label: "Investigation & Settings",
    icon: Search,
  },
  {
    page: "police-security",
    label: "Security",
    icon: Shield,
  },
  {
    page: "anomaly-detection",
    label: "Anomaly Detection",
    icon: BrainCircuit,
  },
  {
    page: "owner-accounts",
    label: "Manage Officers",
    icon: UserCog,
  },
];

// SUPERUSER (admin): admin dashboard, user management, guesthouses, subscriptions, system config, operator features, audit logs, data & reports, notifications
const SUPERUSER_NAV_ITEMS: NavItem[] = [
  { page: "super-admin-dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
  { page: "guesthouse-user-management", label: "Guesthouse & User Mgmt", icon: Hotel },
  { page: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { page: "super-system-config", label: "System Configuration", icon: Settings },
  { page: "operator-features", label: "Operator Features", icon: ShieldCheck },
  { page: "super-audit-logs", label: "Audit Logs", icon: ClipboardList },
  { page: "super-data-reports", label: "Data & Reports", icon: BarChart3 },
];

const OPERATOR_EXCLUDED = new Set<string>(["owner-accounts"]);

// ── Permission → page mapping for STAFF role ──
// Supports both legacy keys (rooms, daytime) and new keys (rooms_view, daytime_view)
const PERMISSION_PAGE_MAP: Record<string, NavItem> = {
  // New keys with _view suffix
  rooms_view: { page: "accommodation", label: "Accommodation", icon: DoorOpen },
  daytime_view: { page: "accommodation", label: "Accommodation", icon: DoorOpen },
  housekeeping_view: {
    page: "operations",
    label: "Operations",
    icon: Wrench,
  },
  reports_view: { page: "reports", label: "Reports", icon: BarChart3 },
  reviews_view: { page: "reviews", label: "Reviews", icon: Star },
  notifications_view: {
    page: "notifications",
    label: "Notifications",
    icon: Bell,
  },
  settings_view: { page: "settings", label: "Settings", icon: Settings },
  // Legacy keys without _view suffix (backward compat)
  rooms: { page: "accommodation", label: "Accommodation", icon: DoorOpen },
  daytime: { page: "accommodation", label: "Accommodation", icon: DoorOpen },
  housekeeping: {
    page: "operations",
    label: "Operations",
    icon: Wrench,
  },
  reports: { page: "reports", label: "Reports", icon: BarChart3 },
  reviews: { page: "reviews", label: "Reviews", icon: Star },
  notifications: {
    page: "notifications",
    label: "Notifications",
    icon: Bell,
  },
  settings: { page: "settings", label: "Settings", icon: Settings },
  reservations: { page: "guests-reservations", label: "Reservations", icon: CalendarCheck },
  guests: { page: "guests-reservations", label: "Guests", icon: UsersRound },
  staff_logs_view: { page: "staff-logs", label: "Staff Activity", icon: ScrollText },
  guest_communication_view: { page: "guest-communication", label: "Messages", icon: MessageSquare },
  group_bookings_view: { page: "group-bookings", label: "Group Bookings", icon: Users },
};

// ── Helper: get nav items based on role ──
function getNavItems(user: CurrentUser, disabledPages: string[] = []): NavItem[] {
  const disabledSet = new Set(disabledPages);

  switch (user.role) {
    case "POLICE": {
      const rank = (user.policeRank || "OFFICER") as PoliceRank;
      const allowedPages = POLICE_RANK_PERMISSIONS[rank] || POLICE_RANK_PERMISSIONS.OFFICER;
      return POLICE_NAV_ITEMS.filter((item) => allowedPages.includes(item.page));
    }

    case "SUPERUSER": {
      // Guest house owners (SUPERUSER with providerId) see the provider dashboard.
      // System admins (SUPERUSER without providerId) see the admin dashboard.
      if (user.providerId) {
        return ALL_NAV_ITEMS.filter(
          (item) => !OPERATOR_EXCLUDED.has(item.page) && !disabledSet.has(item.page)
        );
      }
      return SUPERUSER_NAV_ITEMS;
    }

    case "OPERATOR":
      return ALL_NAV_ITEMS.filter(
        (item) => !OPERATOR_EXCLUDED.has(item.page) && !disabledSet.has(item.page)
      );

    case "STAFF": {
      const items: NavItem[] = [];
      // Always give staff access to dashboard
      if (!disabledSet.has("dashboard")) {
        items.push({
          page: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        });
      }
      // Add items based on permissions (deduplicate by page key)
      const seen = new Set<string>();
      for (const perm of user.permissions) {
        const mapped = PERMISSION_PAGE_MAP[perm];
        if (mapped && !seen.has(mapped.page) && !disabledSet.has(mapped.page)) {
          seen.add(mapped.page);
          items.push(mapped);
        }
      }
      return items;
    }

    default:
      return [
        { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      ];
  }
}

// ── Helper: get initials from name ──
function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Helper: get role badge className (no label — use t() for that) ──
function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "SUPERUSER": return "bg-amber-100 text-amber-700 border-amber-200";
    case "OPERATOR": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "STAFF": return "bg-sky-100 text-sky-700 border-sky-200";
    case "POLICE": return "bg-rose-100 text-rose-700 border-rose-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

// ── Nav item button component ──
function NavItemButton({
  item,
  currentPage,
  onClick,
}: {
  item: NavItem;
  currentPage: string;
  onClick: () => void;
}) {
  const { t } = useTranslation("sidebar");
  const Icon = item.icon;
  const isActive = currentPage === item.page;

  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {isActive && (
        <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon
        className={`size-[18px] shrink-0 transition-colors ${
          isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
        }`}
      />
      <span className="truncate">{t(item.label)}</span>
      {item.badge && (
        <Badge
          variant="secondary"
          className="ml-auto h-5 min-w-[20px] items-center justify-center bg-rose-500 px-1.5 text-[10px] font-bold text-white"
        >
          {t(item.badge)}
        </Badge>
      )}
    </button>
  );
}

// ── Sidebar content (shared between desktop & mobile) ──
// ── Subscription status widget for provider sidebar ──
function SubscriptionStatusCard({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation("sidebar");
  const subscription = useAppStore((s) => s.subscription);

  if (!subscription) return null;

  const isActive = subscription.status === "ACTIVE";
  const isWarning = subscription.status === "WARNING";
  const isExpired = subscription.status === "EXPIRED";
  const isSuspended = subscription.status === "SUSPENDED";

  // Collapsed mode — icon indicator
  if (collapsed) {
    const bgClass = isActive
      ? "bg-emerald-100"
      : isSuspended || isExpired
      ? "bg-rose-100"
      : "bg-amber-100";
    const iconClass = isActive
      ? "text-emerald-600"
      : isSuspended || isExpired
      ? "text-rose-600"
      : "text-amber-600";
    return (
      <div className="flex flex-col items-center gap-1 px-2 py-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${bgClass} animate-pulse shadow-sm`}> 
          <Clock className={`size-4 ${iconClass}`} />
        </div>
      </div>
    );
  }

  // Expanded card
  const containerClass = isActive
    ? "border-emerald-200 bg-emerald-50"
    : isSuspended || isExpired
    ? "border-rose-200 bg-rose-50"
    : "border-amber-200 bg-amber-50";

  const iconColorClass = isActive
    ? "text-emerald-600"
    : isSuspended || isExpired
    ? "text-rose-600"
    : "text-amber-600";

  const titleClass = isActive
    ? "text-emerald-800"
    : isSuspended || isExpired
    ? "text-rose-800"
    : "text-amber-800";

  const subtextClass = isActive
    ? "text-emerald-700"
    : isSuspended || isExpired
    ? "text-rose-700"
    : "text-amber-700";

  const badgeClass = isActive
    ? "bg-emerald-200/60 text-emerald-800"
    : isSuspended || isExpired
    ? "bg-rose-200/60 text-rose-800"
    : "bg-amber-200/60 text-amber-800";

  const Icon = isSuspended || isExpired ? AlertTriangle : Clock;

  return (
    <div className={`rounded-lg border p-3 ${containerClass} animate-subtle-pulse shadow-sm`}> 
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${iconColorClass}`} />
        <p className={`text-xs font-semibold ${titleClass}`}>
          {isActive
            ? t("Subscription Active")
            : isSuspended
            ? t("Service Suspended")
            : isExpired
            ? t("Subscription Expired")
            : t("Expiring Soon")}
        </p>
      </div>
      <div className={`mt-1.5 flex items-center justify-between text-[11px] ${subtextClass}`}>
        <span>{formatDaysRemaining(subscription.daysRemaining)}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${badgeClass}`}>
          <Clock className="h-3 w-3" />
          {Math.abs(subscription.daysRemaining)}d
        </span>
      </div>
      {subscription.price > 0 ? (
        <div className={`mt-1 text-[11px] ${subtextClass}`}>
          {t("Due: ")}{subscription.price.toLocaleString()} ETB / {formatCycle(subscription.cycle)}
        </div>
      ) : (
        <div className={`mt-1 text-[11px] ${subtextClass}`}>
          {formatCycle(subscription.cycle)} {t("cycle — Free trial")}
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  user,
  currentPage,
  onNavigate,
  onLogout,
  collapsed,
  onToggleCollapse,
}: {
  user: CurrentUser;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { t } = useTranslation("sidebar");
  const { jointSession, setJointLoginDialogOpen, subscription, disabledPages } = useAppStore();
  const navItems = getNavItems(user, disabledPages ?? []);
  const roleBadgeClass = getRoleBadgeClass(user.role);

  // Translated role label
  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      SUPERUSER: t("roleSuperuser"),
      OPERATOR: t("roleOperator"),
      STAFF: t("roleStaff"),
      POLICE: t("rolePolice"),
    };
    return map[role] || role;
  };

  // Translated rank label
  const getRankLabel = (rank: string) => {
    const map: Record<string, string> = {
      ADMIN: t("rankAdmin"),
      DETECTIVE: t("rankDetective"),
      OFFICER: t("rankOfficer"),
      VIEWER: t("rankViewer"),
    };
    return map[rank] || rank;
  };

  // Determine if user can start a joint session (SUPERUSER or POLICE ADMIN)
  const canStartJoint =
    user.role === "SUPERUSER" ||
    (user.role === "POLICE" && user.policeRank === "ADMIN");

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* ── User profile section ── */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <div
          className={`flex items-center gap-3 ${collapsed ? "flex-col text-center" : ""}`}
        >
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              {/* All roles: Name with dropdown menu (My Profile + Sign Out) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center justify-between gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-slate-50 group">
                    <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-primary">
                      {user.name}
                    </p>
                    <ChevronDown className="size-3.5 shrink-0 text-slate-400 group-hover:text-primary transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {/* User info header */}
                  <div className="flex items-center gap-2.5 px-2 py-2.5">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="truncate text-[11px] text-slate-400">{getRoleLabel(user.role)}{user.providerName ? ` · ${user.providerName}` : ""}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 cursor-pointer"
                    onClick={() => onNavigate("settings")}
                  >
                    <UserCircle className="size-4 text-slate-500" />
                    <span>{t("My Profile")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                    onClick={() => onLogout()}
                  >
                    <LogOut className="size-4" />
                    <span>{t("Sign Out")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold leading-none px-1.5 py-0.5 ${roleBadgeClass}`}
                >
                  <Shield className="mr-1 size-2.5" />
                  {getRoleLabel(user.role)}
                </Badge>
                {user.role === "POLICE" && user.policeRank && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-semibold leading-none px-1.5 py-0.5 ${RANK_BADGE_CLASSES[(user.policeRank as PoliceRank)] || ""}`}
                  >
                    {getRankLabel(user.policeRank as string) || user.policeRank}
                  </Badge>
                )}
                {user.providerName && (
                  <span className="truncate text-[11px] text-slate-400">
                    {user.providerName}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="shrink-0 bg-slate-200/60" />

      {/* ── Navigation links ── */}
      <ScrollArea className="flex-1 min-h-0 px-3 py-3">
        <nav className="flex flex-col gap-1" aria-label={t("Main navigation")}>
          {navItems.map((item) => (
            <NavItemButton
              key={item.page}
              item={item}
              currentPage={currentPage}
              onClick={() => onNavigate(item.page)}
            />
          ))}

          {/* Joint Operations — only shown during active joint session */}
          {jointSession.active && (
            <>
              <Separator className="my-2 bg-slate-200/60" />
              <p className={`px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${collapsed ? "text-center" : ""}`}>
                {t("Joint Session")}
              </p>
              <NavItemButton
                item={{ page: "joint-operations", label: "Joint Operations", icon: ShieldCheck }}
                currentPage={currentPage}
                onClick={() => onNavigate("joint-operations")}
              />
              {!collapsed && (
                <p className="px-3 mt-2 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                  {t("Police Tools")}
                </p>
              )}
              {JOINT_SESSION_POLICE_ITEMS.map((item, idx) => {
                // Show section label before the first item in a new section
                const showSection =
                  !collapsed &&
                  item.section &&
                  (idx === 0 || JOINT_SESSION_POLICE_ITEMS[idx - 1]?.section !== item.section);
                return (
                  <React.Fragment key={item.page}>
                    {showSection && (
                      <>
                        <Separator className="my-2 bg-slate-200/60" />
                        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {t("Suspect Watch")}
                        </p>
                      </>
                    )}
                    <NavItemButton
                      item={item}
                      currentPage={currentPage}
                      onClick={() => onNavigate(item.page)}
                    />
                  </React.Fragment>
                );
              })}
            </>
          )}

          {/* Start Joint Session button — shown for SUPERUSER/POLICE ADMIN when no joint session */}
          {canStartJoint && !jointSession.active && !collapsed && (
            <>
              <Separator className="my-2 bg-slate-200/60" />
              <button
                onClick={() => setJointLoginDialogOpen(true)}
                className="flex w-full items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2.5 text-sm font-medium text-amber-700 transition-all hover:bg-amber-50 hover:border-amber-400 hover:text-amber-800 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <ShieldCheck className="size-[18px] shrink-0" />
                <span>{t("Start Joint Session")}</span>
              </button>
            </>
          )}
          {canStartJoint && !jointSession.active && collapsed && (
            <button
              onClick={() => setJointLoginDialogOpen(true)}
              className="flex items-center justify-center rounded-lg border border-dashed border-amber-300 p-2 text-amber-600 hover:bg-amber-50 transition-colors outline-none"
              title={t("Start Joint Session")}
            >
              <ShieldCheck className="size-[18px]" />
            </button>
          )}
        </nav>
      </ScrollArea>

      {/* ── Subscription status for providers ── */}
      {(user.role === "OPERATOR" || user.role === "STAFF") && (
        <div className="shrink-0 px-3 py-2">
          <SubscriptionStatusCard collapsed={collapsed} />
        </div>
      )}

      <Separator className="shrink-0 bg-slate-200/60" />

      {/* ── Bottom section: language switcher + collapse toggle ── */}
      <div className="shrink-0 p-3 flex flex-col gap-2">
        {/* Language switcher */}
        {collapsed ? (
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-1">
            <LanguageSwitcher />
            <span className="text-xs text-slate-400">{t("Language")}</span>
          </div>
        )}
        {/* Desktop collapse toggle */}
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="size-[18px] text-slate-400" />
            <span>{t("Collapse")}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Sidebar Component ──
export default function Sidebar() {
  const { t } = useTranslation("sidebar");
  const { currentUser, currentPage, setCurrentPage, setCurrentUser, sidebarOpen, setSidebarOpen, setDisabledPages } =
    useAppStore();
  const isMobile = useIsMobile();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Fetch disabled operator pages for OPERATOR/STAFF/SUPERUSER(with providerId)
  React.useEffect(() => {
    if (!mounted || !currentUser) return;
    const role = currentUser.role;
    const shouldFetch =
      role === "OPERATOR" || role === "STAFF" ||
      (role === "SUPERUSER" && currentUser.providerId);
    if (!shouldFetch) return;
    // Skip if already loaded (null = not yet fetched)
    if (useAppStore.getState().disabledPages !== null) return;
    apiGetDisabledPages().then((pages) => setDisabledPages(pages)).catch(() => setDisabledPages([]));
  }, [mounted, currentUser, setDisabledPages]);

  if (!mounted || !currentUser) return null;

  async function handleLogout() {
    // Clear httpOnly cookie on server
    await apiLogout();
    // Clear local state
    setCurrentUser(null);
    setCurrentPage("login");
    if (isMobile) setSidebarOpen(false);
  }

  function handleNavigate(page: string) {
    setCurrentPage(page);
    if (isMobile) setSidebarOpen(false);
  }

  // ── Mobile: render as a Sheet ──
  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100"
          aria-label={t("Open navigation menu")}
        >
          <Menu className="size-5 text-slate-700" />
        </button>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0 flex flex-col overflow-hidden">
            <SheetHeader className="border-b border-slate-100 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Building2 className="size-4 text-white" />
                </div>
                <SheetTitle className="text-sm font-bold text-slate-900">
                  GHMS
                </SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent
                user={currentUser}
                currentPage={currentPage}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                collapsed={false}
                onToggleCollapse={() => {}}
              />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // ── Desktop: render as a fixed sidebar ──
  const collapsed = !sidebarOpen;

  return (
    <aside
      className={`relative flex h-full flex-col min-h-0 border-r border-slate-200 bg-white transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      {/* ── Logo / Brand ── */}
      <div
        className={`flex h-16 items-center border-b border-slate-200/60 px-4 ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
          <Building2 className="size-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-slate-900">
              GHMS
            </h1>
            <p className="truncate text-[11px] text-slate-400">
              {t("Guest House Management")}
            </p>
          </div>
        )}
        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute -right-3 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50"
            aria-label={t("Expand sidebar")}
          >
            <Menu className="size-3 text-slate-500" />
          </button>
        )}
      </div>

      <SidebarContent
        user={currentUser}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggleCollapse={() => setSidebarOpen(!sidebarOpen)}
      />
    </aside>
  );
}