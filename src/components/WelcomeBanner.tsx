'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Sparkles, Upload, Keyboard, Palette, X, ArrowRight, Database } from 'lucide-react'

interface WelcomeBannerProps {
  onNavigate?: (tab: string) => void
  onDismiss?: () => void
}

const STEPS = [
  { icon: Upload, title: 'Upload Schema', desc: 'Drop SQL/DDL files to begin analysis' },
  { icon: Keyboard, title: 'Use Shortcuts', desc: 'Press Ctrl+K for command palette' },
  { icon: Palette, title: 'Customize Theme', desc: 'Choose from 7 color schemes' },
  { icon: Database, title: 'Explore Agents', desc: '35 agents across 7 intelligence layers' },
]

function getStoredDismissed(): boolean {
  try {
    return localStorage.getItem('welcome-banner-dismissed') === 'true'
  } catch {
    return false
  }
}

export function WelcomeBanner({ onNavigate, onDismiss }: WelcomeBannerProps) {
  const { colors } = useTheme()
  const [dismissed, setDismissed] = useState(getStoredDismissed)
  const [stepIndex, setStepIndex] = useState(0)
  const [animating, setAnimating] = useState(false)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Auto-rotate steps
  useEffect(() => {
    if (dismissed) return
    const interval = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setStepIndex(prev => (prev + 1) % STEPS.length)
        setAnimating(false)
      }, 300)
    }, 4000)
    return () => clearInterval(interval)
  }, [dismissed])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    try { localStorage.setItem('welcome-banner-dismissed', 'true') } catch {}
    onDismiss?.()
  }, [onDismiss])

  if (dismissed) return null

  const currentStep = STEPS[stepIndex]
  const StepIcon = currentStep.icon

  return (
    <div
      className="rounded-xl border p-4 md:p-5 transition-all duration-500"
      style={{
        background: `linear-gradient(135deg, ${alpha(colors.primary, 12)}, ${alpha(colors.accent, 12)}, ${alpha(colors.primary, 6)})`,
        borderColor: alpha(colors.primary, 20),
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${alpha(colors.primary, 25)}, ${alpha(colors.accent, 25)})`,
            }}
          >
            <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text }}>
              Welcome to AI Enterprise Architect
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: alpha(colors.success, 15), color: colors.success }}
              >
                Getting Started
              </span>
            </h3>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              Follow these steps to get the most out of the platform
            </p>
          </div>
        </div>
        <button
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: colors.textMuted }}
          onClick={handleDismiss}
          aria-label="Dismiss welcome banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step display */}
      <div
        className="rounded-lg p-4 mb-4 transition-opacity duration-300"
        style={{
          backgroundColor: alpha(colors.bgTertiary, 20),
          opacity: animating ? 0 : 1,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg transition-transform"
            style={{ backgroundColor: alpha(colors.primary, 12) }}
          >
            <StepIcon className="w-5 h-5" style={{ color: colors.primary }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: colors.text }}>
                {currentStep.title}
              </p>
              <span className="text-[10px]" style={{ color: colors.textMuted }}>
                Step {stepIndex + 1} of {STEPS.length}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              {currentStep.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Progress dots + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i === stepIndex ? colors.primary : alpha(colors.border, 80),
                width: i === stepIndex ? '16px' : '8px',
              }}
              onClick={() => {
                setAnimating(true)
                setTimeout(() => { setStepIndex(i); setAnimating(false) }, 150)
              }}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-[1.02]"
            style={{
              backgroundColor: alpha(colors.primary, 12),
              color: colors.primary,
              border: `1px solid ${alpha(colors.primary, 20)}`,
            }}
            onClick={() => onNavigate?.('upload')}
          >
            <Upload className="w-3 h-3 inline mr-1.5" />
            Upload Schema
          </button>
          <button
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: colors.primary, color: '#ffffff' }}
            onClick={handleDismiss}
          >
            Get Started
            <ArrowRight className="w-3 h-3 inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
