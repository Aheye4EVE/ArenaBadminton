export function getIntegrationConfiguration() {
  const googleMaps = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    lineProvider: process.env.NEXT_PUBLIC_SUPABASE_LINE_PROVIDER ?? "custom:line",
    maps: googleMaps,
    mapProvider: "google-maps",
    googleMaps,
    database: Boolean(process.env.DATABASE_URL),
    r2: Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET),
  };
}

export function shouldShowQaData() {
  return process.env.ARENA_SHOW_QA_DATA === "true";
}
