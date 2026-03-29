'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

/**
 * Hydration Settings - Permanent Solution for SSR/CSR Mismatch
 * 
 * This context provides a centralized way to handle hydration issues in Next.js:
 * 
 * 1. mounted: Boolean flag to check if component is hydrated
 * 2. suppressHydration: Utility to conditionally suppress hydration warnings
 * 3. safeValue: Returns a fallback during SSR, actual value after hydration
 * 4. themeReady: Specifically for theme-related content
 */

export type HydrationStrategy = 
  | 'suppress'      // Use suppressHydrationWarning (simplest)
  | 'defer'         // Defer rendering until mounted (safest)
  | 'css-vars'      // Use CSS variables (best performance)
  | 'placeholder'   // Show placeholder during SSR

export interface HydrationSettings {
  // Core state
  mounted: boolean
  strategy: HydrationStrategy
  
  // Utility methods
  suppressHydration: boolean
  safeValue: <T>(value: T, fallback: T) => T
  safeStyle: (style: React.CSSProperties) => React.CSSProperties
  
  // Theme specific
  themeReady: boolean
  
  // Actions
  setStrategy: (strategy: HydrationStrategy) => void
}

const HydrationSettingsContext = createContext<HydrationSettings | undefined>(undefined)

const STORAGE_KEY = 'hydration-settings-strategy'

export function HydrationSettingsProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [strategy, setStrategyState] = useState<HydrationStrategy>('defer')

  // Load saved strategy on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as HydrationStrategy | null
      if (saved && ['suppress', 'defer', 'css-vars', 'placeholder'].includes(saved)) {
        setStrategyState(saved)
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    setMounted(true)
  }, [])

  // Save strategy when changed
  const setStrategy = useCallback((newStrategy: HydrationStrategy) => {
    setStrategyState(newStrategy)
    try {
      localStorage.setItem(STORAGE_KEY, newStrategy)
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [])

  // Returns true if we should use suppressHydrationWarning
  const suppressHydration = strategy === 'suppress'

  // Returns value after hydration, fallback during SSR
  const safeValue = useCallback(<T,>(value: T, fallback: T): T => {
    if (!mounted && strategy !== 'suppress') {
      return fallback
    }
    return value
  }, [mounted, strategy])

  // Returns safe style object that won't cause hydration issues
  const safeStyle = useCallback((style: React.CSSProperties): React.CSSProperties => {
    if (!mounted && strategy === 'defer') {
      return {}
    }
    return style
  }, [mounted, strategy])

  // Theme is ready when mounted (for defer strategy) or always (for suppress strategy)
  const themeReady = mounted || strategy === 'suppress'

  return (
    <HydrationSettingsContext.Provider value={{
      mounted,
      strategy,
      suppressHydration,
      safeValue,
      safeStyle,
      themeReady,
      setStrategy,
    }}>
      {children}
    </HydrationSettingsContext.Provider>
  )
}

export function useHydrationSettings() {
  const context = useContext(HydrationSettingsContext)
  if (!context) {
    throw new Error('useHydrationSettings must be used within HydrationSettingsProvider')
  }
  return context
}

/**
 * Higher-Order Component for hydration-safe rendering
 * 
 * Usage:
 * ```tsx
 * const SafeComponent = withHydration(MyComponent)
 * 
 * // Or with specific strategy
 * const SafeComponent = withHydration(MyComponent, { strategy: 'defer' })
 * ```
 */
export function withHydration<P extends object>(
  Component: React.ComponentType<P>,
  options?: { strategy?: HydrationStrategy; fallback?: React.ReactNode }
) {
  return function HydrationSafeComponent(props: P) {
    const { mounted, strategy } = useHydrationSettings()
    const preferredStrategy = options?.strategy || strategy

    if (!mounted && preferredStrategy === 'defer') {
      return <>{options?.fallback || null}</>
    }

    return (
      <div suppressHydrationWarning={preferredStrategy === 'suppress'}>
        <Component {...props} />
      </div>
    )
  }
}

/**
 * Hook for components that need hydration-safe text content
 * 
 * Usage:
 * ```tsx
 * const { text, suppressHydrationWarning } = useHydrationSafeText(themeName, 'Loading...')
 * return <span suppressHydrationWarning={suppressHydrationWarning}>{text}</span>
 * ```
 */
export function useHydrationSafeText(value: string, fallback: string = '') {
  const { mounted, strategy } = useHydrationSettings()

  return {
    text: mounted || strategy === 'suppress' ? value : fallback,
    suppressHydrationWarning: strategy === 'suppress',
    mounted,
  }
}

/**
 * Hook for components that need hydration-safe styles
 * 
 * Usage:
 * ```tsx
 * const { style, suppressHydrationWarning } = useHydrationSafeStyle({
 *   backgroundColor: theme.primary,
 *   color: theme.text
 * })
 * return <div style={style} suppressHydrationWarning={suppressHydrationWarning}>...</div>
 * ```
 */
export function useHydrationSafeStyle(style: React.CSSProperties) {
  const { mounted, strategy } = useHydrationSettings()

  return {
    style: mounted || strategy === 'suppress' ? style : {},
    suppressHydrationWarning: strategy === 'suppress',
    mounted,
  }
}

/**
 * Utility component for hydration-safe rendering with placeholder
 */
export function HydrationSafe({ 
  children, 
  fallback = null,
  className,
  style,
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { mounted } = useHydrationSettings()

  if (!mounted) {
    return <>{fallback}</>
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}

/**
 * Utility component for inline text that may differ between SSR and CSR
 */
export function HydrationText({ 
  value, 
  fallback = '',
  className,
}: { 
  value: string
  fallback?: string
  className?: string
}) {
  const { strategy, mounted } = useHydrationSettings()

  if (strategy === 'suppress') {
    return (
      <span suppressHydrationWarning className={className}>
        {value}
      </span>
    )
  }

  return (
    <span className={className}>
      {mounted ? value : fallback}
    </span>
  )
}
