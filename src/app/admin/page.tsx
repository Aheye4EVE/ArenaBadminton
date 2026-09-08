import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { ShieldCheck } from "lucide-react";
import AdminAuthSettingsPanel from "@/components/admin-auth-settings-panel";
import AdminConsoleWorkspace, { type AdminConsoleSection } from "@/components/admin-console-workspace";
import AdminGuildSettingsPanel from "@/components/admin-guild-settings-panel";
import AdminModerationPanel from "@/components/admin-moderation-panel";
import AdminShopPanel, { type AdminShopItem } from "@/components/admin-shop-panel";
import AdminTrophyPanel, { type AdminTrophyItem } from "@/components/admin-trophy-panel";
import AdminUsersPanel, { type AdminUserListItem } from "@/components/admin-users-panel";
import AdminVenueSuggestionsPanel, { type AdminVenueSuggestion } from "@/components/admin-venue-suggestions-panel";
import BpRuleEditor, { type BpRules } from "@/components/bp-rule-editor";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Admin Console | Arena-Badminton" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function cleanSearch(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  const result = stringValue(value).trim();
  return result ? result : null;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) notFound();

  const params = await searchParams;
  const search = cleanSearch(firstParam(params, "q"));
  const parsedPage = Number.parseInt(firstParam(params, "page"), 10);
  const page = Number.isFinite(parsedPage) ? Math.min(500, Math.max(1, parsedPage)) : 1;
  const pageSize = 30;

  const [
    usersResult,
    countResult,
    guildSettingsResult,
    guildCountResult,
    shopResult,
    bpRulesResult,
    trophyResult,
    moderationResult,
    venueResult,
    authSettingsResult,
  ] = await Promise.all([
    supabase.rpc("admin_list_users", { p_search: search || null, p_limit: pageSize, p_offset: (page - 1) * pageSize }),
    supabase.rpc("admin_count_users", { p_search: search || null }),
    supabase.rpc("get_guild_creation_settings"),
    supabase.from("guilds").select("id", { count: "exact", head: true }),
    supabase
      .from("shop_items")
      .select("id, slug, name, description, item_type, rarity_tier, icon, effect_type, effect_value, price_gems, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("bp_rule_configs")
      .select("id, rule_version, min_bp, base_win_bp, base_loss_bp, upset_bonus_per_level, favorite_win_penalty_per_level, upset_loss_penalty_per_level, favorite_loss_protection_per_level, min_win_delta, max_win_delta, min_loss_delta, max_loss_delta")
      .eq("id", "default")
      .maybeSingle(),
    supabase
      .from("shop_items")
      .select("id, name, icon, rarity_tier")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("moderation_reports")
      .select("id, reporter_id, target_type, target_id, reason, details, status, created_at")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("venue_suggestions")
      .select("id, name, province, district, subdistrict, address, source_url, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("email_verification_settings")
      .select("email_verification_required, updated_at")
      .eq("id", "default")
      .maybeSingle(),
  ]);

  const rawUserRows = Array.isArray(usersResult.data) ? usersResult.data as Array<Record<string, unknown>> : [];
  const users: AdminUserListItem[] = rawUserRows.map((row) => ({
    id: stringValue(row.user_id),
    displayName: stringValue(row.display_name, "ผู้เล่น Arena"),
    handle: stringValue(row.handle, "arena_player"),
    avatarUrl: nullableString(row.avatar_url),
    level: Math.min(99, Math.max(1, numberValue(row.level, 1))),
    expTotal: Math.max(0, numberValue(row.exp_total)),
    skillBp: Math.max(1000, numberValue(row.skill_bp, 1000)),
    province: nullableString(row.province),
    district: nullableString(row.district),
    subdistrict: nullableString(row.subdistrict),
    profileCompletedAt: nullableString(row.profile_completed_at),
    createdAt: stringValue(row.profile_created_at),
    updatedAt: stringValue(row.profile_updated_at),
    role: (row.role === "admin" ? "admin" : "user") as AdminUserListItem["role"],
    isActive: row.is_active === true,
    gemsBalance: Math.max(0, numberValue(row.gems_balance)),
    totalCredits: Math.max(0, numberValue(row.total_credits)),
    totalDebits: Math.max(0, numberValue(row.total_debits)),
    totalPurchases: Math.max(0, numberValue(row.total_purchases)),
    inventoryQuantity: Math.max(0, numberValue(row.inventory_quantity)),
  })).filter((row) => Boolean(row.id));
  const totalCount = Math.max(0, numberValue(countResult.data));
  const userLoadError = usersResult.error || countResult.error
    ? "โหลดรายชื่อสมาชิกไม่สำเร็จ กรุณาตรวจสอบ Migration ของ Admin User Management หรือเชื่อมต่อใหม่"
    : undefined;

  const rawGuildSettings = Array.isArray(guildSettingsResult.data)
    ? guildSettingsResult.data[0]
    : guildSettingsResult.data;
  const guildSettings = rawGuildSettings as Record<string, unknown> | null | undefined;

  const shopItems: AdminShopItem[] = shopResult.error
    ? []
    : (shopResult.data ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      itemType: item.item_type,
      rarityTier: item.rarity_tier,
      icon: item.icon,
      effectType: item.effect_type,
      effectValue: numberValue(item.effect_value),
      priceGems: numberValue(item.price_gems),
      isActive: Boolean(item.is_active),
      sortOrder: numberValue(item.sort_order),
    }));

  const bpRules: BpRules | null = bpRulesResult.error || !bpRulesResult.data
    ? null
    : (() => {
      const row = bpRulesResult.data as Record<string, unknown>;
      return {
        ruleVersion: stringValue(row.rule_version, "bp-v1"),
        minBp: numberValue(row.min_bp, 1000),
        baseWinBp: numberValue(row.base_win_bp),
        baseLossBp: numberValue(row.base_loss_bp),
        upsetBonusPerLevel: numberValue(row.upset_bonus_per_level),
        favoriteWinPenaltyPerLevel: numberValue(row.favorite_win_penalty_per_level),
        upsetLossPenaltyPerLevel: numberValue(row.upset_loss_penalty_per_level),
        favoriteLossProtectionPerLevel: numberValue(row.favorite_loss_protection_per_level),
        minWinDelta: numberValue(row.min_win_delta),
        maxWinDelta: numberValue(row.max_win_delta),
        minLossDelta: numberValue(row.min_loss_delta),
        maxLossDelta: numberValue(row.max_loss_delta),
      };
    })();

  const trophyItems: AdminTrophyItem[] = trophyResult.error
    ? []
    : (trophyResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      rarityTier: row.rarity_tier,
    }));

  const moderationRows = Array.isArray(moderationResult.data)
    ? moderationResult.data as Array<Record<string, unknown>>
    : [];
  const reporterIds = [...new Set(moderationRows.map((row) => stringValue(row.reporter_id)).filter(Boolean))];
  const { data: reporterProfiles } = reporterIds.length > 0
    ? await supabase.from("public_profile_directory").select("id, display_name").in("id", reporterIds)
    : { data: [] as Array<{ id: string; display_name: string }> };
  const reporterNames = new Map(
    ((reporterProfiles ?? []) as Array<{ id: string; display_name: string }>).map((profile) => [profile.id, profile.display_name]),
  );
  const moderationReports = moderationRows.map((row) => ({
    id: stringValue(row.id),
    targetType: stringValue(row.target_type, "unknown"),
    targetId: stringValue(row.target_id),
    reason: stringValue(row.reason, "รายงานจากสมาชิก"),
    details: stringValue(row.details),
    status: stringValue(row.status, "open"),
    createdAt: stringValue(row.created_at),
    reporterName: reporterNames.get(stringValue(row.reporter_id)) ?? "ผู้เล่น Arena",
  })).filter((report) => Boolean(report.id));

  const venueSuggestions: AdminVenueSuggestion[] = (venueResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    province: String(row.province),
    district: typeof row.district === "string" ? row.district : null,
    subdistrict: typeof row.subdistrict === "string" ? row.subdistrict : null,
    address: typeof row.address === "string" ? row.address : null,
    sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
    createdAt: String(row.created_at),
  }));

  const bpContent = bpRules
    ? <BpRuleEditor rules={bpRules} />
    : <p className="admin-console-inline-error" role="alert">โหลดกติกา BP ไม่สำเร็จ</p>;
  const creditRequestKey = randomUUID();
  const shopContent = shopResult.error
    ? <AdminShopPanel items={[]} creditRequestKey={creditRequestKey} loadError="โหลด Catalog ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" />
    : <AdminShopPanel items={shopItems} creditRequestKey={creditRequestKey} />;

  const sections: AdminConsoleSection[] = [
    {
      id: "users",
      content: <AdminUsersPanel users={users} totalCount={totalCount} page={page} pageSize={pageSize} search={search} loadError={userLoadError} />,
    },
    {
      id: "guilds",
      content: <AdminGuildSettingsPanel settings={{
        creationMode: guildSettings?.creation_mode === "free" ? "free" : "item",
        freeUntil: typeof guildSettings?.free_until === "string" ? guildSettings.free_until : null,
        founderItemSlug: stringValue(guildSettings?.founder_item_slug, "guild-founding-contract"),
        maxMembersCap: numberValue(guildSettings?.max_members_cap, 256),
      }} guildCount={guildCountResult.count ?? 0} />,
    },
    {
      id: "shop",
      content: shopContent,
    },
    {
      id: "bp-rules",
      content: bpContent,
    },
    {
      id: "trophies",
      content: <AdminTrophyPanel items={trophyItems} loadError={trophyResult.error ? "โหลด Item Catalog ไม่สำเร็จ แต่ยังกรอก Trophy แบบไม่ผูก Item ได้" : undefined} />,
    },
    {
      id: "moderation",
      content: <AdminModerationPanel reports={moderationReports} />,
    },
    {
      id: "venues",
      content: <AdminVenueSuggestionsPanel suggestions={venueSuggestions} error={venueResult.error ? "load" : firstParam(params, "error") || undefined} updated={firstParam(params, "updated") === "1"} />,
    },
    {
      id: "auth",
      content: <AdminAuthSettingsPanel required={authSettingsResult.data?.email_verification_required !== false} updatedAt={typeof authSettingsResult.data?.updated_at === "string" ? authSettingsResult.data.updated_at : null} />,
    },
  ];

  return (
    <main className="admin-hub-page">
      <div className="admin-hub-shell">
        <header className="admin-hub-topbar">
          <Link href="/" className="admin-hub-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
          <span className="admin-hub-role"><ShieldCheck size={15} /> Admin Console</span>
        </header>

        <AdminConsoleWorkspace sections={sections} />

        <aside className="admin-hub-safety"><ShieldCheck size={18} /><span>หน้านี้ตรวจสิทธิ์ Admin ซ้ำผ่าน Supabase RPC ทุกครั้ง และการแก้ไขข้อมูลสำคัญยังถูกบังคับด้วย Database RPC + RLS</span></aside>
        <footer className="admin-hub-footer"><Link href="/profile">กลับ Profile</Link><Link href="/">กลับหน้าหลัก</Link></footer>
      </div>
    </main>
  );
}
