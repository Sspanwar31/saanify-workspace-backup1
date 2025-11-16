import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SETUP_MODE = process.env.SETUP_MODE === "true";
const SETUP_KEY = process.env.SETUP_KEY;

// Create Supabase client using SERVICE ROLE KEY
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: NextRequest) {
  console.log("========== SETUP DEBUG START ==========");

  // Debugging environment variable presence
  console.log("DEBUG: SUPABASE_URL =", process.env.SUPABASE_URL ? "[present]" : "[missing]");
  console.log("DEBUG: SERVICE_ROLE_KEY =", process.env.SUPABASE_SERVICE_ROLE_KEY ? "[present]" : "[missing]");
  console.log("DEBUG: SETUP_MODE =", SETUP_MODE);
  console.log("DEBUG: SETUP_KEY present =", SETUP_KEY ? true : false);

  if (!SETUP_MODE) {
    console.log("DEBUG: Setup mode disabled");
    return NextResponse.json({ success: false, error: "Setup mode disabled" }, { status: 403 });
  }

  try {
    const { setupKey, superadminEmail, superadminPassword } = await req.json();
    console.log("DEBUG: Incoming setupKey match =", setupKey === SETUP_KEY);

    if (setupKey !== SETUP_KEY) {
      console.log("DEBUG: Invalid setup key");
      return NextResponse.json({ success: false, error: "Invalid setup key" }, { status: 401 });
    }

    console.log("DEBUG: Calling RPC initialize_app_schema...");
    const { error: schemaError } = await supabase.rpc("initialize_app_schema");
    console.log("DEBUG: RPC error =", schemaError);

    if (schemaError) throw schemaError;

    console.log("DEBUG: Hashing password...");
    const hashedPassword = await hashPassword(superadminPassword);

    console.log("DEBUG: Inserting superadmin into users table...");
    const { error: userError } = await supabase
      .from("users")
      .insert({
        email: superadminEmail,
        password: hashedPassword,
        role: "superadmin",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    console.log("DEBUG: Insert error =", userError);

    if (userError) throw userError;

    console.log("========== SETUP SUCCESS ==========");

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully",
      redirectUrl: "/auth/login"
    });
  } catch (err: any) {
    console.log("========== SETUP FAILED ==========");
    console.log("DEBUG: ERROR =", err?.message || err);
    return NextResponse.json({ success: false, error: err.message || "Setup failed" }, { status: 500 });
  }
}

// Simple SHA-256 hashing
async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
