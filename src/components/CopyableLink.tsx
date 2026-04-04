'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link, Copy, Check, ExternalLink } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { getUISettings, subscribeToUISettings } from '@/hooks/useUISettings'

interface CopyableLinkProps {
  /** The URL to copy */
  url: string
  /** Display label */
  label?: string
  /** Optional description */
  description?: string
  /** Icon to show */
  icon?: React.ReactNode
  /** Color for the card */
  color?: string
  /** Click handler for navigation */
  onClick?: () => void
  /** Children to render instead of default content */
  children?: React.ReactNode
  /** Show as inline link (no card styling) */
  inline?: boolean
  /** Custom className */
  className?: string
}

export function CopyableLink({
  url,
  label,
  description,
  icon,
  color,
  onClick,
  children,
  inline = false,
  className = '',
}: CopyableLinkProps) {
  const { colors } = useTheme()
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState(getUISettings)

  // Subscribe to settings changes
  useEffect(() => {
    return subscribeToUISettings(() => {
      setSettings(getUISettings())
    })
  }, [])

  const alpha = useCallback((c: string, opacity: number) => 
    `color-mix(in srgb, ${c} ${opacity}%, transparent)`, [])

  const handleCopyUrl = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Get the full URL with origin
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = fullUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [url])

  const fullUrl = typeof window !== 'undefined' 
    ? (url.startsWith('http') ? url : `${window.location.origin}${url}`)
    : url

  // If copyable links are disabled, still show URL in status bar
  if (!settings.copyableLinksEnabled) {
    if (children) {
      return (
        <a 
          href={url}
          onClick={(e) => {
            if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
              e.preventDefault()
              onClick?.()
            }
          }}
          className={`block no-underline ${className}`}
        >
          {children}
        </a>
      )
    }
    
    if (inline) {
      return (
        <a 
          href={url}
          onClick={(e) => {
            if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
              e.preventDefault()
              onClick?.()
            }
          }}
          className={`cursor-pointer hover:underline no-underline ${className}`}
          style={{ color: color || colors.primary }}
        >
          {label}
        </a>
      )
    }

    return (
      <a 
        href={url}
        onClick={(e) => {
          if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            onClick?.()
          }
        }}
        className={`block rounded-xl border p-6 cursor-pointer transition-all hover:scale-[1.02] no-underline ${className}`}
        style={{ 
          background: color ? `linear-gradient(to bottom right, ${alpha(color, 20)}, ${alpha(color, 10)})` : undefined,
          borderColor: color ? alpha(color, 30) : colors.border,
        }}
      >
        {icon}
        {label && <h3 className="font-semibold" style={{ color: colors.text }}>{label}</h3>}
        {description && <p className="text-sm mt-1" style={{ color: colors.textMuted }}>{description}</p>}
      </a>
    )
  }

  // Render with copy functionality
  if (children) {
    return (
      <a 
        href={url}
        onClick={(e) => {
          if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            onClick?.()
          }
        }}
        className={`relative group block no-underline ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Copy button overlay */}
        {isHovered && (
          <div 
            className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            style={{ 
              backgroundColor: alpha(colors.card, 90),
              border: `1px solid ${colors.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
            onClick={e => { e.stopPropagation(); e.preventDefault(); }}
          >
            {settings.showUrlOnHover && (
              <span 
                className="max-w-[200px] truncate mr-1 font-mono"
                style={{ color: colors.textMuted }}
                title={fullUrl}
              >
                {fullUrl}
              </span>
            )}
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-white/10"
              style={{ color: copied ? colors.success : colors.primary }}
              title={copied ? 'Copied!' : 'Copy link'}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
        {children}
      </a>
    )
  }

  // Inline variant
  if (inline) {
    return (
      <a 
        href={url}
        onClick={(e) => {
          if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            onClick?.()
          }
        }}
        className={`relative inline-flex items-center gap-1 cursor-pointer group no-underline ${className}`}
        style={{ color: color || colors.primary }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="hover:underline">{label}</span>
        
        {isHovered && (
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center p-1 rounded transition-colors"
            style={{ color: copied ? colors.success : colors.textMuted }}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </a>
    )
  }

  // Card variant
  return (
    <a
      href={url}
      onClick={(e) => {
        if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={`block relative rounded-xl border p-6 cursor-pointer transition-all hover:scale-[1.02] no-underline ${className}`}
      style={{ 
        background: color ? `linear-gradient(to bottom right, ${alpha(color, 20)}, ${alpha(color, 10)})` : undefined,
        borderColor: color ? alpha(color, 30) : colors.border,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Copy button overlay */}
      {settings.copyableLinksEnabled && isHovered && (
        <div 
          className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
          style={{ 
            backgroundColor: alpha(colors.card, 95),
            border: `1px solid ${colors.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
          onClick={e => { e.stopPropagation(); e.preventDefault(); }}
        >
          {settings.showUrlOnHover && (
            <span 
              className="max-w-[200px] truncate mr-1 font-mono"
              style={{ color: colors.textMuted }}
              title={fullUrl}
            >
              {fullUrl}
            </span>
          )}
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-white/10"
            style={{ color: copied ? colors.success : colors.primary }}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {icon}
      {label && <h3 className="font-semibold" style={{ color: colors.text }}>{label}</h3>}
      {description && <p className="text-sm mt-1" style={{ color: colors.textMuted }}>{description}</p>}
    </a>
  )
}

// Navigation Card variant - specifically for dashboard quick actions
interface NavCardProps {
  title: string
  description: string
  icon: React.ReactNode
  url: string
  color: string
  onClick?: () => void
}

export function NavCard({ title, description, icon, url, color, onClick }: NavCardProps) {
  const { colors } = useTheme()
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState(getUISettings)

  useEffect(() => {
    return subscribeToUISettings(() => {
      setSettings(getUISettings())
    })
  }, [])

  const alpha = useCallback((c: string, opacity: number) => 
    `color-mix(in srgb, ${c} ${opacity}%, transparent)`, [])

  const handleCopyUrl = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = fullUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [url])

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only prevent default for left-click (allow right-click for context menu)
    if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      onClick?.()
    }
  }, [onClick])

  const fullUrl = typeof window !== 'undefined' 
    ? (url.startsWith('http') ? url : `${window.location.origin}${url}`)
    : url

  return (
    <a
      href={url}
      onClick={handleClick}
      className="block relative rounded-xl border p-6 cursor-pointer transition-all hover:scale-[1.02] no-underline"
      style={{ 
        background: `linear-gradient(to bottom right, ${alpha(color, 20)}, ${alpha(color, 10)})`,
        borderColor: alpha(color, 30),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Copy button overlay - only show if enabled */}
      {settings.copyableLinksEnabled && isHovered && (
        <div 
          className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
          style={{ 
            backgroundColor: alpha(colors.card, 95),
            border: `1px solid ${colors.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
          onClick={e => e.stopPropagation()}
        >
          {settings.showUrlOnHover && (
            <span 
              className="max-w-[200px] truncate mr-1 font-mono"
              style={{ color: colors.textMuted }}
              title={fullUrl}
            >
              {fullUrl}
            </span>
          )}
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-white/10"
            style={{ color: copied ? colors.success : colors.primary }}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {icon}
      <h3 className="font-semibold" style={{ color: colors.text }}>{title}</h3>
      <p className="text-sm mt-1" style={{ color: colors.textMuted }}>{description}</p>
    </a>
  )
}
