"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { resolveGuildLogoUpdate } from "@/lib/r2-upload";

export type GuildActionState = {
  error?: string;
  message?: string;
  inviteToken?: string;
  guildId?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  questId?: string;
};

const optionalText = (max: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(max).optional(),
);

const uuidField = z.string().uuid("รหัสไม่ถูกต้อง");
const areaField = optionalText(80);
const handleField = z.string().trim().min(1, "กรุณากรอก TAGNAME").max(80, "TAGNAME ยาวเกินไป");

const createGuildSchema = z.object({
  name: z.string().trim().min(2, "ชื่อ Guild ต้องมีอย่างน้อย 2 ตัวอักษร").max(100, "ชื่อ Guild ยาวเกินไป"),
  description: optionalText(1_000),
  province: areaField,
  district: areaField,
  subdistrict: areaField,
  visibility: z.enum(["public", "private"]),
  joinPolicy: z.enum(["open", "request", "invite_only"]),
});

const updateGuildSchema = createGuildSchema.extend({ guildId: uuidField });

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function fields(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[] | undefined>;
}

function guildError(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("founding item required")) return "ต้องมี Guild Founding Contract ก่อนจึงจะสร้าง Guild ได้ กรุณาไปที่ร้านค้า";
  if (message.includes("founding item is not available")) return "ไอเทมก่อตั้ง Guild ยังไม่พร้อมใช้งาน กรุณาติดต่อ Admin";
  if (message.includes("already belong")) return "บัญชีนี้มี Guild ที่ใช้งานอยู่แล้วในขณะนี้";
  if (message.includes("capacity") || message.includes("full")) return "Guild เต็มแล้ว ไม่สามารถรับสมาชิกเพิ่มได้ในขณะนี้";
  if (message.includes("invite target")) return "ไม่พบผู้เล่นจาก TAGNAME นี้ หรือไม่สามารถเชิญบัญชีนี้ได้";
  if (message.includes("profile completion")) return "กรุณากรอก Profile ให้ครบก่อนใช้งาน Guild";
  if (message.includes("capacity")) return "จำนวนสมาชิก Guild เต็มหรือถึงเพดานที่ระบบกำหนดแล้ว";
  if (message.includes("invite")) return "คำเชิญ Guild ไม่ถูกต้องหรือหมดอายุแล้ว";
  if (message.includes("banned")) return "บัญชีนี้ถูกระงับจาก Guild นี้";
  if (message.includes("manager")) return "เฉพาะ Guild Master หรือ Officer เท่านั้นที่ทำรายการนี้ได้";
  if (message.includes("quest target")) return "ภารกิจนี้ยังทำไม่ครบตามเป้าหมาย";
  if (message.includes("quest is not active")) return "ภารกิจนี้หมดเวลา หรือยังไม่เปิดใช้งาน";
  if (message.includes("quest reward item")) return "Item รางวัลนี้ไม่พร้อมใช้งานแล้ว";
  if (message.includes("active guild member")) return "ต้องเป็นสมาชิก Guild ที่ยัง active จึงจะรับรางวัลได้";
  if (error.code === "23505") return "รายการนี้ถูกสร้างไปแล้ว กรุณารีเฟรชหน้าอีกครั้ง";
  if (error.code === "22023") return "ข้อมูล Guild ไม่ถูกต้องหรือไม่อยู่ในสถานะที่ทำรายการได้";
  return "ไม่สามารถดำเนินการกับ Guild ได้ กรุณาลองใหม่อีกครั้ง";
}

function returnedRow(data: unknown) {
  if (Array.isArray(data)) return data[0] as Record<string, unknown> | undefined;
  return data as Record<string, unknown> | undefined;
}

async function requireCompletedProfile() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");
  if (!result.profile?.profile_completed_at) redirect("/profile/setup");
  return result;
}

