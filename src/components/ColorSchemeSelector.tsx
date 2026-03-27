'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette, Check, ChevronDown, Settings2, X } from 'lucide-react'
import { useTheme, COLOR_SCHEMES, ColorScheme } from '@/hooks/useTheme'

export function ColorSchemeSelector() {
  const { colorScheme, setColorScheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowAdvanced(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentScheme = COLOR_SCHEMES[colorScheme]
  const schemes = Object.entries(COLOR_SCHEMES) as [ColorScheme, typeof currentScheme][]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
        style={{
          backgroundColor: `color-mix(in srgb, ${currentScheme.primary} 15%, transparent)`,
          borderColor: `color-mix(in srgb, ${currentScheme.primary} 30%, transparent)`,
          color: currentScheme.primary,
        }}
      >
        <Palette className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">{currentScheme.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-72 rounded-lg shadow-xl border overflow-hidden z-50"
          style={{
            backgroundColor: currentScheme.card,
            borderColor: currentScheme.border,
          }}
        >
          {/* Header */}
          <div 
            className="px-3 py-2 border-b flex items-center justify-between"
            style={{ 
              borderColor: currentScheme.border,
              color: currentScheme.textMuted 
            }}
          >
            <span className="text-xs font-medium uppercase tracking-wider">Color Scheme</span>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
              style={{
                backgroundColor: showAdvanced 
                  ? `color-mix(in srgb, ${currentScheme.primary} 20%, transparent)` 
                  : 'transparent',
                color: showAdvanced ? currentScheme.primary : currentScheme.textMuted,
              }}
            >
              <Settings2 className="w-3 h-3" />
              Advanced
            </button>
          </div>

          {/* Color Schemes Grid */}
          <div className="p-2">
            <div className="grid grid-cols-2 gap-1">
              {schemes.map(([key, scheme]) => (
                <button
                  key={key}
                  onClick={() => setColorScheme(key)}
                  className="flex items-center gap-2 px-2 py-2 rounded transition-all hover:opacity-80"
                  style={{
                    backgroundColor: colorScheme === key 
                      ? `color-mix(in srgb, ${scheme.primary} 15%, transparent)` 
                      : 'transparent',
                    color: colorScheme === key ? scheme.primary : scheme.text,
                    border: colorScheme === key 
                      ? `1px solid color-mix(in srgb, ${scheme.primary} 30%, transparent)`
                      : '1px solid transparent',
                  }}
                >
                  <div 
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ 
                      borderColor: scheme.primary,
                      backgroundColor: `color-mix(in srgb, ${scheme.primary} 30%, transparent)`,
                    }}
                  >
                    {colorScheme === key && (
                      <Check className="w-3 h-3" style={{ color: scheme.primary }} />
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">{scheme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div 
              className="border-t p-3 space-y-3"
              style={{ borderColor: currentScheme.border }}
            >
              <div 
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: currentScheme.textMuted }}
              >
                Element Colors Preview
              </div>

              {/* Tab Colors Preview */}
              <div className="space-y-2">
                <div 
                  className="text-xs font-medium"
                  style={{ color: currentScheme.textSecondary }}
                >
                  Tab Colors
                </div>
                <div 
                  className="flex items-center gap-1 p-1 rounded-lg"
                  style={{ backgroundColor: currentScheme.tabBg }}
                >
                  <div 
                    className="px-3 py-1.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: currentScheme.tabActiveBg,
                      color: currentScheme.tabActiveText,
                    }}
                  >
                    Active Tab
                  </div>
                  <div 
                    className="px-3 py-1.5 rounded text-xs font-medium"
                    style={{ color: currentScheme.tabInactiveText }}
                  >
                    Inactive Tab
                  </div>
                </div>
              </div>

              {/* Card Colors Preview */}
              <div className="space-y-2">
                <div 
                  className="text-xs font-medium"
                  style={{ color: currentScheme.textSecondary }}
                >
                  Card Colors
                </div>
                <div 
                  className="rounded-lg border p-2"
                  style={{
                    backgroundColor: currentScheme.card,
                    borderColor: currentScheme.border,
                  }}
                >
                  <div 
                    className="text-xs font-medium mb-1"
                    style={{ color: currentScheme.text }}
                  >
                    Card Title
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: currentScheme.textMuted }}
                  >
                    Card description text
                  </div>
                </div>
              </div>

              {/* Input Colors Preview */}
              <div className="space-y-2">
                <div 
                  className="text-xs font-medium"
                  style={{ color: currentScheme.textSecondary }}
                >
                  Input Colors
                </div>
                <input 
                  type="text"
                  placeholder="Input placeholder..."
                  className="w-full px-3 py-1.5 rounded text-xs"
                  style={{
                    backgroundColor: currentScheme.inputBg,
                    border: `1px solid ${currentScheme.inputBorder}`,
                    color: currentScheme.inputText,
                  }}
                  readOnly
                />
              </div>

              {/* Button Colors Preview */}
              <div className="space-y-2">
                <div 
                  className="text-xs font-medium"
                  style={{ color: currentScheme.textSecondary }}
                >
                  Button Colors
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    className="px-3 py-1.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: currentScheme.buttonPrimary,
                      color: '#ffffff',
                    }}
                  >
                    Primary
                  </button>
                  <button 
                    className="px-3 py-1.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: currentScheme.buttonSecondary,
                      color: currentScheme.text,
                    }}
                  >
                    Secondary
                  </button>
                  <button 
                    className="px-3 py-1.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'transparent',
                      border: `1px solid ${currentScheme.buttonOutline}`,
                      color: currentScheme.text,
                    }}
                  >
                    Outline
                  </button>
                </div>
              </div>

              {/* Color Swatches */}
              <div className="space-y-2">
                <div 
                  className="text-xs font-medium"
                  style={{ color: currentScheme.textSecondary }}
                >
                  Full Palette
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[
                    { color: currentScheme.primary, label: 'Primary' },
                    { color: currentScheme.accent, label: 'Accent' },
                    { color: currentScheme.success, label: 'Success' },
                    { color: currentScheme.warning, label: 'Warning' },
                    { color: currentScheme.error, label: 'Error' },
                    { color: currentScheme.bg, label: 'BG' },
                  ].map((item) => (
                    <div 
                      key={item.label}
                      className="w-full aspect-square rounded"
                      style={{ backgroundColor: item.color }}
                      title={item.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
