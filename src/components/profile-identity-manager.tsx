"use client";

import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { Check, Link2, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { friendlyAuthError, getAuthCallbackUrl } from "@/lib/auth-client";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const providerLabels: Record<string, string> = {
  email: "Email & Password",
  google: "Google Account",
};

function providerLabel(provider: string) {
  return providerLabels[provider] ?? provider;
}

export default function ProfileIdentityManager({ connectedProviders, initialError }: { connectedProviders: string[]; initialError?: string }) {
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [error, setError] = useState(initialError ?? "");
  const normalizedProviders = new Set(connectedProviders);
  const linkableProviders = ["google"] as const;
  const hasEmailPassword = normalizedProviders.has("email");

  async function linkProvider(providerName: (typeof linkableProviders)[number]) {
    setError("");
    setIsBusy(providerName);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: linkError } = await supabase.auth.linkIdentity({
        provider: providerName as Provider,
        options: { redirectTo: getAuthCallbackUrl("/profile/edit") },
      });
      if (linkError) {
        setError(friendlyAuthError(linkError.message));
      } else if (data.url) {
        window.location.assign(data.url);
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อ Provider นี้ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsBusy(null);
    }
  }

  return (
    <section className="profile-identity-manager" aria-labelledby="profile-identities-title">
      <div className="profile-form-section__heading"><span>03</span><div><h2 id="profile-identities-title">ช่องทางเข้าสู่ระบบ</h2><p>เชื่อม Provider เพิ่มได้ โดยข้อมูล Profile เดิมจะยังอยู่บัญชีเดียวกัน</p></div></div>
      <div className="profile-identity-list">
        <div className="profile-identity-item profile-identity-item--email"><span className="profile-identity-item__mark">@</span><div><strong>Email &amp; Password</strong><small>{hasEmailPassword ? "ช่องทางหลักสำหรับกู้คืนบัญชี" : "บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน Email"}</small></div>{hasEmailPassword ? <span className="profile-identity-connected"><Check size={14} /> เชื่อมแล้ว</span> : <span className="profile-identity-unconnected">ยังไม่เชื่อม</span>}</div>
        {linkableProviders.map((provider) => {
          const connected = normalizedProviders.has(provider);
          return <div className="profile-identity-item" key={provider}><span className={`profile-identity-item__mark profile-identity-item__mark--${provider}`}>G</span><div><strong>{providerLabel(provider)}</strong><small>{connected ? "ใช้เข้าสู่บัญชี Arena นี้ได้" : "ยังไม่ได้เชื่อมกับบัญชีนี้"}</small></div>{connected ? <span className="profile-identity-connected"><Check size={14} /> เชื่อมแล้ว</span> : <button type="button" className="profile-identity-link" onClick={() => void linkProvider(provider)} disabled={isBusy !== null}><Link2 size={14} />{isBusy === provider ? <><LoaderCircle className="community-spin" size={14} /> กำลังเชื่อม</> : "เชื่อมต่อ"}</button>}</div>;
        })}
      </div>
      {error ? <p className="profile-identity-feedback" role="alert"><Sparkles size={15} />{error}</p> : null}
      <p className="profile-identity-note"><ShieldCheck size={15} /> ระบบไม่อนุญาตให้เปลี่ยนหรือยกเลิก Provider จากหน้าเว็บจนกว่าจะมีช่องทางสำรอง เพื่อป้องกันการล็อกบัญชีตัวเอง</p>
    </section>
  );
}