export async function createGuildAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const parsed = createGuildSchema.safeParse({
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    province: readText(formData, "province"),
    district: readText(formData, "district"),
    subdistrict: readText(formData, "subdistrict"),
    visibility: readText(formData, "visibility"),
    joinPolicy: readText(formData, "joinPolicy"),
  });
  if (!parsed.success) return { error: "กรุณาตรวจสอบข้อมูล Guild ให้ครบถ้วน", fieldErrors: fields(parsed.error) };

  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("create_guild", {
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? null,
    p_logo_url: null,
    p_province: parsed.data.province ?? null,
    p_district: parsed.data.district ?? null,
    p_subdistrict: parsed.data.subdistrict ?? null,
    p_visibility: parsed.data.visibility,
    p_join_policy: parsed.data.joinPolicy,
    p_request_key: randomUUID(),
  });
  if (error) return { error: guildError(error) };
  const guild = returnedRow(data);
  if (!guild || typeof guild.id !== "string") return { error: "สร้าง Guild สำเร็จแต่ไม่พบรหัส Guild" };
  revalidatePath("/");
  revalidatePath("/guilds");
  revalidatePath("/organizer");
  redirect(`/guilds/${guild.id}/manage?created=1`);
}

export async function joinGuildAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const parsed = uuidField.safeParse(readText(formData, "guildId"));
  if (!parsed.success) return { error: "Guild ไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("join_guild", { p_guild_id: parsed.data });
  if (error) return { error: guildError(error) };
  const row = returnedRow(data);
  revalidatePath("/guilds");
  revalidatePath(`/guilds/${parsed.data}`);
  return { message: row?.membership_status === "pending" ? "ส่งคำขอเข้าร่วม Guild แล้ว รอการอนุมัติจากผู้ดูแล" : "เข้าร่วม Guild เรียบร้อยแล้ว" };
}

export async function leaveGuildAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const parsed = uuidField.safeParse(readText(formData, "guildId"));
  if (!parsed.success) return { error: "Guild ไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("leave_guild", { p_guild_id: parsed.data });
  if (error) return { error: guildError(error) };
  revalidatePath("/");
  revalidatePath("/guilds");
  revalidatePath(`/guilds/${parsed.data}`);
  revalidatePath("/organizer");
  return { message: "ออกจาก Guild แล้ว" };
}

export async function updateGuildAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const parsed = updateGuildSchema.safeParse({
    guildId: readText(formData, "guildId"),
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    province: readText(formData, "province"),
    district: readText(formData, "district"),
    subdistrict: readText(formData, "subdistrict"),
    visibility: readText(formData, "visibility"),
    joinPolicy: readText(formData, "joinPolicy"),
  });
  if (!parsed.success) return { error: "กรุณาตรวจสอบข้อมูล Guild ให้ครบถ้วน", fieldErrors: fields(parsed.error) };

  const { supabase } = await requireCompletedProfile();
  const logo = resolveGuildLogoUpdate(formData, parsed.data.guildId);
  if (logo.error) return { error: logo.error };
  let logoUrl = logo.value;
  if (logo.value === undefined) {
    const { data: currentGuild, error: currentGuildError } = await supabase
      .from("guilds")
      .select("logo_url")
      .eq("id", parsed.data.guildId)
      .maybeSingle();
    if (currentGuildError) return { error: "โหลดข้อมูล Logo Guild ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    logoUrl = typeof currentGuild?.logo_url === "string" ? currentGuild.logo_url : null;
  }
  const { error } = await supabase.rpc("update_guild", {
    p_guild_id: parsed.data.guildId,
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? null,
    p_logo_url: logoUrl,
    p_province: parsed.data.province ?? null,
    p_district: parsed.data.district ?? null,
    p_subdistrict: parsed.data.subdistrict ?? null,
    p_visibility: parsed.data.visibility,
    p_join_policy: parsed.data.joinPolicy,
  });
  if (error) return { error: guildError(error) };
  revalidatePath("/");
  revalidatePath("/guilds");
  revalidatePath(`/guilds/${parsed.data.guildId}`);
  revalidatePath(`/guilds/${parsed.data.guildId}/manage`);
  revalidatePath("/organizer");
  return { message: "บันทึกข้อมูล Guild แล้ว" };
}

