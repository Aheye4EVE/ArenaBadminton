"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type GroupActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  membershipStatus?: "registered" | "waitlisted" | "cancelled";
};

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const integerField = (min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : Number(value)),
    z.number().int().min(min).max(max),
  );

const moneyField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? 0 : Number(value)),
  z.number().finite().min(0).max(100_000),
);

const locationAreaField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(80, "ชื่อพื้นที่ยาวเกินไป").optional(),
);

const createGroupSchema = z
  .object({
    title: z.string().trim().min(1, "กรุณากรอกชื่อก๊วน").max(160, "ชื่อก๊วนยาวเกินไป"),
    description: optionalText(1_000),
    locationText: z.string().trim().min(1, "กรุณากรอกสถานที่หรือชื่อสนาม").max(240, "สถานที่ยาวเกินไป"),
    province: z.string().trim().min(1, "กรุณากรอกจังหวัด").max(80, "ชื่อจังหวัดยาวเกินไป"),
    district: locationAreaField,
    subdistrict: locationAreaField,
    startsDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "กรุณาเลือกวันที่"),
    startsTime: z.string().regex(/^\d{2}:\d{2}$/, "กรุณาเลือกเวลา"),
    durationMinutes: integerField(30, 480),
    capacity: integerField(2, 200),
    minLevel: integerField(1, 99),
    maxLevel: integerField(1, 99),
    playType: z.enum(["open", "friendly", "tournament", "training"]),
    entryFee: moneyField,
    notes: optionalText(1_000),
  })
  .superRefine((data, context) => {
    if (data.minLevel > data.maxLevel) {
      context.addIssue({ code: "custom", path: ["maxLevel"], message: "ระดับสูงสุดต้องไม่น้อยกว่าระดับเริ่มต้น" });
    }
  });

const groupIdSchema = z.string().uuid("รหัสก๊วนไม่ถูกต้อง");

function readFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function formFieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[] | undefined>;
}

function bangkokDateTimeToIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  const result = new Date(`${date}T${time}:00+07:00`);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

function groupErrorMessage(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("profile completion")) return "กรุณากรอก Profile ให้ครบก่อนสร้างหรือเข้าก๊วน";
  if (message.includes("at least 15 minutes")) return "ก๊วนต้องเริ่มล่วงหน้าอย่างน้อย 15 นาที";
  if (message.includes("not open for joining")) return "ก๊วนนี้ปิดรับสมาชิกแล้ว";
  if (message.includes("already finalized")) return "ผลการเข้าร่วมก๊วนนี้ถูกสรุปแล้ว";
  if (message.includes("not an active member")) return "คุณไม่ได้อยู่ในสมาชิกที่กำลังเข้าร่วมก๊วนนี้";
  if (message.includes("organizer")) return "ผู้จัดไม่สามารถออกจากก๊วนของตัวเองได้ ให้ใช้เมนูยกเลิกก๊วนแทน";
  if (message.includes("no longer active")) return "ก๊วนนี้จบหรือถูกยกเลิกแล้ว";
  if (error.code === "23505") return "ข้อมูลก๊วนซ้ำ กรุณาลองใหม่อีกครั้ง";
  if (error.code === "22023") return "ข้อมูลก๊วนไม่ถูกต้องหรือไม่อยู่ในสถานะที่ทำรายการได้";
  return "ไม่สามารถดำเนินการกับก๊วนได้ กรุณาลองใหม่อีกครั้ง";
}

async function requireCompletedProfile() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");
  if (!result.profile?.profile_completed_at) redirect("/profile/setup");
  return result;
}

function getReturnedRow(data: unknown) {
  if (Array.isArray(data)) return data[0] as Record<string, unknown> | undefined;
  return data as Record<string, unknown> | undefined;
}

