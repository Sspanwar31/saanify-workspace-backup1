import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/real-supabase'

export const POST = async (req: NextRequest) => {
  try {
    const { taskName } = await req.json()

    if (!taskName) {
      return NextResponse.json({ success: false, error: 'Task name is required' }, { status: 400 })
    }

    // Log the task start
    const { data, error } = await supabase.from('automation_logs').insert([{
      task_name: taskName,
      status: 'running',
      run_time: new Date()
    }])

    if (error) throw error

    // You can call the actual task function here (backup, sync, etc.)

    return NextResponse.json({ success: true, message: `Task ${taskName} started`, log: data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
