import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../data");
const JSON_FILE = path.join(DATA_DIR, "badminton_venues_thailand.json");
const SQL_EXPORT_FILE = path.join(DATA_DIR, "supabase_venues_seed.sql");
const SUPABASE_MIGRATION_FILE = path.resolve(__dirname, "../supabase/migrations/20260906140000_seed_thailand_badminton_venues.sql");
const SUPABASE_CSV_FILE = path.join(DATA_DIR, "supabase_venues_import.csv");

function escapeSql(str) {
  if (str === null || str === undefined || str === "") return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

export function generateSupabaseFiles() {
  if (!fs.existsSync(JSON_FILE)) {
    console.error("No venues JSON file found at:", JSON_FILE);
    return;
  }

  const venues = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  console.log(`Generating Supabase files from ${venues.length} venues...`);

  // 1. Generate CTE-based Supabase SQL Seed
  const lines = [
    "-- ==========================================================================",
    "-- Supabase PostgreSQL Migration / Seed: Thailand Badminton Venues Registry",
    `-- Total unique venues: ${venues.length}`,
    "-- Generated on: " + new Date().toISOString(),
    "-- ==========================================================================",
    "",
    "with seed(name, province, district, subdistrict, address, latitude, longitude, rating, source_url) as (",
    "  values"
  ];

  const valueRows = [];
  for (const v of venues) {
    const name = escapeSql(v.name.slice(0, 160));
    const prov = escapeSql(v.province);
    const dist = escapeSql(v.district);
    const subdist = escapeSql(v.subdistrict);
    const addr = escapeSql(v.address);
    const lat = v.latitude !== null && v.latitude !== undefined ? v.latitude : "NULL";
    const lng = v.longitude !== null && v.longitude !== undefined ? v.longitude : "NULL";
    const rating = v.rating !== null && v.rating !== undefined ? Number(v.rating).toFixed(1) : "0.0";
    const sourceUrl = escapeSql(v.sourceUrl);

    valueRows.push(`    (${name}, ${prov}, ${dist}, ${subdist}, ${addr}, ${lat}, ${lng}, ${rating}, ${sourceUrl})`);
  }

  lines.push(valueRows.join(",\n"));
  lines.push(")");
  lines.push("insert into public.venues (");
  lines.push("  created_by, name, province, district, subdistrict, address,");
  lines.push("  latitude, longitude, rating, availability, status, aliases, source_url, verified_at");
  lines.push(")");
  lines.push("select");
  lines.push("  null,");
  lines.push("  seed.name,");
  lines.push("  seed.province,");
  lines.push("  seed.district,");
  lines.push("  seed.subdistrict,");
  lines.push("  seed.address,");
  lines.push("  seed.latitude,");
  lines.push("  seed.longitude,");
  lines.push("  seed.rating,");
  lines.push("  'unknown',");
  lines.push("  'active',");
  lines.push("  '{}'::text[],");
  lines.push("  seed.source_url,");
  lines.push("  now()");
  lines.push("from seed");
  lines.push("where not exists (");
  lines.push("  select 1 from public.venues existing");
  lines.push("  where lower(btrim(existing.name)) = lower(btrim(seed.name))");
  lines.push("    and (");
  lines.push("      existing.province = seed.province");
  lines.push("      or public.arena_area(existing.province) = public.arena_area(seed.province)");
  lines.push("    )");
  lines.push(");");
  lines.push("");

  const sqlContent = lines.join("\n");
  fs.writeFileSync(SQL_EXPORT_FILE, sqlContent, "utf8");
  fs.writeFileSync(SUPABASE_MIGRATION_FILE, sqlContent, "utf8");
  console.log(`Saved Supabase SQL file to:`);
  console.log(` - ${SQL_EXPORT_FILE}`);
  console.log(` - ${SUPABASE_MIGRATION_FILE}`);

  // 2. Generate Supabase Studio Table Editor CSV format
  const csvHeaders = ["name", "province", "district", "subdistrict", "address", "latitude", "longitude", "rating", "availability", "status", "source_url"];
  const csvRows = [csvHeaders.join(",")];
  for (const v of venues) {
    const row = [
      v.name,
      v.province,
      v.district || "",
      v.subdistrict || "",
      v.address || "",
      v.latitude !== null ? v.latitude : "",
      v.longitude !== null ? v.longitude : "",
      v.rating !== null ? v.rating : "0",
      "unknown",
      "active",
      v.sourceUrl || ""
    ].map(val => `"${String(val).replace(/"/g, '""')}"`);
    csvRows.push(row.join(","));
  }
  fs.writeFileSync(SUPABASE_CSV_FILE, "\uFEFF" + csvRows.join("\n"), "utf8");
  console.log(`Saved Supabase CSV file to:`);
  console.log(` - ${SUPABASE_CSV_FILE}`);
}

if (process.argv[1] && process.argv[1].endsWith("generate-supabase-seed.mjs")) {
  generateSupabaseFiles();
}
