import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NotificationsBrowser, { type NotificationItem } from "@/components/notifications-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "การแจ้งเตือน | Arena-Badminton" };
export const dynamic = "force-dynamic";

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export default async function NotificationsPage() {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  const { data } = await supabase.from("notifications").select("id, notification_type, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(50);
  const items: NotificationItem[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: textValue(row.id),
    type: textValue(row.notification_type, "update"),
    title: textValue(row.title, "Arena Update"),
    body: textValue(row.body),
    href: typeof row.href === "string" ? row.href : null,
    readAt: typeof row.read_at === "string" ? row.read_at : null,
    createdAt: textValue(row.created_at),
  }));
  return <NotificationsBrowser items={items} />;
}
