import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Environment variables
const SETUP_MODE = process.env.SETUP_MODE === 'true'
const SETUP_KEY = process.env.SETUP_KEY

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function POST(req: NextRequest) {
  if (!SETUP_MODE) {
    return NextResponse.json({ success: false, error: 'Setup mode is disabled' }, { status: 403 })
  }

  try {
    const { setupKey, superadminEmail, superadminPassword } = await req.json()

    if (setupKey !== SETUP_KEY) {
      return NextResponse.json({ success: false, error: 'Invalid setup key' }, { status: 401 })
    }

    if (!superadminEmail || !superadminPassword || superadminPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Invalid superadmin credentials' }, { status: 400 })
    }

    // Step 1: Initialize tables
    const { error: sqlError } = await supabase.rpc('run_setup_sql')
    if (sqlError) throw sqlError

    // Step 2: Create superadmin user
    const hashedPassword = await hashPassword(superadminPassword)
    const { error: insertError } = await supabase.from('users').insert({
      email: superadminEmail,
      password: hashedPassword,
      role: 'superadmin',
      is_active: true,
      created_at: new Date().toISOString()
    })

    if (insertError) throw insertError

    return NextResponse.json({ success: true, message: 'Setup completed successfully' })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// Simple SHA-256 hashing (use bcrypt in production)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
