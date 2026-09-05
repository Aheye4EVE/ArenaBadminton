import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_PREFIXES = ["avatars/", "profile-backgrounds/", "guilds/", "media/", "marketplace/"];

function isSafeObjectKey(value: string) {
  return value.length > 0
    && value.length <= 512
    && !value.includes("..")
    && !value.includes("\\")
    && !value.includes("\0")
    && ALLOWED_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params;
  const objectKey = segments.join("/");
  if (!isSafeObjectKey(objectKey)) return NextResponse.json({ message: "ไม่พบไฟล์สื่อ" }, { status: 404 });

  const configuration = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
  };
  if (Object.values(configuration).some((value) => !value)) return NextResponse.json({ message: "ยังไม่ได้ตั้งค่า Cloudflare R2" }, { status: 503 });

  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${configuration.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: configuration.accessKeyId!,
        secretAccessKey: configuration.secretAccessKey!,
      },
    });
    const object = await client.send(new GetObjectCommand({ Bucket: configuration.bucket, Key: objectKey }));
    if (!object.Body) return NextResponse.json({ message: "ไม่พบไฟล์สื่อ" }, { status: 404 });

    const body = object.Body.transformToWebStream();
    const headers = new Headers({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "Content-Type": object.ContentType ?? "application/octet-stream",
    });
    if (object.ETag) headers.set("ETag", object.ETag);
    return new Response(body, { status: 200, headers });
  } catch {
    return NextResponse.json({ message: "ไม่พบไฟล์สื่อ" }, { status: 404 });
  }
}
