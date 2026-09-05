"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Provider } from "@supabase/supabase-js";
import {
  ArrowRight,
  AtSign,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Crown,
  Eye,
  EyeOff,
  Gem,
  LockKeyhole,
  LogOut,
  Medal,
  Sparkles,
  ShieldCheck,
  Trophy,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { friendlyAuthError, getAuthCallbackUrl, getLineProvider } from "@/lib/auth-client";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { HeaderProfileSummary } from "@/types/profile";
import PasswordResetForm from "@/components/password-reset-form";

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const formatNumber = (value: number) => new Intl.NumberFormat("th-TH").format(value);

function AccountAvatar({ account, large = false }: { account: HeaderProfileSummary | null; large?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayName = account?.displayName || "Arena Player";

  return (
    <span className={cx("account-avatar", large && "account-avatar--large")}>
      {account?.avatarUrl && !imageFailed ? (
        <>
          {/* OAuth avatar hosts are dynamic and intentionally bypass Next Image host allow-listing. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={account.avatarUrl} alt={large ? `${displayName} avatar` : ""} onError={() => setImageFailed(true)} />
        </>
      ) : (
        <UserRound size={large ? 30 : 19} strokeWidth={1.8} aria-hidden="true" />
      )}
      {account ? <span className="account-avatar__status" aria-hidden="true" /> : null}
    </span>
  );
}

function CompactAuthCard({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showReset, setShowReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const switchMode = (nextMode: "login" | "signup") => {
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
        options: { redirectTo: getAuthCallbackUrl("/profile/setup") },
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
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) {
          setError(friendlyAuthError(authError.message));
          return;
        }
        onClose();
        router.replace("/profile/setup");
        router.refresh();
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: getAuthCallbackUrl("/profile/setup") },
      });
      if (authError) {
        setError(friendlyAuthError(authError.message));
        return;
      }

      if (data.session) {
        onClose();
        router.replace("/profile/setup");
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

  if (showReset) {
    return (
      <section className="account-auth" aria-labelledby="account-reset-title">
        <div className="account-auth__topline">
          <button type="button" className="account-card-close" onClick={onClose} aria-label="ปิดหน้าต่างเข้าสู่ระบบ"><X size={18} /></button>
        </div>
        <div id="account-reset-title" className="sr-only">ลืมรหัสผ่าน</div>
        <PasswordResetForm compact onBack={() => { setShowReset(false); setError(""); }} />
      </section>
    );
  }

  return (
    <section className="account-auth" aria-labelledby="account-auth-title">
      <div className="account-auth__topline">
        <div className="account-auth__eyebrow"><Sparkles size={15} /> Arena Member</div>
        <button type="button" className="account-card-close" onClick={onClose} aria-label="ปิดหน้าต่างเข้าสู่ระบบ"><X size={18} /></button>
      </div>
      <div className="account-auth__heading">
        <h2 id="account-auth-title">{mode === "login" ? "กลับเข้าสู่สนามกันเถอะ" : "มาสร้างโปรไฟล์นักแบดกัน"}</h2>
        <p>{mode === "login" ? "เข้าสู่ระบบเพื่อค้นหาก๊วนและเก็บแต้มของคุณ" : "สมัครครั้งเดียว แล้วออกไปเจอก๊วนใหม่ ๆ ด้วยกัน"}</p>
      </div>

      <div className="account-auth__tabs" role="tablist" aria-label="ประเภทสมาชิก">
        <button type="button" role="tab" aria-selected={mode === "login"} className={cx("account-auth__tab", mode === "login" && "account-auth__tab--active")} onClick={() => switchMode("login")}>เข้าสู่ระบบ</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={cx("account-auth__tab", mode === "signup" && "account-auth__tab--active")} onClick={() => switchMode("signup")}>สมัครสมาชิก</button>
      </div>

      <div className="account-auth__social-grid">
        <button type="button" className="account-social account-social--line" disabled={isBusy} onClick={() => signInWithProvider(getLineProvider())}>
          <span className="account-social__mark">LINE</span> ต่อด้วย LINE
        </button>
        <button type="button" className="account-social account-social--google" disabled={isBusy} onClick={() => signInWithProvider("google")}>
          <span className="account-social__mark">G</span> ต่อด้วย Google
        </button>
      </div>

      <div className="account-auth__divider"><span>หรือใช้ Email &amp; Password</span></div>

      <form className="account-auth-form" onSubmit={submitEmailAuth} noValidate>
        <label className="account-auth-field">
          <span>อีเมล</span>
          <div className="account-auth-field__control"><AtSign size={16} aria-hidden="true" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></div>
        </label>
        <label className="account-auth-field">
          <span>รหัสผ่าน</span>
          <div className="account-auth-field__control"><LockKeyhole size={16} aria-hidden="true" /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} required /><button type="button" className="account-password-toggle" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
        </label>
        {mode === "signup" ? (
          <label className="account-auth-field">
            <span>ยืนยันรหัสผ่าน</span>
            <div className="account-auth-field__control"><LockKeyhole size={16} aria-hidden="true" /><input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={8} required /></div>
          </label>
        ) : null}
        {mode === "login" ? <button type="button" className="account-auth__forgot" onClick={() => { setShowReset(true); setError(""); setMessage(""); }}>ลืมรหัสผ่าน?</button> : null}
        {error ? <div className="account-auth-feedback account-auth-feedback--error" role="alert">{error}</div> : null}
        {message ? <div className="account-auth-feedback account-auth-feedback--success" role="status"><CheckCircle2 size={16} /> {message}</div> : null}
        <button type="submit" className="account-auth-submit" disabled={isBusy}>
          {isBusy ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ Arena" : "สร้างบัญชีของฉัน"}
          {!isBusy ? <ArrowRight size={16} /> : null}
        </button>
      </form>

      <Link href="/auth/login" className="account-auth__full-link" onClick={onClose}>
        เปิดหน้าเข้าสู่ระบบแบบเต็ม <ArrowRight size={14} />
      </Link>
    </section>
  );
}

function ProfileSetupPrompt({ onClose }: { onClose: () => void }) {
  return (
    <section className="account-profile account-profile--setup" aria-labelledby="account-setup-title">
      <div className="account-profile__topline">
        <div className="account-auth__eyebrow"><Sparkles size={15} /> Almost ready</div>
        <button type="button" className="account-card-close" onClick={onClose} aria-label="ปิด Profile Card"><X size={18} /></button>
      </div>
      <div className="account-profile__setup-icon" aria-hidden="true"><UserRound size={27} /></div>
      <h2 id="account-setup-title">โปรไฟล์ของคุณยังไม่ครบ</h2>
      <p>กรอกข้อมูลอีกนิดเดียว แล้วเริ่มค้นหาก๊วนและสนามแบดใกล้คุณได้เลย</p>
      <Link href="/profile/setup" className="account-profile__cta" onClick={onClose}>ตั้งค่า Profile <ArrowRight size={16} /></Link>
    </section>
  );
}

function ProfileSummaryCard({ account, onClose }: { account: HeaderProfileSummary; onClose: () => void }) {
  const rankText = account.rank === null ? "—" : `#${account.rank}`;
  const levelText = account.nextLevelExp === null
    ? `${formatNumber(account.expTotal)} EXP · MAX`
    : `${formatNumber(account.expTotal)} / ${formatNumber(account.nextLevelExp)} EXP`;

  return (
    <section className="account-profile" aria-labelledby="account-profile-title">
      <div className="account-profile__topline">
        <div className="account-auth__eyebrow"><Sparkles size={15} /> My Arena Profile</div>
        <button type="button" className="account-card-close" onClick={onClose} aria-label="ปิด Profile Card"><X size={18} /></button>
      </div>

      <div className="account-profile__identity">
        <AccountAvatar account={account} large />
        <div className="account-profile__identity-copy">
          <div className="account-profile__name-row">
            <h2 id="account-profile-title">{account.displayName}</h2>
            <Crown size={19} fill="currentColor" aria-label="สมาชิก Arena" />
          </div>
          <p>@{account.handle}</p>
          <span className="account-profile__title-pill">{account.levelLabel}</span>
        </div>
      </div>

      <div className="account-profile__level">
        <div className="account-profile__level-row">
          <span>Level {account.level}</span>
          <strong>{levelText}</strong>
        </div>
        <div className="account-profile__level-track" role="progressbar" aria-label={`ความคืบหน้า Level ${account.level}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={account.levelProgress}>
          <span style={{ width: `${account.levelProgress}%` }} />
        </div>
      </div>

      <div className="account-profile__stats">
        <div><Users size={19} /><strong>{formatNumber(account.stats.createdGroups)}</strong><span>ก๊วนที่จัด</span></div>
        <div><CalendarDays size={19} /><strong>{formatNumber(account.stats.joinedGroups)}</strong><span>เข้าร่วมกิจกรรม</span></div>
        <div><Trophy size={19} /><strong>{formatNumber(account.stats.matchesPlayed)}</strong><span>แมตช์แข่งขัน</span></div>
      </div>

      <Link href="/profile" className="account-profile__cta" onClick={onClose}>โปรไฟล์ของฉัน <ArrowRight size={17} /></Link>

      <Link href={account.guild ? `/guilds/${account.guild.id}` : "/guilds"} className="account-profile__guild-cta" onClick={onClose}>
        <span><ShieldCheck size={16} /><strong>{account.guild ? account.guild.name : "เข้าร่วม Guild"}</strong><small>{account.guild ? `Guild Lv.${account.guild.level} · ${account.guild.role === "guild_master" ? "Guild Master" : account.guild.role === "officer" ? "Officer" : "Member"}` : "ค้นหาบ้านใหม่ใน Arena"}</small></span><ArrowRight size={15} />
      </Link>

      {account.isAdmin ? (
        <Link href="/admin" className="account-profile__admin-cta" onClick={onClose}>
          <ShieldCheck size={16} /> เข้าสู่ระบบ Admin <ArrowRight size={15} />
        </Link>
      ) : null}

      <div className="account-profile__metrics">
        <div><Gem size={19} /><span><small>Skill BP</small><strong>{formatNumber(account.skillBp)}</strong></span></div>
        <div><TrendingUp size={19} /><span><small>อันดับของฉัน</small><strong>{rankText}</strong></span><em>{account.rank === null ? "กำลังคำนวณ" : "กำลังไต่อันดับ"}</em></div>
      </div>

      <div className="account-profile__footer">
        <span><Medal size={15} /> ชนะแล้ว {formatNumber(account.stats.wins)} แมตช์</span>
        <form action={signOut}>
          <button type="submit"><LogOut size={15} /> ออกจากระบบ</button>
        </form>
      </div>
    </section>
  );
}

export default function AccountMenu({ account, isAuthenticated }: { account: HeaderProfileSummary | null; isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) closeMenu();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("input, button, a")?.focus());

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closeMenu, open]);

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cx("profile-chip", "account-trigger", open && "account-trigger--open")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={account ? `เปิดโปรไฟล์ของ ${account.displayName}` : isAuthenticated ? "ตั้งค่า Profile" : "เข้าสู่ระบบ"}
        onClick={() => setOpen((current) => !current)}
      >
        <AccountAvatar account={account} />
        <span className="hidden text-left sm:block">
          <strong>{account?.displayName ?? (isAuthenticated ? "ตั้งค่าโปรไฟล์" : "เข้าสู่ระบบ")}</strong>
          <small lang="en">{account ? `Lv.${account.level}` : isAuthenticated ? "Complete profile" : "Join Arena"}</small>
        </span>
        <ChevronDown className={cx("account-trigger__chevron", "hidden sm:block", open && "account-trigger__chevron--open")} size={15} />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button type="button" className="account-backdrop" aria-label="ปิด Account Card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeMenu} />
            <motion.div ref={panelRef} className="account-popover" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.18, ease: "easeOut" }} role="dialog" aria-modal="true">
              {isAuthenticated && account ? <ProfileSummaryCard account={account} onClose={closeMenu} /> : isAuthenticated ? <ProfileSetupPrompt onClose={closeMenu} /> : <CompactAuthCard onClose={closeMenu} />}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
