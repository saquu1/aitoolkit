import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface ProcessInfo {
  pid: number
  ppid: number
  user: string
  command: string
  args: string
  threads: number
  memory: number
  cpu: number
}

interface ThreadStats {
  totalTasks: number
  maxThreads: number
  utilization: number
  bashProcesses: number
  suProcesses: number
  orphanedCount: number
  topConsumers: { name: string; count: number; threads: number }[]
  processes: ProcessInfo[]
}

async function getThreadStats(): Promise<ThreadStats> {
  // Get max threads
  let maxThreads = 929
  try {
    const { stdout } = await execAsync('cat /proc/sys/kernel/threads-max')
    maxThreads = parseInt(stdout.trim(), 10)
  } catch (e) {}

  // Get total tasks (threads + processes)
  let totalTasks = 0
  try {
    const { stdout } = await execAsync('ls -1 /proc/*/task 2>/dev/null | wc -l')
    totalTasks = parseInt(stdout.trim(), 10)
  } catch (e) {}

  // Get process counts
  let bashCount = 0
  let suCount = 0
  try {
    const { stdout } = await execAsync('pgrep -c bash 2>/dev/null || echo 0')
    bashCount = parseInt(stdout.trim(), 10)
  } catch (e) {}
  try {
    const { stdout } = await execAsync('pgrep -c su 2>/dev/null || echo 0')
    suCount = parseInt(stdout.trim(), 10)
  } catch (e) {}

  // Get top thread consumers
  let topConsumers: { name: string; count: number; threads: number }[] = []
  try {
    const { stdout } = await execAsync('ps -eo comm,nlwp --sort=-nlwp | head -15')
    const lines = stdout.trim().split('\n').slice(1)
    const consumerMap = new Map<string, { count: number; threads: number }>()

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2) {
        const name = parts[0]
        const threads = parseInt(parts[parts.length - 1], 10) || 1
        const existing = consumerMap.get(name) || { count: 0, threads: 0 }
        consumerMap.set(name, { count: existing.count + 1, threads: existing.threads + threads })
      }
    }

    topConsumers = Array.from(consumerMap.entries())
      .map(([name, data]) => ({ name, count: data.count, threads: data.threads }))
      .sort((a, b) => b.threads - a.threads)
      .slice(0, 10)
  } catch (e) {}

  // Get detailed process list
  let processes: ProcessInfo[] = []
  try {
    const { stdout } = await execAsync('ps -eo pid,ppid,user,comm,args,nlwp,%mem,%cpu --sort=-nlwp | head -50')
    const lines = stdout.trim().split('\n').slice(1)

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 5) {
        processes.push({
          pid: parseInt(parts[0], 10),
          ppid: parseInt(parts[1], 10),
          user: parts[2],
          command: parts[3],
          args: parts.slice(4, -3).join(' '),
          threads: parseInt(parts[parts.length - 3], 10) || 1,
          memory: parseFloat(parts[parts.length - 2]) || 0,
          cpu: parseFloat(parts[parts.length - 1]) || 0
        })
      }
    }
  } catch (e) {}

  // Calculate orphaned count (bash/su processes with PPID 1)
  let orphanedCount = 0
  try {
    const { stdout } = await execAsync('ps -ef | grep -E "(bash|su)" | grep -v grep | grep -v "ppid" | wc -l')
    orphanedCount = Math.floor(parseInt(stdout.trim(), 10) / 2) // Each session has both su and bash
  } catch (e) {}

  return {
    totalTasks,
    maxThreads,
    utilization: Math.round((totalTasks / maxThreads) * 100),
    bashProcesses: bashCount,
    suProcesses: suCount,
    orphanedCount,
    topConsumers,
    processes
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await getThreadStats()
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error getting thread stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get thread stats' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'cleanup') {
      // Kill orphaned shell sessions
      let killedCount = 0

      try {
        // Kill bash processes (except current)
        const { stdout: bashPids } = await execAsync('pgrep bash')
        const pids = bashPids.trim().split('\n').filter(Boolean)

        for (const pid of pids) {
          try {
            // Don't kill the current process or its parent
            const { stdout: ppid } = await execAsync(`ps -o ppid= -p ${pid} 2>/dev/null || echo 0`)
            const parentPid = parseInt(ppid.trim(), 10)

            if (parentPid === 1) {
              // This is orphaned (parented to init)
              await execAsync(`kill -9 ${pid} 2>/dev/null || true`)
              killedCount++
            }
          } catch (e) {}
        }

        // Kill orphaned su processes
        await execAsync('pkill -9 -f "su.*-c.*bash" 2>/dev/null || true')

      } catch (e) {}

      // Get updated stats
      const stats = await getThreadStats()

      return NextResponse.json({
        success: true,
        message: `Cleaned up ${killedCount} orphaned processes`,
        killedCount,
        stats
      })
    }

    if (action === 'kill-process') {
      const { pid } = body
      if (!pid) {
        return NextResponse.json({ error: 'PID is required' }, { status: 400 })
      }

      try {
        await execAsync(`kill -9 ${pid} 2>/dev/null || true`)
        const stats = await getThreadStats()
        return NextResponse.json({
          success: true,
          message: `Process ${pid} terminated`,
          stats
        })
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in thread cleanup:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform action' },
      { status: 500 }
    )
  }
}
