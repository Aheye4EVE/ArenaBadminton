import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AdminUsersPanel, { type AdminUserListItem } from "@/components/admin-users-panel";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Admin Users | Arena-Badminton" };
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

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) notFound();

  const params = await searchParams;
  const search = cleanSearch(firstParam(params, "q"));
  const parsedPage = Number.parseInt(firstParam(params, "page"), 10);
  const page = Number.isFinite(parsedPage) ? Math.min(500, Math.max(1, parsedPage)) : 1;
  const pageSize = 30;
  const [usersResult, countResult] = await Promise.all([
    supabase.rpc("admin_list_users", { p_search: search || null, p_limit: pageSize, p_offset: (page - 1) * pageSize }),
    supabase.rpc("admin_count_users", { p_search: search || null }),
  ]);

  const rawRows = Array.isArray(usersResult.data) ? usersResult.data as Array<Record<string, unknown>> : [];
  const users: AdminUserListItem[] = rawRows.map((row) => ({
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
  const loadError = usersResult.error || countResult.error
    ? "โหลดรายชื่อสมาชิกไม่สำเร็จ กรุณาตรวจสอบ Migration ของ Admin User Management หรือเชื่อมต่อใหม่"
    : undefined;

  return <AdminUsersPanel users={users} totalCount={totalCount} page={page} pageSize={pageSize} search={search} loadError={loadError} />;
}
