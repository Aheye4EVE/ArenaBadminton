import type { Metadata } from "next";
import Link from "next/link";
import GuildInviteAccept from "@/components/guild-invite-accept";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Guild Invitation | Arena-Badminton" };
export const dynamic = "force-dynamic";

type SearchParams = { token?: string | string[] };

function firstParam(params: SearchParams, key: keyof SearchParams) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function GuildInvitePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const token = firstParam(await searchParams, "token").trim().slice(0, 128);
  const callbackPath = `/guilds/invite?token=${encodeURIComponent(token)}`;
  const loginHref = `/auth/login?next=${encodeURIComponent(callbackPath)}`;
  const { supabase, user, profile } = await getAuthenticatedProfile();

  if (!token) return <main className="guild-invite-page"><div className="guild-invite-shell"><Link href="/" className="guilds-brand"><span>Arena</span><em>-Badminton</em></Link><section className="guild-invite-card"><div className="guild-invite-card__crest">🛡️</div><h1>ไม่พบลิงก์คำเชิญ</h1><span>กรุณาเปิดลิงก์คำเชิญจาก Notification หรือขอคำเชิญใหม่จาก Guild Master</span><Link href="/guilds" className="guild-secondary-action">กลับ Guild Directory</Link></section></div></main>;

  if (!supabase || !user) return <GuildInviteAccept token={token} guildName={null} status={null} expiresAt={null} authRequired loginHref={loginHref} />;
  if (!profile?.profile_completed_at) return <GuildInviteAccept token={token} guildName={null} status="pending" expiresAt={null} loginHref={loginHref} profileIncomplete />;

  const { data: invite } = await supabase.from("guild_invites").select("guild_id, status, expires_at").eq("invite_token", token).eq("invitee_id", user.id).maybeSingle();
  const guild = invite?.guild_id ? (await supabase.from("guilds").select("name").eq("id", invite.guild_id).maybeSingle()).data : null;
  return <GuildInviteAccept token={token} guildName={guild?.name ?? null} status={invite?.status ?? null} expiresAt={invite?.expires_at ?? null} loginHref={loginHref} />;
}
