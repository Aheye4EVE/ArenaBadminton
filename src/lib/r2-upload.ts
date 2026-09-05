const PUBLIC_URL_PATTERN = /^https:\/\//i;

function isPrivateR2Endpoint(value: string) {
  return /^https:\/\/[^/]+\.r2\.cloudflarestorage\.com(?:\/[^/]*)?$/i.test(value);
}

function applicationBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured && PUBLIC_URL_PATTERN.test(configured)) return configured;

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost && /^[a-z0-9.-]+$/i.test(productionHost)) return `https://${productionHost}`;

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost && /^[a-z0-9.-]+$/i.test(deploymentHost)) return `https://${deploymentHost}`;

  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : null;
}

export function mediaProxyUrl(objectKey: string) {
  const baseUrl = applicationBaseUrl();
  if (!baseUrl) return null;
  return `${baseUrl}/api/media/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export const PROFILE_BACKGROUND_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_BACKGROUND_CONTENT_TYPES = AVATAR_CONTENT_TYPES;
export const GUILD_LOGO_MAX_BYTES = 5 * 1024 * 1024;

export function publicObjectUrl(objectKey: string) {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (baseUrl && PUBLIC_URL_PATTERN.test(baseUrl) && !isPrivateR2Endpoint(baseUrl)) return `${baseUrl}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  const proxyUrl = mediaProxyUrl(objectKey);
  if (proxyUrl) return proxyUrl;
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
  const focusX = readMediaFocus(formData, "avatarFocusX");
  const focusY = readMediaFocus(formData, "avatarFocusY");

  if (removeAvatar) return { value: null as string | null, focusX, focusY, error: null as string | null };
  if (!objectKey) return { value: undefined, focusX, focusY, error: null as string | null };
  if (!isOwnedAvatarObjectKey(objectKey, userId)) {
    return { value: undefined, focusX, focusY, error: "รูปโปรไฟล์ไม่ถูกต้อง กรุณาอัปโหลดใหม่อีกครั้ง" };
  }
  if (formData.get("avatarCropConfirmed") !== "true") {
    return { value: undefined, focusX, focusY, error: "กรุณากดยืนยันการ Crop รูปโปรไฟล์ก่อนบันทึก" };
  }

  const value = publicObjectUrl(objectKey);
  if (!value) {
    return { value: undefined, focusX, focusY, error: "ยังไม่ได้ตั้งค่า Public URL ของ R2" };
  }

  return { value, focusX, focusY, error: null as string | null };
}

function readMediaFocus(formData: FormData, name: string) {
  const value = formData.get(name);
  const number = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 50;
}

export function isOwnedProfileBackgroundObjectKey(value: string, userId: string) {
  const prefix = `profile-backgrounds/${userId}/`;
  const filename = value.startsWith(prefix) ? value.slice(prefix.length) : "";
  return Boolean(
    filename
      && filename.length <= 180
      && !filename.includes("..")
      && !filename.includes("/")
      && !filename.includes("\\")
      && /^[a-zA-Z0-9._-]+$/.test(filename),
  );
}

export function resolveProfileBackgroundUpdate(formData: FormData, userId: string) {
  const objectKeyValue = formData.get("profileBackgroundObjectKey");
  const objectKey = typeof objectKeyValue === "string" ? objectKeyValue.trim() : "";
  const removeBackground = formData.get("removeProfileBackground") === "true";
  const focusX = readMediaFocus(formData, "backgroundFocusX");
  const focusY = readMediaFocus(formData, "backgroundFocusY");

  if (removeBackground) return { value: null as string | null, focusX, focusY, error: null as string | null };
  if (!objectKey) return { value: undefined, focusX, focusY, error: null as string | null };
  if (!isOwnedProfileBackgroundObjectKey(objectKey, userId)) {
    return { value: undefined, focusX, focusY, error: "ภาพพื้นหลัง Profile ไม่ถูกต้อง กรุณาอัปโหลดใหม่อีกครั้ง" };
  }
  if (formData.get("profileBackgroundCropConfirmed") !== "true") {
    return { value: undefined, focusX, focusY, error: "กรุณากดยืนยันการ Crop ภาพพื้นหลัง Profile ก่อนบันทึก" };
  }

  const value = publicObjectUrl(objectKey);
  if (!value) return { value: undefined, focusX, focusY, error: "ยังไม่ได้ตั้งค่า Public URL ของ R2" };
  return { value, focusX, focusY, error: null as string | null };
}

export function isOwnedGuildLogoObjectKey(value: string, guildId: string) {
  const prefix = `guilds/${guildId}/logo/`;
  const filename = value.startsWith(prefix) ? value.slice(prefix.length) : "";
  return Boolean(
    filename
      && filename.length <= 180
      && !filename.includes("..")
      && !filename.includes("/")
      && !filename.includes("\\")
      && /^[a-zA-Z0-9._-]+$/.test(filename),
  );
}

export function resolveGuildLogoUpdate(formData: FormData, guildId: string) {
  const objectKeyValue = formData.get("logoObjectKey");
  const objectKey = typeof objectKeyValue === "string" ? objectKeyValue.trim() : "";
  const removeLogo = formData.get("removeLogo") === "true";

  if (removeLogo) return { value: null as string | null, error: null as string | null };
  if (!objectKey) return { value: undefined, error: null as string | null };
  if (!isOwnedGuildLogoObjectKey(objectKey, guildId)) {
    return { value: undefined, error: "Logo Guild ไม่ถูกต้อง กรุณาอัปโหลดใหม่อีกครั้ง" };
  }

  const value = publicObjectUrl(objectKey);
  if (!value) return { value: undefined, error: "ยังไม่ได้ตั้งค่า Public URL ของ R2" };
  return { value, error: null as string | null };
}
