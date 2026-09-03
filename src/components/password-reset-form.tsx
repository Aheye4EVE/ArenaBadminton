"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, AtSign, MailCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { friendlyAuthError, getAuthCallbackUrl } from "@/lib/auth-client";

type PasswordResetFormProps = {
  compact?: boolean;
  onBack?: () => void;
};

export default function PasswordResetForm({ compact = false, onBack }: PasswordResetFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    setIsBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAuthCallbackUrl("/auth/reset-password"),
      });

      if (resetError) {
        setError(friendlyAuthError(resetError.message));
        return;
      }

      setSent(true);
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบสมาชิกได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsBusy(false);
    }
  };

  if (sent) {
    return (
      <div className={compact ? "account-reset account-reset--success" : "reset-form reset-form--success"}>
        <span className="account-reset__icon" aria-hidden="true"><MailCheck size={24} /></span>
        <h2>เช็กกล่องจดหมายของคุณ</h2>
        <p>เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว หากไม่พบลองเช็กในโฟลเดอร์ Spam ด้วยนะ</p>
        <div className="account-reset__actions">
          {onBack ? (
            <button type="button" className={compact ? "account-reset__back" : "reset-form__back"} onClick={onBack}>
              <ArrowLeft size={16} /> กลับเข้าสู่ระบบ
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "account-reset" : "reset-form"}>
      <div className="account-reset__intro">
        <span className="account-reset__icon" aria-hidden="true"><MailCheck size={24} /></span>
        <div>
          <h2>ลืมรหัสผ่าน?</h2>
          <p>กรอกอีเมลที่ใช้สมัคร แล้วเราจะส่งลิงก์ให้คุณกลับเข้าสู่ Arena</p>
        </div>
      </div>

      <form className={compact ? "account-auth-form" : "auth-form"} onSubmit={submitReset} noValidate>
        <label className={compact ? "account-auth-field" : "auth-field"}>
          <span>อีเมล</span>
          <div className={compact ? "account-auth-field__control" : "auth-field__control"}>
            <AtSign size={17} aria-hidden="true" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
        </label>
        {error ? <div className={compact ? "account-auth-feedback account-auth-feedback--error" : "auth-feedback auth-feedback--error"} role="alert">{error}</div> : null}
        <button type="submit" className={compact ? "account-auth-submit" : "auth-submit"} disabled={isBusy}>
          {isBusy ? "กำลังส่งลิงก์..." : "ส่งลิงก์ตั้งรหัสผ่าน"}
          {!isBusy ? <ArrowRight size={17} /> : null}
        </button>
      </form>

      {onBack ? (
        <button type="button" className={compact ? "account-reset__back" : "reset-form__back"} onClick={onBack}>
          <ArrowLeft size={16} /> กลับเข้าสู่ระบบ
        </button>
      ) : null}
    </div>
  );
}
