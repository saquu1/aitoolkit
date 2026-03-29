// =============================================================================
// FTP Web Manager API
// =============================================================================
// Complete FTP file management with copy, paste, move, upload, download, zip
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import * as ftp from 'basic-ftp';
import { Readable, PassThrough } from 'stream';
import archiver from 'archiver';
import AdmZip from 'adm-zip';

// Connection pool for FTP sessions
const connectionPool = new Map<string, ftp.Client>();

// Connection configuration interface
interface FTPConnection {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  rootPath: string;
}

// Store active connections (in-memory for demo, use Redis in production)
const activeConnections = new Map<string, FTPConnection>();

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

async function getClient(connectionId: string): Promise<ftp.Client> {
  const config = activeConnections.get(connectionId);
  if (!config) {
    throw new Error('Connection not found. Please reconnect.');
  }

  let client = connectionPool.get(connectionId);
  
  if (!client || !client.closed) {
    client = new ftp.Client();
    client.ftp.verbose = false;
    
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure: config.secure,
    });
    
    connectionPool.set(connectionId, client);
  }
  
  return client;
}

function formatListing(listing: ftp.FileInfo[]): any[] {
  return listing.map(item => ({
    name: item.name,
    type: item.type === 1 ? 'directory' : 'file',
    size: item.size,
    modifiedAt: item.modifiedAt?.toISOString() || null,
    permissions: item.permissions,
    owner: item.owner,
    group: item.group,
    isDirectory: item.type === 1,
    isFile: item.type === 0,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// GET HANDLER - List files, download files, get info
// ══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const connectionId = searchParams.get('connectionId');

  try {
    switch (action) {
      case 'list':
        return await handleList(searchParams);
      
      case 'download':
        return await handleDownload(searchParams);
      
      case 'download-multiple':
        return await handleDownloadMultiple(searchParams);
      
      case 'get-info':
        return await handleGetInfo(searchParams);
      
      case 'search':
        return await handleSearch(searchParams);
      
      case 'connections':
        return await handleGetConnections(searchParams);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('FTP Manager GET error:', error);
    return NextResponse.json(
      { error: error.message || 'FTP operation failed' },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST HANDLER - Connect, Create, Upload, Copy, Move, Zip
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'connect':
        return await handleConnect(body);
      
      case 'disconnect':
        return await handleDisconnect(body);
      
      case 'create-folder':
        return await handleCreateFolder(body);
      
      case 'create-file':
        return await handleCreateFile(body);
      
      case 'upload':
        return await handleUpload(body);
      
      case 'upload-multiple':
        return await handleUploadMultiple(body);
      
      case 'copy':
        return await handleCopy(body);
      
      case 'move':
        return await handleMove(body);
      
      case 'rename':
        return await handleRename(body);
      
      case 'delete':
        return await handleDelete(body);
      
      case 'chmod':
        return await handleChmod(body);
      
      case 'extract-zip':
        return await handleExtractZip(body);
      
      case 'create-zip':
        return await handleCreateZip(body);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('FTP Manager POST error:', error);
    return NextResponse.json(
      { error: error.message || 'FTP operation failed' },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTION HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function handleConnect(body: any) {
  const { host, port = 21, username, password, secure = false, rootPath = '/' } = body;

  if (!host || !username) {
    return NextResponse.json(
      { error: 'Host and username are required' },
      { status: 400 }
    );
  }

  const connectionId = `${host}:${port}:${username}:${Date.now()}`;
  
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host,
      port,
      user: username,
      password: password || '',
      secure,
    });

    // Store connection info
    activeConnections.set(connectionId, {
      id: connectionId,
      host,
      port,
      username,
      password,
      secure,
      rootPath,
    });
    
    connectionPool.set(connectionId, client);

    // Get initial directory listing
    await client.ensureDir(rootPath);
    const listing = await client.list();

    return NextResponse.json({
      success: true,
      connectionId,
      rootPath,
      currentPath: rootPath,
      items: formatListing(listing),
      message: `Connected to ${host}:${port}`,
    });
  } catch (error: any) {
    client.close();
    return NextResponse.json(
      { error: `Connection failed: ${error.message}` },
      { status: 400 }
    );
  }
}

async function handleDisconnect(body: any) {
  const { connectionId } = body;

  const client = connectionPool.get(connectionId);
  if (client) {
    client.close();
    connectionPool.delete(connectionId);
  }
  
  activeConnections.delete(connectionId);

  return NextResponse.json({
    success: true,
    message: 'Disconnected successfully',
  });
}

async function handleGetConnections(searchParams: URLSearchParams) {
  const connections = Array.from(activeConnections.values()).map(conn => ({
    id: conn.id,
    host: conn.host,
    port: conn.port,
    username: conn.username,
    secure: conn.secure,
    rootPath: conn.rootPath,
  }));

  return NextResponse.json({
    connections,
    count: connections.length,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// LISTING HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function handleList(searchParams: URLSearchParams) {
  const connectionId = searchParams.get('connectionId');
  const path = searchParams.get('path') || '/';

  if (!connectionId) {
    return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
  }

  const client = await getClient(connectionId);
  
  try {
    await client.ensureDir(path);
    const listing = await client.list();

    // Get current working directory
    const currentPath = client.pwd();

    return NextResponse.json({
      success: true,
      path,
      currentPath,
      items: formatListing(listing),
      totalItems: listing.length,
      directories: listing.filter(i => i.type === 1).length,
      files: listing.filter(i => i.type === 0).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to list directory: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleGetInfo(searchParams: URLSearchParams) {
  const connectionId = searchParams.get('connectionId');
  const path = searchParams.get('path');

  if (!connectionId || !path) {
    return NextResponse.json({ error: 'Connection ID and path required' }, { status: 400 });
  }

  const client = await getClient(connectionId);

  try {
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    
    await client.ensureDir(parentPath);
    const listing = await client.list();
    const item = listing.find(i => i.name === fileName);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: {
        name: item.name,
        type: item.type === 1 ? 'directory' : 'file',
        size: item.size,
        modifiedAt: item.modifiedAt?.toISOString() || null,
        permissions: item.permissions,
        owner: item.owner,
        group: item.group,
        path,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to get info: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleSearch(searchParams: URLSearchParams) {
  const connectionId = searchParams.get('connectionId');
  const query = searchParams.get('query') || '';
  const path = searchParams.get('path') || '/';

  if (!connectionId) {
    return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
  }

  const client = await getClient(connectionId);
  const results: any[] = [];

  async function searchDirectory(dirPath: string, depth: number = 0): Promise<void> {
    if (depth > 10) return; // Limit depth
    
    try {
      await client.ensureDir(dirPath);
      const listing = await client.list();

      for (const item of listing) {
        const itemPath = dirPath === '/' ? `/${item.name}` : `${dirPath}/${item.name}`;
        
        if (item.name.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            name: item.name,
            path: itemPath,
            type: item.type === 1 ? 'directory' : 'file',
            size: item.size,
          });
        }

        if (item.type === 1 && depth < 10) {
          await searchDirectory(itemPath, depth + 1);
        }
      }
    } catch (e) {
      // Skip directories we can't access
    }
  }

  try {
    await searchDirectory(path);
    
    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Search failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function handleCreateFolder(body: any) {
  const { connectionId, path, name } = body;

  if (!connectionId || !path || !name) {
    return NextResponse.json(
      { error: 'Connection ID, path, and name are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    const folderPath = path === '/' ? `/${name}` : `${path}/${name}`;
    await client.ensureDir(folderPath);
    
    return NextResponse.json({
      success: true,
      message: 'Folder created successfully',
      path: folderPath,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to create folder: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleCreateFile(body: any) {
  const { connectionId, path, name, content = '' } = body;

  if (!connectionId || !path || !name) {
    return NextResponse.json(
      { error: 'Connection ID, path, and name are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    const filePath = path === '/' ? `/${name}` : `${path}/${name}`;
    const stream = Readable.from([content]);
    
    await client.uploadFrom(stream, filePath);

    return NextResponse.json({
      success: true,
      message: 'File created successfully',
      path: filePath,
      size: Buffer.byteLength(content, 'utf8'),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to create file: ${error.message}` },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// UPLOAD HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function handleUpload(body: any) {
  const { connectionId, path, fileName, content, encoding = 'utf-8' } = body;

  if (!connectionId || !path || !fileName || !content) {
    return NextResponse.json(
      { error: 'Connection ID, path, fileName, and content are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    const filePath = path === '/' ? `/${fileName}` : `${path}/${fileName}`;
    
    // Handle base64 encoded content
    let fileContent = content;
    if (encoding === 'base64') {
      fileContent = Buffer.from(content, 'base64');
    }
    
    const stream = Readable.from([fileContent]);
    await client.uploadFrom(stream, filePath);

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      path: filePath,
      fileName,
      size: typeof fileContent === 'string' ? Buffer.byteLength(fileContent, 'utf-8') : fileContent.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to upload file: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleUploadMultiple(body: any) {
  const { connectionId, path, files } = body;

  if (!connectionId || !path || !files || !Array.isArray(files)) {
    return NextResponse.json(
      { error: 'Connection ID, path, and files array are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);
  const results: any[] = [];

  for (const file of files) {
    try {
      const filePath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
      const content = file.encoding === 'base64' 
        ? Buffer.from(file.content, 'base64')
        : file.content;
      
      const stream = Readable.from([content]);
      await client.uploadFrom(stream, filePath);

      results.push({
        name: file.name,
        success: true,
        path: filePath,
      });
    } catch (error: any) {
      results.push({
        name: file.name,
        success: false,
        error: error.message,
      });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return NextResponse.json({
    success: true,
    message: `${successCount}/${files.length} files uploaded`,
    results,
    successCount,
    failedCount: files.length - successCount,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// DOWNLOAD HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function handleDownload(searchParams: URLSearchParams) {
  const connectionId = searchParams.get('connectionId');
  const path = searchParams.get('path');

  if (!connectionId || !path) {
    return NextResponse.json(
      { error: 'Connection ID and path are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    const chunks: Buffer[] = [];
    const passThrough = new PassThrough();
    
    passThrough.on('data', (chunk) => chunks.push(chunk));
    
    await client.downloadTo(passThrough, path);
    
    const content = Buffer.concat(chunks);
    const fileName = path.substring(path.lastIndexOf('/') + 1);

    return NextResponse.json({
      success: true,
      fileName,
      path,
      content: content.toString('base64'),
      encoding: 'base64',
      size: content.length,
      mimeType: getMimeType(fileName),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to download file: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleDownloadMultiple(searchParams: URLSearchParams) {
  const connectionId = searchParams.get('connectionId');
  const paths = searchParams.get('paths')?.split(',') || [];

  if (!connectionId || paths.length === 0) {
    return NextResponse.json(
      { error: 'Connection ID and paths are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);
  
  try {
    // Create a zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    
    archive.on('data', (chunk) => chunks.push(chunk));

    for (const path of paths) {
      try {
        const fileName = path.substring(path.lastIndexOf('/') + 1);
        const passThrough = new PassThrough();
        const fileChunks: Buffer[] = [];
        
        passThrough.on('data', (chunk) => fileChunks.push(chunk));
        await client.downloadTo(passThrough, path);
        
        const content = Buffer.concat(fileChunks);
        archive.append(content, { name: fileName });
      } catch (e) {
        console.error(`Failed to add ${path} to zip:`, e);
      }
    }

    await archive.finalize();
    const zipContent = Buffer.concat(chunks);

    return NextResponse.json({
      success: true,
      content: zipContent.toString('base64'),
      encoding: 'base64',
      size: zipContent.length,
      fileName: `ftp_download_${Date.now()}.zip`,
      fileCount: paths.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to create zip: ${error.message}` },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FILE OPERATIONS (COPY, MOVE, RENAME, DELETE)
// ══════════════════════════════════════════════════════════════════════════════

async function handleCopy(body: any) {
  const { connectionId, sourcePath, targetPath, newName } = body;

  if (!connectionId || !sourcePath || !targetPath) {
    return NextResponse.json(
      { error: 'Connection ID, sourcePath, and targetPath are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    // FTP doesn't have a native copy command, so we need to download and re-upload
    const fileName = newName || sourcePath.substring(sourcePath.lastIndexOf('/') + 1);
    const destPath = targetPath === '/' ? `/${fileName}` : `${targetPath}/${fileName}`;
    
    // Download to memory
    const chunks: Buffer[] = [];
    const passThrough = new PassThrough();
    passThrough.on('data', (chunk) => chunks.push(chunk));
    await client.downloadTo(passThrough, sourcePath);
    const content = Buffer.concat(chunks);
    
    // Upload to destination
    const uploadStream = Readable.from([content]);
    await client.uploadFrom(uploadStream, destPath);

    return NextResponse.json({
      success: true,
      message: 'File copied successfully',
      sourcePath,
      targetPath: destPath,
      size: content.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to copy: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleMove(body: any) {
  const { connectionId, sourcePath, targetPath, newName } = body;

  if (!connectionId || !sourcePath || !targetPath) {
    return NextResponse.json(
      { error: 'Connection ID, sourcePath, and targetPath are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    const fileName = newName || sourcePath.substring(sourcePath.lastIndexOf('/') + 1);
    const destPath = targetPath === '/' ? `/${fileName}` : `${targetPath}/${fileName}`;
    
    await client.rename(sourcePath, destPath);

    return NextResponse.json({
      success: true,
      message: 'File moved successfully',
      sourcePath,
      targetPath: destPath,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to move: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleRename(body: any) {
  const { connectionId, path, newName } = body;

  if (!connectionId || !path || !newName) {
    return NextResponse.json(
      { error: 'Connection ID, path, and newName are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
    
    await client.rename(path, newPath);

    return NextResponse.json({
      success: true,
      message: 'Renamed successfully',
      oldPath: path,
      newPath,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to rename: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleDelete(body: any) {
  const { connectionId, paths } = body;

  if (!connectionId || !paths || !Array.isArray(paths)) {
    return NextResponse.json(
      { error: 'Connection ID and paths array are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);
  const results: any[] = [];

  for (const path of paths) {
    try {
      // Check if it's a file or directory
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      const itemName = path.substring(path.lastIndexOf('/') + 1);
      
      await client.ensureDir(parentPath);
      const listing = await client.list();
      const item = listing.find(i => i.name === itemName);

      if (!item) {
        results.push({ path, success: false, error: 'Not found' });
        continue;
      }

      if (item.type === 1) {
        // Directory - need to remove recursively
        await client.removeDir(path);
      } else {
        // File
        await client.remove(path);
      }

      results.push({ path, success: true });
    } catch (error: any) {
      results.push({ path, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return NextResponse.json({
    success: true,
    message: `${successCount}/${paths.length} items deleted`,
    results,
    successCount,
    failedCount: paths.length - successCount,
  });
}

async function handleChmod(body: any) {
  const { connectionId, path, permissions } = body;

  if (!connectionId || !path || !permissions) {
    return NextResponse.json(
      { error: 'Connection ID, path, and permissions are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    await client.send(`SITE CHMOD ${permissions} ${path}`, true);

    return NextResponse.json({
      success: true,
      message: 'Permissions changed successfully',
      path,
      permissions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to change permissions: ${error.message}` },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ZIP HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function handleCreateZip(body: any) {
  const { connectionId, paths, zipName, targetPath } = body;

  if (!connectionId || !paths || !Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json(
      { error: 'Connection ID and paths array are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    // Create zip in memory
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    
    archive.on('data', (chunk) => chunks.push(chunk));

    for (const path of paths) {
      try {
        const fileName = path.substring(path.lastIndexOf('/') + 1);
        
        // Check if it's a file
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        await client.ensureDir(parentPath);
        const listing = await client.list();
        const item = listing.find(i => i.name === fileName);

        if (item && item.type === 0) {
          // It's a file - download and add to zip
          const passThrough = new PassThrough();
          const fileChunks: Buffer[] = [];
          passThrough.on('data', (chunk) => fileChunks.push(chunk));
          await client.downloadTo(passThrough, path);
          
          const content = Buffer.concat(fileChunks);
          archive.append(content, { name: fileName });
        }
      } catch (e) {
        console.error(`Failed to add ${path} to zip:`, e);
      }
    }

    await archive.finalize();
    const zipContent = Buffer.concat(chunks);

    // Upload the zip file
    const finalZipName = zipName || `archive_${Date.now()}.zip`;
    const destPath = targetPath === '/' ? `/${finalZipName}` : `${targetPath}/${finalZipName}`;
    
    const uploadStream = Readable.from([zipContent]);
    await client.uploadFrom(uploadStream, destPath);

    return NextResponse.json({
      success: true,
      message: 'Zip file created and uploaded successfully',
      path: destPath,
      size: zipContent.length,
      fileCount: paths.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to create zip: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleExtractZip(body: any) {
  const { connectionId, zipPath, targetPath } = body;

  if (!connectionId || !zipPath || !targetPath) {
    return NextResponse.json(
      { error: 'Connection ID, zipPath, and targetPath are required' },
      { status: 400 }
    );
  }

  const client = await getClient(connectionId);

  try {
    // Download the zip file
    const chunks: Buffer[] = [];
    const passThrough = new PassThrough();
    passThrough.on('data', (chunk) => chunks.push(chunk));
    await client.downloadTo(passThrough, zipPath);
    const zipContent = Buffer.concat(chunks);

    // Extract using AdmZip
    const zip = new AdmZip(zipContent);
    const entries = zip.getEntries();

    let extractedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory) {
        const content = entry.getData();
        const filePath = targetPath === '/' ? `/${entry.entryName}` : `${targetPath}/${entry.entryName}`;
        
        // Create directories if needed
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        if (dirPath) {
          try {
            await client.ensureDir(dirPath);
          } catch (e) {
            // Directory might already exist
          }
        }
        
        // Upload the extracted file
        const uploadStream = Readable.from([content]);
        await client.uploadFrom(uploadStream, filePath);
        extractedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Extracted ${extractedCount} files successfully`,
      zipPath,
      targetPath,
      extractedCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to extract zip: ${error.message}` },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER: MIME TYPE DETECTION
// ══════════════════════════════════════════════════════════════════════════════

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    'sql': 'application/sql',
    'cs': 'text/x-csharp',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'jsx': 'application/javascript',
    'md': 'text/markdown',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}
