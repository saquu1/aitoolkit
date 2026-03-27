/**
 * ERROR MONITOR
 * =============
 * Client component that adds the ErrorPanel to the app
 * and enables global error capture
 */

'use client'

import { useEffect } from 'react'
import ErrorPanel from '@/components/ErrorPanel'
import { enableGlobalErrorCapture } from '@/lib/api-client'

export function ErrorMonitor() {
  // Enable global error capture on mount
  useEffect(() => {
    enableGlobalErrorCapture()
  }, [])

  return <ErrorPanel />
}

export default ErrorMonitor