export async function createGroupAction(_previousState: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const parsed = createGroupSchema.safeParse({
    title: readFormText(formData, "title"),
    description: readFormText(formData, "description"),
    locationText: readFormText(formData, "locationText"),
    province: readFormText(formData, "province"),
    district: readFormText(formData, "district"),
    subdistrict: readFormText(formData, "subdistrict"),
    startsDate: readFormText(formData, "startsDate"),
    startsTime: readFormText(formData, "startsTime"),
    durationMinutes: readFormText(formData, "durationMinutes"),
    capacity: readFormText(formData, "capacity"),
    minLevel: readFormText(formData, "minLevel"),
    maxLevel: readFormText(formData, "maxLevel"),
    playType: readFormText(formData, "playType"),
    entryFee: readFormText(formData, "entryFee"),
    notes: readFormText(formData, "notes"),
  });

  if (!parsed.success) return { error: "กรุณาตรวจสอบรายละเอียดก๊วนให้ครบถ้วน", fieldErrors: formFieldErrors(parsed.error) };

  const startsAt = bangkokDateTimeToIso(parsed.data.startsDate, parsed.data.startsTime);
  if (!startsAt) return { error: "วันที่หรือเวลาไม่ถูกต้อง", fieldErrors: { startsDate: ["กรุณาเลือกวันที่และเวลาใหม่"] } };
  if (new Date(startsAt).getTime() <= Date.now() + 15 * 60 * 1_000) {
    return { error: "ก๊วนต้องเริ่มล่วงหน้าอย่างน้อย 15 นาที", fieldErrors: { startsTime: ["เวลาเริ่มต้องอยู่ล่วงหน้าอย่างน้อย 15 นาที"] } };
  }

  const locationParts = [parsed.data.locationText, parsed.data.subdistrict, parsed.data.district, parsed.data.province].filter(Boolean);
  const searchableLocation = locationParts.join(" · ");
  if (searchableLocation.length > 240) {
    return { error: "รายละเอียดพื้นที่ยาวเกินไป กรุณาลดความยาวลง", fieldErrors: { locationText: ["ลดความยาวสถานที่หรือพื้นที่ลง"] } };
  }

  const { supabase } = await requireCompletedProfile();
  let groupId: string | null = null;
  try {
    const { data, error } = await supabase.rpc("create_group", {
      p_title: parsed.data.title,
      p_description: parsed.data.description ?? null,
      p_location_text: searchableLocation,
      p_starts_at: startsAt,
      p_duration_minutes: parsed.data.durationMinutes,
      p_capacity: parsed.data.capacity,
      p_min_level: parsed.data.minLevel,
      p_max_level: parsed.data.maxLevel,
      p_play_type: parsed.data.playType,
      p_entry_fee: parsed.data.entryFee,
      p_notes: parsed.data.notes ?? null,
    });

    if (error) return { error: groupErrorMessage(error) };
    const group = getReturnedRow(data);
    groupId = typeof group?.id === "string" ? group.id : null;
  } catch {
    return { error: "สร้างก๊วนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  if (!groupId) return { error: "สร้างก๊วนสำเร็จแต่ไม่พบรหัสก๊วน กรุณาเปิดหน้าก๊วนอีกครั้ง" };
  revalidatePath("/groups");
  revalidatePath("/organizer");
  redirect(`/groups/${groupId}`);
}

export async function joinGroupAction(_previousState: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const groupId = groupIdSchema.safeParse(readFormText(formData, "groupId"));
  if (!groupId.success) return { error: "ก๊วนไม่ถูกต้อง" };

  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("join_group", { p_group_id: groupId.data });
  if (error) return { error: groupErrorMessage(error) };

  const result = getReturnedRow(data);
  const membershipStatus = result?.membership_status === "registered" ? "registered" : "waitlisted";
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId.data}`);
  return {
    membershipStatus,
    message: membershipStatus === "registered" ? "เข้าร่วมก๊วนเรียบร้อยแล้ว" : "ก๊วนเต็มแล้ว ระบบเพิ่มคุณเข้าคิวรอให้แล้ว",
  };
}

export async function leaveGroupAction(_previousState: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const groupId = groupIdSchema.safeParse(readFormText(formData, "groupId"));
  if (!groupId.success) return { error: "ก๊วนไม่ถูกต้อง" };

  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("leave_group", { p_group_id: groupId.data });
  if (error) return { error: groupErrorMessage(error) };

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId.data}`);
  return { membershipStatus: "cancelled", message: "ออกจากก๊วนแล้ว หากมีคิวรอ ระบบจะเลื่อนสมาชิกถัดไปเข้าแทน" };
}

export async function cancelGroupAction(_previousState: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const groupId = groupIdSchema.safeParse(readFormText(formData, "groupId"));
  if (!groupId.success) return { error: "ก๊วนไม่ถูกต้อง" };

  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("cancel_group", { p_group_id: groupId.data });
  if (error) return { error: groupErrorMessage(error) };

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId.data}`);
  return { message: "ยกเลิกก๊วนแล้ว สมาชิกที่อยู่ในก๊วนจะไม่สามารถเข้าร่วมกิจกรรมนี้ต่อได้" };
}
