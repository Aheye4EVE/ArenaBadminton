import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, getSupabaseServerClient } from "@/lib/supabase-server";
import { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES, GUILD_LOGO_MAX_BYTES, publicObjectUrl } from "@/lib/r2-upload";

export const runtime = "nodejs";

const uploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(120),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  purpose: z.enum(["community", "avatar", "guild-logo"]).default("community"),
  guildId: z.string().uuid().optional(),
});

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, "").slice(0, 90) || "upload";
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ code: "AUTH_REQUIRED", message: "ต้องเข้าสู่ระบบก่อนอัปโหลดรูป" }, { status: 401 });
  }

  const configuration = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
  };

  if (Object.values(configuration).some((value) => !value)) {
    return NextResponse.json({ code: "R2_NOT_CONFIGURED", message: "ยังไม่ได้ตั้งค่า Cloudflare R2" }, { status: 503 });
  }

  try {
    const body = uploadRequestSchema.parse(await request.json());
    if (body.purpose === "avatar" && (!AVATAR_CONTENT_TYPES.includes(body.contentType as (typeof AVATAR_CONTENT_TYPES)[number]) || body.size > AVATAR_MAX_BYTES)) {
      return NextResponse.json({ code: "INVALID_AVATAR", message: "Avatar ต้องเป็น JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB" }, { status: 422 });
    }
    if (body.purpose === "guild-logo") {
      if (!body.guildId || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(body.contentType) || body.size > GUILD_LOGO_MAX_BYTES) {
        return NextResponse.json({ code: "INVALID_GUILD_LOGO", message: "Logo Guild ต้องเป็นรูปภาพขนาดไม่เกิน 5 MB" }, { status: 422 });
      }
      const supabase = await getSupabaseServerClient();
      const { data: membership, error: membershipError } = supabase
        ? await supabase.from("guild_members").select("role").eq("guild_id", body.guildId).eq("user_id", user.id).eq("membership_status", "active").in("role", ["guild_master", "officer"]).maybeSingle()
        : { data: null, error: new Error("Supabase is not configured") };
      if (membershipError || !membership) {
        return NextResponse.json({ code: "GUILD_LOGO_FORBIDDEN", message: "เฉพาะ Guild Master หรือ Officer เท่านั้นที่อัปโหลด Logo ได้" }, { status: 403 });
      }
    }

    const key = body.purpose === "avatar"
      ? `avatars/${user.id}/${crypto.randomUUID()}-${safeFilename(body.filename)}`
      : body.purpose === "guild-logo"
        ? `guilds/${body.guildId}/logo/${crypto.randomUUID()}-${safeFilename(body.filename)}`
        : `media/${user.id}/${crypto.randomUUID()}-${safeFilename(body.filename)}`;
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${configuration.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: configuration.accessKeyId!,
        secretAccessKey: configuration.secretAccessKey!,
      },
    });
    const command = new PutObjectCommand({
      Bucket: configuration.bucket,
      Key: key,
      ContentType: body.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

    return NextResponse.json({
      uploadUrl,
      objectKey: key,
      publicUrl: publicObjectUrl(key),
      expiresIn: 600,
      requiredHeaders: { "Content-Type": body.contentType },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ code: "INVALID_UPLOAD", message: "ข้อมูลไฟล์ไม่ถูกต้อง" }, { status: 422 });
    }

    return NextResponse.json({ code: "PRESIGN_FAILED", message: "ไม่สามารถเตรียมการอัปโหลดได้" }, { status: 500 });
  }
}