export async function createGuildAnnouncementAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const guildId = uuidField.safeParse(readText(formData, "guildId"));
  const title = z.string().trim().min(1).max(160).safeParse(readText(formData, "title"));
  const body = z.string().trim().min(1).max(3000).safeParse(readText(formData, "body"));
  if (!guildId.success || !title.success || !body.success) return { error: "กรุณากรอกประกาศให้ครบถ้วน" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("create_guild_announcement", { p_guild_id: guildId.data, p_title: title.data, p_body: body.data, p_is_pinned: readText(formData, "isPinned") === "true" });
  if (error) return { error: guildError(error) };
  revalidatePath(`/guilds/${guildId.data}`);
  revalidatePath(`/guilds/${guildId.data}/manage`);
  return { message: "เผยแพร่ประกาศแล้ว" };
}

export async function createGuildInviteAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const guildId = uuidField.safeParse(readText(formData, "guildId"));
  const parsedHandle = handleField.safeParse(readText(formData, "handle").replace(/^@+/, "").toLowerCase());
  if (!guildId.success || !parsedHandle.success) return { error: "กรุณากรอก TAGNAME ของผู้เล่นให้ถูกต้อง" };

  const { supabase } = await requireCompletedProfile();
  const { data: invitee, error: lookupError } = await supabase
    .from("public_profile_directory")
    .select("id, display_name, handle")
    .eq("handle", parsedHandle.data)
    .maybeSingle();
  if (lookupError || !invitee?.id) return { error: "ไม่พบผู้เล่นจาก TAGNAME นี้ กรุณาตรวจสอบอีกครั้ง" };

  const { data, error } = await supabase.rpc("create_guild_invite", { p_guild_id: guildId.data, p_invitee_id: invitee.id });
  if (error) return { error: guildError(error) };
  const row = returnedRow(data);
  const inviteToken = typeof row?.invite_token === "string" ? row.invite_token : "";
  if (!inviteToken) return { error: "สร้างคำเชิญสำเร็จแต่ไม่พบลิงก์คำเชิญ" };
  revalidatePath(`/guilds/${guildId.data}`);
  revalidatePath(`/guilds/${guildId.data}/manage`);
  return { message: `ส่งคำเชิญให้ @${invitee.handle ?? parsedHandle.data} แล้ว`, inviteToken };
}

export async function reviewGuildJoinRequestAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const requestId = uuidField.safeParse(readText(formData, "requestId"));
  const guildId = uuidField.safeParse(readText(formData, "guildId"));
  if (!requestId.success || !guildId.success) return { error: "คำขอเข้าร่วมไม่ถูกต้อง" };
  const decision = readText(formData, "decision");
  if (decision !== "approve" && decision !== "reject") return { error: "การตัดสินใจไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("review_guild_join_request", { p_request_id: requestId.data, p_decision: decision });
  if (error) return { error: guildError(error) };
  revalidatePath(`/guilds/${guildId.data}`);
  revalidatePath(`/guilds/${guildId.data}/manage`);
  return { message: decision === "approve" ? "อนุมัติสมาชิกแล้ว" : "ปฏิเสธคำขอแล้ว" };
}

export async function manageGuildMemberAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const guildId = uuidField.safeParse(readText(formData, "guildId"));
  const targetUserId = uuidField.safeParse(readText(formData, "targetUserId"));
  if (!guildId.success || !targetUserId.success) return { error: "สมาชิกไม่ถูกต้อง" };
  const action = readText(formData, "memberAction");
  if (!["promote", "demote", "kick", "ban"].includes(action)) return { error: "การจัดการสมาชิกไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("manage_guild_member", { p_guild_id: guildId.data, p_target_user_id: targetUserId.data, p_action: action, p_reason: readText(formData, "reason") });
  if (error) return { error: guildError(error) };
  revalidatePath("/");
  revalidatePath("/guilds");
  revalidatePath(`/guilds/${guildId.data}`);
  revalidatePath(`/guilds/${guildId.data}/manage`);
  revalidatePath("/organizer");
  return { message: "อัปเดตสมาชิกแล้ว" };
}

