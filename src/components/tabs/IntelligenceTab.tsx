'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { ColumnIntelligenceViewer } from '@/components/ColumnIntelligenceViewer'
import { SPIntelligenceViewer } from '@/components/SPIntelligenceViewer'
import { ViewIntelligenceViewer } from '@/components/ViewIntelligenceViewer'
import { ComplianceReportGenerator, type ComplianceReport } from '@/lib/compliance-report-generator'
import { 
  Brain,
  MessageSquareQuote,
  Layout,
  FileCheck,
  BookOpen,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Sparkles,
  RefreshCw,
  Download,
  Eye,
  Pencil,
  AlertTriangle,
  Lightbulb,
  Code,
  FileText,
  Shield,
  Columns,
  Database,
  Eye as ViewIcon
} from 'lucide-react'

interface QuestionGroup {
  id: string
  title: string
  description: string
  icon: string
  questions: any[]
  status: string
}

interface QuestionSession {
  id: string
  groups: QuestionGroup[]
  progress: {
    total: number
    answered: number
    criticalTotal: number
    criticalAnswered: number
  }
}

interface ScreenBlueprint {
  screenType: string
  tableName: string
  title: string
  fields: any[]
  actions: any[]
  sections?: any[]
  filters?: any[]
}

interface BusinessRule {
  id: string
  code: string
  name: string
  description: string
  category: string
  priority: string
  status: string
  trigger: any
  condition: any
  action: any
}

interface UserStory {
  id: string
  code: string
  title: string
  role: string
  feature: string
  benefit: string
  acceptanceCriteria: string[]
  priority: string
  storyPoints: number
  tableName: string
}

interface IntelligenceTabProps {
  onNavigate?: (tab: string) => void
}

