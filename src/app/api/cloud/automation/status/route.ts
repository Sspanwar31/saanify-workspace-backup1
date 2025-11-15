import { NextRequest, NextResponse } from 'next/server'
import SupabaseService from '@/lib/supabase-service'
import { db } from '@/lib/db'

export const GET = async (req: NextRequest) => {
  try {
    // For development, return mock real-time data
    const mockStatus = {
      overall: {
        total_runs: 0,
        successful_runs: 0,
        failed_runs: 0,
        running_runs: 0,
        success_rate: 0,
        average_duration_ms: 0,
        last_24_hours: 0
      },
      task_breakdown: {},
      recent_activity: [],
      system_health: {
        supabase_connected: false,
        automation_logs_available: false,
        last_log_time: null
      }
    }
    
    return NextResponse.json({
      success: true,
      status: mockStatus
    })
  } catch (error) {
    console.error('Failed to fetch automation status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch automation status'
    }, { status: 500 })
  }
}
