/**
 * Formatting API Routes
 * TASK-4.6: Code Formatting
 */

import { NextRequest, NextResponse } from 'next/server'
import { codeFormatter, formatCode, formatTypeScript, formatJSON, formatPrisma, formatSQL } from '@/lib/formatting/code-formatter'

// GET /api/formatting
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')

  if (action === 'languages') {
    return NextResponse.json({
      success: true,
      data: codeFormatter.getSupportedLanguages()
    })
  }

  return NextResponse.json({
    error: 'Invalid action',
    availableActions: ['languages']
  }, { status: 400 })
}

// POST /api/formatting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, code, language, options } = body

    switch (action) {
      case 'format':
        if (!code || !language) {
          return NextResponse.json({
            error: 'Missing code or language'
          }, { status: 400 })
        }
        const result = await formatCode(code, language)
        return NextResponse.json({
          success: true,
          data: result
        })

      case 'format-typescript':
        if (!code) {
          return NextResponse.json({
            error: 'Missing code'
          }, { status: 400 })
        }
        const tsResult = await formatTypeScript(code)
        return NextResponse.json({
          success: true,
          data: tsResult
        })

      case 'format-json':
        if (!code) {
          return NextResponse.json({
            error: 'Missing code'
          }, { status: 400 })
        }
        const jsonResult = await formatJSON(code)
        return NextResponse.json({
          success: true,
          data: jsonResult
        })

      case 'format-prisma':
        if (!code) {
          return NextResponse.json({
            error: 'Missing code'
          }, { status: 400 })
        }
        const prismaResult = await formatPrisma(code)
        return NextResponse.json({
          success: true,
          data: prismaResult
        })

      case 'format-sql':
        if (!code) {
          return NextResponse.json({
            error: 'Missing code'
          }, { status: 400 })
        }
        const sqlResult = await formatSQL(code)
        return NextResponse.json({
          success: true,
          data: sqlResult
        })

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['format', 'format-typescript', 'format-json', 'format-prisma', 'format-sql']
        }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({
      error: 'Formatting failed',
      message: error.message
    }, { status: 500 })
  }
}
