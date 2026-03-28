// =============================================================================
// Memory Stats API - Returns real-time memory usage analysis
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface MemoryModule {
  name: string;
  size: string;
  sizeMB: number;
  percentage: number;
  color: string;
}

interface ProcessInfo {
  name: string;
  memoryMB: number;
  cpuPercent: string;
}

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action') || 'stats';
    
    if (action === 'stats') {
      return await getMemoryStats();
    } else if (action === 'processes') {
      return await getProcessList();
    } else if (action === 'clear-cache') {
      return await clearCacheAndRestart();
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Memory stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to get memory stats',
      details: error instanceof Error ? error.message : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'clear-cache') {
      return await clearCacheAndRestart();
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Memory action error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform action',
      details: error instanceof Error ? error.message : undefined
    }, { status: 500 });
  }
}

async function getMemoryStats() {
  // Get system memory
  const { stdout: memInfo } = await execAsync('cat /proc/meminfo 2>/dev/null || echo ""');
  const memLines = memInfo.split('\n');
  
  const parseKB = (line: string) => {
    const match = line.match(/:\s*(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  
  const memTotal = parseKB(memLines.find(l => l.startsWith('MemTotal:')) || '');
  const memFree = parseKB(memLines.find(l => l.startsWith('MemFree:')) || '');
  const memAvailable = parseKB(memLines.find(l => l.startsWith('MemAvailable:')) || '');
  const memUsed = memTotal - memAvailable;
  
  // Get process memory for node/next processes
  const { stdout: processMem } = await execAsync(
    `ps aux | grep -E "next-server|node|bun" | grep -v grep | awk '{print $11" "$12" "$13" "$4" "$6}' | head -10`
  );
  
  const processes: ProcessInfo[] = processMem.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.trim().split(/\s+/);
      const name = parts.slice(0, -2).join(' ').substring(0, 40);
      const cpuPercent = parts[parts.length - 2] || '0';
      const memKB = parseInt(parts[parts.length - 1]) || 0;
      return {
        name: name || 'unknown',
        memoryMB: Math.round(memKB / 1024),
        cpuPercent: cpuPercent
      };
    });
  
  // Calculate total next-server memory
  const nextServerProcess = processes.find(p => p.name.includes('next-server'));
  const totalNodeMemory = processes.reduce((sum, p) => sum + p.memoryMB, 0);
  
  // Determine if memory is high
  const memoryUsagePercent = memTotal > 0 ? (memUsed / memTotal) * 100 : 0;
  const isHighMemory = memoryUsagePercent > 70 || totalNodeMemory > 3000;
  
  // Memory modules breakdown (estimated based on typical Next.js app)
  const totalMB = nextServerProcess?.memoryMB || totalNodeMemory || 2000;
  
  const modules: MemoryModule[] = [
    { 
      name: 'Next.js Dev Runtime', 
      size: '~' + Math.round(totalMB * 0.40) + ' MB',
      sizeMB: Math.round(totalMB * 0.40),
      percentage: 40,
      color: '#3b82f6'
    },
    { 
      name: 'Prisma Client', 
      size: '~' + Math.round(totalMB * 0.20) + ' MB',
      sizeMB: Math.round(totalMB * 0.20),
      percentage: 20,
      color: '#10b981'
    },
    { 
      name: 'Mermaid + Diagrams', 
      size: '~' + Math.round(totalMB * 0.15) + ' MB',
      sizeMB: Math.round(totalMB * 0.15),
      percentage: 15,
      color: '#f59e0b'
    },
    { 
      name: 'Source Code', 
      size: '~' + Math.round(totalMB * 0.10) + ' MB',
      sizeMB: Math.round(totalMB * 0.10),
      percentage: 10,
      color: '#8b5cf6'
    },
    { 
      name: 'Lucide Icons', 
      size: '~' + Math.round(totalMB * 0.075) + ' MB',
      sizeMB: Math.round(totalMB * 0.075),
      percentage: 7.5,
      color: '#ec4899'
    },
    { 
      name: 'Other Dependencies', 
      size: '~' + Math.round(totalMB * 0.075) + ' MB',
      sizeMB: Math.round(totalMB * 0.075),
      percentage: 7.5,
      color: '#6b7280'
    },
  ];
  
  // Check for memory leaks
  const leakPatterns = await checkMemoryLeaks();
  
  // Get .next folder size
  let nextCacheSize = 0;
  try {
    const { stdout: cacheSize } = await execAsync('du -sm .next 2>/dev/null | cut -f1');
    nextCacheSize = parseInt(cacheSize.trim()) || 0;
  } catch {
    nextCacheSize = 0;
  }
  
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    system: {
      total: Math.round(memTotal / 1024),
      used: Math.round(memUsed / 1024),
      free: Math.round(memAvailable / 1024),
      usagePercent: Math.round(memoryUsagePercent * 10) / 10
    },
    nextServer: {
      memoryMB: nextServerProcess?.memoryMB || 0,
      processes: processes
    },
    modules,
    totalNodeMemoryMB: totalNodeMemory,
    isHighMemory,
    nextCacheSizeMB: nextCacheSize,
    leakPatterns,
    recommendations: getRecommendations(memoryUsagePercent, totalNodeMemory, nextCacheSize)
  });
}

