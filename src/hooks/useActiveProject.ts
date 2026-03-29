'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'schema-architect-active-project'

export interface ActiveProjectInfo {
  id: string
  name: string
  softwareType: string
  targetTemplate: string
  color: string
  icon?: string
}

export function useActiveProject() {
  const [activeProject, setActiveProjectState] = useState<ActiveProjectInfo | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setActiveProjectState(parsed)
      }
    } catch (error) {
      console.error('Error loading active project:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever it changes
  const setActiveProject = (project: ActiveProjectInfo | null) => {
    setActiveProjectState(project)
    if (project) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const clearActiveProject = () => {
    setActiveProjectState(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    activeProject,
    setActiveProject,
    clearActiveProject,
    isLoaded
  }
}
