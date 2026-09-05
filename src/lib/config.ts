export function getIntegrationConfiguration() {
  const googleMaps = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    maps: googleMaps,
    mapProvider: "google-maps",
    googleMaps,
    database: Boolean(process.env.DATABASE_URL),
    r2: Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET),
    r2PublicUrl: Boolean(process.env.R2_PUBLIC_BASE_URL),
  };
}

export function shouldShowQaData() {
  return process.env.ARENA_SHOW_QA_DATA === "true";
}
