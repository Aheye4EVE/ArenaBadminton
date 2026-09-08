import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const signupSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  nextPath: z.string().trim().startsWith("/").max(200).default("/profile/setup"),
});

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || (!publishableKey && !serviceRoleKey)) {
    return NextResponse.json({ code: "AUTH_NOT_CONFIGURED", message: "ยังไม่ได้ตั้งค่า Supabase Auth" }, { status: 503 });
  }

  let body: z.infer<typeof signupSchema>;
  try {
    body = signupSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ code: "INVALID_SIGNUP", message: "ข้อมูลสมัครสมาชิกไม่ถูกต้อง" }, { status: 422 });
  }

  // If serviceRoleKey is available, create the user directly with email_confirm: true.
  // This bypasses email verification completely, sends NO email, and makes the account immediately active.
  if (serviceRoleKey) {
    const adminClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

      if (createError) {
        const errorMsg = (createError.message ?? "").toLowerCase();
        if (errorMsg.includes("already") || errorMsg.includes("exists") || createError.status === 422) {
          return NextResponse.json(
            { code: "EMAIL_EXISTS", message: "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทนได้เลย" },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { code: "SIGNUP_FAILED", message: createError.message },
          { status: 400 },
        );
      }

      // Ensure setting in DB is explicitly set to false
      void adminClient
        .from("email_verification_settings")
        .upsert({ id: "default", email_verification_required: false, updated_at: new Date().toISOString() });

      return NextResponse.json({
        ok: true,
        needsVerification: false,
        sessionCreated: false,
        autoConfirmed: true,
        userId: userData.user.id,
      });
    } catch (err: unknown) {
      console.error("Signup admin error:", err);
      return NextResponse.json(
        { code: "SIGNUP_FAILED", message: "ไม่สามารถเชื่อมต่อระบบสมาชิกได้" },
        { status: 500 },
      );
    }
  }

  // Fallback if serviceRoleKey is not available
  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("next", body.nextPath);
  const client = createClient(url, publishableKey!, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data, error } = await client.auth.signUp({
      email: body.email,
      password: body.password,
      options: { emailRedirectTo: callbackUrl.toString() },
    });
    if (error) return NextResponse.json({ code: "SIGNUP_FAILED", message: error.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      needsVerification: false,
      sessionCreated: Boolean(data.session),
      autoConfirmed: true,
    });
  } catch {
    return NextResponse.json({ code: "SIGNUP_FAILED", message: "ไม่สามารถเชื่อมต่อระบบสมาชิกได้" }, { status: 500 });
  }
}
