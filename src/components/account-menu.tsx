"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { AuthChangeEvent, Provider, Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  AtSign,
  CheckCircle2,
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
  X,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { friendlyAuthError, getAuthCallbackUrl } from "@/lib/auth-client";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { safeMediaUrl } from "@/lib/safe-media-url";
import type { HeaderProfileSummary } from "@/types/profile";
import PasswordResetForm from "@/components/password-reset-form";
import GoogleLogo from "@/components/google-logo";
import { AvatarPreview } from "@/components/avatar-preview";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const formatNumber = (value: number) =>
  new Intl.NumberFormat("th-TH").format(value);

function AccountAvatar({
  account,
  large = false,
}: {
  account: HeaderProfileSummary | null;
  large?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayName = account?.displayName || "Arena Player";
  const avatarUrl = safeMediaUrl(account?.avatarUrl);

  return (
    <span className={cx("account-avatar", large && "account-avatar--large")}>
      {avatarUrl && !imageFailed ? (
        <>
          {/* OAuth avatar hosts are dynamic and intentionally bypass Next Image host allow-listing. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={large ? `${displayName} avatar` : ""}
            style={{
              objectPosition: `${account?.avatarFocusX ?? 50}% ${account?.avatarFocusY ?? 50}%`,
            }}
            onError={() => setImageFailed(true)}
          />
        </>
      ) : (
        <UserRound
          size={large ? 30 : 19}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      )}
      {account ? (
        <span className="account-avatar__status" aria-hidden="true" />
      ) : null}
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
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
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
        body: JSON.stringify({
          email: email.trim(),
          password,
          nextPath: "/profile/setup",
        }),
      });
      const result = (await response.json()) as {
        code?: string;
        message?: string;
        needsVerification?: boolean;
        sessionCreated?: boolean;
      };
      if (!response.ok) {
        setError(
          result.code === "AUTH_CONFIRMATION_CONFIGURATION"
            ? (result.message ?? "ระบบยืนยัน Email ยังตั้งค่าไม่ครบ")
            : friendlyAuthError(result.message ?? ""),
        );
        return;
      }

      if (result.needsVerification) {
        setMessage(
          "สมัครสมาชิกสำเร็จแล้ว กรุณาเปิดอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ",
        );
        setPassword("");
        setConfirmPassword("");
        return;
      }

      if (!result.sessionCreated) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
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
          <button
            type="button"
            className="account-card-close"
            onClick={onClose}
            aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
          >
            <X size={18} />
          </button>
        </div>
        <div id="account-reset-title" className="sr-only">
          ลืมรหัสผ่าน
        </div>
        <PasswordResetForm
          compact
          onBack={() => {
            setShowReset(false);
            setError("");
          }}
        />
      </section>
    );
  }

  return (
    <section className="account-auth" aria-labelledby="account-auth-title">
      <div className="account-auth__topline">
        <div className="account-auth__eyebrow">
          <Sparkles size={15} /> Arena Member
        </div>
        <button
          type="button"
          className="account-card-close"
          onClick={onClose}
          aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
        >
          <X size={18} />
        </button>
      </div>
      <div className="account-auth__heading">
        <h2 id="account-auth-title">
          {mode === "login"
            ? "กลับเข้าสู่สนามกันเถอะ"
            : "มาสร้างโปรไฟล์นักแบดกัน"}
        </h2>
        <p>
          {mode === "login"
            ? "เข้าสู่ระบบเพื่อค้นหาก๊วนและเก็บแต้มของคุณ"
            : "สมัครครั้งเดียว แล้วออกไปเจอก๊วนใหม่ ๆ ด้วยกัน"}
        </p>
      </div>

      <div
        className="account-auth__tabs"
        role="tablist"
        aria-label="ประเภทสมาชิก"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={cx(
            "account-auth__tab",
            mode === "login" && "account-auth__tab--active",
          )}
          onClick={() => switchMode("login")}
        >
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={cx(
            "account-auth__tab",
            mode === "signup" && "account-auth__tab--active",
          )}
          onClick={() => switchMode("signup")}
        >
          สมัครสมาชิก
        </button>
      </div>

      <div className="account-auth__social-grid">
        <button
          type="button"
          className="account-social account-social--google"
          disabled={isBusy}
          onClick={() => signInWithProvider("google")}
        >
          <span className="account-social__mark"><GoogleLogo size={18} /></span>
          <span>เข้าระบบด้วย Google</span>
        </button>
      </div>

      <div className="account-auth__divider">
        <span>หรือใช้ Email &amp; Password</span>
      </div>

      <form className="account-auth-form" onSubmit={submitEmailAuth} noValidate>
        <label className="account-auth-field">
          <span>อีเมล</span>
          <div className="account-auth-field__control">
            <AtSign size={16} aria-hidden="true" />
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
        <label className="account-auth-field">
          <span>รหัสผ่าน</span>
          <div className="account-auth-field__control">
            <LockKeyhole size={16} aria-hidden="true" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder="อย่างน้อย 8 ตัวอักษร"
              minLength={8}
              required
            />
            <button
              type="button"
              className="account-password-toggle"
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {mode === "signup" ? (
          <label className="account-auth-field">
            <span>ยืนยันรหัสผ่าน</span>
            <div className="account-auth-field__control">
              <LockKeyhole size={16} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                minLength={8}
                required
              />
            </div>
          </label>
        ) : null}
        {mode === "login" ? (
          <button
            type="button"
            className="account-auth__forgot"
            onClick={() => {
              setShowReset(true);
              setError("");
              setMessage("");
            }}
          >
            ลืมรหัสผ่าน?
          </button>
        ) : null}
        {error ? (
          <div
            className="account-auth-feedback account-auth-feedback--error"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {message ? (
          <div
            className="account-auth-feedback account-auth-feedback--success"
            role="status"
          >
            <CheckCircle2 size={16} /> {message}
          </div>
        ) : null}
        <button type="submit" className="account-auth-submit" disabled={isBusy}>
          {isBusy
            ? "กำลังดำเนินการ..."
            : mode === "login"
              ? "เข้าสู่ Arena"
              : "สร้างบัญชีของฉัน"}
          {!isBusy ? <ArrowRight size={16} /> : null}
        </button>
      </form>

      <Link
        href="/auth/login"
        className="account-auth__full-link"
        onClick={onClose}
      >
        เปิดหน้าเข้าสู่ระบบแบบเต็ม <ArrowRight size={14} />
      </Link>
    </section>
  );
}

function ProfileSetupPrompt({ onClose }: { onClose: () => void }) {
  return (
    <section
      className={cx("account-profile", "account-profile--setup")}
      aria-labelledby="account-setup-title"
    >
      <div className="account-profile__topline">
        <div className="account-auth__eyebrow">
          <Sparkles size={15} /> Almost ready
        </div>
        <button
          type="button"
          className="account-card-close"
          onClick={onClose}
          aria-label="ปิด Profile Card"
        >
          <X size={18} />
        </button>
      </div>
      <div className="account-profile__setup-icon" aria-hidden="true">
        <UserRound size={27} />
      </div>
      <h2 id="account-setup-title">โปรไฟล์ของคุณยังไม่ครบ</h2>
      <p>กรอกข้อมูลอีกนิดเดียว แล้วเริ่มค้นหาก๊วนและสนามแบดใกล้คุณได้เลย</p>
      <Link
        href="/profile/setup"
        className="account-profile__cta"
        onClick={onClose}
      >
        ตั้งค่า Profile <ArrowRight size={16} />
      </Link>
    </section>
  );
}

function AccountSummaryLoading() {
  return (
    <section
      className={cx("account-profile", "account-profile--setup")}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="account-auth__eyebrow">
        <Sparkles size={15} /> Arena Member
      </div>
      <div className="account-profile__setup-icon" aria-hidden="true">
        <Sparkles className="community-spin" size={27} />
      </div>
      <h2>กำลังเปิด Arena Pass...</h2>
      <p>กำลังตรวจสอบสถานะบัญชีของคุณ</p>
    </section>
  );
}

function AccountSummaryError({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      className={cx("account-profile", "account-profile--setup")}
      aria-labelledby="account-summary-error-title"
    >
      <div className="account-auth__eyebrow">
        <Sparkles size={15} /> Arena Member
      </div>
      <div className="account-profile__setup-icon" aria-hidden="true">
        <ShieldCheck size={27} />
      </div>
      <h2 id="account-summary-error-title">เชื่อมต่อ Arena Pass ไม่สำเร็จ</h2>
      <p>สถานะ Login ยังอยู่ แต่โหลดรายละเอียด Profile ไม่ทัน กรุณาลองใหม่</p>
      <button type="button" className="account-profile__cta" onClick={onRetry}>
        ลองเปิด Arena Pass ใหม่ <ArrowRight size={16} />
      </button>
    </section>
  );
}

function ArcadeProfileSummaryCard({
  account,
  onClose,
}: {
  account: HeaderProfileSummary;
  onClose: () => void;
}) {
  const rankText =
    account.rank === null ? "—" : `#${formatNumber(account.rank)}`;
  const levelText =
    account.nextLevelExp === null
      ? `${formatNumber(account.expTotal)} EXP (MAX)`
      : `${formatNumber(account.expTotal)} / ${formatNumber(account.nextLevelExp)} EXP`;
  const bgUrl =
    safeMediaUrl(account.profileBackgroundUrl) || "/assets/hero-scene.webp";

  return (
    <section
      className="account-profile account-profile--arcade"
      aria-labelledby="account-profile-title"
    >
      <div className="account-profile__cover-container">
        <div className="account-profile__mini-cover">
          <img
            src={bgUrl}
            alt=""
            style={{
              objectPosition: `${account.backgroundFocusX}% ${account.backgroundFocusY}%`,
            }}
          />
          <div className="account-profile__mini-cover-gradient" />
        </div>

        <div className="account-profile__topline">
          <div className="account-profile__pass-badge">
            <Sparkles size={12} />
            <span>ARENA PASS</span>
          </div>
          <Link
            href="/shop"
            className="account-profile__wallet-pill"
            onClick={onClose}
            title="เติม Arena Points"
          >
            <Gem size={13} className="text-amber-400" />
            <strong>{formatNumber(account.gemsBalance)}</strong>
            <span className="account-profile__wallet-plus">+</span>
          </Link>
          <button
            type="button"
            className="account-card-close account-card-close--cover"
            onClick={onClose}
            aria-label="ปิด Profile Card"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="account-profile__identity-wrap">
        <div className="account-profile__avatar-box">
          <AvatarPreview
            avatarUrl={safeMediaUrl(account.avatarUrl)}
            displayName={account.displayName}
          >
            <AccountAvatar account={account} large />
          </AvatarPreview>
        </div>
        <div className="account-profile__user-info">
          <div className="account-profile__name-line">
            <h2 id="account-profile-title">{account.displayName}</h2>
            <Crown
              size={16}
              className="text-amber-400 fill-amber-400"
              aria-label="สมาชิก Arena"
            />
          </div>
          <p className="account-profile__handle">
            @{account.handle.replace(/^@/, "")}
          </p>
          <div className="account-profile__badges-row">
            <span
              className={`account-profile__rank-pill account-profile__rank-pill--${account.skillRankColor}`}
            >
              Tier {account.skillRankTier} · {account.skillRankName}
            </span>
            <Link
              href="/ranking"
              className="account-profile__rank-tag"
              onClick={onClose}
            >
              <TrendingUp size={11} />
              <span>Rank {rankText}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="account-profile__exp-section">
        <div className="account-profile__exp-labels">
          <span>
            Lv.{account.level} {account.levelLabel}
          </span>
          <strong>{levelText}</strong>
        </div>
        <div
          className="account-profile__exp-track"
          role="progressbar"
          aria-label={`ความคืบหน้า Level ${account.level}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={account.levelProgress}
        >
          <span style={{ width: `${account.levelProgress}%` }} />
        </div>
      </div>

      <div className="account-profile__bento-matrix">
        <div className="account-profile__bento-box account-profile__bento-box--combat">
          <div className="account-profile__bento-header">
            <Trophy size={13} />
            <span>สถิติการแข่ง</span>
            <small className="ml-auto text-pink-600 font-bold">
              {account.stats.winRate.toFixed(0)}% Win
            </small>
          </div>
          <div className="account-profile__bento-body">
            <div className="account-profile__bento-stat">
              <small>ชนะ / แพ้</small>
              <strong>
                {account.stats.wins}W - {account.stats.losses}L
              </strong>
            </div>
            <div className="account-profile__bento-stat">
              <small>Skill BP</small>
              <strong className="text-purple-600">
                {formatNumber(account.skillBp)}
              </strong>
            </div>
          </div>
        </div>
        <div className="account-profile__bento-box account-profile__bento-box--activity">
          <div className="account-profile__bento-header">
            <Users size={13} />
            <span>ก๊วน &amp; กิจกรรม</span>
          </div>
          <div className="account-profile__bento-body">
            <div className="account-profile__bento-stat">
              <small>ก๊วนที่สร้าง</small>
              <strong>{formatNumber(account.stats.createdGroups)}</strong>
            </div>
            <div className="account-profile__bento-stat">
              <small>เข้าร่วมแล้ว</small>
              <strong>{formatNumber(account.stats.joinedGroups)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cx(
          "account-profile__capsules-grid",
          Boolean(account.isAdmin) && "account-profile__capsules-grid--admin",
        )}
      >
        <Link
          href="/friends"
          className="account-profile__capsule-btn"
          onClick={onClose}
        >
          <Users size={15} />
          <span>เพื่อน</span>
          {account.pendingFriendRequestCount > 0 ? (
            <b className="account-profile__capsule-badge">
              {Math.min(99, account.pendingFriendRequestCount)}
            </b>
          ) : null}
        </Link>
        <Link
          href={account.guild ? `/guilds/${account.guild.id}` : "/guilds"}
          className="account-profile__capsule-btn"
          onClick={onClose}
        >
          <ShieldCheck size={15} />
          <span>
            {account.guild ? `กิลด์ Lv.${account.guild.level}` : "เข้ากิลด์"}
          </span>
        </Link>
        <Link
          href="/profile"
          className="account-profile__capsule-btn account-profile__capsule-btn--primary"
          onClick={onClose}
        >
          <UserRound size={15} />
          <span>โปรไฟล์เต็ม</span>
        </Link>
        {Boolean(account.isAdmin) ? (
          <Link
            href="/admin"
            className="account-profile__capsule-btn account-profile__capsule-btn--admin"
            onClick={onClose}
          >
            <ShieldCheck size={14} />
            <span>Admin</span>
          </Link>
        ) : null}
      </div>

      <div className="account-profile__footer-line">
        <form action={signOut}>
          <button type="submit" className="account-profile__logout-btn">
            <LogOut size={13} /> ออกจากระบบ
          </button>
        </form>
      </div>
    </section>
  );
}

function ProfileSummaryCard({
  account,
  onClose,
}: {
  account: HeaderProfileSummary;
  onClose: () => void;
}) {
  return <ArcadeProfileSummaryCard account={account} onClose={onClose} />;
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

export default function AccountMenu({
  account = null,
  isAuthenticated = false,
  onSessionResolved,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<AccountSession>({
    account,
    isAuthenticated,
  });
  const [summaryState, setSummaryState] = useState<
    "loading" | "ready" | "error"
  >(account ? "ready" : "loading");
  const [summaryRetry, setSummaryRetry] = useState(0);
  const sessionRef = useRef<AccountSession>({ account, isAuthenticated });
  const authStateRef = useRef<boolean | null>(
    account || isAuthenticated ? true : null,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = "account-profile-popover";

  const applySession = useCallback(
    (nextSession: AccountSession) => {
      sessionRef.current = nextSession;
      setSession(nextSession);
      onSessionResolved?.(nextSession);
    },
    [onSessionResolved],
  );

  const closeMenu = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    if (!sessionRef.current.account) setSummaryState("loading");

    const markSummaryError = () => {
      if (!cancelled && !sessionRef.current.account) setSummaryState("error");
    };

    const refreshSummary = async (attempt = 0): Promise<void> => {
      try {
        const response = await fetch("/api/profile/summary", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          if (!cancelled && attempt < 2) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, 250 * (attempt + 1)),
            );
            return refreshSummary(attempt + 1);
          }
          markSummaryError();
          return;
        }

        const payload = (await response.json()) as {
          account?: HeaderProfileSummary | null;
          isAuthenticated?: boolean;
        };
        if (cancelled) return;

        const nextIsAuthenticated = Boolean(payload.isAuthenticated);
        // A transient/failed server summary must never downgrade a browser
        // session that Supabase has already confirmed as signed in.
        if (authStateRef.current === true && !nextIsAuthenticated) {
          markSummaryError();
          return;
        }

        authStateRef.current = nextIsAuthenticated;
        setSummaryState("ready");
        applySession({
          account: payload.account ?? null,
          isAuthenticated: nextIsAuthenticated,
        });
      } catch {
        if (!cancelled && attempt < 2) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, 250 * (attempt + 1)),
          );
          return refreshSummary(attempt + 1);
        }
        markSummaryError();
        // The browser auth listener below still provides the authoritative
        // signed-in/signed-out state when the optional summary endpoint is
        // temporarily unavailable.
      }
    };

    let supabase: ReturnType<typeof getSupabaseBrowserClient> | null = null;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      // Keep the summary request usable on deployments without browser env.
    }

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, authSession: Session | null) => {
        if (authSession?.user) {
          authStateRef.current = true;
          if (!sessionRef.current.account) setSummaryState("loading");
          applySession({
            ...sessionRef.current,
            isAuthenticated: true,
          });
          window.setTimeout(() => void refreshSummary(), 0);
        } else if (event === "SIGNED_OUT") {
          authStateRef.current = false;
          setSummaryState("ready");
          applySession({ account: null, isAuthenticated: false });
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();

      void (async () => {
        try {
          const { data: userData, error } = await supabase.auth.getUser();
          if (!cancelled && !error && userData.user) {
            authStateRef.current = true;
            if (!sessionRef.current.account) setSummaryState("loading");
            applySession({
              ...sessionRef.current,
              isAuthenticated: true,
            });
          } else if (!cancelled && !error && authStateRef.current !== true) {
            authStateRef.current = false;
            setSummaryState("ready");
            applySession({ account: null, isAuthenticated: false });
          }
        } catch {
          // Let the server summary resolve the state if the Auth request fails.
        }
        await refreshSummary();
      })();
    } else {
      void refreshSummary();
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applySession, summaryRetry]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        closeMenu();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    window.requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>("input, button, a")?.focus(),
    );

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
        className={cx(
          "profile-chip",
          "account-trigger",
          open && "account-trigger--open",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={
          currentAccount
            ? `เปิดโปรไฟล์ของ ${currentAccount.displayName}`
            : currentIsAuthenticated
              ? "ตั้งค่า Profile"
              : "เข้าสู่ระบบ"
        }
        onClick={() => setOpen((current) => !current)}
        whileHover={{ scale: 1.12, y: -2 }}
        whileTap={{ scale: 0.84, rotate: -5 }}
        animate={
          open
            ? { scale: 1.1, rotate: [0, -7, 5, -2, 0] }
            : { scale: 1, rotate: 0 }
        }
        transition={{ type: "spring", stiffness: 350, damping: 15 }}
      >
        <AccountAvatar account={currentAccount} />
        <span className="account-trigger__text">
          <strong>
            {currentAccount?.displayName ??
              (currentIsAuthenticated ? "ตั้งค่าโปรไฟล์" : "เข้าสู่ระบบ")}
          </strong>
          <small lang="en">
            {currentAccount
              ? `Lv.${currentAccount.level}`
              : currentIsAuthenticated
                ? "Complete profile"
                : "Join Arena"}
          </small>
        </span>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              className="account-backdrop"
              aria-label="ปิด Account Card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
            />
            <motion.div
              ref={panelRef}
              id={popoverId}
              className={cx(
                "account-popover",
                currentAccount && "account-popover--profile",
              )}
              initial={{ opacity: 0, scale: 0.68, y: -36, rotate: 2, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0, filter: "blur(0px)" }}
              exit={{
                opacity: 0,
                scale: 0.76,
                y: -20,
                filter: "blur(6px)",
                transition: { duration: 0.18, ease: "easeOut" },
              }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 16,
                mass: 0.55,
              }}
              role="dialog"
              aria-modal="true"
            >
              {summaryState === "loading" ? (
                <AccountSummaryLoading />
              ) : summaryState === "error" ? (
                <AccountSummaryError
                  onRetry={() => setSummaryRetry((current) => current + 1)}
                />
              ) : currentIsAuthenticated && currentAccount ? (
                <div className="account-popover--rgb-frame">
                  <ProfileSummaryCard
                    account={currentAccount}
                    onClose={closeMenu}
                  />
                </div>
              ) : currentIsAuthenticated ? (
                <ProfileSetupPrompt onClose={closeMenu} />
              ) : (
                <CompactAuthCard onClose={closeMenu} />
              )}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
