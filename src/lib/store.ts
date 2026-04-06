import { create } from 'zustand'
import type { AppView } from './nav-config'

interface AppState {
  // Navigation
  currentView: AppView
  setCurrentView: (view: AppView) => void

  // Auth
  isAuthenticated: boolean
  currentUser: { id: number; loginName: string } | null
  login: (user: { id: number; loginName: string }) => void
  logout: () => void

  // UI State
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Loading
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),

  // Auth
  isAuthenticated: false,
  currentUser: null,
  login: (user) => set({ isAuthenticated: true, currentUser: user }),
  logout: () => set({ isAuthenticated: false, currentUser: null }),

  // UI State
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Loading
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}))
