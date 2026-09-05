const MAX_MEDIA_URL_LENGTH = 2048;

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
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
