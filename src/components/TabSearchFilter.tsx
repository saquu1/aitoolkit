'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface TabSearchFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Total number of items to compare against for match count */
  totalCount?: number
  /** Current match count after filtering */
  matchCount?: number
  className?: string
}

export function TabSearchFilter({
  value,
  onChange,
  placeholder = 'Filter pages...',
  totalCount,
  matchCount,
  className = '',
}: TabSearchFilterProps) {
  const { colors, mounted } = useTheme()
  const [localValue, setLocalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Sync external value changes (e.g., clear from outside)
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value)
    }
  }, [value])

  // Debounced onChange — 300ms delay
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, 300)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [localValue])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  const isFiltering = localValue.trim().length > 0
  const showMatchCount = isFiltering && totalCount !== undefined && matchCount !== undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div
        className="relative flex items-center rounded-lg transition-all duration-300 ease-in-out"
        style={{
          width: isFocused ? '100%' : '100%',
          backgroundColor: alpha(colors.bgTertiary, 30),
          border: `1px solid ${isFiltering ? alpha(colors.primary, 40) : alpha(colors.border, 50)}`,
          boxShadow: isFocused
            ? `0 0 0 2px ${alpha(colors.primary, 10)}`
            : isFiltering
              ? `0 0 0 2px ${alpha(colors.primary, 10)}`
              : 'none',
        }}
      >
        {/* Search icon */}
        <Search
          className="absolute left-2.5 w-3.5 h-3.5 flex-shrink-0 pointer-events-none transition-colors duration-200"
          style={{ color: isFocused || isFiltering ? colors.primary : colors.textMuted }}
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2 rounded-lg text-xs outline-none bg-transparent"
          style={{ color: colors.text }}
          aria-label={placeholder}
        />

        {/* Clear button */}
        {isFiltering && (
          <button
            onClick={handleClear}
            className="absolute right-2 p-0.5 rounded transition-all duration-200 cursor-pointer"
            style={{ color: colors.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.text
              e.currentTarget.style.backgroundColor = alpha(colors.bgTertiary, 50)
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.textMuted
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Match count indicator */}
      {showMatchCount && (
        <div
          className="flex items-center gap-1.5 px-1 content-fade-in"
          style={{ color: colors.textMuted }}
        >
          <Filter className="w-3 h-3" />
          <span className="text-[10px] font-medium">
            {matchCount} of {totalCount} pages
          </span>
        </div>
      )}
    </div>
  )
}
