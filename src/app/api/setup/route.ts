// src/app/api/setup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SETUP_MODE = process.env.SETUP_MODE === 'true'
const SETUP_KEY = process.env.SETUP_KEY

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  if (!SETUP_MODE) {
    return NextResponse.json({ success: false, error: 'Setup mode disabled' }, { status: 403 })
  }

  try {
    const { setupKey, superadminEmail, superadminPassword } = await req.json()

    if (setupKey !== SETUP_KEY) {
      return NextResponse.json({ success: false, error: 'Invalid setup key' }, { status: 401 })
    }

    if (!superadminEmail || !superadminPassword || superadminPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Invalid superadmin credentials' }, { status: 400 })
    }

    // ------------------------------
    // 1️⃣ Create tables if not exist
    // ------------------------------
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS roles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        permissions JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT REFERENCES roles(name),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS automation_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        task_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        details TEXT,
        error TEXT,
        duration_ms INT DEFAULT 0,
        run_time TIMESTAMP DEFAULT NOW(),
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW()
      );
    `
    const { error: tableError } = await supabase.rpc('execute_sql', { sql: createTablesSQL })
    if (tableError) throw tableError

    // ------------------------------
    // 2️⃣ Seed roles
    // ------------------------------
    const roles = [
      { name: 'superadmin', permissions: { all: true } },
      { name: 'admin', permissions: { manage_users: true, view_reports: true } },
      { name: 'user', permissions: { view_profile: true } }
    ]
    for (const r of roles) {
      await supabase.from('roles').upsert(r, { onConflict: ['name'] })
    }

    // ------------------------------
    // 3️⃣ Create superadmin user
    // ------------------------------
    const hashedPassword = await hashPassword(superadminPassword)
    await supabase.from('users').upsert({
      email: superadminEmail,
      password: hashedPassword,
      role: 'superadmin',
      is_active: true
    }, { onConflict: ['email'] })

    // ------------------------------
    // 4️⃣ Optional: Seed automation tasks (blank logs)
    // ------------------------------
    const tasks = ['schema-sync','auto-sync','backup-now','auto-backup','health-check','log-rotation','ai-optimization','security-scan','backup-restore']
    for (const t of tasks) {
      await supabase.from('automation_logs').upsert({ task_name: t, status: 'ready' }, { onConflict: ['task_name'] })
    }

    // ------------------------------
    // 5️⃣ Return success
    // ------------------------------
    return NextResponse.json({ success: true, message: 'Setup completed successfully' })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// ------------------------------
// Simple SHA-256 hash for password
// ------------------------------
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
