"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type MatchActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const uuidSchema = z.string().uuid("รหัสไม่ถูกต้อง");

const integerField = (min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : Number(value)),
    z.number().int().min(min).max(max),
  );

const playerIdsField = z.preprocess(
  (value) => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
  z.array(z.string().uuid("รหัสผู้เล่นไม่ถูกต้อง")).min(1).max(2),
);

const createMatchSchema = z
  .object({
    groupId: uuidSchema,
    format: z.enum(["singles", "doubles"]),
    teamAUserIds: playerIdsField,
    teamBUserIds: playerIdsField,
    expWinReward: integerField(0, 1_000_000),
    expLossReward: integerField(0, 1_000_000),
  })
  .superRefine((data, context) => {
    const expected = data.format === "singles" ? 1 : 2;
    if (data.teamAUserIds.length !== expected) {
      context.addIssue({ code: "custom", path: ["teamAUserIds"], message: "ทีม A มีจำนวนผู้เล่นไม่ครบ" });
    }
    if (data.teamBUserIds.length !== expected) {
      context.addIssue({ code: "custom", path: ["teamBUserIds"], message: "ทีม B มีจำนวนผู้เล่นไม่ครบ" });
    }
    if (new Set([...data.teamAUserIds, ...data.teamBUserIds]).size !== data.teamAUserIds.length + data.teamBUserIds.length) {
      context.addIssue({ code: "custom", path: ["teamBUserIds"], message: "ผู้เล่นคนเดียวกันอยู่ได้เพียงทีมเดียว" });
    }
  });

const matchIdSchema = uuidSchema;

function readFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readFormValues(formData: FormData, name: string) {
  return formData.getAll(name).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function formFieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[] | undefined>;
}

function getReturnedRow(data: unknown) {
  if (Array.isArray(data)) return data[0] as Record<string, unknown> | undefined;
  return data as Record<string, unknown> | undefined;
}

function matchErrorMessage(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("authentication required")) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
  if (message.includes("only the organizer can create")) return "เฉพาะผู้จัดก๊วนเท่านั้นที่สร้างแมตช์ได้";
  if (message.includes("only the organizer can mark")) return "เฉพาะผู้จัดก๊วนเท่านั้นที่แก้สถานะผู้เล่นได้";
  if (message.includes("registered group member")) return "ผู้เล่นทุกคนต้องเป็นสมาชิกที่ยืนยันที่นั่งในก๊วนนี้";
  if (message.includes("invalid number of players")) return "จำนวนผู้เล่นในแต่ละทีมไม่ถูกต้อง";
  if (message.includes("cannot appear twice")) return "ผู้เล่นคนเดียวกันอยู่ได้เพียงทีมเดียว";
  if (message.includes("no longer available")) return "ก๊วนนี้ไม่เปิดให้สร้างแมตช์เพิ่มแล้ว";
  if (message.includes("open for check-in")) return "แมตช์นี้ไม่อยู่ในช่วงที่เช็กอินได้";
  if (message.includes("only match participants can check in")) return "เฉพาะผู้เล่นในแมตช์เท่านั้นที่เช็กอินได้";
  if (message.includes("invalid attendance")) return "สถานะการเข้าร่วมไม่ถูกต้อง";
  if (message.includes("open for attendance")) return "แมตช์นี้ปิดแก้ไขสถานะการเข้าร่วมแล้ว";
  if (message.includes("player is not in this match")) return "ผู้เล่นคนนี้ไม่ได้อยู่ในแมตช์";
  if (message.includes("invalid badminton score")) return "คะแนนแบดมินตันไม่ถูกต้อง";
  if (message.includes("satisfy badminton rules")) return "คะแนนต้องมีผู้ชนะอย่างน้อย 21 แต้ม และชนะตามกติกา";
  if (message.includes("check in before submitting")) return "ผู้เล่นทุกคนต้องเช็กอินก่อนส่งผลการแข่งขัน";
  if (message.includes("participant or organizer")) return "เฉพาะผู้เล่นในแมตช์หรือผู้จัดก๊วนเท่านั้นที่ทำรายการนี้ได้";
  if (message.includes("submitter cannot confirm")) return "ผู้ส่งผลไม่สามารถยืนยันผลของตัวเองซ้ำได้";
  if (message.includes("awaiting confirmation")) return "แมตช์นี้ยังไม่อยู่ในสถานะรอยืนยันผล";
  if (message.includes("same result")) return "ผู้ส่งผลไม่สามารถยืนยันผลของตัวเองซ้ำได้";
  if (message.includes("bp rule")) return "ระบบยังไม่พร้อมคำนวณ BP กรุณาติดต่อผู้ดูแลระบบ";
  if (message.includes("not found")) return "ไม่พบแมตช์นี้";
  if (error.code === "23505") return "ข้อมูลแมตช์ซ้ำ กรุณาลองใหม่อีกครั้ง";
  if (error.code === "22023") return "ข้อมูลการแข่งขันไม่ถูกต้องหรือไม่อยู่ในสถานะที่ทำรายการได้";
  return "ไม่สามารถดำเนินการกับแมตช์ได้ กรุณาลองใหม่อีกครั้ง";
}