export async function applyGuildExpansionAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const guildId = uuidField.safeParse(readText(formData, "guildId"));
  const itemId = uuidField.safeParse(readText(formData, "itemId"));
  if (!guildId.success || !itemId.success) return { error: "ไอเทมขยาย Guild ไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("apply_guild_expansion_item", { p_guild_id: guildId.data, p_item_id: itemId.data });
  if (error) return { error: guildError(error) };
  revalidatePath(`/guilds/${guildId.data}`);
  revalidatePath(`/guilds/${guildId.data}/manage`);
  revalidatePath("/shop");
  return { message: "เพิ่มจำนวนสมาชิก Guild แล้ว" };
}

export async function acceptGuildInviteAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const token = readText(formData, "inviteToken").trim();
  if (token.length < 16 || token.length > 128) return { error: "คำเชิญไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("accept_guild_invite", { p_invite_token: token });
  if (error) return { error: guildError(error) };
  const row = returnedRow(data);
  if (typeof row?.guild_id !== "string") return { error: "รับคำเชิญแล้วแต่ไม่พบ Guild" };
  revalidatePath("/");
  revalidatePath("/guilds");
  revalidatePath(`/guilds/${row.guild_id}`);
  return { message: "เข้าร่วม Guild จากคำเชิญแล้ว", guildId: row.guild_id };
}

export async function createGuildQuestAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const parsed = z.object({
    guildId: uuidField,
    title: z.string().trim().min(2).max(160),
    description: optionalText(1000),
    questType: z.enum(["match_played", "match_wins", "members_joined", "guild_exp"]),
    targetValue: z.coerce.number().int().min(1).max(1_000_000),
    rewardGuildExp: z.coerce.number().int().min(0).max(100_000_000),
    rewardExp: z.coerce.number().int().min(0).max(100_000_000),
    rewardItemId: z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? null : value), z.string().uuid().nullable()),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
  }).safeParse({
    guildId: readText(formData, "guildId"), title: readText(formData, "title"), description: readText(formData, "description"), questType: readText(formData, "questType"), targetValue: readText(formData, "targetValue"), rewardGuildExp: readText(formData, "rewardGuildExp"), rewardExp: readText(formData, "rewardExp"), rewardItemId: readText(formData, "rewardItemId"), startsAt: readText(formData, "startsAt"), endsAt: readText(formData, "endsAt"),
  });
  if (!parsed.success) return { error: "กรุณากรอกรายละเอียดภารกิจให้ถูกต้อง" };
  const startsDate = parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date();
  const endsDate = parsed.data.endsAt ? new Date(parsed.data.endsAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(startsDate.getTime()) || Number.isNaN(endsDate.getTime()) || endsDate <= startsDate) return { error: "ช่วงเวลาภารกิจไม่ถูกต้อง" };
  const startsAt = startsDate.toISOString();
  const endsAt = endsDate.toISOString();
  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("create_guild_quest", { p_guild_id: parsed.data.guildId, p_title: parsed.data.title, p_description: parsed.data.description ?? "", p_quest_type: parsed.data.questType, p_target_value: parsed.data.targetValue, p_reward_guild_exp: parsed.data.rewardGuildExp, p_reward_exp: parsed.data.rewardExp, p_reward_item_id: parsed.data.rewardItemId, p_starts_at: startsAt, p_ends_at: endsAt });
  if (error) return { error: guildError(error) };
  const row = returnedRow(data);
  revalidatePath(`/guilds/${parsed.data.guildId}`);
  revalidatePath(`/guilds/${parsed.data.guildId}/manage`);
  return { message: "สร้างภารกิจ Guild แล้ว", questId: typeof row?.id === "string" ? row.id : undefined };
}

export async function claimGuildQuestAction(_previousState: GuildActionState, formData: FormData): Promise<GuildActionState> {
  const questId = uuidField.safeParse(readText(formData, "questId"));
  const guildId = uuidField.safeParse(readText(formData, "guildId"));
  if (!questId.success || !guildId.success) return { error: "ภารกิจไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("claim_guild_quest", { p_quest_id: questId.data });
  if (error) return { error: guildError(error) };
  revalidatePath(`/guilds/${guildId.data}`);
  revalidatePath("/profile");
  revalidatePath("/shop");
  return { message: "รับรางวัลภารกิจแล้ว", questId: questId.data };
}
