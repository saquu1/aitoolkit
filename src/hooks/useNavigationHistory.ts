'use client'

import { useState, useCallback, useRef } from 'react'

interface HistoryEntry {
  tabId: string
  label: string
  timestamp: number
}

/**
 * Hook for tracking navigation history with back/forward support.
 * Maintains a stack of visited tabs and supports undo/redo navigation.
 */
export function useNavigationHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const isProgrammaticRef = useRef(false)

  const push = useCallback((tabId: string, label: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1)
      newHistory.push({ tabId, label, timestamp: Date.now() })
      // Keep only last 50 entries
      if (newHistory.length > 50) newHistory.shift()
      return newHistory
    })
    setCurrentIndex(prev => Math.min(prev + 1, 49))
  }, [currentIndex])

  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < history.length - 1

  const goBack = useCallback((): HistoryEntry | null => {
    if (!canGoBack) return null
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return history[newIndex]
  }, [canGoBack, currentIndex, history])

  const goForward = useCallback((): HistoryEntry | null => {
    if (!canGoForward) return null
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return history[newIndex]
  }, [canGoForward, currentIndex, history])

  const current = history[currentIndex] || null
  const recentItems = history.slice(Math.max(0, currentIndex - 4), currentIndex + 1).reverse()

  return {
    push,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    current,
    recentItems,
    historyLength: history.length,
  }
}
