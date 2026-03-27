'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ColorScheme = 
  | 'midnight' 
  | 'ocean' 
  | 'forest' 
  | 'sunset' 
  | 'lavender'
  | 'cyberpunk'
  | 'light'

interface ThemeColors {
  name: string
  label: string
  primary: string
  primaryLight: string
  primaryDark: string
  accent: string
  accentLight: string
  bg: string
  bgSecondary: string
  bgTertiary: string
  card: string
  cardHeader: string
  border: string
  text: string
  textMuted: string
  textSecondary: string
  success: string
  successLight: string
  warning: string
  warningLight: string
  error: string
  errorLight: string
  // Tab specific colors
  tabBg: string
  tabActiveBg: string
  tabActiveText: string
  tabInactiveText: string
  tabBorder: string
  // Input specific colors
  inputBg: string
  inputBorder: string
  inputText: string
  inputPlaceholder: string
  // Button specific colors
  buttonPrimary: string
  buttonPrimaryHover: string
  buttonSecondary: string
  buttonSecondaryHover: string
  buttonOutline: string
  buttonOutlineHover: string
}

export const COLOR_SCHEMES: Record<ColorScheme, ThemeColors> = {
  midnight: {
    name: 'midnight',
    label: 'Midnight Purple',
    primary: '#a855f7',
    primaryLight: '#c084fc',
    primaryDark: '#7c3aed',
    accent: '#6366f1',
    accentLight: '#818cf8',
    bg: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    card: '#1e293b',
    cardHeader: '#0f172a',
    border: '#334155',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    textSecondary: '#cbd5e1',
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    error: '#ef4444',
    errorLight: '#f87171',
    tabBg: '#0f172a',
    tabActiveBg: 'rgba(168, 85, 247, 0.2)',
    tabActiveText: '#c084fc',
    tabInactiveText: '#94a3b8',
    tabBorder: '#334155',
    inputBg: '#0f172a',
    inputBorder: '#334155',
    inputText: '#f8fafc',
    inputPlaceholder: '#64748b',
    buttonPrimary: '#a855f7',
    buttonPrimaryHover: '#9333ea',
    buttonSecondary: '#334155',
    buttonSecondaryHover: '#475569',
    buttonOutline: '#334155',
    buttonOutlineHover: '#475569',
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean Blue',
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    accent: '#06b6d4',
    accentLight: '#22d3ee',
    bg: '#0c1929',
    bgSecondary: '#132f4c',
    bgTertiary: '#1e4976',
    card: '#132f4c',
    cardHeader: '#0c1929',
    border: '#1e4976',
    text: '#f0f9ff',
    textMuted: '#7dd3fc',
    textSecondary: '#bae6fd',
    success: '#10b981',
    successLight: '#34d399',
    warning: '#fbbf24',
    warningLight: '#fcd34d',
    error: '#f43f5e',
    errorLight: '#fb7185',
    tabBg: '#0c1929',
    tabActiveBg: 'rgba(59, 130, 246, 0.2)',
    tabActiveText: '#60a5fa',
    tabInactiveText: '#7dd3fc',
    tabBorder: '#1e4976',
    inputBg: '#0c1929',
    inputBorder: '#1e4976',
    inputText: '#f0f9ff',
    inputPlaceholder: '#4a90c2',
    buttonPrimary: '#3b82f6',
    buttonPrimaryHover: '#2563eb',
    buttonSecondary: '#1e4976',
    buttonSecondaryHover: '#2d5a8a',
    buttonOutline: '#1e4976',
    buttonOutlineHover: '#2d5a8a',
  },
  forest: {
    name: 'forest',
    label: 'Forest Green',
    primary: '#22c55e',
    primaryLight: '#4ade80',
    primaryDark: '#16a34a',
    accent: '#14b8a6',
    accentLight: '#2dd4bf',
    bg: '#0a1a0f',
    bgSecondary: '#14261a',
    bgTertiary: '#1f4028',
    card: '#14261a',
    cardHeader: '#0a1a0f',
    border: '#1f4028',
    text: '#f0fdf4',
    textMuted: '#86efac',
    textSecondary: '#bbf7d0',
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#eab308',
    warningLight: '#facc15',
    error: '#dc2626',
    errorLight: '#ef4444',
    tabBg: '#0a1a0f',
    tabActiveBg: 'rgba(34, 197, 94, 0.2)',
    tabActiveText: '#4ade80',
    tabInactiveText: '#86efac',
    tabBorder: '#1f4028',
    inputBg: '#0a1a0f',
    inputBorder: '#1f4028',
    inputText: '#f0fdf4',
    inputPlaceholder: '#3d7a50',
    buttonPrimary: '#22c55e',
    buttonPrimaryHover: '#16a34a',
    buttonSecondary: '#1f4028',
    buttonSecondaryHover: '#2d5a3a',
    buttonOutline: '#1f4028',
    buttonOutlineHover: '#2d5a3a',
  },
  sunset: {
    name: 'sunset',
    label: 'Sunset Orange',
    primary: '#f97316',
    primaryLight: '#fb923c',
    primaryDark: '#ea580c',
    accent: '#ec4899',
    accentLight: '#f472b6',
    bg: '#1a0f0a',
    bgSecondary: '#2d1810',
    bgTertiary: '#4a2816',
    card: '#2d1810',
    cardHeader: '#1a0f0a',
    border: '#4a2816',
    text: '#fff7ed',
    textMuted: '#fdba74',
    textSecondary: '#fed7aa',
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#fbbf24',
    warningLight: '#fcd34d',
    error: '#dc2626',
    errorLight: '#ef4444',
    tabBg: '#1a0f0a',
    tabActiveBg: 'rgba(249, 115, 22, 0.2)',
    tabActiveText: '#fb923c',
    tabInactiveText: '#fdba74',
    tabBorder: '#4a2816',
    inputBg: '#1a0f0a',
    inputBorder: '#4a2816',
    inputText: '#fff7ed',
    inputPlaceholder: '#8b5a3c',
    buttonPrimary: '#f97316',
    buttonPrimaryHover: '#ea580c',
    buttonSecondary: '#4a2816',
    buttonSecondaryHover: '#6b3d22',
    buttonOutline: '#4a2816',
    buttonOutlineHover: '#6b3d22',
  },
  lavender: {
    name: 'lavender',
    label: 'Lavender Dream',
    primary: '#a78bfa',
    primaryLight: '#c4b5fd',
    primaryDark: '#8b5cf6',
    accent: '#f472b6',
    accentLight: '#f9a8d4',
    bg: '#13111c',
    bgSecondary: '#1f1a2e',
    bgTertiary: '#312d47',
    card: '#1f1a2e',
    cardHeader: '#13111c',
    border: '#312d47',
    text: '#faf5ff',
    textMuted: '#c4b5fd',
    textSecondary: '#ddd6fe',
    success: '#34d399',
    successLight: '#6ee7b7',
    warning: '#fcd34d',
    warningLight: '#fde68a',
    error: '#f87171',
    errorLight: '#fca5a5',
    tabBg: '#13111c',
    tabActiveBg: 'rgba(167, 139, 250, 0.2)',
    tabActiveText: '#c4b5fd',
    tabInactiveText: '#a78bfa',
    tabBorder: '#312d47',
    inputBg: '#13111c',
    inputBorder: '#312d47',
    inputText: '#faf5ff',
    inputPlaceholder: '#6b5f8a',
    buttonPrimary: '#a78bfa',
    buttonPrimaryHover: '#8b5cf6',
    buttonSecondary: '#312d47',
    buttonSecondaryHover: '#47406a',
    buttonOutline: '#312d47',
    buttonOutlineHover: '#47406a',
  },
  cyberpunk: {
    name: 'cyberpunk',
    label: 'Cyberpunk Neon',
    primary: '#f0abfc',
    primaryLight: '#f5d0fe',
    primaryDark: '#e879f9',
    accent: '#22d3ee',
    accentLight: '#67e8f9',
    bg: '#0a0a0a',
    bgSecondary: '#171717',
    bgTertiary: '#262626',
    card: '#171717',
    cardHeader: '#0a0a0a',
    border: '#262626',
    text: '#fafafa',
    textMuted: '#a3a3a3',
    textSecondary: '#d4d4d4',
    success: '#4ade80',
    successLight: '#86efac',
    warning: '#facc15',
    warningLight: '#fde047',
    error: '#fb7185',
    errorLight: '#fda4af',
    tabBg: '#0a0a0a',
    tabActiveBg: 'rgba(240, 171, 252, 0.2)',
    tabActiveText: '#f5d0fe',
    tabInactiveText: '#a3a3a3',
    tabBorder: '#262626',
    inputBg: '#0a0a0a',
    inputBorder: '#262626',
    inputText: '#fafafa',
    inputPlaceholder: '#525252',
    buttonPrimary: '#f0abfc',
    buttonPrimaryHover: '#e879f9',
    buttonSecondary: '#262626',
    buttonSecondaryHover: '#404040',
    buttonOutline: '#262626',
    buttonOutlineHover: '#404040',
  },
  light: {
    name: 'light',
    label: 'Light Mode',
    primary: '#7c3aed',
    primaryLight: '#8b5cf6',
    primaryDark: '#6d28d9',
    accent: '#2563eb',
    accentLight: '#3b82f6',
    bg: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    card: '#ffffff',
    cardHeader: '#f8fafc',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
    textSecondary: '#475569',
    success: '#16a34a',
    successLight: '#22c55e',
    warning: '#d97706',
    warningLight: '#f59e0b',
    error: '#dc2626',
    errorLight: '#ef4444',
    tabBg: '#f1f5f9',
    tabActiveBg: 'rgba(124, 58, 237, 0.1)',
    tabActiveText: '#7c3aed',
    tabInactiveText: '#64748b',
    tabBorder: '#e2e8f0',
    inputBg: '#ffffff',
    inputBorder: '#e2e8f0',
    inputText: '#1e293b',
    inputPlaceholder: '#94a3b8',
    buttonPrimary: '#7c3aed',
    buttonPrimaryHover: '#6d28d9',
    buttonSecondary: '#f1f5f9',
    buttonSecondaryHover: '#e2e8f0',
    buttonOutline: '#e2e8f0',
    buttonOutlineHover: '#cbd5e1',
  },
}