async function requireCompletedProfile() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");
  if (!result.profile?.profile_completed_at) redirect("/profile/setup");
  return result;
}

export async function createMatchAction(_previousState: MatchActionState, formData: FormData): Promise<MatchActionState> {
  const parsed = createMatchSchema.safeParse({
    groupId: readFormText(formData, "groupId"),
    format: readFormText(formData, "format"),
    teamAUserIds: readFormValues(formData, "teamAUserId"),
    teamBUserIds: readFormValues(formData, "teamBUserId"),
    expWinReward: readFormText(formData, "expWinReward"),
    expLossReward: readFormText(formData, "expLossReward"),
  });

  if (!parsed.success) return { error: "กรุณาตรวจสอบข้อมูลแมตช์ให้ครบถ้วน", fieldErrors: formFieldErrors(parsed.error) };

  const { supabase } = await requireCompletedProfile();
  let matchId: string | null = null;
  try {
    const { data, error } = await supabase.rpc("create_match", {
      p_group_id: parsed.data.groupId,
      p_format: parsed.data.format,
      p_team_a_user_ids: parsed.data.teamAUserIds,
      p_team_b_user_ids: parsed.data.teamBUserIds,
      p_exp_win_reward: parsed.data.expWinReward,
      p_exp_loss_reward: parsed.data.expLossReward,
    });
    if (error) return { error: matchErrorMessage(error) };
    const row = getReturnedRow(data);
    matchId = typeof row?.id === "string" ? row.id : null;
  } catch {
    return { error: "สร้างแมตช์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  if (!matchId) return { error: "สร้างแมตช์สำเร็จแต่ไม่พบรหัสแมตช์ กรุณาลองเปิดใหม่อีกครั้ง" };
  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath(`/groups/${parsed.data.groupId}/matches/new`);
  revalidatePath("/matches");
  redirect(`/matches/${matchId}`);
}

export async function checkInMatchAction(_previousState: MatchActionState, formData: FormData): Promise<MatchActionState> {
  const matchId = matchIdSchema.safeParse(readFormText(formData, "matchId"));
  if (!matchId.success) return { error: "แมตช์ไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("check_in_match", { p_match_id: matchId.data });
  if (error) return { error: matchErrorMessage(error) };
  revalidatePath(`/matches/${matchId.data}`);
  revalidatePath("/matches");
  return { message: "เช็กอินเข้าแมตช์แล้ว" };
}

export async function markMatchAttendanceAction(_previousState: MatchActionState, formData: FormData): Promise<MatchActionState> {
  const matchId = matchIdSchema.safeParse(readFormText(formData, "matchId"));
  const userId = uuidSchema.safeParse(readFormText(formData, "userId"));
  const status = z.enum(["no_show", "excused"]).safeParse(readFormText(formData, "status"));
  if (!matchId.success || !userId.success || !status.success) return { error: "ข้อมูลสถานะผู้เล่นไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("mark_match_attendance", {
    p_match_id: matchId.data,
    p_user_id: userId.data,
    p_status: status.data,
  });
  if (error) return { error: matchErrorMessage(error) };
  revalidatePath(`/matches/${matchId.data}`);
  return { message: status.data === "no_show" ? "บันทึกเป็นไม่มาแข่งแล้ว" : "บันทึกสถานะยกเว้นแล้ว" };
}

export async function submitMatchResultAction(_previousState: MatchActionState, formData: FormData): Promise<MatchActionState> {
  const matchId = matchIdSchema.safeParse(readFormText(formData, "matchId"));
  const teamAScore = integerField(0, 30).safeParse(readFormText(formData, "teamAScore"));
  const teamBScore = integerField(0, 30).safeParse(readFormText(formData, "teamBScore"));
  if (!matchId.success || !teamAScore.success || !teamBScore.success) return { error: "กรุณากรอกคะแนนให้ถูกต้อง" };

  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("submit_match_result", {
    p_match_id: matchId.data,
    p_team_a_score: teamAScore.data,
    p_team_b_score: teamBScore.data,
  });
  if (error) return { error: matchErrorMessage(error) };
  revalidatePath(`/matches/${matchId.data}`);
  revalidatePath("/matches");
  return { message: "ส่งผลการแข่งขันแล้ว รอผู้เล่นอีกฝั่งยืนยัน" };
}

export async function confirmMatchResultAction(_previousState: MatchActionState, formData: FormData): Promise<MatchActionState> {
  const matchId = matchIdSchema.safeParse(readFormText(formData, "matchId"));
  if (!matchId.success) return { error: "แมตช์ไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("confirm_match_result", { p_match_id: matchId.data });
  if (error) return { error: matchErrorMessage(error) };
  revalidatePath(`/matches/${matchId.data}`);
  revalidatePath("/matches");
  revalidatePath("/profile");
  revalidatePath("/ranking");
  return { message: "ยืนยันผลแล้ว ระบบบันทึก EXP และ BP ให้ผู้เล่นเรียบร้อย" };
}
