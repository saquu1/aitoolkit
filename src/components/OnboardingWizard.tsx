'use client'

/**
 * Onboarding Wizard Component
 * Step-by-step guide for new users
 * 
 * TASK-4.8: Guided Onboarding
 * Part of Phase 4: Features & User Experience
 */

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Upload,
  Database,
  Puzzle,
  Rocket,
  Award,
  Play,
  FileCode,
  Brain,
  GitBranch,
  Settings
} from 'lucide-react'

// Steps configuration
interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  isComplete: boolean
  estimatedTime?: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AI Enterprise Architect',
    description: 'Transform your legacy systems into modern, scalable applications',
    icon: Sparkles,
    isComplete: false
  },
  {
    id: 'upload',
    title: 'Upload Your Code',
    description: 'Start by uploading your SQL DDL, stored procedures, or other code files',
    icon: Upload,
    isComplete: false,
    estimatedTime: '2 min'
  },
  {
    id: 'analysis',
    title: 'AI-Powered Analysis',
    description: 'Our agents will analyze your code and extract tables, columns, and relationships',
    icon: Database,
    isComplete: false,
    estimatedTime: '1-2 min'
  },
  {
    id: 'modules',
    title: 'Module Organization',
    description: 'Tables are automatically organized into business modules',
    icon: Puzzle,
    isComplete: false,
    estimatedTime: '30 sec'
  },
  {
    id: 'generation',
    title: 'Code Generation',
    description: 'Generate Prisma schemas, TypeScript types, API routes, and more',
    icon: Rocket,
    isComplete: false,
    estimatedTime: '1 min'
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description: 'Start exploring your generated code and documentation',
    icon: Award,
    isComplete: false
  }
]

interface OnboardingWizardProps {
  onComplete?: () => void
  onSkip?: () => void
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [skipped, setSkipped] = useState(false)