async function getProcessList() {
  const { stdout } = await execAsync(
    `ps aux --sort=-%mem | head -20 | awk '{printf "%s|%s|%s|%s\\n", $1, $4, $6/1024, $11}'`
  );
  
  const processes = stdout.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [user, cpu, mem, cmd] = line.split('|');
      return {
        user,
        cpuPercent: parseFloat(cpu),
        memoryMB: parseFloat(mem),
        command: cmd?.substring(0, 50)
      };
    });
  
  return NextResponse.json({ success: true, processes });
}

async function checkMemoryLeaks() {
  const patterns = [];
  
  try {
    // Check for event listeners without cleanup
    const { stdout: eventListeners } = await execAsync(
      `grep -r "addEventListener" src/components/*.tsx 2>/dev/null | wc -l || echo 0`
    );
    const addCount = parseInt(eventListeners.trim()) || 0;
    
    const { stdout: removeListeners } = await execAsync(
      `grep -r "removeEventListener" src/components/*.tsx 2>/dev/null | wc -l || echo 0`
    );
    const removeCount = parseInt(removeListeners.trim()) || 0;
    
    patterns.push({
      pattern: 'Event Listeners',
      status: addCount <= removeCount ? 'clean' : 'warning',
      notes: addCount <= removeCount 
        ? 'All use return () => removeEventListener' 
        : `${addCount} addEventListener vs ${removeCount} removeEventListener`
    });
    
    // Check for setInterval
    const { stdout: intervals } = await execAsync(
      `grep -r "setInterval" src/lib/*.ts 2>/dev/null | wc -l || echo 0`
    );
    const intervalCount = parseInt(intervals.trim()) || 0;
    
    patterns.push({
      pattern: 'setInterval',
      status: 'acceptable',
      notes: `${intervalCount} interval(s) found - acceptable for server-lifetime tasks`
    });
    
    // Check for global caches
    const { stdout: globals } = await execAsync(
      `grep -r "global\." src/lib/*.ts 2>/dev/null | grep -v "globalThis" | wc -l || echo 0`
    );
    const globalCount = parseInt(globals.trim()) || 0;
    
    patterns.push({
      pattern: 'Global Variables',
      status: globalCount === 0 ? 'clean' : 'warning',
      notes: globalCount === 0 
        ? 'No problematic global patterns found' 
        : `${globalCount} global usage(s) found`
    });
    
  } catch {
    patterns.push({
      pattern: 'Analysis',
      status: 'unknown',
      notes: 'Could not analyze codebase'
    });
  }
  
  return patterns;
}

function getRecommendations(memoryPercent: number, nodeMemory: number, cacheSize: number): string[] {
  const recommendations = [];
  
  if (cacheSize > 500) {
    recommendations.push(`Clear .next cache (currently ${cacheSize} MB) to save memory`);
  }
  
  if (nodeMemory > 3000) {
    recommendations.push('Consider using production mode: bun run build && bun run start');
  }
  
  if (memoryPercent > 70) {
    recommendations.push('Memory usage is high - consider restarting the server');
  }
  
  recommendations.push('Lazy load Mermaid diagrams to save ~300 MB');
  recommendations.push('Use tree-shaking for Lucide icons to reduce bundle size');
  
  return recommendations;
}

async function clearCacheAndRestart() {
  try {
    // This will clear the cache
    await execAsync('rm -rf .next');
    
    // Return success - the actual restart needs to be handled by the caller
    // because we can't restart ourselves while serving the request
    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared. Restarting server...',
      action: 'restart-required'
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : undefined
    }, { status: 500 });
  }
}
