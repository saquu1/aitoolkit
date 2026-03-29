'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GitBranch, Download, Calendar, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Report {
  id: string
  type: string
  title: string
  createdAt: string
  status: string
  summary?: string
}

export function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/analytics/intelligence?action=reports')
        const data = await res.json()
        if (data.success) {
          setReports(data.reports || [])
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReports()
  }, [])

  const handleGenerateReport = async (type: string) => {
    try {
      const res = await fetch('/api/analytics/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-report', type })
      })
      const data = await res.json()
      if (data.success) {
        // Refresh reports list
        setReports(prev => [data.report, ...prev])
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Reports
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleGenerateReport('weekly')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Weekly Report
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleGenerateReport('session-comparison')}
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  Compare Sessions
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reports generated yet</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Click the buttons above to generate reports
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{report.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.summary || `${report.type} report`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {report.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
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
