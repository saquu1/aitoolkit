/**
 * FLOW MAP API
 * ============
 * REST API for Phase 4 Flow Map operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { flowMapService } from '@/lib/flow-map'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'get'
  const scanId = request.nextUrl.searchParams.get('scanId')

  try {
    switch (action) {
      case 'get':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        const flowMap = await flowMapService.getFlowMap(scanId)
        return NextResponse.json({
          success: !!flowMap,
          flowMap
        })

      case 'stats':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          stats: await flowMapService.getFlowStats(scanId)
        })

      case 'mermaid':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          mermaid: await flowMapService.generateMermaidDiagram(scanId)
        })

      case 'nodes':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        const nodes = await prisma.flowNode.findMany({ where: { scanId } })
        return NextResponse.json({ success: true, nodes })

      case 'flows':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        const flows = await prisma.dataFlow.findMany({ where: { scanId } })
        return NextResponse.json({ success: true, flows })

      case 'list-scans':
        const scans = await prisma.dataFlow.groupBy({
          by: ['scanId'],
          _count: { id: true },
          orderBy: { scanId: 'desc' },
          take: 20
        })
        return NextResponse.json({
          success: true,
          scans: scans.map(s => ({ scanId: s.scanId, flowCount: s._count.id }))
        })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Flow Map API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, scanId } = body

  try {
    switch (action) {
      case 'generate':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        const flowMap = await flowMapService.generateFlowMap(scanId)
        return NextResponse.json({
          success: true,
          flowMap,
          message: `Generated ${flowMap.nodes.length} nodes and ${flowMap.edges.length} edges`
        })

      case 'update-node':
        const { nodeId, position } = body
        if (!nodeId || !position) {
          return NextResponse.json({ success: false, error: 'nodeId and position required' }, { status: 400 })
        }
        await prisma.flowNode.update({
          where: { id: nodeId },
          data: { positionX: position.x, positionY: position.y }
        })
        return NextResponse.json({ success: true })

      case 'delete':
        if (!scanId) {
          return NextResponse.json({ success: false, error: 'scanId required' }, { status: 400 })
        }
        await prisma.dataFlow.deleteMany({ where: { scanId } })
        await prisma.flowNode.deleteMany({ where: { scanId } })
        return NextResponse.json({ success: true, message: 'Flow map deleted' })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Flow Map POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
