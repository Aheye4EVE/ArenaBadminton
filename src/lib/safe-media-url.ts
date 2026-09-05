const MAX_MEDIA_URL_LENGTH = 2048;
const DEFAULT_PUBLIC_SITE_URL = "https://arena-badminton.vercel.app";

function isR2StorageEndpoint(url: URL) {
  return /^https:\/\/[^/]+\.r2\.cloudflarestorage\.com$/i.test(url.origin);
}

function getApplicationBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured && /^https:\/\//i.test(configured)) return configured;

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost && /^[a-z0-9.-]+$/i.test(productionHost)) return `https://${productionHost}`;

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost && /^[a-z0-9.-]+$/i.test(deploymentHost)) return `https://${deploymentHost}`;

  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : DEFAULT_PUBLIC_SITE_URL;
}

function proxyR2Url(url: URL) {
  if (!isR2StorageEndpoint(url)) return null;
  const objectKey = url.pathname.replace(/^\/+/, "");
  if (!objectKey || objectKey.includes("..") || objectKey.includes("\\") || !/^(avatars|profile-backgrounds|guilds|media|marketplace)\//i.test(objectKey)) return null;
  const baseUrl = getApplicationBaseUrl();
  return baseUrl ? `${baseUrl}/api/media/${objectKey.split("/").map((part) => encodeURIComponent(part)).join("/")}` : null;
}

/**
 * Public image URLs are rendered from database values. Keep the client-side
 * rendering boundary deliberately narrow even though the database also
 * validates these columns. This avoids turning malformed legacy data into a
 * browser URL.
 */
export function safeMediaUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_MEDIA_URL_LENGTH) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return proxyR2Url(url) ?? url.toString();
  } catch {
    return null;
  }
}