export function IntelligenceTab({ onNavigate }: IntelligenceTabProps) {
  const { colors } = useTheme()
  const { parseResult } = useSchema()
  const [activeSection, setActiveSection] = useState<'questions' | 'blueprints' | 'rules' | 'stories' | 'columns' | 'compliance' | 'sp' | 'views'>('columns')
  const [isLoading, setIsLoading] = useState(false)
  
  // Questions state
  const [questionSession, setQuestionSession] = useState<QuestionSession | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  
  // Blueprints state
  const [blueprints, setBlueprints] = useState<Record<string, any>>({})
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null)
  
  // Rules state
  const [rules, setRules] = useState<BusinessRule[]>([])
  const [selectedRule, setSelectedRule] = useState<BusinessRule | null>(null)
  
  // Stories state
  const [stories, setStories] = useState<UserStory[]>([])
  const [selectedStory, setSelectedStory] = useState<UserStory | null>(null)

  const generateQuestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-questions',
          modules: [] // Will use default modules
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setQuestionSession(data.session)
      }
    } catch (error) {
      console.error('Failed to generate questions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateBlueprints = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-blueprints',
          tables: []
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setBlueprints(data.blueprints)
      }
    } catch (error) {
      console.error('Failed to generate blueprints:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateRules = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-rules',
          tables: []
        })
      })
      
      const data = await response.json()
      if (data.success) {
        const allRules = data.groups.flatMap((g: any) => g.rules)
        setRules(allRules)
      }
    } catch (error) {
      console.error('Failed to generate rules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateStories = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-user-stories',
          tables: []
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setStories(data.stories)
      }
    } catch (error) {
      console.error('Failed to generate stories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const answerQuestion = async (questionId: string, answer: string | string[]) => {
    if (!questionSession) return
    
    try {
      const response = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer-question',
          session: questionSession,
          questionId,
          answer
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setQuestionSession(data.session)
      }
    } catch (error) {
      console.error('Failed to answer question:', error)
    }
  }

  const getPriorityStyle = (priority: string) => {
    const priorityColors: Record<string, string> = {
      critical: colors.error,
      high: colors.warning,
      medium: colors.warningLight,
      low: colors.textMuted,
    }
    const color = priorityColors[priority] || colors.textMuted
    return {
      backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
      color: color,
      borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'validation': return <FileCheck className="w-4 h-4" />
      case 'workflow': return <RefreshCw className="w-4 h-4" />
      case 'security': return <AlertTriangle className="w-4 h-4" />
      case 'business_logic': return <Lightbulb className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <Brain className="w-7 h-7" style={{ color: colors.primary }} />
            Intelligence Layer
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            AI Questions, Screen Blueprints, Business Rules & User Stories
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as any)}>
        <TabsList className="border">
          <TabsTrigger value="columns" className="flex items-center gap-2">
            <Columns className="w-4 h-4" />
            Column Intelligence
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4" />
            AI Questions
          </TabsTrigger>
          <TabsTrigger value="blueprints" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Screen Blueprints
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Business Rules
          </TabsTrigger>
          <TabsTrigger value="stories" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            User Stories
          </TabsTrigger>
          <TabsTrigger value="sp" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            SP Intelligence
          </TabsTrigger>
          <TabsTrigger value="views" className="flex items-center gap-2">
            <ViewIcon className="w-4 h-4" />
            View Intelligence
          </TabsTrigger>
        </TabsList>

        {/* Column Intelligence Tab */}
        <TabsContent value="columns" className="space-y-4 mt-4">
          <ColumnIntelligenceViewer 
            tables={parseResult?.tables.map(t => ({
              schemaName: t.schemaName,
              tableName: t.tableName,
              columns: t.columns.map(c => ({
                name: c.name,
                dataType: c.dataType,
                maxLength: c.maxLength,
                isNullable: c.nullable,
                isPrimaryKey: c.isPrimaryKey,
                isIdentity: c.isIdentity,
                defaultValue: c.defaultValue
              })),
              foreignKeys: t.foreignKeys.map(fk => ({
                constraintName: fk.constraintName,
                columnName: fk.columnName,
                referencesTable: fk.referencesTable,
                referencesColumn: fk.referencesColumn
              })),
              sourceDDL: t.sourceDDL
            })) || []}
          />
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4 mt-4">
          <ComplianceReportViewer parseResult={parseResult} />
        </TabsContent>

        {/* AI Questions Tab */}
        <TabsContent value="questions" className="space-y-4 mt-4">
          {!questionSession ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquareQuote className="w-16 h-16 mx-auto mb-4" style={{ color: colors.primary }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>Generate AI Questions</h3>
                <p className="mb-4 max-w-md mx-auto" style={{ color: colors.textMuted }}>
                  The AI will analyze your tables and modules to generate intelligent questions
                  about business logic, validation, workflow, and more.
                </p>
                <Button 
                  onClick={generateQuestions}
                  disabled={isLoading}
                  style={{ backgroundColor: colors.primary, color: '#ffffff' }}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Questions
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Progress Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: colors.textMuted }}>Progress</span>
                    <span className="font-medium" style={{ color: colors.text }}>
                      {questionSession.progress.answered}/{questionSession.progress.total} answered
                    </span>
                  </div>
                  <Progress 
                    value={(questionSession.progress.answered / questionSession.progress.total) * 100}
                    className="h-2"
                  />
                  <div className="flex gap-4 mt-2 text-xs" style={{ color: colors.textMuted }}>
                    <span style={{ color: colors.error }}>
                      Critical: {questionSession.progress.criticalAnswered}/{questionSession.progress.criticalTotal}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Question Groups */}
              <div className="space-y-3">
                {questionSession.groups.map((group) => (
                  <Card key={group.id}>
                    <div 
                      className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedGroup === group.id ? (
                            <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                          ) : (
                            <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                          )}
                          <span className="text-2xl">{group.icon}</span>
                          <div>
                            <h4 className="font-medium" style={{ color: colors.text }}>{group.title}</h4>
                            <p className="text-xs" style={{ color: colors.textMuted }}>{group.questions.length} questions</p>
                          </div>
                        </div>
                        <Badge 
                          style={{
                            backgroundColor: group.status === 'completed' 
                              ? `color-mix(in srgb, ${colors.success} 20%, transparent)` 
                              : group.status === 'in_progress' 
                              ? `color-mix(in srgb, ${colors.warning} 20%, transparent)` 
                              : `color-mix(in srgb, ${colors.textMuted} 20%, transparent)`,
                            color: group.status === 'completed' 
                              ? colors.success 
                              : group.status === 'in_progress' 
                              ? colors.warning 
                              : colors.textMuted,
                          }}
                        >
                          {group.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {expandedGroup === group.id && (
                      <div className="border-t p-4 space-y-3" style={{ borderColor: colors.border }}>
                        {group.questions.map((question) => (
                          <div 
                            key={question.id} 
                            className="rounded-lg p-3"
                            style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {question.answer ? (
                                    <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
                                  ) : (
                                    <Circle className="w-4 h-4" style={{ color: colors.textMuted }} />
                                  )}
                                  <Badge style={getPriorityStyle(question.priority)}>
                                    {question.priority}
                                  </Badge>
                                  <span className="text-xs" style={{ color: colors.textMuted }}>{question.category}</span>
                                </div>
                                <p className="font-medium" style={{ color: colors.text }}>{question.question}</p>
                                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{question.context}</p>
                              </div>
                            </div>
                            
                            {question.options && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {question.options.map((opt: any) => (
                                  <Button
                                    key={opt.value}
                                    size="sm"
                                    variant={question.answer === opt.value ? 'default' : 'outline'}
                                    style={question.answer === opt.value 
                                      ? { backgroundColor: colors.primary, color: '#ffffff' }
                                      : { borderColor: colors.border, color: colors.textSecondary }
                                    }
                                    onClick={() => answerQuestion(question.id, opt.value)}
                                  >
                                    {opt.label}
                                    {opt.recommended && (
                                      <Badge 
                                        className="ml-2 text-xs"
                                        style={{
                                          backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)`,
                                          color: colors.success,
                                        }}
                                      >
                                        Recommended
                                      </Badge>
                                    )}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Screen Blueprints Tab */}
        <TabsContent value="blueprints" className="space-y-4 mt-4">
          {Object.keys(blueprints).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Layout className="w-16 h-16 mx-auto mb-4" style={{ color: colors.accent }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>Generate Screen Blueprints</h3>
                <p className="mb-4 max-w-md mx-auto" style={{ color: colors.textMuted }}>
                  Auto-generate List, Form, and Detail screen blueprints for each table
                  with intelligent field organization.
                </p>
                <Button 
                  onClick={generateBlueprints}
                  disabled={isLoading}
                  style={{ backgroundColor: colors.accent, color: '#ffffff' }}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Blueprints
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(blueprints).map(([tableName, bp]) => (
                <Card 
                  key={tableName}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ 
                    borderColor: selectedBlueprint === tableName 
                      ? colors.accent 
                      : colors.border 
                  }}
                  onClick={() => setSelectedBlueprint(tableName)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm" style={{ color: colors.text }}>{tableName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded p-2" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
                        <Layout className="w-4 h-4 mx-auto mb-1" style={{ color: colors.accent }} />
                        <span style={{ color: colors.textSecondary }}>List</span>
                      </div>
                      <div className="rounded p-2" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
                        <FileText className="w-4 h-4 mx-auto mb-1" style={{ color: colors.success }} />
                        <span style={{ color: colors.textSecondary }}>Form</span>
                      </div>
                      <div className="rounded p-2" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
                        <Eye className="w-4 h-4 mx-auto mb-1" style={{ color: colors.primary }} />
                        <span style={{ color: colors.textSecondary }}>Detail</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs" style={{ color: colors.textMuted }}>
                      {(bp as any).listScreen?.fields?.length || 0} fields • {(bp as any).dashboardWidgets?.length || 0} widgets
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Business Rules Tab */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileCheck className="w-16 h-16 mx-auto mb-4" style={{ color: colors.warning }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>Generate Business Rules</h3>
                <p className="mb-4 max-w-md mx-auto" style={{ color: colors.textMuted }}>
                  Auto-generate validation, workflow, and business logic rules
                  based on table structure and module context.
                </p>
                <Button 
                  onClick={generateRules}
                  disabled={isLoading}
                  style={{ backgroundColor: colors.warning, color: '#ffffff' }}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Rules
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Rules Summary */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { value: rules.length, label: 'Total Rules', color: colors.text },
                  { value: rules.filter(r => r.priority === 'critical').length, label: 'Critical', color: colors.error },
                  { value: rules.filter(r => r.status === 'approved').length, label: 'Approved', color: colors.success },
                  { value: rules.filter(r => r.status === 'draft').length, label: 'Draft', color: colors.warning },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Rules List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {rules.map((rule) => (
                        <div 
                          key={rule.id}
                          className="rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                          onClick={() => setSelectedRule(rule)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getCategoryIcon(rule.category)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono" style={{ color: colors.textMuted }}>{rule.code}</span>
                                  <Badge style={getPriorityStyle(rule.priority)}>
                                    {rule.priority}
                                  </Badge>
                                </div>
                                <span className="font-medium" style={{ color: colors.text }}>{rule.name}</span>
                              </div>
                            </div>
                            <Badge 
                              style={{
                                backgroundColor: rule.status === 'approved' 
                                  ? `color-mix(in srgb, ${colors.success} 20%, transparent)` 
                                  : rule.status === 'pending_approval' 
                                  ? `color-mix(in srgb, ${colors.warning} 20%, transparent)` 
                                  : `color-mix(in srgb, ${colors.textMuted} 20%, transparent)`,
                                color: rule.status === 'approved' 
                                  ? colors.success 
                                  : rule.status === 'pending_approval' 
                                  ? colors.warning 
                                  : colors.textMuted,
                              }}
                            >
                              {rule.status}
                            </Badge>
                          </div>
                          <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{rule.description}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* User Stories Tab */}
        <TabsContent value="stories" className="space-y-4 mt-4">
          {stories.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: colors.success }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>Generate User Stories</h3>
                <p className="mb-4 max-w-md mx-auto" style={{ color: colors.textMuted }}>
                  Auto-generate user stories with acceptance criteria for each table,
                  ready for sprint planning.
                </p>
                <Button 
                  onClick={generateStories}
                  disabled={isLoading}
                  style={{ backgroundColor: colors.success, color: '#ffffff' }}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Stories
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stories Summary */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { value: stories.length, label: 'Total Stories', color: colors.text },
                  { value: stories.filter(s => s.priority === 'must_have').length, label: 'Must Have', color: colors.error },
                  { value: stories.filter(s => s.priority === 'should_have').length, label: 'Should Have', color: colors.warning },
                  { value: stories.reduce((sum, s) => sum + s.storyPoints, 0), label: 'Story Points', color: colors.primary },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Stories List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">User Stories</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      style={{ borderColor: colors.border, color: colors.textSecondary }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Jira
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {stories.map((story) => (
                        <div 
                          key={story.id}
                          className="rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                          onClick={() => setSelectedStory(story)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono" style={{ color: colors.textMuted }}>{story.code}</span>
                                <Badge 
                                  style={{
                                    backgroundColor: story.priority === 'must_have' 
                                      ? `color-mix(in srgb, ${colors.error} 20%, transparent)` 
                                      : story.priority === 'should_have' 
                                      ? `color-mix(in srgb, ${colors.warning} 20%, transparent)` 
                                      : `color-mix(in srgb, ${colors.textMuted} 20%, transparent)`,
                                    color: story.priority === 'must_have' 
                                      ? colors.error 
                                      : story.priority === 'should_have' 
                                      ? colors.warning 
                                      : colors.textMuted,
                                  }}
                                >
                                  {story.priority.replace('_', ' ')}
                                </Badge>
                                <Badge 
                                  style={{
                                    backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                                    color: colors.primary,
                                  }}
                                >
                                  {story.storyPoints} SP
                                </Badge>
                              </div>
                              <span className="font-medium" style={{ color: colors.text }}>{story.title}</span>
                            </div>
                          </div>
                          <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                            As a <span style={{ color: colors.textSecondary }}>{story.role}</span>, I want to <span style={{ color: colors.textSecondary }}>{story.feature}</span> so that <span style={{ color: colors.textSecondary }}>{story.benefit}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* SP Intelligence Tab */}
        <TabsContent value="sp" className="space-y-4 mt-4">
          <SPIntelligenceViewer 
            storedProcedures={parseResult?.storedProcedures || []}
            tables={parseResult?.tables.map(t => ({
              schemaName: t.schemaName,
              tableName: t.tableName,
              columns: t.columns.map(c => ({
                name: c.name,
                dataType: c.dataType,
                maxLength: c.maxLength,
                isNullable: c.nullable,
                isPrimaryKey: c.isPrimaryKey,
                isIdentity: c.isIdentity,
                defaultValue: c.defaultValue
              })),
              foreignKeys: t.foreignKeys.map(fk => ({
                constraintName: fk.constraintName,
                columnName: fk.columnName,
                referencesTable: fk.referencesTable,
                referencesColumn: fk.referencesColumn
              })),
              sourceDDL: t.sourceDDL
            })) || []}
          />
        </TabsContent>

        {/* View Intelligence Tab */}
        <TabsContent value="views" className="space-y-4 mt-4">
          <ViewIntelligenceViewer 
            viewSql={parseResult?.rawSql}
            tables={parseResult?.tables.map(t => ({
              schemaName: t.schemaName,
              tableName: t.tableName,
              columns: t.columns.map(c => ({
                name: c.name,
                dataType: c.dataType,
                maxLength: c.maxLength,
                isNullable: c.nullable,
                isPrimaryKey: c.isPrimaryKey,
                isIdentity: c.isIdentity,
                defaultValue: c.defaultValue
              })),
              foreignKeys: t.foreignKeys.map(fk => ({
                constraintName: fk.constraintName,
                columnName: fk.columnName,
                referencesTable: fk.referencesTable,
                referencesColumn: fk.referencesColumn
              })),
              sourceDDL: t.sourceDDL
            })) || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================================================
// Compliance Report Viewer Component
// =============================================================================

function ComplianceReportViewer({ parseResult }: { parseResult: any }) {
  const { colors } = useTheme()
  
  const generator = useMemo(() => new ComplianceReportGenerator(), [])

  // Generate report using useMemo instead of useEffect
  const report = useMemo(() => {
    if (!parseResult?.tables?.length) return null
    
    const tables = parseResult.tables.map((t: any) => ({
      schemaName: t.schemaName,
      tableName: t.tableName,
      columns: t.columns.map((c: any) => ({
        name: c.name,
        dataType: c.dataType,
        maxLength: c.maxLength,
        isNullable: c.nullable,
        isPrimaryKey: c.isPrimaryKey,
        isIdentity: c.isIdentity,
        defaultValue: c.defaultValue
      })),
      foreignKeys: [],
      sourceDDL: t.sourceDDL
    }))

    return generator.generateReport(tables, 'HIS Schema')
  }, [parseResult, generator])

  if (!parseResult?.tables?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Schema Uploaded</h3>
          <p className="text-muted-foreground text-sm">
            Upload SQL schema to generate compliance report
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
          <h3 className="text-lg font-semibold">Generating Report...</h3>
        </CardContent>
      </Card>
    )
  }

  const handleExportJSON = () => {
    const json = generator.exportAsJSON(report)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-report-${report.reportId}.json`
    a.click()
  }

  const handleExportMarkdown = () => {
    const md = generator.exportAsMarkdown(report)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-report-${report.reportId}.md`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Report
          </h3>
          <p className="text-sm text-muted-foreground">
            Generated: {report.generatedAt.toLocaleString()} | Risk Score: {report.riskScore}/100
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
            <FileText className="h-4 w-4 mr-2" />
            Export MD
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{report.summary.totalColumns}</div>
            <div className="text-xs text-muted-foreground">Total Columns</div>
          </CardContent>
        </Card>
        <Card className="border-red-500">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{report.summary.phiColumns}</div>
            <div className="text-xs text-muted-foreground">PHI Columns</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{report.summary.piiColumns}</div>
            <div className="text-xs text-muted-foreground">PII Columns</div>
          </CardContent>
        </Card>
        <Card className="border-orange-500">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-500">{report.summary.encryptionRequired}</div>
            <div className="text-xs text-muted-foreground">Need Encryption</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold ${
              report.complianceStatus === 'compliant' ? 'text-green-500' :
              report.complianceStatus === 'partial' ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {report.complianceStatus.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground">Status</div>
          </CardContent>
        </Card>
      </div>

      {/* Framework Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Framework Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.frameworks.map((fw) => (
              <div key={fw.framework} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={fw.status === 'compliant' ? 'default' : fw.status === 'partial' ? 'secondary' : 'destructive'}>
                      {fw.framework}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {fw.applicableColumns} applicable columns
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={fw.complianceScore} className="w-24 h-2" />
                    <span className="text-sm font-medium">{fw.complianceScore}%</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {fw.requirements.slice(0, 4).map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {req.status === 'compliant' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : req.status === 'partial' ? (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      ) : (
                        <Circle className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-muted-foreground">{req.requirement}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Top Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {report.recommendations.slice(0, 5).map((rec) => (
              <div key={rec.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={rec.priority === 'critical' ? 'destructive' : rec.priority === 'high' ? 'default' : 'secondary'}>
                      {rec.priority}
                    </Badge>
                    <span className="font-medium">{rec.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{rec.estimatedEffort}</span>
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
                <div className="flex gap-1 mt-2">
                  {rec.frameworks.map((fw) => (
                    <Badge key={fw} variant="outline" className="text-xs">{fw}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
