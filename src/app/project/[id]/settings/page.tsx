'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { Settings, Save, Loader2, ToggleLeft, ToggleRight, Trash2, Database } from 'lucide-react'

interface ProjectSettings {
  id: string
  name: string
  description?: string
  softwareType: string
  targetTemplate: string
  color: string
  icon: string
  status: string
}

export default function SettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [project, setProject] = useState<ProjectSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keepActive, setKeepActive] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchProject()
    checkActiveStatus()
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects?id=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkActiveStatus = () => {
    try {
      const stored = localStorage.getItem('schema-architect-active-project')
      if (stored) {
        const parsed = JSON.parse(stored)
        setKeepActive(parsed.id === projectId)
      }
    } catch (error) {
      console.error('Error checking active status:', error)
    }
  }

  const handleToggleActive = () => {
    const newValue = !keepActive
    setKeepActive(newValue)

    if (newValue && project) {
      // Save to localStorage
      localStorage.setItem('schema-architect-active-project', JSON.stringify({
        id: project.id,
        name: project.name,
        softwareType: project.softwareType,
        targetTemplate: project.targetTemplate,
        color: project.color,
        icon: project.icon
      }))
      setMessage({ type: 'success', text: 'Project set as active - will persist across sessions' })
    } else {
      // Remove from localStorage
      localStorage.removeItem('schema-architect-active-project')
      setMessage({ type: 'success', text: 'Project no longer set as active' })
    }

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSaveSettings = async () => {
    if (!project) return
    setSaving(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          name: project.name,
          description: project.description,
          softwareType: project.softwareType,
          targetTemplate: project.targetTemplate,
          color: project.color,
          icon: project.icon
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleDeleteProject = async () => {
    if (!project) return
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return

    try {
      const response = await fetch(`/api/projects?id=${projectId}`, { method: 'DELETE' })
      if (response.ok) {
        // Clear active project if this was it
        if (keepActive) {
          localStorage.removeItem('schema-architect-active-project')
        }
        router.push('/dashboard')
      } else {
        setMessage({ type: 'error', text: 'Failed to delete project' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting project' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>Project not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Settings className="w-6 h-6" style={{ color: colors.primary }} />
            <h1 className="text-xl font-bold" style={{ color: colors.text }}>Project Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {message.text}
          </div>
        )}

        {/* Active Project Toggle */}
        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: colors.text }}>Keep Project Active</h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                When enabled, this project will persist across sessions and page reloads.
                Direct access URL: <code className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: colors.bg }}>/project/{projectId}</code>
              </p>
            </div>
            <button
              onClick={handleToggleActive}
              className="flex items-center gap-2"
            >
              {keepActive ? (
                <ToggleRight className="w-10 h-10" style={{ color: colors.primary }} />
              ) : (
                <ToggleLeft className="w-10 h-10" style={{ color: colors.textMuted }} />
              )}
            </button>
          </div>
          {keepActive && (
            <div className="mt-3 p-2 rounded text-sm" style={{ backgroundColor: `${colors.primary}10`, color: colors.primary }}>
              ✓ This project is set as active. Bookmark this URL for quick access.
            </div>
          )}
        </div>

        {/* Basic Settings */}
        <div className="p-4 rounded-xl border space-y-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h3 className="font-semibold" style={{ color: colors.text }}>Basic Information</h3>

          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Project Name</label>
            <input
              type="text"
              value={project.name}
              onChange={(e) => setProject({ ...project, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border"
              style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Description</label>
            <textarea
              value={project.description || ''}
              onChange={(e) => setProject({ ...project, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border resize-none"
              rows={3}
              style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Software Type</label>
              <select
                value={project.softwareType}
                onChange={(e) => setProject({ ...project, softwareType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              >
                <option value="HIS">HIS (Hospital Information System)</option>
                <option value="ERP">ERP</option>
                <option value="CRM">CRM</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="LMS">LMS</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Target Template</label>
              <select
                value={project.targetTemplate}
                onChange={(e) => setProject({ ...project, targetTemplate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              >
                <option value="nextjs-react">Next.js + React</option>
                <option value="nextjs-pages">Next.js Pages Router</option>
                <option value="laravel">Laravel</option>
                <option value="dotnet-mvc">.NET MVC</option>
                <option value="flutter">Flutter</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Project Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={project.color}
                onChange={(e) => setProject({ ...project, color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={project.color}
                onChange={(e) => setProject({ ...project, color: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium"
          style={{ backgroundColor: colors.primary, color: '#fff' }}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>

        {/* Danger Zone */}
        <div className="p-4 rounded-xl border border-red-500/50" style={{ backgroundColor: colors.card }}>
          <h3 className="font-semibold text-red-500 mb-3">Danger Zone</h3>
          <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
            Deleting this project will permanently remove all associated files, tables, procedures, and analysis data.
          </p>
          <button
            onClick={handleDeleteProject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Project
          </button>
        </div>
      </div>
    </div>
  )
}
