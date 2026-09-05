"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type TournamentActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  entryStatus?: "registered" | "waitlisted" | "withdrawn";
  bracketMatchId?: string;
};

const uuidSchema = z.string().uuid("กิจกรรมไม่ถูกต้อง");
const optionalText = (max: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(max).optional(),
);
const integerField = (min: number, max: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : Number(value)),
  z.number().int().min(min).max(max),
);

const createTournamentSchema = z.object({
  title: z.string().trim().min(1, "กรุณากรอกชื่อกิจกรรม").max(160, "ชื่อกิจกรรมยาวเกินไป"),
  description: optionalText(2_000),
  startsDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "กรุณาเลือกวันที่"),
  startsTime: z.string().regex(/^\d{2}:\d{2}$/, "กรุณาเลือกเวลา"),
  format: z.enum(["singles", "doubles", "team"]),
  maxEntries: integerField(2, 256),
  rules: optionalText(5_000),
  venueId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().uuid("สนามไม่ถูกต้อง").optional(),
  ),
});

function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function formFieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[] | undefined>;
}

function bangkokDateTimeToIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59
    || calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  const result = new Date(`${date}T${time}:00+07:00`);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

function getReturnedRow(data: unknown) {
  if (Array.isArray(data)) return data[0] as Record<string, unknown> | undefined;
  return data as Record<string, unknown> | undefined;
}

function tournamentErrorMessage(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("authentication required")) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
  if (message.includes("profile completion required")) return "กรุณากรอก Profile ให้ครบก่อนจัดหรือสมัครกิจกรรม";
  if (message.includes("at least 15 minutes")) return "กิจกรรมต้องเริ่มล่วงหน้าอย่างน้อย 15 นาที";
  if (message.includes("payments are not configured")) return "ระบบยังไม่เปิดรับเงินค่าสมัคร กิจกรรมรุ่นนี้ต้องเป็นกิจกรรมฟรี";
  if (message.includes("venue is not active")) return "สนามนี้ไม่พร้อมใช้งานแล้ว กรุณาเลือกสนามใหม่";
  if (message.includes("not open for registration")) return "กิจกรรมนี้ปิดรับสมัครแล้ว";
  if (message.includes("registration has closed")) return "กิจกรรมนี้หมดเวลารับสมัครแล้ว";
  if (message.includes("active tournament entry not found")) return "ยังไม่มีชื่อคุณในกิจกรรมนี้";
  if (message.includes("entry cannot be reopened")) return "สถานะการแข่งขันนี้ไม่สามารถสมัครซ้ำได้";
  if (message.includes("tournament not found")) return "ไม่พบกิจกรรมนี้";
  if (message.includes("only the tournament organizer")) return "เฉพาะผู้จัดกิจกรรมหรือ Admin เท่านั้นที่จัดการ Bracket ได้";
  if (message.includes("at least two registered")) return "ต้องมีผู้สมัครที่ยืนยันแล้วอย่างน้อย 2 คนก่อนสร้างสายแข่ง";
  if (message.includes("tournament match is not ready")) return "แมตช์นี้ยังไม่พร้อมรับผลการแข่งขัน";
  if (message.includes("tournament result is not ready")) return "ผลแมตช์นี้ยังไม่พร้อมให้ยืนยัน หรือคุณเป็นผู้ส่งผลเอง";
  if (message.includes("tournament match not found")) return "ไม่พบแมตช์ในสายการแข่งขัน";
  if (message.includes("reward")) return "ข้อมูลรางวัลไม่ถูกต้องหรือไม่สามารถแจกซ้ำได้";
  if (error.code === "23505") return "ข้อมูลกิจกรรมซ้ำ กรุณาลองใหม่อีกครั้ง";
  if (error.code === "22023") return "ข้อมูลกิจกรรมไม่ถูกต้องหรือไม่อยู่ในสถานะที่ทำรายการได้";
  return "ไม่สามารถดำเนินการกับกิจกรรมได้ กรุณาลองใหม่อีกครั้ง";
}

async function requireCompletedProfile() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");
  if (!result.profile?.profile_completed_at) redirect("/profile/setup");
  return result;
}

