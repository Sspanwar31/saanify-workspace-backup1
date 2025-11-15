// src/app/api/setup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SETUP_MODE = process.env.SETUP_MODE === 'true'
const SETUP_KEY = process.env.SETUP_KEY

// Minimal Supabase client
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

    // Step 1: Initialize database via Supabase RPC
    const { error: schemaError } = await supabase.rpc('initialize_app_schema')
    if (schemaError) throw schemaError

    // Step 2: Create superadmin user in users table
    const hashedPassword = await hashPassword(superadminPassword)
    const { error: userError } = await supabase
      .from('users')
      .insert([{ email: superadminEmail, password: hashedPassword, role: 'superadmin', is_active: true }])
    if (userError) throw userError

    return NextResponse.json({ success: true, message: 'Setup completed successfully' })

  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// Simple SHA-256 hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
