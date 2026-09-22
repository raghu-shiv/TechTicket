import { create } from "zustand";

interface UIState {
  isMobileSidebarOpen: boolean;
  isCommandMenuOpen: boolean;

  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleMobileSidebar: () => void;

  openCommandMenu: () => void;
  closeCommandMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileSidebarOpen: false,
  isCommandMenuOpen: false,

  openMobileSidebar: () => set({ isMobileSidebarOpen: true }),

  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),

  toggleMobileSidebar: () =>
    set((state) => ({
      isMobileSidebarOpen: !state.isMobileSidebarOpen,
    })),

  openCommandMenu: () => set({ isCommandMenuOpen: true }),

  closeCommandMenu: () => set({ isCommandMenuOpen: false }),
}));