export async function createTournamentAction(
  _previousState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const parsed = createTournamentSchema.safeParse({
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    startsDate: formText(formData, "startsDate"),
    startsTime: formText(formData, "startsTime"),
    format: formText(formData, "format"),
    maxEntries: formText(formData, "maxEntries"),
    rules: formText(formData, "rules"),
    venueId: formText(formData, "venueId"),
  });

  if (!parsed.success) return { error: "กรุณาตรวจสอบรายละเอียดกิจกรรมให้ครบถ้วน", fieldErrors: formFieldErrors(parsed.error) };
  const startsAt = bangkokDateTimeToIso(parsed.data.startsDate, parsed.data.startsTime);
  if (!startsAt) return { error: "วันที่หรือเวลาไม่ถูกต้อง", fieldErrors: { startsDate: ["กรุณาเลือกวันที่และเวลาใหม่"] } };
  if (new Date(startsAt).getTime() <= Date.now() + 15 * 60 * 1_000) {
    return { error: "กิจกรรมต้องเริ่มล่วงหน้าอย่างน้อย 15 นาที", fieldErrors: { startsTime: ["เวลาเริ่มต้องอยู่ล่วงหน้าอย่างน้อย 15 นาที"] } };
  }

  const { supabase } = await requireCompletedProfile();
  try {
    const { data, error } = await supabase.rpc("create_tournament", {
      p_title: parsed.data.title,
      p_description: parsed.data.description ?? null,
      p_starts_at: startsAt,
      p_format: parsed.data.format,
      p_max_entries: parsed.data.maxEntries,
      p_entry_fee: 0,
      p_rules: parsed.data.rules ?? null,
      p_venue_id: parsed.data.venueId ?? null,
    });
    if (error) return { error: tournamentErrorMessage(error) };
    const row = getReturnedRow(data);
    if (typeof row?.id !== "string") return { error: "สร้างกิจกรรมสำเร็จแต่ไม่พบรหัสกิจกรรม กรุณาลองเปิดใหม่อีกครั้ง" };
    revalidatePath("/events");
    redirect(`/events/${row.id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
    return { error: "สร้างกิจกรรมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function joinTournamentAction(
  _previousState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const tournamentId = uuidSchema.safeParse(formText(formData, "tournamentId"));
  if (!tournamentId.success) return { error: "กิจกรรมไม่ถูกต้อง" };

  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("join_tournament", { p_tournament_id: tournamentId.data });
  if (error) return { error: tournamentErrorMessage(error) };

  const row = getReturnedRow(data);
  const entryStatus = row?.entry_status === "registered" ? "registered" : "waitlisted";
  revalidatePath("/events");
  revalidatePath(`/events/${tournamentId.data}`);
  return {
    entryStatus,
    message: entryStatus === "registered" ? "สมัครกิจกรรมเรียบร้อยแล้ว" : "กิจกรรมเต็มแล้ว ระบบเพิ่มคุณเข้าคิวรอให้แล้ว",
  };
}

export async function withdrawTournamentAction(
  _previousState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const tournamentId = uuidSchema.safeParse(formText(formData, "tournamentId"));
  if (!tournamentId.success) return { error: "กิจกรรมไม่ถูกต้อง" };

  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("withdraw_tournament_entry", { p_tournament_id: tournamentId.data });
  if (error) return { error: tournamentErrorMessage(error) };

  revalidatePath("/events");
  revalidatePath(`/events/${tournamentId.data}`);
  return { entryStatus: "withdrawn", message: "ถอนชื่อจากกิจกรรมแล้ว หากมีคิวรอ ระบบจะเลื่อนสมาชิกถัดไปเข้าแทน" };
}

export async function generateTournamentBracketAction(
  _previousState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const tournamentId = uuidSchema.safeParse(formText(formData, "tournamentId"));
  if (!tournamentId.success) return { error: "กิจกรรมไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("create_tournament_bracket", { p_tournament_id: tournamentId.data });
  if (error) return { error: tournamentErrorMessage(error) };
  revalidatePath(`/events/${tournamentId.data}`);
  revalidatePath("/events");
  return { message: "สร้างสายการแข่งขันแล้ว พร้อมเริ่มแข่งได้เลย" };
}

export async function upsertTournamentRewardAction(
  _previousState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const parsed = z.object({
    tournamentId: uuidSchema,
    placement: integerField(1, 256),
    expReward: integerField(0, 100_000_000),
    bpReward: integerField(0, 1_000_000),
    itemId: z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? null : value), z.string().uuid().nullable()),
    label: optionalText(160),
  }).safeParse({
    tournamentId: formText(formData, "tournamentId"),
    placement: formText(formData, "placement"),
    expReward: formText(formData, "expReward"),
    bpReward: formText(formData, "bpReward"),
    itemId: formText(formData, "itemId"),
    label: formText(formData, "label"),
  });
  if (!parsed.success) return { error: "กรุณากรอกข้อมูลรางวัลให้ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("upsert_tournament_reward", {
    p_tournament_id: parsed.data.tournamentId,
    p_placement: parsed.data.placement,
    p_exp_reward: parsed.data.expReward,
    p_bp_reward: parsed.data.bpReward,
    p_item_id: parsed.data.itemId,
    p_label: parsed.data.label ?? "",
  });
  if (error) return { error: tournamentErrorMessage(error) };
  revalidatePath(`/events/${parsed.data.tournamentId}`);
  return { message: `บันทึกรางวัลอันดับ ${parsed.data.placement} แล้ว` };
}

export async function recordTournamentBracketResultAction(
  _previousState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const parsed = z.object({
    matchId: uuidSchema,
    scoreA: integerField(0, 30),
    scoreB: integerField(0, 30),
  }).safeParse({
    matchId: formText(formData, "matchId"),
    scoreA: formText(formData, "scoreA"),
    scoreB: formText(formData, "scoreB"),
  });
  if (!parsed.success) return { error: "กรุณากรอกคะแนนแบดมินตันให้ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("record_tournament_bracket_result", {
    p_match_id: parsed.data.matchId,
    p_score_a: parsed.data.scoreA,
    p_score_b: parsed.data.scoreB,
  });
  if (error) return { error: tournamentErrorMessage(error) };
  const row = getReturnedRow(data);
  const tournamentId = typeof row?.tournament_id === "string" ? row.tournament_id : null;
  if (tournamentId) revalidatePath(`/events/${tournamentId}`);
  return { message: "ส่งผลการแข่งขันแล้ว รออีกฝั่งหรือผู้จัดยืนยันผล", bracketMatchId: parsed.data.matchId };
}

export async function confirmTournamentBracketResultAction(
  _previousState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const matchId = uuidSchema.safeParse(formText(formData, "matchId"));
  if (!matchId.success) return { error: "แมตช์ไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("confirm_tournament_bracket_result", { p_match_id: matchId.data });
  if (error) return { error: tournamentErrorMessage(error) };
  const row = getReturnedRow(data);
  const tournamentId = typeof row?.tournament_id === "string" ? row.tournament_id : null;
  if (tournamentId) {
    revalidatePath(`/events/${tournamentId}`);
    revalidatePath("/events");
  }
  revalidatePath("/profile");
  revalidatePath("/ranking");
  return { message: "ยืนยันผลการแข่งขันแล้ว ระบบเดินสายและแจก Reward ตามเงื่อนไขให้เรียบร้อย" };
}
