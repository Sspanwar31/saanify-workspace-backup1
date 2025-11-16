import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Supabase server-side client (service key)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const signupSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  company: z.string().min(2),
  role: z.enum(['developer','designer','manager','founder','other']),
  password: z.string().min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  agreeToTerms: z.boolean().refine(v => v === true)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = signupSchema.parse(body);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", validatedData.email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Insert user
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        email: validatedData.email,
        password: await hashPassword(validatedData.password),
        role: validatedData.role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, message: "User created" });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join("");
}
