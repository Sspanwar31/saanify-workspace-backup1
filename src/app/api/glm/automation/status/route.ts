// src/app/api/glm/automation/status/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // Lightweight mock response for deployment
  const tasks = [
    'schema-sync',
    'auto-sync',
    'backup-now',
    'auto-backup',
    'health-check'
  ]

  const status = tasks.map(task => ({
    task,
    lastRun: null,
    status: 'ready',
    message: null
  }))

  return NextResponse.json({ success: true, data: status })
}
