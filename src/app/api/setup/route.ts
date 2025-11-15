// src/app/api/setup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side environment variables
const SETUP_MODE = process.env.SETUP_MODE === "true";
const SETUP_KEY = process.env.SETUP_KEY;

// Supabase server-side client with service key
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  if (!SETUP_MODE) {
    return NextResponse.json({ success: false, error: "Setup mode is disabled" }, { status: 403 });
  }

  try {
    const { setupKey, superadminEmail, superadminPassword } = await req.json();

    // Validate setup key
    if (setupKey !== SETUP_KEY) {
      return NextResponse.json({ success: false, error: "Invalid setup key" }, { status: 401 });
    }

    // Basic validation
    if (!superadminEmail || !superadminPassword || superadminPassword.length < 8) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 400 });
    }

    // Step 1: Initialize schema via RPC function
    const { error: schemaError } = await supabase.rpc("initialize_app_schema");
    if (schemaError) throw schemaError;

    // Step 2: Create superadmin user
    const hashedPassword = await hashPassword(superadminPassword);
    const { error: userError } = await supabase
      .from("users")
      .insert({
        email: superadminEmail,
        password: hashedPassword,
        role: "superadmin",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (userError) throw userError;

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully",
      redirectUrl: "/auth/login",
      superadmin: { email: superadminEmail, role: "superadmin" }
    });
  } catch (err: any) {
    console.error("Setup failed:", err);
    return NextResponse.json({ success: false, error: err.message || "Setup failed" }, { status: 500 });
  }
}

// Simple SHA-256 hash (for demo, replace with bcrypt in production)
async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
