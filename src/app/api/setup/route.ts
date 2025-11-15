// src/app/api/setup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SETUP_MODE = process.env.SETUP_MODE === "true";
const SETUP_KEY = process.env.SETUP_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  if (!SETUP_MODE) {
    return NextResponse.json(
      { success: false, error: "Setup mode is disabled" },
      { status: 403 }
    );
  }

  try {
    const { setupKey, superadminEmail, superadminPassword } = await req.json();

    if (setupKey !== SETUP_KEY) {
      return NextResponse.json(
        { success: false, error: "Invalid setup key" },
        { status: 401 }
      );
    }

    if (!superadminEmail || !superadminPassword || superadminPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 400 }
      );
    }

    // --- Step 1: Create tables if not exist ---
    const { error: sqlError } = await supabase.rpc("raw_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS societies (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS roles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          permissions JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        INSERT INTO roles(name, permissions)
          VALUES 
          ('superadmin', '{"all": true}'),
          ('admin', '{"manage_users": true, "manage_society": true, "view_reports": true}'),
          ('treasurer', '{"manage_finances": true, "view_reports": true}'),
          ('user', '{"view_profile": true}')
        ON CONFLICT (name) DO NOTHING;
      `
    });

    if (sqlError) throw sqlError;

    // --- Step 2: Create superadmin user ---
    const hashedPassword = await hashPassword(superadminPassword);
    const { error: userError } = await supabase
      .from("users")
      .insert({
        email: superadminEmail,
        password: hashedPassword,
        role: "superadmin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (userError) throw userError;

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully",
      superadmin: { email: superadminEmail, role: "superadmin" }
    });
  } catch (error: any) {
    console.error("Setup failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Setup failed" },
      { status: 500 }
    );
  }
}

// --- Simple SHA-256 hash (for demo, use bcrypt in production) ---
async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
