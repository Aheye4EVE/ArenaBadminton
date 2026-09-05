import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import AdminUserDetailPanel, { type AdminUserDetail, type AdminWalletLedgerItem } from "@/components/admin-user-detail-panel";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Admin User Detail | Arena-Badminton" };
export const dynamic = "force-dynamic";

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

function errorPage() {
  return <main className="admin-users-page"><div className="admin-users-shell"><header className="admin-users-topbar"><Link href="/admin/users" className="admin-users-back">← รายชื่อสมาชิก</Link><Link href="/" className="admin-users-brand"><span>Arena</span><em>-Badminton</em></Link><span className="admin-users-role">Admin User Management</span></header><section className="admin-users-error-card"><strong>โหลดรายละเอียด User ไม่สำเร็จ</strong><span>กรุณาตรวจสอบ Migration ของ Admin User Management แล้วลองเปิดหน้านี้ใหม่อีกครั้ง</span><Link href="/admin/users">กลับรายชื่อสมาชิก</Link></section></div></main>;
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) notFound();

  const { userId } = await params;
  if (!z.string().uuid().safeParse(userId).success) notFound();
  const [detailResult, ledgerResult] = await Promise.all([
    supabase.rpc("admin_get_user_detail", { p_user_id: userId }),
    supabase.rpc("admin_get_user_wallet_ledger", { p_user_id: userId, p_limit: 40 }),
  ]);

  const rawDetail = Array.isArray(detailResult.data) ? detailResult.data[0] as Record<string, unknown> | undefined : detailResult.data as Record<string, unknown> | null;
  if (!rawDetail) {
    if (!detailResult.error || detailResult.error.message.toLowerCase().includes("target user not found")) notFound();
    return errorPage();
  }

  const detail: AdminUserDetail = {
    id: stringValue(rawDetail.user_id, userId),
    email: nullableString(rawDetail.email),
    emailConfirmedAt: nullableString(rawDetail.email_confirmed_at),
    lastSignInAt: nullableString(rawDetail.last_sign_in_at),
    displayName: stringValue(rawDetail.display_name, "ผู้เล่น Arena"),
    handle: stringValue(rawDetail.handle, "arena_player"),
    avatarUrl: nullableString(rawDetail.avatar_url),
    bio: nullableString(rawDetail.bio),
    level: Math.min(99, Math.max(1, numberValue(rawDetail.level, 1))),
    expTotal: Math.max(0, numberValue(rawDetail.exp_total)),
    skillBp: Math.max(1000, numberValue(rawDetail.skill_bp, 1000)),
    rankTier: Math.max(1, Math.min(10, numberValue(rawDetail.rank_tier, 1))),
    rankName: stringValue(rawDetail.rank_name, "มือใหม่"),
    rankColor: stringValue(rawDetail.rank_color, "slate"),
    addressLine: nullableString(rawDetail.address_line),
    province: nullableString(rawDetail.province),
    district: nullableString(rawDetail.district),
    subdistrict: nullableString(rawDetail.subdistrict),
    postalCode: nullableString(rawDetail.postal_code),
    profileCompletedAt: nullableString(rawDetail.profile_completed_at),
    createdAt: stringValue(rawDetail.profile_created_at),
    updatedAt: stringValue(rawDetail.profile_updated_at),
    role: rawDetail.role === "admin" ? "admin" : "user",
    isActive: rawDetail.is_active === true,
    gemsBalance: Math.max(0, numberValue(rawDetail.gems_balance)),
    totalCredits: Math.max(0, numberValue(rawDetail.total_credits)),
    totalDebits: Math.max(0, numberValue(rawDetail.total_debits)),
    totalPurchases: Math.max(0, numberValue(rawDetail.total_purchases)),
    inventoryItemTypes: Math.max(0, numberValue(rawDetail.inventory_item_types)),
    inventoryQuantity: Math.max(0, numberValue(rawDetail.inventory_quantity)),
    lastWalletActivity: nullableString(rawDetail.last_wallet_activity),
  };

  const rawLedger = Array.isArray(ledgerResult.data) ? ledgerResult.data as Array<Record<string, unknown>> : [];
  const ledger: AdminWalletLedgerItem[] = rawLedger.map((row) => ({
    id: stringValue(row.ledger_id),
    transactionType: stringValue(row.transaction_type, "system"),
    amount: numberValue(row.amount),
    balanceBefore: Math.max(0, numberValue(row.balance_before)),
    balanceAfter: Math.max(0, numberValue(row.balance_after)),
    referenceText: stringValue(row.reference_text, "ธุรกรรมระบบ"),
    createdAt: stringValue(row.created_at),
  })).filter((row) => Boolean(row.id));

  const loadError = ledgerResult.error ? "โหลดประวัติ Wallet ไม่สำเร็จ แต่ยังสามารถดูข้อมูล Profile และจัดการ Gems ได้" : undefined;
  return <AdminUserDetailPanel detail={detail} ledger={ledger} requestKey={randomUUID()} isSelf={detail.id === user.id} loadError={loadError} />;
}
