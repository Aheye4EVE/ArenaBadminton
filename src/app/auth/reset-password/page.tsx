import type { Metadata } from "next";
import PasswordUpdateForm from "@/components/password-update-form";

export const metadata: Metadata = {
  title: "ตั้งรหัสผ่านใหม่ | Arena-Badminton",
  description: "ตั้งรหัสผ่านใหม่สำหรับบัญชี Arena-Badminton",
};

export default function ResetPasswordPage() {
  return <PasswordUpdateForm />;
}
