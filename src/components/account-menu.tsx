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
  Sparkles,
  ShieldCheck,
  Trophy,
  TrendingUp,
  UserRound,
  Users,
  XCircle,
  X,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { friendlyAuthError, getAuthCallbackUrl } from "@/lib/auth-client";
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
          <img src={account.avatarUrl} alt={large ? `${displayName} avatar` : ""} style={{ objectPosition: `${account.avatarFocusX}% ${account.avatarFocusY}%` }} onError={() => setImageFailed(true)} />
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

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, nextPath: "/profile/setup" }),
      });
      const result = await response.json() as { code?: string; message?: string; needsVerification?: boolean; sessionCreated?: boolean };
      if (!response.ok) {
        setError(result.code === "AUTH_CONFIRMATION_CONFIGURATION" ? result.message ?? "ระบบยืนยัน Email ยังตั้งค่าไม่ครบ" : friendlyAuthError(result.message ?? ""));
        return;
      }

      if (result.needsVerification) {
        setMessage("สมัครสมาชิกสำเร็จแล้ว กรุณาเปิดอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      if (!result.sessionCreated) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) {
          setError(friendlyAuthError(signInError.message));
          return;
        }
      }
      onClose();
      router.replace("/profile/setup");
      router.refresh();
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
    <section className={cx("account-profile", "account-profile--setup")} aria-labelledby="account-setup-title">
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
          <span className={`account-profile__rank-pill account-profile__rank-pill--${account.skillRankColor}`}>Tier {account.skillRankTier} · {account.skillRankName}</span>

          <div className="account-profile__score-row" aria-label="Skill BP และ Ranking">
            <div className="account-profile__score-card account-profile__score-card--bp">
              <Gem size={14} aria-hidden="true" />
              <span><small>Skill BP</small><strong>{formatNumber(account.skillBp)}</strong></span>
            </div>
            <Link href="/ranking" className="account-profile__score-card account-profile__score-card--rank" onClick={onClose} aria-label={`Ranking ${rankText}`}>
              <TrendingUp size={14} aria-hidden="true" />
              <span><small>Ranking</small><strong>{rankText}</strong></span>
            </Link>
          </div>

          <div className="account-profile__points-row">
            <span className="account-profile__points-balance"><Gem size={15} fill="currentColor" aria-hidden="true" /><span><small>Point</small><strong>{formatNumber(account.gemsBalance)}</strong></span></span>
            <Link href="/shop" className="account-profile__points-topup" onClick={onClose}>เติมพ้อยท์ <ArrowRight size={11} /></Link>
          </div>
        </div>
      </div>

      <div className="account-profile__record" aria-label="ประวัติการแข่ง">
        <div className="account-profile__record-item account-profile__record-item--rate">
          <TrendingUp size={17} aria-hidden="true" />
          <span><small>Win rate</small><strong>{account.stats.winRate.toFixed(1)}%</strong></span>
        </div>
        <div className="account-profile__record-item account-profile__record-item--wins">
          <Trophy size={17} aria-hidden="true" />
          <span><small>ชนะ</small><strong>{formatNumber(account.stats.wins)}</strong></span>
        </div>
        <div className="account-profile__record-item account-profile__record-item--losses">
          <XCircle size={17} aria-hidden="true" />
          <span><small>แพ้</small><strong>{formatNumber(account.stats.losses)}</strong></span>
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

      <div className={cx("account-profile__quick-actions", account.isAdmin && "account-profile__quick-actions--admin")} aria-label="เมนูโปรไฟล์">
        <Link href="/friends" className="account-profile__social-link" onClick={onClose}>
          <Users size={17} />
          <span><strong>เพื่อน</strong><small>{account.pendingFriendRequestCount > 0 ? `${formatNumber(account.pendingFriendRequestCount)} คำขอใหม่` : "จัดการเพื่อน"}</small></span>
          {account.pendingFriendRequestCount > 0 ? <b>{Math.min(99, account.pendingFriendRequestCount)}</b> : <ArrowRight size={14} />}
        </Link>
        <Link href={account.guild ? `/guilds/${account.guild.id}` : "/guilds"} className="account-profile__social-link account-profile__social-link--guild" onClick={onClose} title={account.guild?.name ?? "เข้าร่วม Guild"}>
          <ShieldCheck size={17} />
          <span><strong>Guild</strong><small>{account.guild ? `Lv.${account.guild.level} · ${account.guild.role === "guild_master" ? "Master" : account.guild.role === "officer" ? "Officer" : "Member"}` : "เข้าร่วม Guild"}</small></span>
          <ArrowRight size={14} />
        </Link>

        <Link href="/profile" className="account-profile__social-link account-profile__social-link--profile" onClick={onClose}>
          <UserRound size={17} />
          <span><strong>โปรไฟล์</strong><small>ของฉัน</small></span>
          <ArrowRight size={14} />
        </Link>

        {account.isAdmin ? (
          <Link href="/admin" className="account-profile__social-link account-profile__social-link--admin" onClick={onClose}>
            <ShieldCheck size={17} />
            <span><strong>Admin</strong><small>จัดการระบบ</small></span>
            <ArrowRight size={14} />
          </Link>
        ) : null}
      </div>

      <div className="account-profile__footer">
        <form action={signOut}>
          <button type="submit"><LogOut size={15} /> ออกจากระบบ</button>
        </form>
      </div>
    </section>
  );
}

