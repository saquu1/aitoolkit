import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DOWNLOAD_DIR = path.join(process.cwd(), 'download')

export async function GET(request: NextRequest) {
  const files = fs.readdirSync(DOWNLOAD_DIR)
  return NextResponse.json({ files })
}
