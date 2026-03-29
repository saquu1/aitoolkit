import { NextRequest, NextResponse } from 'next/server';
import { FileManager, RAW_FILE_TYPES, PROCESSED_TYPES } from '@/lib/file-manager';

const fileManager = new FileManager();

/**
 * GET /api/file-manager
 * List files or get project structure
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const projectId = searchParams.get('projectId');

    switch (action) {
      case 'structure':
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }
        const structure = await fileManager.listProjectFiles(projectId);
        return NextResponse.json({ structure });

      case 'stats':
        const stats = await fileManager.getStorageStats(projectId || undefined);
        return NextResponse.json({ stats });

      case 'read':
        const category = searchParams.get('category') as 'raw' | 'processed';
        const subType = searchParams.get('subType');
        const fileName = searchParams.get('fileName');
        
        if (!projectId || !fileName || !category || !subType) {
          return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        if (category === 'raw') {
          const content = await fileManager.readRawFile(projectId, fileName, subType as keyof typeof RAW_FILE_TYPES);
          return NextResponse.json({ content });
        } else if (category === 'processed') {
          const content = await fileManager.readProcessedFile(projectId, fileName, subType as keyof typeof PROCESSED_TYPES);
          return NextResponse.json({ content });
        }

      default:
        return NextResponse.json({
          message: 'File Manager API',
          endpoints: {
            'GET ?action=structure&projectId={id}': 'Get project file structure',
            'GET ?action=stats[&projectId={id}]': 'Get storage statistics',
            'GET ?action=read&projectId={id}&category={raw|processed}&subType={type}&fileName={name}': 'Read a file',
            'POST ?action=init&projectId={id}': 'Initialize project storage',
            'POST ?action=save-raw': 'Save raw uploaded file',
            'POST ?action=save-processed': 'Save processed result',
            'POST ?action=save-generated': 'Save generated code',
            'POST ?action=export': 'Create export package',
            'DELETE ?projectId={id}': 'Archive project files'
          }
        });
    }
  } catch (error) {
    console.error('File Manager Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/file-manager
 * Save files or create exports
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    switch (action) {
      case 'init':
        const initProjectId = searchParams.get('projectId') || body.projectId;
        if (!initProjectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }
        await fileManager.initializeProject(initProjectId);
        return NextResponse.json({ success: true, message: `Project ${initProjectId} initialized` });

      case 'save-raw':
        const { projectId: rawProjectId, fileName, content, fileType } = body;
        if (!rawProjectId || !fileName || !content) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const rawMetadata = await fileManager.saveRawFile(
          rawProjectId,
          fileName,
          content,
          fileType || 'SQL'
        );
        return NextResponse.json({ success: true, metadata: rawMetadata });

      case 'save-processed':
        const { projectId: procProjectId, fileName: procFileName, content: procContent, processedType } = body;
        if (!procProjectId || !procFileName || !procContent) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const procPath = await fileManager.saveProcessedFile(
          procProjectId,
          procFileName,
          procContent,
          processedType || 'PARSED'
        );
        return NextResponse.json({ success: true, path: procPath });

      case 'save-generated':
        const { projectId: genProjectId, fileName: genFileName, content: genContent, generatedType, subPath } = body;
        if (!genProjectId || !genFileName || !genContent) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const genPath = await fileManager.saveGeneratedFile(
          genProjectId,
          genFileName,
          genContent,
          generatedType || 'PAGES',
          subPath
        );
        return NextResponse.json({ success: true, path: genPath });

      case 'export':
        const { projectId: exportProjectId, files, exportName } = body;
        if (!exportProjectId || !files || !Array.isArray(files)) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const exportPath = await fileManager.createExport(exportProjectId, files, exportName);
        return NextResponse.json({ success: true, exportPath });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('File Manager Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/file-manager
 * Archive project files
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const reason = searchParams.get('reason') || 'deleted';

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const archivePath = await fileManager.archiveProject(projectId, reason);
    return NextResponse.json({ 
      success: true, 
      message: `Project ${projectId} archived`,
      archivePath 
    });
  } catch (error) {
    console.error('File Manager Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
