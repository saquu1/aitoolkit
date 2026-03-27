'use client'

import { useTheme, COLOR_SCHEMES, ColorScheme } from '@/hooks/useTheme'
import { 
  LayoutMode, 
  TopBarNavStyle, 
  UIDensity, 
  ProjectDropdownPosition,
  useLayoutSettings 
} from '@/hooks/useLayoutSettings'
import { 
  Palette, 
  Layout, 
  Sidebar, 
  PanelTop, 
  Menu, 
  Monitor, 
  ToggleLeft, 
  ToggleRight,
  Check,
  RotateCcw,
  User,
  FolderKanban
} from 'lucide-react'

// Helper for hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith('#')) return `rgba(59, 130, 246, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function LayoutSettingsSection() {
  const { colors, colorScheme, setColorScheme } = useTheme()
  const { settings, updateSettings, resetSettings, mounted } = useLayoutSettings()

  if (!mounted) {
    return (
      <div className="p-4 rounded-xl border animate-pulse" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded" style={{ backgroundColor: colors.border }} />
          <div className="h-4 w-32 rounded" style={{ backgroundColor: colors.border }} />
        </div>
      </div>
    )
  }

  // Theme presets grouped by style
  const themeGroups = {
    'Metronic Style': ['metronic-blue', 'metronic-teal', 'metronic-purple', 'metronic-green', 'metronic-orange', 'metronic-gray'] as ColorScheme[],
    'Dark Themes': ['midnight', 'ocean', 'forest', 'sunset', 'lavender', 'cyberpunk'] as ColorScheme[],
    'Light Themes': ['light'] as ColorScheme[],
  }

  const layoutModes: { value: LayoutMode; label: string; icon: typeof Layout; description: string }[] = [
    { value: 'full-sidebar', label: 'Full Sidebar', icon: Sidebar, description: 'Standard sidebar with icons and labels' },
    { value: 'mini-sidebar', label: 'Mini Sidebar', icon: Menu, description: 'Icon-only sidebar for more space' },
    { value: 'top-bar-only', label: 'Top Bar Only', icon: PanelTop, description: 'No sidebar, navigation in top bar' },
  ]

  const topBarNavStyles: { value: TopBarNavStyle; label: string; description: string }[] = [
    { value: 'tabs', label: 'Horizontal Tabs', description: 'Tab-based navigation in top bar' },
    { value: 'hamburger', label: 'Hamburger Menu', description: 'Dropdown menu from hamburger icon' },
  ]

  const uiDensities: { value: UIDensity; label: string; description: string }[] = [
    { value: 'compact', label: 'Compact', description: 'Smaller fonts, tighter spacing' },
    { value: 'normal', label: 'Normal', description: 'Default spacing and font sizes' },
    { value: 'comfortable', label: 'Comfortable', description: 'Larger spacing for easier reading' },
  ]

  return (
    <div className="space-y-6">
      {/* Settings Scope Toggle */}
      <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
          <Monitor className="w-5 h-5" style={{ color: colors.primary }} />
          Settings Scope
        </h3>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          Choose whether to apply settings globally or just for this project
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => updateSettings({ settingsScope: 'user' })}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors"
            style={{
              backgroundColor: settings.settingsScope === 'user' ? hexToRgba(colors.primary, 0.1) : 'transparent',
              borderColor: settings.settingsScope === 'user' ? colors.primary : colors.border,
              color: settings.settingsScope === 'user' ? colors.primary : colors.textMuted,
            }}
          >
            <User className="w-4 h-4" />
            <span className="font-medium">User Settings</span>
            <span className="text-xs" style={{ color: colors.textMuted }}>(localStorage)</span>
          </button>
          <button
            onClick={() => updateSettings({ settingsScope: 'project' })}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors"
            style={{
              backgroundColor: settings.settingsScope === 'project' ? hexToRgba(colors.primary, 0.1) : 'transparent',
              borderColor: settings.settingsScope === 'project' ? colors.primary : colors.border,
              color: settings.settingsScope === 'project' ? colors.primary : colors.textMuted,
            }}
          >
            <FolderKanban className="w-4 h-4" />
            <span className="font-medium">Project Settings</span>
            <span className="text-xs" style={{ color: colors.textMuted }}>(database)</span>
          </button>
        </div>
      </div>

      {/* Theme Colors */}
      <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
          <Palette className="w-5 h-5" style={{ color: colors.primary }} />
          Theme Colors
        </h3>
        
        {Object.entries(themeGroups).map(([groupName, themeKeys]) => (
          <div key={groupName} className="mb-4 last:mb-0">
            <h4 className="text-sm font-medium mb-2" style={{ color: colors.textMuted }}>{groupName}</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {themeKeys.map((key) => {
                const theme = COLOR_SCHEMES[key]
                if (!theme) return null
                const isActive = colorScheme === key
                return (
                  <button
                    key={key}
                    onClick={() => setColorScheme(key)}
                    className="relative p-2 rounded-lg border transition-all hover:scale-105"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: isActive ? theme.primary : theme.border,
                    }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      />
                    </div>
                    <div 
                      className="text-xs truncate"
                      style={{ color: theme.text }}
                    >
                      {theme.label}
                    </div>
                    {isActive && (
                      <div 
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Layout Mode */}
      <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
          <Layout className="w-5 h-5" style={{ color: colors.primary }} />
          Layout Mode
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {layoutModes.map((mode) => {
            const Icon = mode.icon
            const isActive = settings.layoutMode === mode.value
            return (
              <button
                key={mode.value}
                onClick={() => updateSettings({ layoutMode: mode.value })}
                className="p-4 rounded-lg border transition-colors text-left"
                style={{
                  backgroundColor: isActive ? hexToRgba(colors.primary, 0.1) : 'transparent',
                  borderColor: isActive ? colors.primary : colors.border,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon 
                    className="w-5 h-5" 
                    style={{ color: isActive ? colors.primary : colors.textMuted }} 
                  />
                  <span 
                    className="font-medium"
                    style={{ color: isActive ? colors.primary : colors.text }}
                  >
                    {mode.label}
                  </span>
                </div>
                <p className="text-xs" style={{ color: colors.textMuted }}>
                  {mode.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Top Bar Navigation Style (only when top-bar-only mode) */}
        {settings.layoutMode === 'top-bar-only' && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
            <h4 className="text-sm font-medium mb-3" style={{ color: colors.textMuted }}>
              Top Bar Navigation Style
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {topBarNavStyles.map((style) => {
                const isActive = settings.topBarNavStyle === style.value
                return (
                  <button
                    key={style.value}
                    onClick={() => updateSettings({ topBarNavStyle: style.value })}
                    className="p-3 rounded-lg border transition-colors text-left"
                    style={{
                      backgroundColor: isActive ? hexToRgba(colors.primary, 0.1) : 'transparent',
                      borderColor: isActive ? colors.primary : colors.border,
                    }}
                  >
                    <span 
                      className="font-medium"
                      style={{ color: isActive ? colors.primary : colors.text }}
                    >
                      {style.label}
                    </span>
                    <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                      {style.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Project Dropdown Settings */}
      <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <h3 className="font-semibold mb-3" style={{ color: colors.text }}>
          Project Dropdown
        </h3>
        
        {/* Enable/Disable */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span style={{ color: colors.text }}>Show Project Dropdown</span>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Display the project switcher in the navigation
            </p>
          </div>
          <button
            onClick={() => updateSettings({ showProjectDropdown: !settings.showProjectDropdown })}
            className="p-1"
          >
            {settings.showProjectDropdown ? (
              <ToggleRight className="w-10 h-10" style={{ color: colors.primary }} />
            ) : (
              <ToggleLeft className="w-10 h-10" style={{ color: colors.textMuted }} />
            )}
          </button>
        </div>

        {/* Position (only when enabled) */}
        {settings.showProjectDropdown && (
          <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: colors.textMuted }}>Position</h4>
            <div className="grid grid-cols-2 gap-2">
              {(['sidebar', 'topbar'] as ProjectDropdownPosition[]).map((pos) => {
                const isActive = settings.projectDropdownPosition === pos
                return (
                  <button
                    key={pos}
                    onClick={() => updateSettings({ projectDropdownPosition: pos })}
                    className="px-4 py-2 rounded-lg border transition-colors capitalize"
                    style={{
                      backgroundColor: isActive ? hexToRgba(colors.primary, 0.1) : 'transparent',
                      borderColor: isActive ? colors.primary : colors.border,
                      color: isActive ? colors.primary : colors.textMuted,
                    }}
                  >
                    {pos === 'sidebar' ? 'Sidebar Top' : 'Top Bar Left'}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Settings */}
      {settings.layoutMode !== 'top-bar-only' && (
        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <Sidebar className="w-5 h-5" style={{ color: colors.primary }} />
            Sidebar Settings
          </h3>
          
          {/* Remember Collapse State */}
          <div className="flex items-center justify-between">
            <div>
              <span style={{ color: colors.text }}>Remember Collapse State</span>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Keep sidebar collapsed/expanded across sessions
              </p>
            </div>
            <button
              onClick={() => updateSettings({ rememberSidebarState: !settings.rememberSidebarState })}
              className="p-1"
            >
              {settings.rememberSidebarState ? (
                <ToggleRight className="w-10 h-10" style={{ color: colors.primary }} />
              ) : (
                <ToggleLeft className="w-10 h-10" style={{ color: colors.textMuted }} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* UI Density */}
      <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <h3 className="font-semibold mb-3" style={{ color: colors.text }}>
          UI Density
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {uiDensities.map((density) => {
            const isActive = settings.uiDensity === density.value
            return (
              <button
                key={density.value}
                onClick={() => updateSettings({ uiDensity: density.value })}
                className="p-3 rounded-lg border transition-colors text-left"
                style={{
                  backgroundColor: isActive ? hexToRgba(colors.primary, 0.1) : 'transparent',
                  borderColor: isActive ? colors.primary : colors.border,
                }}
              >
                <span 
                  className="font-medium capitalize"
                  style={{ color: isActive ? colors.primary : colors.text }}
                >
                  {density.label}
                </span>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  {density.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetSettings}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
        style={{ borderColor: colors.border, color: colors.textMuted }}
      >
        <RotateCcw className="w-4 h-4" />
        Reset to Defaults
      </button>
    </div>
  )
}
