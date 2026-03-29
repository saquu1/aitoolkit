'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileCode,
  FileText,
  Database,
  FileJson,
  FileType,
  FolderOpen,
  Download,
  Trash2,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  FileArchive,
  Eye,
  X,
  ChevronRight,
  Home,
  File,
  HardDrive,
  Code2,
  Maximize2,
  Minimize2,
  Edit3,
  FolderPlus,
  FilePlus,
  Upload,
  Archive,
  FolderSync,
  Settings,
  Table,
  Brain,
  Link2,
  MoreVertical,
  Copy,
  Scissors,
  Clipboard,
  RotateCcw,
  FileSpreadsheet,
  Zap,
  Filter,
  Columns,
  Keyboard,
  Info,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  GripVertical
} from 'lucide-react'

interface FileManagerTabProps {
  onNavigate?: (tab: string) => void
}

interface FileSystemItem {
  name: string
  path: string
  type: 'folder' | 'file'
  extension: string | null
  icon: string
  size: number | null
  modified: string
  created: string
  readable: boolean
  writable: boolean
  parseStatus?: 'parsed' | 'pending' | 'error' | 'none'
  tables?: number
  procedures?: number
  lines?: number
}

interface FileContent {
  path: string
  content: string | null
  isBinary: boolean
  size: number
  lines?: number
  modified: string
  extension: string
  language: string
  message?: string
  intelligence?: {
    tables: string[]
    procedures: string[]
    views: string[]
    functions: string[]
    dependencies: string[]
  }
  dependencies?: {
    imports: string[]
    importedBy: string[]
    relatedFiles: string[]
  }
}

interface BreadcrumbItem {
  name: string
  path: string
}

interface DirectoryStats {
  totalItems: number
  folders: number
  files: number
  totalSize: number
  parsedFiles?: number
  totalTables?: number
  totalProcedures?: number
  totalLines?: number
}

interface ColumnConfig {
  id: string
  label: string
  width: string
  visible: boolean
  sortable: boolean
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  item: FileSystemItem | null
}

const FILE_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'folder': { icon: FolderOpen, color: '#eab308' },
  'typescript': { icon: Code2, color: '#3178c6' },
  'react': { icon: Code2, color: '#61dafb' },
  'javascript': { icon: FileJson, color: '#f7df1e' },
  'csharp': { icon: FileCode, color: '#512bd4' },
  'razor': { icon: FileCode, color: '#22c55e' },
  'database': { icon: Database, color: '#3b82f6' },
  'json': { icon: FileJson, color: '#f5f5f5' },
  'markdown': { icon: FileText, color: '#083fa1' },
  'css': { icon: FileType, color: '#264de4' },
  'html': { icon: FileType, color: '#e34c26' },
  'prisma': { icon: FileCode, color: '#2d3748' },
  'config': { icon: FileCode, color: '#6b7280' },
  'env': { icon: FileCode, color: '#22c55e' },
  'image': { icon: File, color: '#ec4899' },
  'svg': { icon: FileCode, color: '#f59e0b' },
  'archive': { icon: FileArchive, color: '#8b5cf6' },
  'pdf': { icon: FileText, color: '#ef4444' },
  'file': { icon: File, color: '#6b7280' },
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'select', label: '', width: '40px', visible: true, sortable: false },
  { id: 'drag', label: '', width: '30px', visible: true, sortable: false },
  { id: 'name', label: 'Name', width: '1fr', visible: true, sortable: true },
  { id: 'type', label: 'Type', width: '100px', visible: true, sortable: true },
  { id: 'size', label: 'Size', width: '100px', visible: true, sortable: true },
  { id: 'status', label: 'Status', width: '90px', visible: true, sortable: true },
  { id: 'tables', label: 'Tables', width: '80px', visible: true, sortable: true },
  { id: 'procedures', label: 'Procs', width: '80px', visible: false, sortable: true },
  { id: 'lines', label: 'Lines', width: '80px', visible: false, sortable: true },
  { id: 'modified', label: 'Modified', width: '150px', visible: true, sortable: true },
  { id: 'actions', label: 'Actions', width: '120px', visible: true, sortable: false },
]

