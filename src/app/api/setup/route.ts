import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Env variables
const SETUP_MODE = process.env.SETUP_MODE === "true";
const SETUP_KEY = process.env.SETUP_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  if (!SETUP_MODE) return NextResponse.json({ success: false, error: "Setup mode disabled" }, { status: 403 });

  try {
    const { setupKey, superadminEmail, superadminPassword } = await req.json();

    if (setupKey !== SETUP_KEY) return NextResponse.json({ success: false, error: "Invalid setup key" }, { status: 401 });
    if (!superadminEmail || !superadminPassword || superadminPassword.length < 8) 
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 400 });

    // Initialize schema
    const { error: schemaError } = await supabase.rpc("initialize_app_schema");
    if (schemaError) throw schemaError;

    // Simple SHA-256 hash
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(superadminPassword));
    const hashedPassword = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Insert superadmin
    const { error: userError } = await supabase
      .from("users")
      .insert({ email: superadminEmail, password: hashedPassword, role: "superadmin", is_active: true })
      .select();
    if (userError) throw userError;

    return NextResponse.json({ success: true, message: "Setup completed", redirectUrl: "/auth/login" });

  } catch (err: any) {
    console.error("Setup failed:", err);
    return NextResponse.json({ success: false, error: err.message || "Setup failed" }, { status: 500 });
  }
}
