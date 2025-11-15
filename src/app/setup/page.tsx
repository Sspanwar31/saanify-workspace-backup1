import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Security environment variables
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

    if (!superadminEmail || !superadminPassword) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 })
    }

    // --- Step 1: Create tables if not exist ---
    const sql = `
      CREATE TABLE IF NOT EXISTS societies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        permissions JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS automation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_name TEXT,
        status TEXT,
        duration_ms INTEGER,
        run_time TIMESTAMP,
        error TEXT,
        details TEXT,
        createdAt TIMESTAMP DEFAULT now(),
        updatedAt TIMESTAMP DEFAULT now()
      );

      INSERT INTO roles (name, permissions) VALUES
        ('superadmin', '{"all": true}'),
        ('admin', '{"manage_users": true, "manage_society": true, "view_reports": true}'),
        ('treasurer', '{"manage_finances": true, "view_reports": true}'),
        ('user', '{"view_profile": true}')
      ON CONFLICT (name) DO NOTHING;
    `

    const { error: sqlError } = await supabase.rpc('execute_sql', { sql })
    if (sqlError) throw sqlError

    // --- Step 2: Create superadmin ---
    // Simple hash (use bcrypt in production)
    const encoder = new TextEncoder()
    const data = encoder.encode(superadminPassword)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2,'0')).join('')

    const { error: userError } = await supabase
      .from('users')
      .upsert({
        email: superadminEmail,
        password: hashedPassword,
        role: 'superadmin'
      }, { onConflict: 'email' })

    if (userError) throw userError

    return NextResponse.json({ success: true, message: 'Setup completed! All tables created and superadmin added.' })
  } catch (err: any) {
    console.error('Setup failed:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
