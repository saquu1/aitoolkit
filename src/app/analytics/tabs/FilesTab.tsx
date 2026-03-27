'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { FileCode, Edit, Trash2, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FileOperation {
  id: string
  operation: string
  filePath: string
  timestamp: string
  sessionId: string
}

export function FilesTab() {
  const [files, setFiles] = useState<FileOperation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch('/api/analytics?action=files')
        const data = await res.json()
        if (data.success) {
          setFiles(data.files || [])
        }
      } catch (error) {
        console.error('Failed to fetch files:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchFiles()
  }, [])

  const getOperationIcon = (op: string) => {
    switch (op.toLowerCase()) {
      case 'write':
      case 'create':
        return <FileCode className="h-4 w-4 text-green-500" />
      case 'edit':
        return <Edit className="h-4 w-4 text-blue-500" />
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />
      case 'read':
        return <Copy className="h-4 w-4 text-gray-500" />
      default:
        return <FileCode className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              File Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No file operations recorded</p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded border hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {getOperationIcon(file.operation)}
                      <span className="text-sm font-mono truncate max-w-md">
                        {file.filePath}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {file.operation}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(file.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
