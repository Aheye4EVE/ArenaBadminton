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
