import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

const uploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(120),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, "").slice(0, 90) || "upload";
}

function publicObjectUrl(objectKey: string) {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) return null;
  return `${baseUrl}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
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
    const key = `media/${user.id}/${crypto.randomUUID()}-${safeFilename(body.filename)}`;
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
