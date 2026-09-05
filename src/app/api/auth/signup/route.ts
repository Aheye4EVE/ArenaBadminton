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
  if (!url || !publishableKey) {
    return NextResponse.json({ code: "AUTH_NOT_CONFIGURED", message: "ยังไม่ได้ตั้งค่า Supabase Auth" }, { status: 503 });
  }

  let body: z.infer<typeof signupSchema>;
  try {
    body = signupSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ code: "INVALID_SIGNUP", message: "ข้อมูลสมัครสมาชิกไม่ถูกต้อง" }, { status: 422 });
  }

  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("next", body.nextPath);
  const client = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data, error } = await client.auth.signUp({
      email: body.email,
      password: body.password,
      options: { emailRedirectTo: callbackUrl.toString() },
    });
    if (error) return NextResponse.json({ code: "SIGNUP_FAILED", message: error.message }, { status: 400 });

    const settingResult = await client
      .from("email_verification_settings")
      .select("email_verification_required")
      .eq("id", "default")
      .maybeSingle();
    const verificationRequired = settingResult.error ? true : settingResult.data?.email_verification_required !== false;

    if (!verificationRequired && data.user && !data.session) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        return NextResponse.json({
          code: "AUTH_CONFIRMATION_CONFIGURATION",
          message: "Admin ปิดการยืนยัน Email แล้ว แต่ระบบยังไม่มี server key สำหรับยืนยันบัญชีอัตโนมัติ",
        }, { status: 503 });
      }

      const adminClient = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { error: confirmError } = await adminClient.auth.admin.updateUserById(data.user.id, { email_confirm: true });
      if (confirmError) {
        return NextResponse.json({ code: "AUTH_CONFIRMATION_FAILED", message: "ยืนยันบัญชีอัตโนมัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, needsVerification: false, sessionCreated: false, autoConfirmed: true });
    }

    return NextResponse.json({
      ok: true,
      needsVerification: !data.session,
      sessionCreated: Boolean(data.session),
      autoConfirmed: false,
    });
  } catch {
    return NextResponse.json({ code: "SIGNUP_FAILED", message: "ไม่สามารถเชื่อมต่อระบบสมาชิกได้" }, { status: 500 });
  }
}
