import { create } from "zustand";

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: string;
  providerId: string | null;
  permissions: string[];
  providerName?: string;
}

interface AppState {
  currentPage: string;
  setCurrentPage: (p: string) => void;
  currentUser: CurrentUser | null;
  setCurrentUser: (u: CurrentUser | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: "login",
  setCurrentPage: (p) => set({ currentPage: p }),
  currentUser: null,
  setCurrentUser: (u) => set({ currentUser: u }),
  sidebarOpen: true,
  setSidebarOpen: (o) => set({ sidebarOpen: o }),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));