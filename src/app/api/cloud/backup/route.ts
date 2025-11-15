import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type = 'full' } = body

  const backupId = `backup_${Date.now()}`

  // Just log the backup initiation
  await db.automation_logs.create({
    data: {
      task: 'backup-now',
      status: 'started',
      message: `Backup ${backupId} initiated`,
    },
  })

  // Trigger remote worker or Supabase function to handle heavy backup
  // Do NOT include .tar.gz in serverless function

  return NextResponse.json({
    success: true,
    message: `Backup ${backupId} started`,
  })
}
