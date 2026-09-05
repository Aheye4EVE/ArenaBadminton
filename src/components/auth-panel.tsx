"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Provider } from "@supabase/supabase-js";
import { ArrowRight, AtSign, CheckCircle2, LockKeyhole, MessageCircle, Sparkles } from "lucide-react";
import PasswordResetForm from "@/components/password-reset-form";
import { friendlyAuthError, getAuthCallbackUrl, getLineProvider } from "@/lib/auth-client";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthMode = "login" | "signup";

export default function AuthPanel({ initialError, initialMessage, nextPath = "/profile/setup" }: { initialError?: string; initialMessage?: string; nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setShowReset(false);
    setError("");
    setMessage("");
  };

  const signInWithProvider = async (provider: Provider) => {
    setIsBusy(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
          redirectTo: getAuthCallbackUrl(nextPath),
          },
      });

      if (authError) {
        setError(friendlyAuthError(authError.message));
      } else if (data.url) {
        window.location.assign(data.url);
      }
    } catch {
      setError("ยังไม่ได้ตั้งค่า Supabase Auth สำหรับ provider นี้");
    } finally {
      setIsBusy(false);
    }
  };

  const submitEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !email.includes("@")) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }
    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }

    setIsBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) {
          setError(friendlyAuthError(authError.message));
          return;
        }
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
          password,
          options: {
            emailRedirectTo: getAuthCallbackUrl(nextPath),
          },
      });
      if (authError) {
        setError(friendlyAuthError(authError.message));
        return;
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
      } else {
        setMessage("สมัครสมาชิกสำเร็จแล้ว กรุณาเปิดอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ");
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบสมาชิกได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsBusy(false);
    }
  };

  const lineProvider = getLineProvider();

  return (
    <main className="auth-page">
      <div className="auth-page__glow auth-page__glow--one" />
      <div className="auth-page__glow auth-page__glow--two" />
      <div className="auth-shell">
        <section className="auth-card" aria-labelledby="auth-title">
          <Link href="/" className="auth-brand" aria-label="กลับหน้าหลัก Arena-Badminton">
            <span className="auth-brand__word">Arena</span>
            <span className="auth-brand__sub">-Badminton</span>
          </Link>

          <div className="auth-heading">
            <span className="auth-heading__sparkle" aria-hidden="true">✦</span>
            <p lang="en">Welcome to the Arena</p>
            <h1 id="auth-title">{showReset ? "กู้คืนการเข้าสู่ระบบ" : mode === "login" ? "กลับเข้าสู่สนามกันเถอะ" : "มาสร้างโปรไฟล์นักแบดกัน"}</h1>
            <span>{showReset ? "กรอกอีเมล แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ" : mode === "login" ? "เข้าสู่ระบบเพื่อค้นหาก๊วนและเก็บแต้มของคุณ" : "สมัครครั้งเดียว แล้วออกไปเจอก๊วนใหม่ ๆ ด้วยกัน"}</span>
          </div>

          {showReset ? (
            <PasswordResetForm onBack={() => { setShowReset(false); setMode("login"); setError(""); setMessage(""); }} />
          ) : (
            <>
              <div className="auth-tabs" role="tablist" aria-label="ประเภทสมาชิก">
                <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "auth-tab auth-tab--active" : "auth-tab"} onClick={() => switchMode("login")}>
                  เข้าสู่ระบบ
                </button>
                <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "auth-tab auth-tab--active" : "auth-tab"} onClick={() => switchMode("signup")}>
                  สมัครสมาชิก
                </button>
              </div>

              <div className="auth-social-grid">
                <button type="button" className="auth-social auth-social--line" disabled={isBusy} onClick={() => signInWithProvider(lineProvider)}>
                  <span className="auth-social__mark">LINE</span>
                  <span>ต่อด้วย LINE</span>
                </button>
                <button type="button" className="auth-social auth-social--google" disabled={isBusy} onClick={() => signInWithProvider("google")}>
                  <span className="auth-social__mark">G</span>
                  <span>ต่อด้วย Google</span>
                </button>
              </div>

              <div className="auth-divider"><span>หรือใช้ Email &amp; Password</span></div>

              <form className="auth-form" onSubmit={submitEmailAuth} noValidate>
                <label className="auth-field">
                  <span>อีเมล</span>
                  <div className="auth-field__control"><AtSign size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></div>
                </label>
                <label className="auth-field">
                  <span>รหัสผ่าน</span>
                  <div className="auth-field__control"><LockKeyhole size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} required /></div>
                </label>
                {mode === "signup" ? (
                  <label className="auth-field">
                    <span>ยืนยันรหัสผ่าน</span>
                    <div className="auth-field__control"><LockKeyhole size={17} /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={8} required /></div>
                  </label>
                ) : null}
                {mode === "login" ? <button type="button" className="auth-forgot" onClick={() => { setShowReset(true); setError(""); setMessage(""); }}>ลืมรหัสผ่าน?</button> : null}
                {error ? <div className="auth-feedback auth-feedback--error" role="alert">{error}</div> : null}
                {message ? <div className="auth-feedback auth-feedback--success" role="status"><CheckCircle2 size={17} /> {message}</div> : null}
                <button type="submit" className="auth-submit" disabled={isBusy}>
                  {isBusy ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ Arena" : "สร้างบัญชีของฉัน"}
                  {!isBusy ? <ArrowRight size={17} /> : null}
                </button>
              </form>
            </>
          )}

          <p className="auth-terms">การดำเนินการต่อแปลว่าคุณยอมรับ <Link href="/">ข้อกำหนดการใช้งาน</Link> และ <Link href="/">นโยบายความเป็นส่วนตัว</Link></p>
        </section>

        <aside className="auth-aside" aria-label="สิ่งที่จะได้รับจาก Arena-Badminton">
          <div className="auth-aside__bubble auth-aside__bubble--one">🏸</div>
          <div className="auth-aside__bubble auth-aside__bubble--two">✨</div>
          <div className="auth-aside__court"><span /><span /><span /><span /></div>
          <div className="auth-aside__copy">
            <p lang="en"><Sparkles size={16} /> Find your game</p>
            <h2>ทุกแมตช์มีเรื่องราว<br />ทุกก๊วนมีเพื่อนใหม่</h2>
            <span><MessageCircle size={16} /> กรอกโปรไฟล์ให้ครบ แล้วเริ่มค้นหาสนามใกล้คุณ</span>
          </div>
          <div className="auth-aside__stats"><span><strong>Lv.01</strong><small>เริ่มเก็บ EXP</small></span><span><strong>1,000 BP</strong><small>ค่าเริ่มต้นของคุณ</small></span><span><strong>99</strong><small>Level สูงสุด</small></span></div>
        </aside>
      </div>
    </main>
  );
}
