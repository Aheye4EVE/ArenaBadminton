"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { friendlyAuthError } from "@/lib/auth-client";

export default function PasswordUpdateForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const result = await supabase.auth.getSession();
        if (!active) return;
        setHasSession(Boolean(result.data.session));
        setIsReady(true);
      } catch {
        if (!active) return;
        setHasSession(false);
        setIsReady(true);
      }
    };

    void checkSession();

    return () => {
      active = false;
    };
  }, []);

  const submitUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }

    setIsBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(friendlyAuthError(updateError.message));
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setMessage("ตั้งรหัสผ่านใหม่สำเร็จแล้ว กลับไปใช้งาน Arena ได้เลย");
    } catch {
      setError("ลิงก์อาจหมดอายุ หรือไม่สามารถเชื่อมต่อระบบสมาชิกได้");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-page__glow auth-page__glow--one" />
      <div className="auth-page__glow auth-page__glow--two" />
      <section className="password-update-card" aria-labelledby="password-update-title">
        <Link href="/" className="auth-brand" aria-label="กลับหน้าหลัก Arena-Badminton">
          <span className="auth-brand__word">Arena</span>
          <span className="auth-brand__sub">-Badminton</span>
        </Link>
        <div className="password-update-card__heading">
          <p lang="en">Welcome back to the Arena</p>
          <h1 id="password-update-title">ตั้งรหัสผ่านใหม่</h1>
          <span>ตั้งรหัสผ่านใหม่ให้ปลอดภัย แล้วกลับไปค้นหาก๊วนของคุณ</span>
        </div>

        {!isReady ? <p className="password-update-card__loading">กำลังตรวจสอบลิงก์...</p> : null}
        {isReady && hasSession === false ? (
          <div className="auth-feedback auth-feedback--error" role="alert">
            ลิงก์นี้หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ
          </div>
        ) : null}
        {isReady && hasSession ? (
          <form className="auth-form" onSubmit={submitUpdate} noValidate>
            <label className="auth-field">
              <span>รหัสผ่านใหม่</span>
              <div className="auth-field__control"><LockKeyhole size={17} aria-hidden="true" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} required /></div>
            </label>
            <label className="auth-field">
              <span>ยืนยันรหัสผ่านใหม่</span>
              <div className="auth-field__control"><LockKeyhole size={17} aria-hidden="true" /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={8} required /></div>
            </label>
            {error ? <div className="auth-feedback auth-feedback--error" role="alert">{error}</div> : null}
            {message ? <div className="auth-feedback auth-feedback--success" role="status"><CheckCircle2 size={17} /> {message}</div> : null}
            <button type="submit" className="auth-submit" disabled={isBusy}>
              {isBusy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
              {!isBusy ? <ArrowRight size={17} /> : null}
            </button>
          </form>
        ) : null}

        <Link href="/auth/login" className="password-update-card__back">กลับไปหน้าเข้าสู่ระบบ</Link>
      </section>
    </main>
  );
}
