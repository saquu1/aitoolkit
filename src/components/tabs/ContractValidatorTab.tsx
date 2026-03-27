'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ContractIssue {
  type: string
  severity: 'error' | 'warning' | 'info'
  message: string
  frontendFile?: string
  frontendLine?: number
  apiFile?: string
  suggestion: string
}

interface ValidationResult {
  success: boolean
  summary: {
    totalEndpoints: number
    totalCalls: number
    totalIssues: number
    errors: number
    warnings: number
  }
  issues: ContractIssue[]
}

export function ContractValidatorTab() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)

  const runValidation = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/contract-validator')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'missing_param': return '❌ Missing Param'
      case 'undefined_access': return '⚠️ Undefined Access'
      case 'unknown_endpoint': return '❓ Unknown Endpoint'
      case 'type_mismatch': return '🔄 Type Mismatch'
      default: return '📋 Issue'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🔍 API Contract Validator</h2>
          <p className="text-gray-600 mt-1">
            One-click detection of data mismatches between Frontend ↔ API ↔ Database
          </p>
        </div>
        <Button 
          onClick={runValidation} 
          disabled={loading}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? '⏳ Scanning...' : '🔍 Scan for Issues'}
        </Button>
      </div>

      {!result && !loading && (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-600">
              Click "Scan for Issues" to detect:
            </p>
            <ul className="text-left mt-4 space-y-2 max-w-md mx-auto text-gray-700">
              <li>• <strong>Missing Parameters</strong> - Frontend sends X but API expects Y</li>
              <li>• <strong>Undefined Access</strong> - Code accesses property on potentially undefined object</li>
              <li>• <strong>Unknown Endpoints</strong> - Frontend calls non-existent API</li>
              <li>• <strong>Type Mismatches</strong> - Data format inconsistencies</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Scanning all API routes and frontend calls...</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">API Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.summary.totalEndpoints}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.summary.totalCalls}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Total Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.summary.totalIssues}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{result.summary.errors}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{result.summary.warnings}</div>
              </CardContent>
            </Card>
          </div>

          {/* Status */}
          <Card className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{result.success ? '✅' : '⚠️'}</span>
                <span className="font-medium">
                  {result.success 
                    ? 'All contracts are valid! No issues found.' 
                    : `Found ${result.summary.totalIssues} issue(s) that need attention.`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Issues List */}
          {result.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>📋 Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.issues.map((issue, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{getTypeIcon(issue.type)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-gray-800">{issue.message}</p>
                      </div>

                      {(issue.frontendFile || issue.apiFile) && (
                        <div className="mt-2 text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
                          {issue.frontendFile && (
                            <div>📱 Frontend: {issue.frontendFile}:{issue.frontendLine}</div>
                          )}
                          {issue.apiFile && (
                            <div>🖥️ API: {issue.apiFile}</div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-sm font-medium text-blue-800">💡 Suggestion:</div>
                        <div className="text-sm text-blue-700 mt-1">{issue.suggestion}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default ContractValidatorTab
