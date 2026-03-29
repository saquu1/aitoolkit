import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'




// =============================================================================
// GET /api/ai-suggestions/[id] - Get single suggestion details
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const suggestion = await prisma.aISuggestion.findUnique({
      where: { id },
      include: {
        session: {
          select: {
            id: true,
            projectId: true,
            scope: true,
            status: true,
            createdAt: true
          }
        }
      }
    })

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields for convenience
    const parsed = {
      ...suggestion,
      currentValue: JSON.parse(suggestion.currentValue || '{}'),
      suggestedValue: JSON.parse(suggestion.suggestedValue || '{}'),
      aiEvidence: JSON.parse(suggestion.aiEvidence || '[]'),
      modifiedValue: suggestion.modifiedValue ? JSON.parse(suggestion.modifiedValue) : null,
      previousValue: suggestion.previousValue ? JSON.parse(suggestion.previousValue) : null
    }

    return NextResponse.json({ suggestion: parsed })

  } catch (error: any) {
    console.error('Error fetching suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestion', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT /api/ai-suggestions/[id] - Update suggestion (approve/reject/edit)
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      action, 
      modifiedValue, 
      rejectReason,
      decisionBy 
    } = body

    // Get current suggestion
    const current = await prisma.aISuggestion.findUnique({
      where: { id }
    })

    if (!current) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      )
    }

    if (current.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot modify suggestion with status: ${current.status}` },
        { status: 400 }
      )
    }

    let updateData: any = {
      decisionBy,
      decisionAt: new Date()
    }

    switch (action) {
      case 'approve':
        updateData.status = 'approved'
        break

      case 'modify_approve':
        if (!modifiedValue) {
          return NextResponse.json(
            { error: 'modifiedValue is required for modify_approve action' },
            { status: 400 }
          )
        }
        updateData.status = 'approved'
        updateData.modifiedValue = JSON.stringify(modifiedValue)
        break

      case 'reject':
        updateData.status = 'rejected'
        updateData.rejectReason = rejectReason
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: approve, modify_approve, or reject' },
          { status: 400 }
        )
    }

    const updated = await prisma.aISuggestion.update({
      where: { id },
      data: updateData
    })

    // Update session counts
    await updateSessionCounts(updated.sessionId)

    // Log decision for learning
    await prisma.aIDecisionLog.create({
      data: {
        projectId: (await prisma.aISuggestionSession.findUnique({
          where: { id: updated.sessionId }
        }))?.projectId || '',
        sessionId: updated.sessionId,
        suggestionId: updated.id,
        targetType: updated.targetType,
        targetEntity: updated.targetEntity,
        targetField: updated.targetField,
        aiSuggested: updated.suggestedValue,
        aiConfidence: updated.aiConfidence,
        humanAction: action === 'reject' ? 'rejected' : 
                     action === 'modify_approve' ? 'modified' : 'approved',
        humanValue: updateData.modifiedValue || updated.suggestedValue,
        editDelta: updateData.modifiedValue ? 
          JSON.stringify(calculateDelta(
            JSON.parse(updated.suggestedValue),
            modifiedValue
          )) : null
      }
    })

    return NextResponse.json({ 
      success: true, 
      suggestion: updated,
      message: `Suggestion ${action}d successfully`
    })

  } catch (error: any) {
    console.error('Error updating suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to update suggestion', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/ai-suggestions/[id] - Apply or Revert suggestion
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, appliedBy } = body

    const suggestion = await prisma.aISuggestion.findUnique({
      where: { id },
      include: {
        session: {
          select: { projectId: true }
        }
      }
    })

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      )
    }

    if (action === 'apply') {
      if (suggestion.status !== 'approved') {
        return NextResponse.json(
          { error: 'Only approved suggestions can be applied' },
          { status: 400 }
        )
      }

      // Store previous value for revert
      const previousValue = suggestion.currentValue
      const projectId = suggestion.session.projectId

      // Apply the suggestion to the actual schema
      const applyResult = await applySuggestionToSchema(
        projectId,
        suggestion.targetType,
        suggestion.targetEntity,
        suggestion.targetField,
        suggestion.suggestedValue,
        suggestion.currentValue
      )

      if (!applyResult.success) {
        return NextResponse.json(
          { error: 'Failed to apply suggestion to schema', details: applyResult.error },
          { status: 500 }
        )
      }

      // Update suggestion status
      const updated = await prisma.aISuggestion.update({
        where: { id },
        data: {
          status: 'applied',
          appliedAt: new Date(),
          appliedBy,
          previousValue
        }
      })

      await updateSessionCounts(updated.sessionId)

      return NextResponse.json({
        success: true,
        suggestion: updated,
        applyDetails: applyResult,
        message: 'Suggestion applied to schema'
      })
    }

    if (action === 'revert') {
      if (suggestion.status !== 'applied') {
        return NextResponse.json(
          { error: 'Only applied suggestions can be reverted' },
          { status: 400 }
        )
      }

      const projectId = suggestion.session.projectId
      const previousValue = JSON.parse(suggestion.previousValue || '{}')

      // Revert the suggestion in the actual schema
      const revertResult = await applySuggestionToSchema(
        projectId,
        suggestion.targetType,
        suggestion.targetEntity,
        suggestion.targetField,
        JSON.stringify(previousValue),
        suggestion.currentValue
      )

      if (!revertResult.success) {
        return NextResponse.json(
          { error: 'Failed to revert suggestion in schema', details: revertResult.error },
          { status: 500 }
        )
      }

      const updated = await prisma.aISuggestion.update({
        where: { id },
        data: {
          status: 'reverted',
          revertedAt: new Date(),
          revertedBy: appliedBy
        }
      })

      await updateSessionCounts(updated.sessionId)

      return NextResponse.json({
        success: true,
        suggestion: updated,
        revertDetails: revertResult,
        message: 'Suggestion reverted. Schema restored to previous state.'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: apply or revert' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Error applying/reverting suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to apply/revert suggestion', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function updateSessionCounts(sessionId: string) {
  const counts = await prisma.aISuggestion.groupBy({
    by: ['status'],
    where: { sessionId },
    _count: true
  })

  const countMap = Object.fromEntries(
    counts.map(c => [c.status, c._count])
  )

  await prisma.aISuggestionSession.update({
    where: { id: sessionId },
    data: {
      pendingCount: countMap['pending'] || 0,
      approvedCount: countMap['approved'] || 0,
      rejectedCount: countMap['rejected'] || 0,
      appliedCount: countMap['applied'] || 0,
      revertedCount: countMap['reverted'] || 0
    }
  })
}

function calculateDelta(original: any, modified: any): any {
  const delta: any = {}
  
  for (const key of new Set([...Object.keys(original || {}), ...Object.keys(modified || {})])) {
    if (original[key] !== modified[key]) {
      delta[key] = {
        from: original[key],
        to: modified[key]
      }
    }
  }
  
  return delta
}

// =============================================================================
// Schema Apply Functions - Update ToolkitTable with AI suggestions
// =============================================================================

interface ApplyResult {
  success: boolean
  error?: string
  details?: any
  targetType?: string
  targetEntity?: string
  targetField?: string
  changes?: any
}

async function applySuggestionToSchema(
  projectId: string,
  targetType: string,
  targetEntity: string,
  targetField: string | null,
  suggestedValueJson: string,
  currentValueJson: string
): Promise<ApplyResult> {
  try {
    const suggestedValue = JSON.parse(suggestedValueJson)
    const currentValue = JSON.parse(currentValueJson)

    // Find the table
    const table = await prisma.toolkitTable.findFirst({
      where: {
        projectId,
        tableName: targetEntity
      }
    })

    if (!table) {
      return {
        success: false,
        error: `Table ${targetEntity} not found in project ${projectId}`
      }
    }

    // Get current columns
    const columns = JSON.parse(table.columns || '[]')
    const foreignKeys = JSON.parse(table.foreignKeys || '[]')
    const constraints = JSON.parse(table.constraints || '[]')

    let changes: any = {}
    let updated = false

    switch (targetType) {
      case 'column_type':
        // Update column SQL type
        const colIndex = columns.findIndex((c: any) => c.name === targetField)
        if (colIndex >= 0) {
          changes = {
            field: targetField,
            previousType: columns[colIndex].sqlType,
            newType: suggestedValue.sqlType
          }
          columns[colIndex].sqlType = suggestedValue.sqlType
          columns[colIndex].typeSource = 'ai_suggested'
          columns[colIndex].aiConfidence = suggestedValue.confidence
          updated = true
        }
        break

      case 'column_constraint':
        // Update column constraints (nullable, default, etc.)
        const constraintColIndex = columns.findIndex((c: any) => c.name === targetField)
        if (constraintColIndex >= 0) {
          changes = {
            field: targetField,
            previousConstraints: { ...columns[constraintColIndex] },
            newConstraints: suggestedValue
          }
          
          if (suggestedValue.isNullable !== undefined) {
            columns[constraintColIndex].isNullable = suggestedValue.isNullable
          }
          if (suggestedValue.defaultValue !== undefined) {
            columns[constraintColIndex].defaultValue = suggestedValue.defaultValue
          }
          if (suggestedValue.isUnique !== undefined) {
            columns[constraintColIndex].isUnique = suggestedValue.isUnique
          }
          updated = true
        }
        break

      case 'relationship':
        // Add or update foreign key relationship
        if (suggestedValue.isFK && suggestedValue.fkTable) {
          const existingFK = foreignKeys.find((fk: any) => fk.column === targetField)
          
          if (!existingFK) {
            // Add new FK
            foreignKeys.push({
              column: targetField,
              referencedTable: suggestedValue.fkTable,
              referencedColumn: suggestedValue.fkColumn || 'Id',
              constraintName: `FK_${targetEntity}_${targetField}`,
              isInferred: true,
              confidence: suggestedValue.confidence
            })
            changes = {
              action: 'added_fk',
              column: targetField,
              referencedTable: suggestedValue.fkTable
            }
          } else {
            // Update existing FK
            existingFK.referencedTable = suggestedValue.fkTable
            existingFK.confidence = suggestedValue.confidence
            existingFK.isInferred = false
            changes = {
              action: 'updated_fk',
              column: targetField,
              referencedTable: suggestedValue.fkTable
            }
          }
          updated = true
        }
        break

      case 'enum_detection':
        // Mark field as enum type with values
        const enumColIndex = columns.findIndex((c: any) => c.name === targetField)
        if (enumColIndex >= 0) {
          changes = {
            field: targetField,
            previousType: columns[enumColIndex].sqlType,
            newType: 'ENUM',
            enumValues: suggestedValue.values
          }
          columns[enumColIndex].sqlType = 'NVARCHAR(50)' // Store as string, but mark as enum
          columns[enumColIndex].isEnum = true
          columns[enumColIndex].enumValues = suggestedValue.values
          columns[enumColIndex].enumName = suggestedValue.enumName
          updated = true
        }
        break

      case 'cascade_chain':
        // Update cascade relationship chain
        if (suggestedValue.chain) {
          changes = {
            action: 'cascade_chain_detected',
            chain: suggestedValue.chain
          }
          // Store cascade metadata on affected columns
          for (const chainItem of suggestedValue.chain) {
            const chainColIndex = columns.findIndex((c: any) => c.name === chainItem.column)
            if (chainColIndex >= 0) {
              columns[chainColIndex].cascadePosition = chainItem.position
              columns[chainColIndex].cascadeChain = suggestedValue.chain.map((c: any) => c.table)
            }
          }
          updated = true
        }
        break

      default:
        return {
          success: false,
          error: `Unknown target type: ${targetType}`
        }
    }

    if (updated) {
      // Save changes to database
      await prisma.toolkitTable.update({
        where: { id: table.id },
        data: {
          columns: JSON.stringify(columns),
          foreignKeys: JSON.stringify(foreignKeys),
          constraints: JSON.stringify(constraints),
          updatedAt: new Date()
        }
      })

      // Update pattern insights for learning
      await updatePatternInsights(projectId, targetType, targetEntity, targetField, suggestedValue, currentValue)
    }

    return {
      success: true,
      targetType,
      targetEntity,
      targetField,
      changes,
      details: {
        tableId: table.id,
        tableName: table.tableName,
        columnsUpdated: columns.length
      }
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function updatePatternInsights(
  projectId: string,
  targetType: string,
  targetEntity: string,
  targetField: string | null,
  suggestedValue: any,
  currentValue: any
) {
  try {
    // Create or update pattern insight for learning
    const patternKey = `${targetType}:${targetField || targetEntity}`
    
    // Check if insight already exists
    const existing = await prisma.aIPatternInsight.findFirst({
      where: {
        projectId,
        patternType: targetType,
        patternKey
      }
    })

    if (existing) {
      // Update occurrence count
      await prisma.aIPatternInsight.update({
        where: { id: existing.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: new Date(),
          confidence: Math.min(100, existing.confidence + 5), // Increase confidence with usage
          examples: JSON.stringify([
            ...JSON.parse(existing.examples || '[]').slice(-9),
            { targetEntity, targetField, suggestedValue, currentValue, timestamp: new Date() }
          ])
        }
      })
    } else {
      // Create new insight
      await prisma.aIPatternInsight.create({
        data: {
          projectId,
          patternType: targetType,
          patternKey,
          patternName: `${targetField || targetEntity} ${targetType} pattern`,
          description: `AI-detected ${targetType} pattern for ${targetField || targetEntity}`,
          confidence: suggestedValue.confidence || 75,
          occurrenceCount: 1,
          examples: JSON.stringify([{ targetEntity, targetField, suggestedValue, currentValue, timestamp: new Date() }]),
          suggestedAction: 'apply_similar'
        }
      })
    }
  } catch (error) {
    console.error('Failed to update pattern insights:', error)
    // Non-blocking error
  }
}
