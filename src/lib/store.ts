import { create } from 'zustand';

export type Page =
  | 'dashboard'
  | 'rooms'
  | 'guests'
  | 'reservations'
  | 'daytime'
  | 'expenses'
  | 'resources'
  | 'reports'
  | 'housekeeping'
  | 'users'
  | 'notifications'
  | 'settings'
  | 'providers'
  | 'police-guests'
  | 'police-dashboard';

interface ProviderInfo {
  id: string;
  name: string;
  status: string;
  type: string;
}

interface CurrentUser {
  id: string;
  username: string;
  role: string;
  name: string;
  permissions?: string;  // JSON array for STAFF role
  providerId?: string | null;
  provider?: ProviderInfo | null;
}

interface AppState {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));