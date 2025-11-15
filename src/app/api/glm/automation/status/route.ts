// src/app/api/glm/automation/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const tasks = [
      'schema-sync',
      'auto-sync',
      'backup-now',
      'auto-backup',
      'health-check',
      'log-rotation',
      'ai-optimization',
      'security-scan',
      'backup-restore'
    ]

    const status = await Promise.all(
      tasks.map(async (task) => {
        const lastLog = await db.automation_logs.findFirst({
          where: { task_name: task },
          orderBy: { createdAt: 'desc' }
        })
        return {
          task,
          lastRun: lastLog?.createdAt || null,
          status: lastLog?.status || 'ready',
          message: lastLog?.details || null
        }
      })
    )

    return NextResponse.json({ success: true, data: status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch automation status' },
      { status: 500 }
    )
  }
}
