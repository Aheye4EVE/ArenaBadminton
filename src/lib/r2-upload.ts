const PUBLIC_URL_PATTERN = /^https?:\/\//i;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function publicObjectUrl(objectKey: string) {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl || !PUBLIC_URL_PATTERN.test(baseUrl)) return null;
  return `${baseUrl}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

export function isOwnedAvatarObjectKey(value: string, userId: string) {
  const prefix = `avatars/${userId}/`;
  const filename = value.startsWith(prefix) ? value.slice(prefix.length) : "";
  return Boolean(
    filename
      && filename.length <= 160
      && !filename.includes("..")
      && !filename.includes("/")
      && !filename.includes("\\")
      && /^[a-zA-Z0-9._-]+$/.test(filename),
  );
}

export function resolveAvatarUpdate(formData: FormData, userId: string) {
  const objectKeyValue = formData.get("avatarObjectKey");
  const objectKey = typeof objectKeyValue === "string" ? objectKeyValue.trim() : "";
  const removeAvatar = formData.get("removeAvatar") === "true";

  if (removeAvatar) return { value: null as string | null, error: null as string | null };
  if (!objectKey) return { value: undefined, error: null as string | null };
  if (!isOwnedAvatarObjectKey(objectKey, userId)) {
    return { value: undefined, error: "รูปโปรไฟล์ไม่ถูกต้อง กรุณาอัปโหลดใหม่อีกครั้ง" };
  }

  const value = publicObjectUrl(objectKey);
  if (!value) {
    return { value: undefined, error: "ยังไม่ได้ตั้งค่า Public URL ของ R2" };
  }

  return { value, error: null as string | null };
}