type AccountSession = {
  account: HeaderProfileSummary | null;
  isAuthenticated: boolean;
};

type AccountMenuProps = {
  account?: HeaderProfileSummary | null;
  isAuthenticated?: boolean;
  onSessionResolved?: (session: AccountSession) => void;
};

export default function AccountMenu({ account = null, isAuthenticated = false, onSessionResolved }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<AccountSession>({ account, isAuthenticated });
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = "account-profile-popover";

  const closeMenu = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/profile/summary", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { account?: HeaderProfileSummary | null; isAuthenticated?: boolean };
      })
      .then((payload) => {
        if (cancelled || !payload) return;
        const nextSession = {
          account: payload.account ?? null,
          isAuthenticated: Boolean(payload.isAuthenticated),
        };
        setSession(nextSession);
        onSessionResolved?.(nextSession);
      })
      .catch(() => {
        // The trigger remains usable as a login/profile button when the
        // optional session read is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [onSessionResolved]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
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

  const currentAccount = session.account;
  const currentIsAuthenticated = session.isAuthenticated;

  return (
    <div className="account-menu" ref={menuRef}>
      <motion.button
        ref={triggerRef}
        type="button"
        className={cx("profile-chip", "account-trigger", open && "account-trigger--open")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={currentAccount ? `เปิดโปรไฟล์ของ ${currentAccount.displayName}` : currentIsAuthenticated ? "ตั้งค่า Profile" : "เข้าสู่ระบบ"}
        onClick={() => setOpen((current) => !current)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        <AccountAvatar account={currentAccount} />
        <span className="account-trigger__text">
          <strong>{currentAccount?.displayName ?? (currentIsAuthenticated ? "ตั้งค่าโปรไฟล์" : "เข้าสู่ระบบ")}</strong>
          <small lang="en">{currentAccount ? `Lv.${currentAccount.level}` : currentIsAuthenticated ? "Complete profile" : "Join Arena"}</small>
        </span>
        <ChevronDown className={cx("account-trigger__chevron", open && "account-trigger__chevron--open")} size={16} aria-hidden="true" />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button type="button" className="account-backdrop" aria-label="ปิด Account Card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={closeMenu} />
            <motion.div
              ref={panelRef}
              id={popoverId}
              className={cx("account-popover", currentAccount && "account-popover--profile")}
              initial={{ opacity: 0, scale: 0.95, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12, transition: { duration: 0.18, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 380, damping: 26, mass: 0.8 }}
              role="dialog"
              aria-modal="true"
              style={{ transformOrigin: "top right" }}
            >
              {currentIsAuthenticated && currentAccount ? (
                <div className="account-popover--rgb-frame">
                  <ProfileSummaryCard account={currentAccount} onClose={closeMenu} />
                </div>
              ) : currentIsAuthenticated ? <ProfileSetupPrompt onClose={closeMenu} /> : <CompactAuthCard onClose={closeMenu} />}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
