import type { Metadata } from "next";
import AuthPanel from "@/components/auth-panel";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | Arena-Badminton",
  description: "สมัครสมาชิกและเข้าสู่ Community คนรักแบดมินตัน",
};

function getCallbackMessage(value: string | undefined) {
  if (value === "auth_callback_failed") return "การเชื่อมต่อบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  return undefined;
}

function getLoginMessage(value: string | undefined) {
  if (value === "auth_required") return "กรุณาเข้าสู่ระบบก่อนตั้งค่าโปรไฟล์";
  if (value === "password_reset_success") return "ตั้งรหัสผ่านใหม่สำเร็จแล้ว เข้าสู่ระบบได้เลย";
  return undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return <AuthPanel initialError={getCallbackMessage(params.error)} initialMessage={getLoginMessage(params.message)} />;
}
