// src/app/api/glm/automation/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    // Define automation tasks
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

    // Fetch last log for each task
    const statusPromises = tasks.map(async (task) => {
      const lastLog = await db.automation_logs.findFirst({
        where: { task_name: task }, // ✅ Correct column
        orderBy: { createdAt: 'desc' }
      })

      return {
        task,
        lastRun: lastLog?.createdAt || null,
        status: lastLog?.status || 'ready',
        message: lastLog?.details || null
      }
    })

    const status = await Promise.all(statusPromises)

    return NextResponse.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('Error fetching automation status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch automation status' },
      { status: 500 }
    )
  }
}
