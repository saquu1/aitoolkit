/**
 * PRE-COMMIT HOOK API
 * ===================
 * REST API for Phase 5 Pre-commit Hook operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { preCommitHookService, HookConfig } from '@/lib/pre-commit-hook'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'config'
  const hookId = request.nextUrl.searchParams.get('hookId')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

  try {
    switch (action) {
      case 'config':
        const config = await preCommitHookService.getHookConfig(hookId || undefined)
        return NextResponse.json({ success: true, config })

      case 'status':
        const isInstalled = await preCommitHookService.isHookInstalled()
        return NextResponse.json({
          success: true,
          installed: isInstalled,
          message: isInstalled ? 'Pre-commit hook is installed' : 'No pre-commit hook found'
        })

      case 'history':
        const history = await preCommitHookService.getExecutionHistory(limit)
        return NextResponse.json({ success: true, history })

      case 'stats':
        const stats = await preCommitHookService.getStats()
        return NextResponse.json({ success: true, stats })

      case 'hooks':
        const hooks = await prisma.preCommitHook.findMany({
          orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, hooks })

      case 'skip-rules':
        const skipRules = await prisma.skipRule.findMany({
          where: { isActive: true }
        })
        return NextResponse.json({ success: true, skipRules })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Pre-commit Hook API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'install':
        const installResult = await preCommitHookService.installHook(body.config)
        return NextResponse.json(installResult)

      case 'uninstall':
        const uninstallResult = await preCommitHookService.uninstallHook()
        return NextResponse.json(uninstallResult)

      case 'run':
        const hookId = body.hookId || 'default'
        const trigger = body.trigger || 'manual'
        const runResult = await preCommitHookService.runHook(hookId, trigger)
        return NextResponse.json({
          success: runResult.passed,
          result: runResult
        })

      case 'update-config':
        if (!body.hookId) {
          return NextResponse.json({ success: false, error: 'hookId required' }, { status: 400 })
        }
        const updated = await preCommitHookService.updateHookConfig(body.hookId, body.config)
        return NextResponse.json({ success: true, config: updated })

      case 'create-skip-rule':
        const skipRule = await prisma.skipRule.create({
          data: {
            name: body.name,
            description: body.description,
            ruleType: body.ruleType,
            pattern: body.pattern,
            skipAll: body.skipAll || false,
            skipChecks: JSON.stringify(body.skipChecks || [])
          }
        })
        return NextResponse.json({ success: true, skipRule })

      case 'delete-skip-rule':
        await prisma.skipRule.delete({ where: { id: body.ruleId } })
        return NextResponse.json({ success: true })

      case 'toggle-hook':
        const toggled = await prisma.preCommitHook.update({
          where: { id: body.hookId },
          data: { isActive: body.isActive }
        })
        return NextResponse.json({ success: true, hook: toggled })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Pre-commit Hook POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
