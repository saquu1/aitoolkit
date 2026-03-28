'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Server,
  Folder,
  File,
  Upload,
  Download,
  RefreshCw,
  ChevronRight,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  FolderPlus,
  FilePlus,
  Archive,
  ArchiveRestore,
  Search,
  Home,
  ArrowUp,
  X,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff,
  HardDrive,
  Clock,
  Terminal,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  FileCode,
  FileArchive,
  Monitor,
  Globe,
  Eye,
} from 'lucide-react'

interface FileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modifiedAt: string | null
  permissions?: string
  owner?: string
  group?: string
  isDirectory: boolean
  isFile: boolean
}

interface ClipboardItem {
  type: 'copy' | 'cut'
  items: string[]
  sourcePath: string
}

type ManagerMode = 'local' | 'ftp'

export function FTPWebManager() {
  const { colors } = useTheme()

  // Mode toggle
  const [mode, setMode] = useState<ManagerMode>('local')

  // FTP Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Connection form
  const [host, setHost] = useState('')
  const [port, setPort] = useState('21')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [secure, setSecure] = useState(false)
  const [rootPath, setRootPath] = useState('/')

  // File browser state
  const [currentPath, setCurrentPath] = useState('/')
  const [items, setItems] = useState<FileItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [pathHistory, setPathHistory] = useState<string[]>(['/'])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Clipboard
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FileItem[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showNewFileModal, setShowNewFileModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [previewFileName, setPreviewFileName] = useState<string>('')

  // Modal inputs
  const [newItemName, setNewItemName] = useState('')
  const [newFileContent, setNewFileContent] = useState('')
  const [renameItemPath, setRenameItemPath] = useState('')
  const [renameItemName, setRenameItemName] = useState('')

  // Upload
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // View options
  const [showHidden, setShowHidden] = useState(false)

  // API endpoint based on mode
  const apiEndpoint = mode === 'ftp' ? '/api/ftp-manager' : '/api/local-file-manager'

  // ══════════════════════════════════════════════════════════════════════════════
  // MODE SWITCHING
  // ══════════════════════════════════════════════════════════════════════════════

  const switchMode = useCallback((newMode: ManagerMode) => {
    setMode(newMode)
    setItems([])
    setSelectedItems(new Set())
    setClipboard(null)
    setPathHistory(['/'])
    setHistoryIndex(0)
    
    if (newMode === 'ftp') {
      setIsConnected(false)
      setConnectionId(null)
      setCurrentPath('/')
    } else {
      // Local mode - automatically list root
      setCurrentPath('/')
      listDirectory('/', true)
    }
  }, [])

  // ══════════════════════════════════════════════════════════════════════════════
  // CONNECTION FUNCTIONS (FTP Only)
  // ══════════════════════════════════════════════════════════════════════════════

  const connect = useCallback(async () => {
    if (!host || !username) {
      setConnectionError('Host and username are required')
      return
    }

    setIsConnecting(true)
    setConnectionError(null)

    try {
      const response = await fetch('/api/ftp-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          host,
          port: parseInt(port) || 21,
          username,
          password,
          secure,
          rootPath,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsConnected(true)
        setConnectionId(data.connectionId)
        setCurrentPath(data.currentPath)
        setItems(data.items)
        setPathHistory([data.currentPath])
        setHistoryIndex(0)
        setShowConnectModal(false)
      } else {
        setConnectionError(data.error || 'Connection failed')
      }
    } catch (error: any) {
      setConnectionError(error.message || 'Connection failed')
    } finally {
      setIsConnecting(false)
    }
  }, [host, port, username, password, secure, rootPath])

  const disconnect = useCallback(async () => {
    if (!connectionId) return

    try {
      await fetch('/api/ftp-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          connectionId,
        }),
      })
    } catch (e) {
      // Ignore disconnect errors
    }

    setIsConnected(false)
    setConnectionId(null)
    setItems([])
    setCurrentPath('/')
    setSelectedItems(new Set())
    setPathHistory(['/'])
    setHistoryIndex(0)
  }, [connectionId])

  // ══════════════════════════════════════════════════════════════════════════════
  // NAVIGATION FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  const listDirectory = useCallback(async (path: string, addToHistory = true) => {
    if (mode === 'ftp' && !connectionId) return

    setLoading(true)
    setSelectedItems(new Set())

    try {
      let url: string
      if (mode === 'ftp') {
        url = `/api/ftp-manager?action=list&connectionId=${connectionId}&path=${encodeURIComponent(path)}`
      } else {
        url = `/api/local-file-manager?action=list&path=${encodeURIComponent(path)}&showHidden=${showHidden}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setCurrentPath(data.currentPath || path)
        setItems(data.items || [])

        if (addToHistory) {
          const newHistory = [...pathHistory.slice(0, historyIndex + 1), data.currentPath || path]
          setPathHistory(newHistory)
          setHistoryIndex(newHistory.length - 1)
        }
      } else {
        console.error('Failed to list directory:', data.error)
      }
    } catch (error: any) {
      console.error('Failed to list directory:', error)
    } finally {
      setLoading(false)
    }
  }, [mode, connectionId, pathHistory, historyIndex, showHidden])

  const navigateUp = useCallback(() => {
    if (currentPath === '/' || currentPath === '') return
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/'
    listDirectory(parentPath)
  }, [currentPath, listDirectory])

  const navigateTo = useCallback((path: string) => {
    listDirectory(path)
  }, [listDirectory])

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      listDirectory(pathHistory[newIndex], false)
    }
  }, [historyIndex, pathHistory, listDirectory])

  const goForward = useCallback(() => {
    if (historyIndex < pathHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      listDirectory(pathHistory[newIndex], false)
    }
  }, [historyIndex, pathHistory, listDirectory])

  const refresh = useCallback(() => {
    listDirectory(currentPath, false)
  }, [currentPath, listDirectory])

  // Initial load for local mode
  useEffect(() => {
    if (mode === 'local') {
      listDirectory('/', true)
    }
  }, [mode])

  // ══════════════════════════════════════════════════════════════════════════════
  // SELECTION FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  const toggleSelect = useCallback((name: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(name)) {
        newSet.delete(name)
      } else {
        newSet.add(name)
      }
      return newSet
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(items.map(i => i.name)))
  }, [items])

  const deselectAll = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  // ══════════════════════════════════════════════════════════════════════════════
  // CLIPBOARD FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  const copySelected = useCallback(() => {
    if (selectedItems.size === 0) return
    setClipboard({
      type: 'copy',
      items: Array.from(selectedItems),
      sourcePath: currentPath,
    })
  }, [selectedItems, currentPath])

  const cutSelected = useCallback(() => {
    if (selectedItems.size === 0) return
    setClipboard({
      type: 'cut',
      items: Array.from(selectedItems),
      sourcePath: currentPath,
    })
  }, [selectedItems, currentPath])

  const paste = useCallback(async () => {
    if (!clipboard) return
    if (mode === 'ftp' && !connectionId) return

    setLoading(true)

    try {
      for (const itemName of clipboard.items) {
        const sourcePath = clipboard.sourcePath === '/' 
          ? `/${itemName}` 
          : `${clipboard.sourcePath}/${itemName}`

        const body: any = {
          action: clipboard.type === 'copy' ? 'copy' : 'move',
          sourcePath,
          targetPath: currentPath,
        }

        if (mode === 'ftp') {
          body.connectionId = connectionId
        }

        await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (clipboard.type === 'cut') {
        setClipboard(null)
      }

      refresh()
    } catch (error: any) {
      console.error('Paste failed:', error)
    } finally {
      setLoading(false)
    }
  }, [clipboard, mode, connectionId, currentPath, refresh, apiEndpoint])

  // ══════════════════════════════════════════════════════════════════════════════
  // FILE OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════════

  const createFolder = useCallback(async () => {
    if (!newItemName) return
    if (mode === 'ftp' && !connectionId) return

    try {
      const body: any = {
        action: 'create-folder',
        path: currentPath,
        name: newItemName,
      }

      if (mode === 'ftp') {
        body.connectionId = connectionId
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success) {
        setShowNewFolderModal(false)
        setNewItemName('')
        refresh()
      }
    } catch (error: any) {
      console.error('Failed to create folder:', error)
    }
  }, [newItemName, mode, connectionId, currentPath, refresh, apiEndpoint])

  const createFile = useCallback(async () => {
    if (!newItemName) return
    if (mode === 'ftp' && !connectionId) return

    try {
      const body: any = {
        action: 'create-file',
        path: currentPath,
        name: newItemName,
        content: newFileContent,
      }

      if (mode === 'ftp') {
        body.connectionId = connectionId
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success) {
        setShowNewFileModal(false)
        setNewItemName('')
        setNewFileContent('')
        refresh()
      }
    } catch (error: any) {
      console.error('Failed to create file:', error)
    }
  }, [newItemName, newFileContent, mode, connectionId, currentPath, refresh, apiEndpoint])

  const deleteSelected = useCallback(async () => {
    if (selectedItems.size === 0) return
    if (mode === 'ftp' && !connectionId) return

    if (!confirm(`Delete ${selectedItems.size} item(s)?`)) return

    const paths = Array.from(selectedItems).map(name => 
      currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
    )

    try {
      const body: any = {
        action: 'delete',
        paths,
      }

      if (mode === 'ftp') {
        body.connectionId = connectionId
      }

      await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      setSelectedItems(new Set())
      refresh()
    } catch (error: any) {
      console.error('Failed to delete:', error)
    }
  }, [selectedItems, mode, connectionId, currentPath, refresh, apiEndpoint])

  const renameItem = useCallback(async () => {
    if (!renameItemPath || !renameItemName) return
    if (mode === 'ftp' && !connectionId) return

    try {
      const body: any = {
        action: 'rename',
        path: renameItemPath,
        newName: renameItemName,
      }

      if (mode === 'ftp') {
        body.connectionId = connectionId
      }

      await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      setShowRenameModal(false)
      setRenameItemPath('')
      setRenameItemName('')
      refresh()
    } catch (error: any) {
      console.error('Failed to rename:', error)
    }
  }, [renameItemPath, renameItemName, mode, connectionId, refresh, apiEndpoint])

  // ══════════════════════════════════════════════════════════════════════════════
  // UPLOAD/DOWNLOAD
  // ══════════════════════════════════════════════════════════════════════════════

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadFiles(files)
    if (files.length > 0) {
      setShowUploadModal(true)
    }
  }, [])

  const uploadFilesToServer = useCallback(async () => {
    if (uploadFiles.length === 0) return
    if (mode === 'ftp' && !connectionId) return

    setUploadProgress(0)

    const filesData = []
    for (const file of uploadFiles) {
      const content = await file.arrayBuffer()
      filesData.push({
        name: file.name,
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      })
    }

    try {
      const body: any = {
        action: 'upload-multiple',
        path: currentPath,
        files: filesData,
      }

      if (mode === 'ftp') {
        body.connectionId = connectionId
      }

      await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      setShowUploadModal(false)
      setUploadFiles([])
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      refresh()
    } catch (error: any) {
      console.error('Upload failed:', error)
    }
  }, [uploadFiles, mode, connectionId, currentPath, refresh, apiEndpoint])

  const downloadFile = useCallback(async (item: FileItem) => {
    if (mode === 'ftp' && !connectionId) return

    const path = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`

    try {
      let url: string
      if (mode === 'ftp') {
        url = `/api/ftp-manager?action=download&connectionId=${connectionId}&path=${encodeURIComponent(path)}`
      } else {
        url = `/api/local-file-manager?action=download&path=${encodeURIComponent(path)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.content), c => c.charCodeAt(0))],
          { type: data.mimeType }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.fileName
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error: any) {
      console.error('Download failed:', error)
    }
  }, [mode, connectionId, currentPath])

  const downloadSelected = useCallback(async () => {
    if (selectedItems.size === 0) return
    if (mode === 'ftp' && !connectionId) return

    const paths = Array.from(selectedItems).map(name =>
      currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
    )

    try {
      let url: string
      if (mode === 'ftp') {
        url = `/api/ftp-manager?action=download-multiple&connectionId=${connectionId}&paths=${encodeURIComponent(paths.join(','))}`
      } else {
        url = `/api/local-file-manager?action=download-multiple&paths=${encodeURIComponent(paths.join(','))}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.content), c => c.charCodeAt(0))],
          { type: 'application/zip' }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.fileName
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error: any) {
      console.error('Download failed:', error)
    }
  }, [selectedItems, mode, connectionId, currentPath])

  const previewFile = useCallback(async (item: FileItem) => {
    if (mode === 'ftp' && !connectionId) return

    const path = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`

    try {
      let url: string
      if (mode === 'ftp') {
        url = `/api/ftp-manager?action=download&connectionId=${connectionId}&path=${encodeURIComponent(path)}`
      } else {
        url = `/api/local-file-manager?action=download&path=${encodeURIComponent(path)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        const content = atob(data.content)
        // Limit preview to 100KB
        const truncated = content.length > 100000 ? content.substring(0, 100000) + '\n\n... (truncated)' : content
        setPreviewContent(truncated)
        setPreviewFileName(data.fileName)
        setShowPreviewModal(true)
      }
    } catch (error: any) {
      console.error('Preview failed:', error)
    }
  }, [mode, connectionId, currentPath])

  // ══════════════════════════════════════════════════════════════════════════════
  // ZIP OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════════

  const createZip = useCallback(async () => {
    if (selectedItems.size === 0) return
    if (mode === 'ftp' && !connectionId) return

    const zipName = prompt('Enter zip file name:', `archive_${Date.now()}.zip`)
    if (!zipName) return

    const paths = Array.from(selectedItems).map(name =>
      currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
    )

    try {
      const body: any = {
        action: 'create-zip',
        paths,
        zipName,
        targetPath: currentPath,
      }

      if (mode === 'ftp') {
        body.connectionId = connectionId
      }

      await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      refresh()
    } catch (error: any) {
      console.error('Failed to create zip:', error)
    }
  }, [selectedItems, mode, connectionId, currentPath, refresh, apiEndpoint])

  const extractZip = useCallback(async (item: FileItem) => {
    if (mode === 'ftp' && !connectionId) return

    const path = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`

    if (!confirm(`Extract ${item.name} to current directory?`)) return

    try {
      const body: any = {
        action: 'extract-zip',
        zipPath: path,
        targetPath: currentPath,
      }

      if (mode === 'ftp') {
        body.connectionId = connectionId
      }

      await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      refresh()
    } catch (error: any) {
      console.error('Failed to extract zip:', error)
    }
  }, [mode, connectionId, currentPath, refresh, apiEndpoint])

  // ══════════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ══════════════════════════════════════════════════════════════════════════════

  const search = useCallback(async () => {
    if (!searchQuery) return
    if (mode === 'ftp' && !connectionId) return

    setIsSearching(true)

    try {
      let url: string
      if (mode === 'ftp') {
        url = `/api/ftp-manager?action=search&connectionId=${connectionId}&query=${encodeURIComponent(searchQuery)}&path=${encodeURIComponent(currentPath)}`
      } else {
        url = `/api/local-file-manager?action=search&query=${encodeURIComponent(searchQuery)}&path=${encodeURIComponent(currentPath)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.results.map((r: any) => ({
          ...r,
          isDirectory: r.type === 'directory',
          isFile: r.type === 'file',
        })))
      }
    } catch (error: any) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, mode, connectionId, currentPath])

  // ══════════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════════

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const getFileIcon = (item: FileItem) => {
    if (item.isDirectory) return Folder

    const ext = item.name.split('.').pop()?.toLowerCase()
    const iconMap: Record<string, typeof File> = {
      'jpg': ImageIcon, 'jpeg': ImageIcon, 'png': ImageIcon, 'gif': ImageIcon, 'svg': ImageIcon,
      'mp3': Music, 'wav': Music, 'ogg': Music,
      'mp4': Video, 'avi': Video, 'mkv': Video,
      'js': FileCode, 'ts': FileCode, 'jsx': FileCode, 'tsx': FileCode,
      'html': FileCode, 'css': FileCode, 'json': FileCode,
      'py': FileCode, 'java': FileCode, 'cs': FileCode, 'cshtml': FileCode,
      'zip': FileArchive, 'rar': FileArchive, '7z': FileArchive, 'tar': FileArchive,
      'pdf': FileText, 'doc': FileText, 'docx': FileText, 'txt': FileText,
      'md': FileText, 'sql': FileCode,
    }

    return iconMap[ext || ''] || File
  }

  const getFileColor = (item: FileItem): string => {
    if (item.isDirectory) return colors.primary

    const ext = item.name.split('.').pop()?.toLowerCase()
    const colorMap: Record<string, string> = {
      'js': '#f7df1e', 'ts': '#3178c6', 'jsx': '#61dafb', 'tsx': '#61dafb',
      'html': '#e34f26', 'css': '#1572b6', 'json': '#000000',
      'py': '#3776ab', 'java': '#b07219', 'cs': '#239120', 'cshtml': '#239120',
      'zip': '#f4a261', 'rar': '#f4a261', '7z': '#f4a261',
      'pdf': '#e53935', 'doc': '#2b579a', 'docx': '#2b579a',
      'jpg': '#4caf50', 'jpeg': '#4caf50', 'png': '#4caf50', 'gif': '#4caf50',
      'mp3': '#9c27b0', 'mp4': '#ff5722', 'sql': '#336791',
    }

    return colorMap[ext || ''] || colors.textMuted
  }

  const isReady = mode === 'local' || (mode === 'ftp' && isConnected)

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: colors.card }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}
      >
        <div className="flex items-center gap-3">
          {mode === 'ftp' ? (
            <Server className="w-5 h-5" style={{ color: colors.primary }} />
          ) : (
            <Monitor className="w-5 h-5" style={{ color: colors.primary }} />
          )}
          <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
            {mode === 'ftp' ? 'FTP Web Manager' : 'File Web Manager'}
          </h2>
          {mode === 'ftp' && isConnected && (
            <Badge
              className="flex items-center gap-1"
              style={{ backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)`, color: colors.success }}
            >
              <Wifi className="w-3 h-3" />
              Connected
            </Badge>
          )}
          {mode === 'local' && (
            <Badge
              className="flex items-center gap-1"
              style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`, color: colors.primary }}
            >
              <HardDrive className="w-3 h-3" />
              Project Directory
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div
            className="flex items-center rounded-lg p-1"
            style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
          >
            <button
              onClick={() => switchMode('local')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                mode === 'local' ? 'font-medium' : ''
              }`}
              style={{
                backgroundColor: mode === 'local' ? colors.primary : 'transparent',
                color: mode === 'local' ? '#fff' : colors.textMuted,
              }}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Local</span>
            </button>
            <button
              onClick={() => switchMode('ftp')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                mode === 'ftp' ? 'font-medium' : ''
              }`}
              style={{
                backgroundColor: mode === 'ftp' ? colors.primary : 'transparent',
                color: mode === 'ftp' ? '#fff' : colors.textMuted,
              }}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">FTP</span>
            </button>
          </div>

          {/* FTP Connection Button */}
          {mode === 'ftp' && (
            isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                style={{ borderColor: colors.error, color: colors.error }}
              >
                <WifiOff className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowConnectModal(true)} style={{ backgroundColor: colors.primary, color: '#fff' }}>
                <Server className="w-4 h-4 mr-1" />
                Connect
              </Button>
            )
          )}
        </div>
      </div>

      {/* Main Content */}
      {!isReady ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Server className="w-16 h-16 mb-4" style={{ color: colors.textMuted }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: colors.text }}>
            Connect to FTP Server
          </h3>
          <p className="text-center mb-6" style={{ color: colors.textMuted }}>
            Enter your FTP server credentials to manage files remotely
          </p>
          <Button
            size="lg"
            onClick={() => setShowConnectModal(true)}
            style={{ backgroundColor: colors.primary, color: '#fff' }}
          >
            <Server className="w-5 h-5 mr-2" />
            New Connection
          </Button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div
            className="flex items-center gap-2 px-4 py-2 border-b flex-wrap"
            style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}
          >
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={goBack} disabled={historyIndex === 0}>
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goForward} disabled={historyIndex >= pathHistory.length - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={navigateUp} disabled={currentPath === '/' || currentPath === ''}>
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={refresh}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigateTo('/')}>
                <Home className="w-4 h-4" />
              </Button>
            </div>

            {/* Path bar */}
            <div
              className="flex-1 flex items-center px-3 py-1.5 rounded border"
              style={{ backgroundColor: colors.background, borderColor: colors.border }}
            >
              <Terminal className="w-4 h-4 mr-2" style={{ color: colors.textMuted }} />
              <input
                type="text"
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && navigateTo(currentPath)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: colors.text }}
              />
            </div>

            {/* Search */}
            <div className="flex items-center gap-1">
              <div
                className="flex items-center px-2 py-1.5 rounded border"
                style={{ backgroundColor: colors.background, borderColor: colors.border }}
              >
                <Search className="w-4 h-4" style={{ color: colors.textMuted }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                  placeholder="Search..."
                  className="bg-transparent outline-none text-sm ml-2 w-32"
                  style={{ color: colors.text }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setShowNewFolderModal(true)} title="New Folder">
                <FolderPlus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowNewFileModal(true)} title="New File">
                <FilePlus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} title="Upload">
                <Upload className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Selection actions */}
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-1 border-l pl-2">
                <Badge variant="outline">{selectedItems.size} selected</Badge>
                <Button variant="ghost" size="sm" onClick={copySelected} title="Copy">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={cutSelected} title="Cut">
                  <Scissors className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadSelected} title="Download">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={createZip} title="Create ZIP">
                  <Archive className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={deleteSelected} style={{ color: colors.error }} title="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Clipboard */}
            {clipboard && (
              <div className="flex items-center gap-1 border-l pl-2">
                <Badge
                  style={{
                    backgroundColor: clipboard.type === 'cut' 
                      ? `color-mix(in srgb, ${colors.warning} 20%, transparent)`
                      : `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                    color: clipboard.type === 'cut' ? colors.warning : colors.primary,
                  }}
                >
                  {clipboard.type === 'cut' ? 'Cut' : 'Copy'}: {clipboard.items.length}
                </Badge>
                <Button variant="ghost" size="sm" onClick={paste} title="Paste">
                  <Clipboard className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setClipboard(null)} title="Cancel">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {/* File list */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32" style={{ color: colors.textMuted }}>
                <Folder className="w-12 h-12 mb-2" />
                <p>Empty directory</p>
              </div>
            ) : (
              <table className="w-full">
                <thead
                  className="sticky top-0"
                  style={{ backgroundColor: colors.card }}
                >
                  <tr className="text-left text-sm" style={{ color: colors.textMuted }}>
                    <th className="px-4 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === items.length && items.length > 0}
                        onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                      />
                    </th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2 w-24">Size</th>
                    <th className="px-4 py-2 w-40">Modified</th>
                    <th className="px-4 py-2 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter(item => showHidden || !item.name.startsWith('.'))
                    .sort((a, b) => {
                      if (a.isDirectory && !b.isDirectory) return -1
                      if (!a.isDirectory && b.isDirectory) return 1
                      return a.name.localeCompare(b.name)
                    })
                    .map((item) => {
                      const Icon = getFileIcon(item)
                      const isSelected = selectedItems.has(item.name)
                      const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`

                      return (
                        <tr
                          key={item.name}
                          className={`cursor-pointer hover:bg-opacity-50 ${isSelected ? 'bg-opacity-30' : ''}`}
                          style={{
                            backgroundColor: isSelected 
                              ? `color-mix(in srgb, ${colors.primary} 10%, transparent)`
                              : 'transparent',
                          }}
                          onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                              toggleSelect(item.name)
                            } else if (item.isDirectory) {
                              navigateTo(itemPath)
                            }
                          }}
                          onDoubleClick={() => {
                            if (item.isDirectory) {
                              navigateTo(itemPath)
                            } else {
                              downloadFile(item)
                            }
                          }}
                        >
                          <td className="px-4 py-2" onClick={(e) => { e.stopPropagation(); toggleSelect(item.name) }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(item.name)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-5 h-5" style={{ color: getFileColor(item) }} />
                              <span style={{ color: colors.text }}>{item.name}</span>
                              {item.name.endsWith('.zip') && (
                                <Badge variant="outline" className="text-xs">ZIP</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm" style={{ color: colors.textMuted }}>
                            {item.isDirectory ? '-' : formatSize(item.size)}
                          </td>
                          <td className="px-4 py-2 text-sm" style={{ color: colors.textMuted }}>
                            {formatDate(item.modifiedAt)}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              {!item.isDirectory && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => { e.stopPropagation(); previewFile(item) }}
                                    title="Preview"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => { e.stopPropagation(); downloadFile(item) }}
                                    title="Download"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                              {item.name.endsWith('.zip') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => { e.stopPropagation(); extractZip(item) }}
                                  title="Extract"
                                >
                                  <ArchiveRestore className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRenameItemPath(itemPath)
                                  setRenameItemName(item.name)
                                  setShowRenameModal(true)
                                }}
                                title="Rename"
                              >
                                <FileText className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}
          </div>

          {/* Status bar */}
          <div
            className="flex items-center justify-between px-4 py-2 border-t text-sm"
            style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`, color: colors.textMuted }}
          >
            <div className="flex items-center gap-4">
              <span>{items.length} items</span>
              <span>{items.filter(i => i.isDirectory).length} folders</span>
              <span>{items.filter(i => i.isFile).length} files</span>
              {selectedItems.size > 0 && <span>{selectedItems.size} selected</span>}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </>
      )}

      {/* FTP Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-md p-6 rounded-xl shadow-xl"
            style={{ backgroundColor: colors.card }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                Connect to FTP Server
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowConnectModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {connectionError && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg mb-4"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.error} 10%, transparent)` }}
              >
                <AlertTriangle className="w-4 h-4" style={{ color: colors.error }} />
                <span className="text-sm" style={{ color: colors.error }}>{connectionError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Host *</label>
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="ftp.example.com"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Port</label>
                  <Input
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="21"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Root Path</label>
                  <Input
                    value={rootPath}
                    onChange={(e) => setRootPath(e.target.value)}
                    placeholder="/"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Username *</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="secure"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                />
                <label htmlFor="secure" className="text-sm" style={{ color: colors.textMuted }}>
                  Use FTPS (Secure FTP)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowConnectModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={connect}
                  disabled={isConnecting}
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-sm p-6 rounded-xl shadow-xl"
            style={{ backgroundColor: colors.card }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>New Folder</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowNewFolderModal(false); setNewItemName('') }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Folder name"
                autoFocus
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowNewFolderModal(false); setNewItemName('') }}>
                  Cancel
                </Button>
                <Button
                  onClick={createFolder}
                  disabled={!newItemName}
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  Create
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-lg p-6 rounded-xl shadow-xl"
            style={{ backgroundColor: colors.card }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>New File</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowNewFileModal(false); setNewItemName(''); setNewFileContent('') }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="filename.txt"
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder="File content (optional)"
                rows={6}
                className="w-full p-3 rounded-lg text-sm font-mono"
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowNewFileModal(false); setNewItemName(''); setNewFileContent('') }}>
                  Cancel
                </Button>
                <Button
                  onClick={createFile}
                  disabled={!newItemName}
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  Create
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-sm p-6 rounded-xl shadow-xl"
            style={{ backgroundColor: colors.card }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Rename</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowRenameModal(false); setRenameItemPath(''); setRenameItemName('') }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <Input
                value={renameItemName}
                onChange={(e) => setRenameItemName(e.target.value)}
                placeholder="New name"
                autoFocus
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowRenameModal(false); setRenameItemPath(''); setRenameItemName('') }}>
                  Cancel
                </Button>
                <Button
                  onClick={renameItem}
                  disabled={!renameItemName}
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  Rename
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-md p-6 rounded-xl shadow-xl"
            style={{ backgroundColor: colors.card }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Upload Files</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowUploadModal(false); setUploadFiles([]); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="max-h-64 overflow-auto">
                {uploadFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: colors.background }}>
                    <File className="w-4 h-4" style={{ color: colors.textMuted }} />
                    <span className="text-sm truncate flex-1" style={{ color: colors.text }}>{file.name}</span>
                    <span className="text-xs" style={{ color: colors.textMuted }}>{formatSize(file.size)}</span>
                  </div>
                ))}
              </div>
              {uploadProgress > 0 && (
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: colors.background }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ backgroundColor: colors.primary, width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowUploadModal(false); setUploadFiles([]); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                  Cancel
                </Button>
                <Button
                  onClick={uploadFilesToServer}
                  disabled={uploadFiles.length === 0}
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {uploadFiles.length} file(s)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-4xl max-h-[80vh] rounded-xl shadow-xl flex flex-col"
            style={{ backgroundColor: colors.card }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                Preview: {previewFileName}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowPreviewModal(false); setPreviewContent(''); setPreviewFileName('') }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre
                className="text-sm font-mono whitespace-pre-wrap"
                style={{ color: colors.text }}
              >
                {previewContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FTPWebManager