interface ThemeContextType {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
  colors: ThemeColors
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize with default theme to avoid hydration mismatch
  const [colorScheme, setColorScheme] = useState<ColorScheme>('midnight')
  const [isHydrated, setIsHydrated] = useState(false)

  // Load saved theme from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem('colorScheme') as ColorScheme | null
    if (saved && COLOR_SCHEMES[saved]) {
      setColorScheme(saved)
    }
    setIsHydrated(true)
  }, [])

  // Apply CSS variables when theme changes
  useEffect(() => {
    const colors = COLOR_SCHEMES[colorScheme]
    const root = document.documentElement
    
    // Set custom theme variables
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-primary-light', colors.primaryLight)
    root.style.setProperty('--color-primary-dark', colors.primaryDark)
    root.style.setProperty('--color-accent', colors.accent)
    root.style.setProperty('--color-accent-light', colors.accentLight)
    root.style.setProperty('--color-bg', colors.bg)
    root.style.setProperty('--color-bg-secondary', colors.bgSecondary)
    root.style.setProperty('--color-bg-tertiary', colors.bgTertiary)
    root.style.setProperty('--color-card', colors.card)
    root.style.setProperty('--color-card-header', colors.cardHeader)
    root.style.setProperty('--color-border', colors.border)
    root.style.setProperty('--color-text', colors.text)
    root.style.setProperty('--color-text-muted', colors.textMuted)
    root.style.setProperty('--color-text-secondary', colors.textSecondary)
    root.style.setProperty('--color-success', colors.success)
    root.style.setProperty('--color-success-light', colors.successLight)
    root.style.setProperty('--color-warning', colors.warning)
    root.style.setProperty('--color-warning-light', colors.warningLight)
    root.style.setProperty('--color-error', colors.error)
    root.style.setProperty('--color-error-light', colors.errorLight)

    // Set shadcn/ui CSS variables
    // These are used by the shadcn components like Card, Tabs, etc.
    const isDark = colorScheme !== 'light'
    
    // Background and foreground
    root.style.setProperty('--background', isDark ? '0 0% 7%' : '0 0% 100%')
    root.style.setProperty('--foreground', isDark ? '0 0% 98%' : '222.2 84% 4.9%')
    
    // Card
    root.style.setProperty('--card', isDark ? '222 47% 11%' : '0 0% 100%')
    root.style.setProperty('--card-foreground', isDark ? '210 40% 98%' : '222.2 84% 4.9%')
    
    // Popover
    root.style.setProperty('--popover', isDark ? '222 47% 11%' : '0 0% 100%')
    root.style.setProperty('--popover-foreground', isDark ? '210 40% 98%' : '222.2 84% 4.9%')
    
    // Primary - use theme color
    root.style.setProperty('--primary', colors.primary)
    root.style.setProperty('--primary-foreground', isDark ? '0 0% 100%' : '0 0% 100%')
    
    // Secondary
    root.style.setProperty('--secondary', isDark ? '217.2 32.6% 17.5%' : '210 40% 96.1%')
    root.style.setProperty('--secondary-foreground', isDark ? '210 40% 98%' : '222.2 47.4% 11.2%')
    
    // Muted
    root.style.setProperty('--muted', isDark ? '217.2 32.6% 17.5%' : '210 40% 96.1%')
    root.style.setProperty('--muted-foreground', isDark ? '215 20.2% 65.1%' : '215.4 16.3% 46.9%')
    
    // Accent
    root.style.setProperty('--accent', colors.accent)
    root.style.setProperty('--accent-foreground', isDark ? '0 0% 100%' : '222.2 47.4% 11.2%')
    
    // Destructive
    root.style.setProperty('--destructive', isDark ? '0 62.8% 30.6%' : '0 84.2% 60.2%')
    
    // Border and input
    root.style.setProperty('--border', isDark ? '217.2 32.6% 17.5%' : '214.3 31.8% 91.4%')
    root.style.setProperty('--input', isDark ? '217.2 32.6% 17.5%' : '214.3 31.8% 91.4%')
    
    // Ring
    root.style.setProperty('--ring', colors.primary)

    // Tab specific variables
    root.style.setProperty('--tab-bg', colors.tabBg)
    root.style.setProperty('--tab-active-bg', colors.tabActiveBg)
    root.style.setProperty('--tab-active-text', colors.tabActiveText)
    root.style.setProperty('--tab-inactive-text', colors.tabInactiveText)
    root.style.setProperty('--tab-border', colors.tabBorder)

    // Input specific variables
    root.style.setProperty('--input-bg', colors.inputBg)
    root.style.setProperty('--input-border', colors.inputBorder)
    root.style.setProperty('--input-text', colors.inputText)
    root.style.setProperty('--input-placeholder', colors.inputPlaceholder)

    // Button specific variables
    root.style.setProperty('--button-primary', colors.buttonPrimary)
    root.style.setProperty('--button-primary-hover', colors.buttonPrimaryHover)
    root.style.setProperty('--button-secondary', colors.buttonSecondary)
    root.style.setProperty('--button-secondary-hover', colors.buttonSecondaryHover)

    // Save to localStorage only after hydration
    if (isHydrated) {
      localStorage.setItem('colorScheme', colorScheme)
    }
  }, [colorScheme, isHydrated])

  return (
    <ThemeContext.Provider value={{ 
      colorScheme, 
      setColorScheme, 
      colors: COLOR_SCHEMES[colorScheme],
      mounted: isHydrated
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  // Return default theme when used outside provider (SSR/build safety)
  if (!context) {
    return {
      colorScheme: 'midnight' as ColorScheme,
      setColorScheme: () => {},
      colors: COLOR_SCHEMES.midnight,
      mounted: false
    }
  }
  return context
}