  const totalSteps = ONBOARDING_STEPS.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCompletedSteps(prev => new Set(prev).add(ONBOARDING_STEPS[currentStep].id))
      setCurrentStep(prev => prev + 1)
    } else {
      onComplete?.()
    }
  }, [currentStep, totalSteps, onComplete])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    setSkipped(true)
    onSkip?.()
  }, [onSkip])

  const handleRestart = useCallback(() => {
    setSkipped(false)
    setCurrentStep(0)
    setCompletedSteps(new Set())
  }, [])

  const StepIcon = ONBOARDING_STEPS[currentStep].icon

  // Welcome step content
  const renderWelcomeStep = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-purple-400" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-100">
        Welcome to AI Enterprise Architect
      </h2>
      <p className="text-slate-400 max-w-md mx-auto">
        Transform your legacy systems into modern, scalable applications with AI-powered analysis and code generation
      </p>
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <Database className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-slate-100">95+</div>
          <div className="text-sm text-slate-400">Models</div>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <Puzzle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-slate-100">35</div>
          <div className="text-sm text-slate-400">Modules</div>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <Brain className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-slate-100">7</div>
          <div className="text-sm text-slate-400">Agent Layers</div>
        </div>
      </div>
    </div>
  )

  // Upload step content
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-slate-100">Upload Your SQL Files</h3>
        <p className="text-slate-400">
          Drag and drop your SQL DDL scripts, stored procedures, or other code files
        </p>
      </div>
      
      <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
        <Upload className="w-12 h-12 mx-auto text-slate-500" />
        <p className="text-sm text-slate-400 mt-2">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Supported: .sql, .prc, .cs, .json, .xml
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
          <h4 className="font-medium text-slate-200 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-purple-400" />
            SQL DDL Scripts
          </h4>
          <p className="text-slate-400 mt-1 text-xs">
            CREATE TABLE statements with columns, constraints, and indexes
          </p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
          <h4 className="font-medium text-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-green-400" />
            Stored Procedures
          </h4>
          <p className="text-slate-400 mt-1 text-xs">
            Business logic, data transformations, and CRUD operations
          </p>
        </div>
      </div>
    </div>
  )

  // Analysis step content
  const renderAnalysisStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-slate-100">AI-Powered Analysis</h3>
        <p className="text-slate-400">
          Our intelligent agents will analyze your code automatically
        </p>
      </div>
      
      <div className="space-y-3">
        {[
          { name: 'SQL Parser', desc: 'Extract tables, columns, and foreign keys', time: '~15s', icon: Database },
          { name: 'SP Parser', desc: 'Parse stored procedures and extract business logic', time: '~25s', icon: FileCode },
          { name: 'Column Intelligence', desc: 'Infer types, detect PII/PHI', time: '~20s', icon: Brain },
          { name: 'FK Resolver', desc: 'Resolve foreign key relationships', time: '~10s', icon: GitBranch },
          { name: 'Module Matcher', desc: 'Assign tables to business modules', time: '~5s', icon: Puzzle }
        ].map((agent, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded border border-slate-700 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <agent.icon className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-200">{agent.name}</div>
              <div className="text-sm text-slate-400">{agent.desc}</div>
            </div>
            <div className="text-sm text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
              {agent.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Modules step content
  const renderModulesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-slate-100">Module Organization</h3>
        <p className="text-slate-400">
          Tables are automatically grouped into 35 business modules based on naming patterns and relationships
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {[
          { name: 'Patient', color: 'purple', tables: 12 },
          { name: 'Appointment', color: 'blue', tables: 8 },
          { name: 'Billing', color: 'green', tables: 15 },
          { name: 'Laboratory', color: 'yellow', tables: 10 },
          { name: 'Pharmacy', color: 'pink', tables: 9 },
          { name: 'Radiology', color: 'cyan', tables: 6 }
        ].map((mod) => (
          <div key={mod.name} className="bg-slate-800/50 p-3 rounded border border-slate-700 text-center">
            <div className={`w-10 h-10 rounded-lg bg-${mod.color}-500/20 flex items-center justify-center mx-auto mb-2`}>
              <Puzzle className={`w-5 h-5 text-${mod.color}-400`} />
            </div>
            <div className="font-medium text-slate-200 text-sm">{mod.name}</div>
            <div className="text-xs text-slate-400">{mod.tables} tables</div>
          </div>
        ))}
      </div>
      
      <div className="bg-slate-800/30 p-4 rounded border border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Check className="w-4 h-4 text-green-400" />
          Automatic detection based on table naming conventions
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 mt-2">
          <Check className="w-4 h-4 text-green-400" />
          FK relationships inform module boundaries
        </div>
      </div>
    </div>
  )

  // Generation step content
  const renderGenerationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-slate-100">Code Generation</h3>
        <p className="text-slate-400">
          Generate production-ready code from your analyzed schema
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: 'Prisma Schema', desc: 'Type-safe database client with migrations', icon: Database },
          { title: 'TypeScript Types', desc: 'Interfaces and types for your entities', icon: FileCode },
          { title: 'API Routes', desc: 'RESTful endpoints for CRUD operations', icon: GitBranch },
          { title: 'Documentation', desc: 'Auto-generated docs and guides', icon: Settings }
        ].map((item) => (
          <div key={item.title} className="bg-slate-800/50 p-4 rounded border border-slate-700 hover:border-purple-500 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-purple-400" />
              </div>
              <h4 className="font-medium text-slate-200">{item.title}</h4>
            </div>
            <p className="text-sm text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
        <div className="flex items-center gap-2 text-sm text-green-400">
          <Check className="w-4 h-4" />
          All generated code is production-ready and follows best practices
        </div>
      </div>
    </div>
  )

  // Complete step content
  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-10 h-10 text-green-400" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-100">You're All Set!</h2>
      <p className="text-slate-400">
        Your project has been analyzed and is ready for exploration
      </p>
      
      <div className="grid grid-cols-2 gap-4 text-left">
        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
          <h4 className="font-medium text-slate-200 mb-3">Next Steps:</h4>
          <ul className="text-sm text-slate-400 space-y-2">
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-purple-400" />
              Review generated Prisma schema
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-purple-400" />
              Explore the knowledge graph
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-purple-400" />
              Check module assignments
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-purple-400" />
              Generate API documentation
            </li>
          </ul>
        </div>
        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
          <h4 className="font-medium text-slate-200 mb-3">Quick Actions:</h4>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="default" className="w-full justify-start">
              <Database className="w-4 h-4 mr-2" />
              View Dashboard
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start">
              <Rocket className="w-4 h-4 mr-2" />
              Export Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (ONBOARDING_STEPS[currentStep].id) {
      case 'welcome':
        return renderWelcomeStep()
      case 'upload':
        return renderUploadStep()
      case 'analysis':
        return renderAnalysisStep()
      case 'modules':
        return renderModulesStep()
      case 'generation':
        return renderGenerationStep()
      case 'complete':
        return renderCompleteStep()
      default:
        return null
    }
  }

  if (skipped) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100">Onboarding Skipped</h2>
        <p className="text-slate-400 mt-2">
          You can restart onboarding from settings anytime
        </p>
        <Button onClick={handleRestart} className="mt-4">
          Start Over
        </Button>
      </div>
    )
  }

  const step = ONBOARDING_STEPS[currentStep]
  const isLast = currentStep === totalSteps - 1
  const isFirst = currentStep === 0

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Step {currentStep + 1} of {totalSteps}</span>
              <span className="text-slate-400">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-6 px-2">
            {ONBOARDING_STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    idx === currentStep
                      ? 'bg-purple-500 text-white'
                      : completedSteps.has(s.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {completedSteps.has(s.id) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < totalSteps - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      completedSteps.has(s.id) ? 'bg-green-500' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <div className="flex gap-2">
              {!isFirst && (
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              {!isLast && (
                <Button variant="ghost" onClick={handleSkip} className="text-slate-400">
                  Skip Tour
                </Button>
              )}
            </div>
            
            {!isLast ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleNext} className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Start Exploring
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OnboardingWizard