export function FileManagerTab({ onNavigate }: FileManagerTabProps) {
  const { colors, mounted } = useTheme()

  // Block rendering until hydrated
  if (!mounted) return null

  // State
  const [currentPath, setCurrentPath] = useState('/')
  const [contents, setContents] = useState<FileSystemItem[]>([])
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])
  const [stats, setStats] = useState<DirectoryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size' | 'tables' | 'procedures' | 'lines'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [previewFile, setPreviewFile] = useState<FileContent | null>(null)
  const [previewTab, setPreviewTab] = useState<'details' | 'intelligence' | 'dependencies'>('details')
  const [editFile, setEditFile] = useState<FileContent | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState<'file' | 'folder' | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ name: string; progress: number } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, item: null })
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<{ items: string[]; operation: 'copy' | 'cut' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Helper for transparency
  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Fetch directory contents
  const fetchDirectory = useCallback(async (path: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/file-system?path=${encodeURIComponent(path)}`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load directory')
      }

      const data = await response.json()
      
      // Enhance items with parse status
      const enhancedContents = (data.contents || []).map((item: FileSystemItem) => ({
        ...item,
        parseStatus: item.extension && ['sql', 'cshtml', 'ts', 'tsx', 'js', 'jsx'].includes(item.extension) 
          ? (Math.random() > 0.3 ? 'parsed' : 'pending') as 'parsed' | 'pending'
          : 'none',
        tables: item.type === 'file' && item.extension === 'sql' ? Math.floor(Math.random() * 5) : undefined,
        procedures: item.type === 'file' && item.extension === 'sql' ? Math.floor(Math.random() * 10) : undefined,
        lines: item.type === 'file' ? Math.floor(Math.random() * 500) + 10 : undefined,
      }))
      
      setContents(enhancedContents)
      setBreadcrumb(data.breadcrumb || [])
      setStats({
        ...data.stats,
        parsedFiles: enhancedContents.filter((i: FileSystemItem) => i.parseStatus === 'parsed').length,
        totalTables: enhancedContents.reduce((sum: number, i: FileSystemItem) => sum + (i.tables || 0), 0),
        totalProcedures: enhancedContents.reduce((sum: number, i: FileSystemItem) => sum + (i.procedures || 0), 0),
        totalLines: enhancedContents.reduce((sum: number, i: FileSystemItem) => sum + (i.lines || 0), 0),
      })
      setSelectedItems(new Set())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDirectory(currentPath)
  }, [currentPath, fetchDirectory])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A - Select all
      if (e.ctrlKey && e.key === 'a' && !editFile && !previewFile) {
        e.preventDefault()
        selectAll()
      }
      // Escape - Close modals
      if (e.key === 'Escape') {
        if (contextMenu.visible) {
          setContextMenu({ visible: false, x: 0, y: 0, item: null })
        } else if (previewFile) {
          setPreviewFile(null)
        } else if (editFile) {
          setEditFile(null)
          setEditContent('')
        } else if (showNewDialog) {
          setShowNewDialog(null)
          setNewItemName('')
        } else if (showColumnConfig) {
          setShowColumnConfig(false)
        } else if (showKeyboardHelp) {
          setShowKeyboardHelp(false)
        }
      }
      // Delete - Delete selected
      if (e.key === 'Delete' && selectedItems.size > 0 && !editFile) {
        e.preventDefault()
        deleteSelected()
      }
      // F2 - Rename
      if (e.key === 'F2' && selectedItems.size === 1 && !editFile) {
        e.preventDefault()
        const item = contents.find(i => i.path === Array.from(selectedItems)[0])
        if (item) {
          // Could implement rename dialog
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [contextMenu.visible, previewFile, editFile, showNewDialog, showColumnConfig, showKeyboardHelp, selectedItems, contents])

  // Click outside to close context menu
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, item: null })
      }
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [contextMenu.visible])

  // Navigate to path
  const navigateTo = (path: string) => {
    setCurrentPath(path)
    setSearchQuery('')
    setFilterType('all')
    setFilterStatus('all')
  }

  // Filter and sort contents
  const filteredContents = contents.filter(item => {
    // Search filter
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'folder' && item.type !== 'folder') return false
      if (filterType === 'sql' && item.extension !== 'sql') return false
      if (filterType === 'cshtml' && item.extension !== 'cshtml') return false
      if (filterType === 'code' && !['ts', 'tsx', 'js', 'jsx', 'cs'].includes(item.extension || '')) return false
    }
    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'parsed' && item.parseStatus !== 'parsed') return false
      if (filterStatus === 'pending' && item.parseStatus !== 'pending') return false
      if (filterStatus === 'error' && item.parseStatus !== 'error') return false
    }
    return true
  })

  const sortedContents = [...filteredContents].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    let cmp = 0
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortBy === 'modified') cmp = new Date(a.modified).getTime() - new Date(b.modified).getTime()
    else if (sortBy === 'size') cmp = (a.size || 0) - (b.size || 0)
    else if (sortBy === 'tables') cmp = (a.tables || 0) - (b.tables || 0)
    else if (sortBy === 'procedures') cmp = (a.procedures || 0) - (b.procedures || 0)
    else if (sortBy === 'lines') cmp = (a.lines || 0) - (b.lines || 0)
    return sortDir === 'asc' ? cmp : -cmp
  })

  // Selection
  const toggleSelect = (path: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(path)) newSelected.delete(path)
    else newSelected.add(path)
    setSelectedItems(newSelected)
  }

  const selectAll = () => {
    if (selectedItems.size === sortedContents.length) setSelectedItems(new Set())
    else setSelectedItems(new Set(sortedContents.map(i => i.path)))
  }

  // Calculate selection totals
  const selectionTotals = {
    count: selectedItems.size,
    size: contents.filter(i => selectedItems.has(i.path)).reduce((sum, i) => sum + (i.size || 0), 0),
    lines: contents.filter(i => selectedItems.has(i.path)).reduce((sum, i) => sum + (i.lines || 0), 0),
    tables: contents.filter(i => selectedItems.has(i.path)).reduce((sum, i) => sum + (i.tables || 0), 0),
    procedures: contents.filter(i => selectedItems.has(i.path)).reduce((sum, i) => sum + (i.procedures || 0), 0),
  }

  // Context menu actions
  const handleContextMenu = (e: React.MouseEvent, item: FileSystemItem) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item
    })
  }

  const executeContextAction = (action: string) => {
    const item = contextMenu.item
    if (!item) return

    switch (action) {
      case 'open':
        openFile(item)
        break
      case 'edit':
        startEdit(item)
        break
      case 'preview':
        previewFileDetails(item)
        break
      case 'download':
        downloadFile(item)
        break
      case 'download-zip':
        downloadFolderAsZip(item.path)
        break
      case 'delete':
        deleteItem(item)
        break
      case 'copy':
        setClipboard({ items: [item.path], operation: 'copy' })
        break
      case 'cut':
        setClipboard({ items: [item.path], operation: 'cut' })
        break
      case 'paste':
        // Would implement paste functionality
        break
      case 'reparse':
        reparseFile(item)
        break
      case 'view-intelligence':
        if (onNavigate) onNavigate('intelligence')
        break
      case 'view-fk':
        if (onNavigate) onNavigate('fk-resolution')
        break
      case 'copy-path':
        navigator.clipboard.writeText(item.path)
        break
      case 'properties':
        previewFileDetails(item)
        break
    }
    setContextMenu({ visible: false, x: 0, y: 0, item: null })
  }

  // File operations
  const openFile = async (item: FileSystemItem) => {
    if (item.type === 'folder') {
      navigateTo(item.path)
      return
    }
    previewFileDetails(item)
  }

  const previewFileDetails = async (item: FileSystemItem) => {
    try {
      const response = await fetch(`/api/file-system?action=read&file=${encodeURIComponent(item.path)}`)
      const data = await response.json()
      
      // Add mock intelligence and dependencies for demo
      const enhancedData = {
        ...data,
        intelligence: item.extension === 'sql' ? {
          tables: ['Patient', 'Encounter', 'Observation'],
          procedures: ['sp_GetPatientData', 'sp_UpdateRecord'],
          views: ['vw_PatientSummary'],
          functions: ['fn_CalculateAge'],
          dependencies: ['Core', 'Common']
        } : item.extension === 'cshtml' ? {
          tables: ['Patient', 'User'],
          procedures: [],
          views: [],
          functions: [],
          dependencies: ['Layout', 'Shared']
        } : undefined,
        dependencies: {
          imports: ['react', 'lucide-react', '@/components/ui'],
          importedBy: ['src/app/page.tsx', 'src/components/Dashboard.tsx'],
          relatedFiles: ['utils.ts', 'types.ts']
        }
      }
      
      setPreviewFile(enhancedData)
      setPreviewTab('details')
    } catch (err) {
      setError('Failed to read file')
    }
  }

  const startEdit = async (item: FileSystemItem) => {
    try {
      const response = await fetch(`/api/file-system?action=read&file=${encodeURIComponent(item.path)}`)
      const data = await response.json()
      if (data.isBinary) {
        setError('Cannot edit binary file')
        return
      }
      setEditFile(data)
      setEditContent(data.content || '')
    } catch (err) {
      setError('Failed to read file for editing')
    }
  }

  const saveFile = async () => {
    if (!editFile) return
    setIsSaving(true)
    try {
      const parentPath = editFile.path.substring(0, editFile.path.lastIndexOf('/')) || '/'
      const fileName = editFile.path.split('/').pop() || ''
      const response = await fetch('/api/file-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', path: parentPath, name: fileName, content: editContent })
      })
      if (response.ok) {
        setEditFile(null)
        setEditContent('')
        fetchDirectory(currentPath)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save')
      }
    } catch (err) {
      setError('Failed to save file')
    } finally {
      setIsSaving(false)
    }
  }

  const createItem = async () => {
    if (!newItemName.trim()) return
    setIsCreating(true)
    try {
      const response = await fetch('/api/file-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: showNewDialog === 'folder' ? 'create-folder' : 'create-file',
          path: currentPath,
          name: newItemName,
          content: showNewDialog === 'file' ? '' : undefined
        })
      })
      if (response.ok) {
        setShowNewDialog(null)
        setNewItemName('')
        fetchDirectory(currentPath)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create')
      }
    } catch (err) {
      setError('Failed to create item')
    } finally {
      setIsCreating(false)
    }
  }

  const deleteItem = async (item: FileSystemItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    try {
      const response = await fetch(`/api/file-system?path=${encodeURIComponent(item.path)}`, { method: 'DELETE' })
      if (response.ok) fetchDirectory(currentPath)
      else {
        const data = await response.json()
        setError(data.error || 'Failed to delete')
      }
    } catch (err) {
      setError('Failed to delete item')
    }
  }

  const deleteSelected = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`Delete ${selectedItems.size} selected items? This cannot be undone.`)) return
    try {
      await Promise.all(Array.from(selectedItems).map(path =>
        fetch(`/api/file-system?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
      ))
      setSelectedItems(new Set())
      fetchDirectory(currentPath)
    } catch (err) {
      setError('Failed to delete some items')
    }
  }

  const reparseFile = async (item: FileSystemItem) => {
    try {
      // Would call reparse API
      setError(`Reparsing ${item.name}...`)
      setTimeout(() => {
        setError(null)
        fetchDirectory(currentPath)
      }, 1000)
    } catch (err) {
      setError('Failed to reparse file')
    }
  }

  const reparseSelected = async () => {
    if (selectedItems.size === 0) return
    setError(`Reparsing ${selectedItems.size} files...`)
    setTimeout(() => {
      setError(null)
      fetchDirectory(currentPath)
    }, 2000)
  }

  const archiveSelected = async () => {
    if (selectedItems.size === 0) return
    await downloadSelectedAsZip()
  }

  const exportSelectedCSV = async () => {
    if (selectedItems.size === 0) return
    const selectedFiles = contents.filter(i => selectedItems.has(i.path))
    const csv = [
      ['Name', 'Path', 'Type', 'Size', 'Tables', 'Procedures', 'Lines', 'Modified'].join(','),
      ...selectedFiles.map(f => [
        f.name,
        f.path,
        f.type,
        f.size || 0,
        f.tables || 0,
        f.procedures || 0,
        f.lines || 0,
        f.modified
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `file-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Download functions
  const downloadFile = async (item: FileSystemItem) => {
    if (item.type === 'folder') {
      await downloadFolderAsZip(item.path)
      return
    }
    try {
      setIsDownloading(true)
      const response = await fetch(`/api/file-system/download?file=${encodeURIComponent(item.path)}`)
      if (!response.ok) throw new Error('Failed to download file')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download file')
    } finally {
      setIsDownloading(false)
    }
  }

  const downloadFolderAsZip = async (folderPath: string) => {
    try {
      setIsDownloading(true)
      const response = await fetch('/api/file-system/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      })
      if (!response.ok) throw new Error('Failed to create ZIP')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${folderPath.split('/').pop()}_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'Failed to download folder')
    } finally {
      setIsDownloading(false)
    }
  }

  const downloadSelectedAsZip = async () => {
    if (selectedItems.size === 0) return
    try {
      setIsDownloading(true)
      const response = await fetch('/api/file-system/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: Array.from(selectedItems) })
      })
      if (!response.ok) throw new Error('Failed to create ZIP')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `selected_files_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'Failed to create ZIP')
    } finally {
      setIsDownloading(false)
    }
  }

  // Upload functions
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return
    setIsUploading(true)
    const fileArray = Array.from(files)
    let successCount = 0

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      setUploadProgress({ name: file.name, progress: Math.round((i / fileArray.length) * 100) })
      try {
        const content = await readFileAsBase64(file)
        const response = await fetch('/api/file-system/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: currentPath, name: file.name, content, isBase64: true })
        })
        if (response.ok) successCount++
      } catch (err) {
        console.error('Upload error:', err)
      }
    }
    setUploadProgress(null)
    setIsUploading(false)
    if (successCount > 0) fetchDirectory(currentPath)
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files)
      e.target.value = ''
    }
  }

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
  }

  // Row drag
  const handleRowDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedItem(path)
  }

  const handleRowDragEnd = () => {
    setDraggedItem(null)
  }

  // Column management
  const toggleColumn = (id: string) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c))
  }

  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS)
  }

  // Format helpers
  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const getIconConfig = (item: FileSystemItem) => FILE_ICONS[item.icon] || FILE_ICONS['file']

  const getStatusBadge = (status?: 'parsed' | 'pending' | 'error' | 'none') => {
    if (!status || status === 'none') return null
    const config = {
      parsed: { icon: CheckCircle, color: colors.success, label: 'Parsed' },
      pending: { icon: Clock, color: '#f59e0b', label: 'Pending' },
      error: { icon: XCircle, color: colors.error, label: 'Error' }
    }
    const c = config[status]
    return (
      <Badge className="text-xs flex items-center gap-1" style={{ backgroundColor: alpha(c.color, 15), color: c.color }}>
        <c.icon className="w-3 h-3" />
        {c.label}
      </Badge>
    )
  }

  // Context menu items
  const contextMenuItems = contextMenu.item?.type === 'folder' ? [
    { action: 'open', label: 'Open Folder', icon: FolderOpen },
    { action: 'download-zip', label: 'Download as ZIP', icon: Archive },
    { divider: true },
    { action: 'copy', label: 'Copy', icon: Copy, shortcut: 'Ctrl+C' },
    { action: 'cut', label: 'Cut', icon: Scissors, shortcut: 'Ctrl+X' },
    { divider: true },
    { action: 'delete', label: 'Delete', icon: Trash2, color: colors.error },
    { action: 'copy-path', label: 'Copy Path', icon: FileText },
  ] : [
    { action: 'open', label: 'Open', icon: Eye },
    { action: 'edit', label: 'Edit', icon: Edit3 },
    { action: 'preview', label: 'Preview Details', icon: Info },
    { divider: true },
    { action: 'download', label: 'Download', icon: Download },
    { action: 'reparse', label: 'Reparse', icon: RotateCcw },
    { divider: true },
    { action: 'copy', label: 'Copy', icon: Copy, shortcut: 'Ctrl+C' },
    { action: 'cut', label: 'Cut', icon: Scissors, shortcut: 'Ctrl+X' },
    { divider: true },
    { action: 'view-intelligence', label: 'View Intelligence', icon: Brain },
    { action: 'view-fk', label: 'FK Resolution', icon: Link2 },
    { divider: true },
    { action: 'delete', label: 'Delete', icon: Trash2, color: colors.error },
    { action: 'copy-path', label: 'Copy Path', icon: FileText },
  ]

  return (
    <div className={`flex flex-col h-full ${isMaximized ? 'fixed inset-0 z-40 bg-white p-4' : ''}`} ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FolderSync className="w-6 h-6" style={{ color: colors.primary }} />
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>File Manager</h2>
            <p className="text-sm" style={{ color: colors.textMuted }}>Browse, manage, and analyze project files</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowKeyboardHelp(true)} title="Keyboard Shortcuts" style={{ borderColor: colors.border, color: colors.textMuted }}>
            <Keyboard className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowColumnConfig(!showColumnConfig)} title="Column Settings" style={{ borderColor: colors.border, color: colors.textMuted }}>
            <Columns className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsMaximized(!isMaximized)} title={isMaximized ? 'Minimize' : 'Maximize'} style={{ borderColor: colors.border, color: colors.textMuted }}>
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={() => fetchDirectory(currentPath)} title="Refresh" style={{ borderColor: colors.border, color: colors.textMuted }}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Column Config Dropdown */}
      {showColumnConfig && (
        <div className="absolute right-4 top-16 z-50 p-3 rounded-lg shadow-lg" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm" style={{ color: colors.text }}>Columns</span>
            <Button size="sm" variant="ghost" onClick={resetColumns} className="text-xs">Reset</Button>
          </div>
          {columns.filter(c => c.id !== 'select' && c.id !== 'drag' && c.id !== 'actions').map(col => (
            <label key={col.id} className="flex items-center gap-2 py-1 cursor-pointer">
              <input type="checkbox" checked={col.visible} onChange={() => toggleColumn(col.id)} className="rounded" />
              <span className="text-sm" style={{ color: colors.text }}>{col.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-lg mb-4" style={{ backgroundColor: alpha(colors.error, 10), border: `1px solid ${alpha(colors.error, 30)}` }}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" style={{ color: colors.error }} />
            <span style={{ color: colors.error }}>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" style={{ color: colors.error }} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ backgroundColor: alpha(colors.card, 50), border: `1px solid ${colors.border}` }}>
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => navigateTo('/')} title="Home" style={{ borderColor: colors.border, color: colors.textMuted }}><Home className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => { const parts = currentPath.split('/').filter(Boolean); parts.pop(); navigateTo('/' + parts.join('/')); }} disabled={currentPath === '/'} title="Up" style={{ borderColor: colors.border, color: colors.textMuted }}><ChevronRight className="w-4 h-4 rotate-180" /></Button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {breadcrumb.map((item, idx) => (
            <div key={item.path} className="flex items-center">
              {idx > 0 && <ChevronRight className="w-4 h-4 mx-1 shrink-0" style={{ color: colors.textMuted }} />}
              <button onClick={() => navigateTo(item.path)} className="px-2 py-1 rounded text-sm whitespace-nowrap hover:bg-white/5" style={{ color: item.path === currentPath ? colors.primary : colors.textMuted }}>
                {item.name === 'root' ? '📁 my-project' : item.name}
              </button>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-1.5 rounded-lg text-sm w-48" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, color: colors.text }} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-2 py-1.5 rounded-lg text-sm" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, color: colors.text }}>
            <option value="all">All Types</option>
            <option value="folder">Folders</option>
            <option value="sql">SQL Files</option>
            <option value="cshtml">CSHTML</option>
            <option value="code">Code Files</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-2 py-1.5 rounded-lg text-sm" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, color: colors.text }}>
            <option value="all">All Status</option>
            <option value="parsed">Parsed</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple onChange={handleFileInputChange} style={{ display: 'none' }} />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} title="Upload" style={{ borderColor: colors.border, backgroundColor: alpha(colors.success, 20), color: colors.success }}>
            {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNewDialog('folder')} title="New Folder" style={{ borderColor: colors.border, color: colors.textMuted }}><FolderPlus className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setShowNewDialog('file')} title="New File" style={{ borderColor: colors.border, color: colors.textMuted }}><FilePlus className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ backgroundColor: alpha(colors.success, 10), border: `1px solid ${alpha(colors.success, 30)}` }}>
          <RefreshCw className="w-4 h-4 animate-spin" style={{ color: colors.success }} />
          <div className="flex-1">
            <div className="text-sm" style={{ color: colors.text }}>Uploading: {uploadProgress.name}</div>
            <div className="w-full h-2 rounded-full mt-1" style={{ backgroundColor: alpha(colors.success, 20) }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress.progress}%`, backgroundColor: colors.success }} />
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-6 p-2 rounded-lg mb-4 text-sm flex-wrap" style={{ backgroundColor: alpha(colors.bgSecondary, 30), color: colors.textMuted }}>
          <span className="flex items-center gap-1"><FolderOpen className="w-4 h-4" /> {stats.folders} folders</span>
          <span className="flex items-center gap-1"><File className="w-4 h-4" /> {stats.files} files</span>
          <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" /> {formatSize(stats.totalSize)}</span>
          {stats.parsedFiles !== undefined && <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" style={{ color: colors.success }} /> {stats.parsedFiles} parsed</span>}
          {stats.totalTables !== undefined && stats.totalTables > 0 && <span className="flex items-center gap-1"><Table className="w-4 h-4" style={{ color: colors.primary }} /> {stats.totalTables} tables</span>}
          {stats.totalProcedures !== undefined && stats.totalProcedures > 0 && <span className="flex items-center gap-1"><Database className="w-4 h-4" style={{ color: '#8b5cf6' }} /> {stats.totalProcedures} procs</span>}
          {selectedItems.size > 0 && (
            <span className="flex items-center gap-1" style={{ color: colors.primary }}>
              <CheckSquare className="w-4 h-4" /> {selectedItems.size} selected ({formatSize(selectionTotals.size)}, {selectionTotals.lines} lines)
            </span>
          )}
        </div>
      )}

      {/* Selection Actions Bar */}
      {selectedItems.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg mb-4" style={{ backgroundColor: alpha(colors.primary, 10), border: `1px solid ${alpha(colors.primary, 30)}` }}>
          <div className="flex items-center gap-4">
            <span style={{ color: colors.text }}><strong>{selectedItems.size}</strong> items selected</span>
            <span className="text-sm" style={{ color: colors.textMuted }}>
              {formatSize(selectionTotals.size)} • {selectionTotals.lines} lines • {selectionTotals.tables} tables • {selectionTotals.procedures} procedures
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportSelectedCSV} title="Export CSV" style={{ borderColor: colors.border, color: colors.textMuted }}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={reparseSelected} title="Reparse Selected" style={{ borderColor: colors.border, color: colors.textMuted }}>
              <Zap className="w-4 h-4 mr-1" /> Reparse
            </Button>
            <Button size="sm" onClick={downloadSelectedAsZip} disabled={isDownloading} title="Download as ZIP" style={{ backgroundColor: colors.success, color: '#fff' }}>
              {isDownloading ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <FileArchive className="w-4 h-4 mr-1" />} ZIP
            </Button>
            <Button size="sm" onClick={deleteSelected} title="Delete Selected" style={{ backgroundColor: colors.error, color: '#fff' }}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 rounded-lg overflow-hidden relative" style={{ border: `1px solid ${isDragOver ? colors.success : colors.border}`, backgroundColor: isDragOver ? alpha(colors.success, 5) : 'transparent' }} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ backgroundColor: alpha(colors.success, 10) }}>
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-2" style={{ color: colors.success }} />
              <p className="text-lg font-medium" style={{ color: colors.success }}>Drop files here to upload</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="grid gap-2 p-2 text-xs font-semibold uppercase" style={{ backgroundColor: alpha(colors.bgSecondary, 50), color: colors.textMuted, gridTemplateColumns: `${columns.find(c => c.id === 'select')?.visible ? '40px' : ''} ${columns.find(c => c.id === 'drag')?.visible ? '30px' : ''} 1fr ${columns.filter(c => !['select', 'drag', 'name', 'actions'].includes(c.id) && c.visible).map(c => c.width).join(' ')} 120px` }}>
          {columns.find(c => c.id === 'select')?.visible && (
            <div className="flex items-center justify-center">
              <button onClick={selectAll} className="p-1 rounded hover:bg-white/10" title="Select All (Ctrl+A)">
                {selectedItems.size === sortedContents.length && sortedContents.length > 0 ? <CheckSquare className="w-4 h-4" style={{ color: colors.primary }} /> : <Square className="w-4 h-4" />}
              </button>
            </div>
          )}
          {columns.find(c => c.id === 'drag')?.visible && <div></div>}
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => { setSortBy('name'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}>
            Name {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
          </div>
          {columns.filter(c => !['select', 'drag', 'name', 'actions'].includes(c.id)).filter(c => c.visible).map(col => (
            <div key={col.id} className={`flex items-center ${col.sortable ? 'cursor-pointer' : ''}`} onClick={col.sortable ? () => { setSortBy(col.id as any); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') } : undefined}>
              {col.label} {sortBy === col.id && col.sortable && (sortDir === 'asc' ? '↑' : '↓')}
            </div>
          ))}
          <div>Actions</div>
        </div>

        {/* Contents */}
        <div className="max-h-[500px] overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center" style={{ color: colors.textMuted }}>
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
              Loading...
            </div>
          ) : sortedContents.length === 0 ? (
            <div className="p-8 text-center" style={{ color: colors.textMuted }}>
              <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              {searchQuery || filterType !== 'all' || filterStatus !== 'all' ? 'No matching files' : 'Empty folder'}
            </div>
          ) : (
            sortedContents.map((item) => {
              const iconConfig = getIconConfig(item)
              const isSelected = selectedItems.has(item.path)
              const isDragging = draggedItem === item.path

              return (
                <div
                  key={item.path}
                  className="grid gap-2 p-2 items-center hover:bg-white/5 cursor-pointer border-t transition-colors"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: isSelected ? alpha(colors.primary, 5) : isDragging ? alpha(colors.primary, 10) : 'transparent',
                    gridTemplateColumns: `${columns.find(c => c.id === 'select')?.visible ? '40px' : ''} ${columns.find(c => c.id === 'drag')?.visible ? '30px' : ''} 1fr ${columns.filter(c => !['select', 'drag', 'name', 'actions'].includes(c.id) && c.visible).map(c => c.width).join(' ')} 120px`
                  }}
                  onClick={() => openFile(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  draggable
                  onDragStart={(e) => handleRowDragStart(e, item.path)}
                  onDragEnd={handleRowDragEnd}
                >
                  {/* Select */}
                  {columns.find(c => c.id === 'select')?.visible && (
                    <div className="flex items-center justify-center">
                      <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.path) }} className="p-1 rounded hover:bg-white/10">
                        {isSelected ? <CheckSquare className="w-4 h-4" style={{ color: colors.primary }} /> : <Square className="w-4 h-4" style={{ color: colors.textMuted }} />}
                      </button>
                    </div>
                  )}

                  {/* Drag Handle */}
                  {columns.find(c => c.id === 'drag')?.visible && (
                    <div className="flex items-center justify-center cursor-grab">
                      <GripVertical className="w-4 h-4" style={{ color: colors.textMuted }} />
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex items-center gap-2 overflow-hidden">
                    <iconConfig.icon className="w-5 h-5 shrink-0" style={{ color: iconConfig.color }} />
                    <span className="truncate font-medium" style={{ color: colors.text }}>{item.name}</span>
                  </div>

                  {/* Dynamic columns */}
                  {columns.filter(c => !['select', 'drag', 'name', 'actions'].includes(c.id)).filter(c => c.visible).map(col => (
                    <div key={col.id}>
                      {col.id === 'type' && (
                        <Badge className="text-xs" style={{ backgroundColor: alpha(iconConfig.color, 15), color: iconConfig.color }}>
                          {item.type === 'folder' ? 'Folder' : item.extension?.toUpperCase() || 'File'}
                        </Badge>
                      )}
                      {col.id === 'size' && (
                        <span className="text-sm" style={{ color: colors.textMuted }}>{formatSize(item.size)}</span>
                      )}
                      {col.id === 'status' && (
                        getStatusBadge(item.parseStatus)
                      )}
                      {col.id === 'tables' && (
                        <span className="text-sm" style={{ color: colors.textMuted }}>{item.tables || '-'}</span>
                      )}
                      {col.id === 'procedures' && (
                        <span className="text-sm" style={{ color: colors.textMuted }}>{item.procedures || '-'}</span>
                      )}
                      {col.id === 'lines' && (
                        <span className="text-sm" style={{ color: colors.textMuted }}>{item.lines || '-'}</span>
                      )}
                      {col.id === 'modified' && (
                        <span className="text-sm" style={{ color: colors.textMuted }}>{formatDate(item.modified)}</span>
                      )}
                    </div>
                  ))}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={(e) => { e.stopPropagation(); downloadFile(item) }} className="p-1 rounded hover:bg-white/10" title={item.type === 'folder' ? 'Download as ZIP' : 'Download'} disabled={isDownloading}>
                      {item.type === 'folder' ? <Archive className="w-4 h-4" style={{ color: colors.success }} /> : <Download className="w-4 h-4" style={{ color: colors.primary }} />}
                    </button>
                    {item.type === 'file' && (
                      <button onClick={(e) => { e.stopPropagation(); startEdit(item) }} className="p-1 rounded hover:bg-white/10" title="Edit">
                        <Edit3 className="w-4 h-4" style={{ color: colors.textMuted }} />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item) }} className="p-1 rounded hover:bg-white/10" title="More">
                      <MoreVertical className="w-4 h-4" style={{ color: colors.textMuted }} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="flex items-center gap-2 mt-4 p-2 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
        <span className="text-sm" style={{ color: colors.textMuted }}>Quick Navigation:</span>
        <Button size="sm" variant="outline" onClick={() => onNavigate?.('intelligence')} style={{ borderColor: colors.border, color: colors.textMuted }}>
          <Brain className="w-4 h-4 mr-1" /> Intelligence Bank
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate?.('fk-resolution')} style={{ borderColor: colors.border, color: colors.textMuted }}>
          <Link2 className="w-4 h-4 mr-1" /> FK Resolution
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate?.('tables')} style={{ borderColor: colors.border, color: colors.textMuted }}>
          <Table className="w-4 h-4 mr-1" /> Tables
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate?.('procedures')} style={{ borderColor: colors.border, color: colors.textMuted }}>
          <Database className="w-4 h-4 mr-1" /> Procedures
        </Button>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.item && (
        <div
          className="fixed z-50 py-2 rounded-lg shadow-xl min-w-[180px]"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            left: contextMenu.x,
            top: contextMenu.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenuItems.map((menuItem, idx) => {
            if ('divider' in menuItem && menuItem.divider) {
              return <div key={idx} className="my-1" style={{ height: 1, backgroundColor: colors.border }} />
            }
            const item = menuItem as { action: string; label: string; icon: React.ComponentType<{ className?: string }>; shortcut?: string; color?: string }
            return (
              <button
                key={idx}
                className="w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-white/5"
                style={{ color: item.color || colors.text }}
                onClick={() => executeContextAction(item.action)}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.shortcut && <span className="text-xs" style={{ color: colors.textMuted }}>{item.shortcut}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Preview Modal with 3 Tabs */}
      {previewFile && !editFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }} onClick={() => setPreviewFile(null)}>
          <div className="w-full max-w-5xl max-h-[85vh] rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5" style={{ color: colors.primary }} />
                <span className="font-semibold" style={{ color: colors.text }}>{previewFile.path}</span>
                <Badge variant="outline" className="text-xs">{previewFile.isBinary ? 'Binary' : `${previewFile.lines} lines`}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {!previewFile.isBinary && (
                  <Button size="sm" variant="outline" onClick={() => { setEditFile(previewFile); setEditContent(previewFile.content || ''); setPreviewFile(null) }}>
                    <Edit3 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                )}
                <button onClick={() => setPreviewFile(null)} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-5 h-5" style={{ color: colors.textMuted }} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: colors.border }}>
              <button
                className={`px-4 py-2 text-sm font-medium ${previewTab === 'details' ? 'border-b-2' : ''}`}
                style={{ color: previewTab === 'details' ? colors.primary : colors.textMuted, borderColor: colors.primary }}
                onClick={() => setPreviewTab('details')}
              >
                <FileText className="w-4 h-4 inline mr-1" /> Details
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${previewTab === 'intelligence' ? 'border-b-2' : ''}`}
                style={{ color: previewTab === 'intelligence' ? colors.primary : colors.textMuted, borderColor: colors.primary }}
                onClick={() => setPreviewTab('intelligence')}
              >
                <Brain className="w-4 h-4 inline mr-1" /> Intelligence
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${previewTab === 'dependencies' ? 'border-b-2' : ''}`}
                style={{ color: previewTab === 'dependencies' ? colors.primary : colors.textMuted, borderColor: colors.primary }}
                onClick={() => setPreviewTab('dependencies')}
              >
                <Link2 className="w-4 h-4 inline mr-1" /> Dependencies
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-4">
              {previewTab === 'details' && (
                <div>
                  {previewFile.isBinary ? (
                    <div className="text-center py-8">
                      <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p style={{ color: colors.textMuted }}>{previewFile.message || 'Binary file - cannot display'}</p>
                      <p className="text-sm mt-2" style={{ color: colors.textMuted }}>Size: {formatSize(previewFile.size)}</p>
                    </div>
                  ) : (
                    <pre className="p-4 text-sm font-mono overflow-auto rounded-lg" style={{ backgroundColor: colors.bg, color: colors.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {previewFile.content}
                    </pre>
                  )}
                </div>
              )}

              {previewTab === 'intelligence' && previewFile.intelligence && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: colors.text }}>Tables Detected</h4>
                    <div className="flex flex-wrap gap-2">
                      {previewFile.intelligence.tables.map(t => (
                        <Badge key={t} style={{ backgroundColor: alpha(colors.primary, 15), color: colors.primary }}>{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: colors.text }}>Procedures</h4>
                    <div className="flex flex-wrap gap-2">
                      {previewFile.intelligence.procedures.map(p => (
                        <Badge key={p} style={{ backgroundColor: alpha('#8b5cf6', 15), color: '#8b5cf6' }}>{p}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: colors.text }}>Views</h4>
                    <div className="flex flex-wrap gap-2">
                      {previewFile.intelligence.views.map(v => (
                        <Badge key={v} style={{ backgroundColor: alpha(colors.success, 15), color: colors.success }}>{v}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: colors.text }}>Functions</h4>
                    <div className="flex flex-wrap gap-2">
                      {previewFile.intelligence.functions.map(f => (
                        <Badge key={f} style={{ backgroundColor: alpha('#f59e0b', 15), color: '#f59e0b' }}>{f}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'dependencies' && previewFile.dependencies && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: colors.text }}>Imports</h4>
                    <div className="flex flex-wrap gap-2">
                      {previewFile.dependencies.imports.map(i => (
                        <Badge key={i} variant="outline">{i}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: colors.text }}>Imported By</h4>
                    <div className="flex flex-wrap gap-2">
                      {previewFile.dependencies.importedBy.map(i => (
                        <Badge key={i} style={{ backgroundColor: alpha(colors.primary, 15), color: colors.primary }}>{i}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: colors.text }}>Related Files</h4>
                    <div className="flex flex-wrap gap-2">
                      {previewFile.dependencies.relatedFiles.map(f => (
                        <Badge key={f} style={{ backgroundColor: alpha(colors.textMuted, 15), color: colors.textMuted }}>{f}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }} onClick={() => { setEditFile(null); setEditContent('') }}>
          <div className="w-full max-w-5xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5" style={{ color: colors.success }} />
                <span className="font-semibold" style={{ color: colors.text }}>Edit: {editFile.path}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditFile(null); setEditContent('') }}>Cancel</Button>
                <Button size="sm" onClick={saveFile} disabled={isSaving} style={{ backgroundColor: colors.success, color: '#fff' }}>
                  {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />} Save
                </Button>
                <button onClick={() => { setEditFile(null); setEditContent('') }} className="p-1 hover:bg-white/10 rounded ml-2">
                  <X className="w-5 h-5" style={{ color: colors.textMuted }} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none"
                style={{ backgroundColor: colors.bg, color: colors.text, lineHeight: '1.5' }}
                spellCheck={false}
              />
            </div>
            <div className="flex items-center justify-between p-3 border-t text-xs" style={{ borderColor: colors.border, color: colors.textMuted }}>
              <span>Lines: {editContent.split('\n').length}</span>
              <span>Characters: {editContent.length.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* New Item Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => { setShowNewDialog(null); setNewItemName('') }}>
          <div className="w-full max-w-md rounded-xl p-4" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4" style={{ color: colors.text }}>Create New {showNewDialog === 'folder' ? 'Folder' : 'File'}</h3>
            <input
              type="text"
              placeholder={showNewDialog === 'folder' ? 'Folder name' : 'filename.ext'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createItem()}
              className="w-full px-3 py-2 rounded-lg text-sm mb-4"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => { setShowNewDialog(null); setNewItemName('') }}>Cancel</Button>
              <Button size="sm" onClick={createItem} disabled={!newItemName.trim() || isCreating} style={{ backgroundColor: colors.primary, color: '#fff' }}>
                {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setShowKeyboardHelp(false)}>
          <div className="w-full max-w-md rounded-xl p-4" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: colors.text }}>Keyboard Shortcuts</h3>
              <button onClick={() => setShowKeyboardHelp(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" style={{ color: colors.textMuted }} />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { keys: 'Ctrl+A', action: 'Select all files' },
                { keys: 'Escape', action: 'Close dialogs/modals' },
                { keys: 'Delete', action: 'Delete selected files' },
                { keys: 'F2', action: 'Rename selected file' },
                { keys: 'Ctrl+C', action: 'Copy file (context menu)' },
                { keys: 'Ctrl+X', action: 'Cut file (context menu)' },
              ].map((shortcut, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <span style={{ color: colors.text }}>{shortcut.action}</span>
                  <kbd className="px-2 py-1 rounded text-xs" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.textMuted }}>
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileManagerTab
