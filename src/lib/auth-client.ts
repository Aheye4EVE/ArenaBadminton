export function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (normalized.includes("email not confirmed")) return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
  if (normalized.includes("user already registered")) return "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทนได้เลย";
  if (normalized.includes("password")) return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  if (normalized.includes("rate limit")) return "ระบบส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่";
  if (normalized.includes("provider") || normalized.includes("unsupported")) return "Provider นี้ยังไม่ได้เปิดใน Supabase Dashboard";
  return "ไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
}

export function getAuthCallbackUrl(nextPath = "/profile/setup") {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}
