import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path definitions
const DATA_DIR = path.resolve(__dirname, "../../data");
const JSON_FILE = path.join(DATA_DIR, "badminton_venues_thailand.json");
const CSV_FILE = path.join(DATA_DIR, "badminton_venues_thailand.csv");
const SQL_FILE = path.join(DATA_DIR, "venues_seed.sql");
const CHECKPOINT_FILE = path.join(DATA_DIR, "scrape_checkpoint.json");

// 77 Provinces of Thailand
export const THAILAND_PROVINCES = [
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
  "สมุทรปราการ",
  "สมุทรสาคร",
  "นครปฐม",
  "พระนครศรีอยุธยา",
  "สระบุรี",
  "ลพบุรี",
  "อ่างทอง",
  "สิงห์บุรี",
  "ชัยนาท",
  "อุทัยธานี",
  "สุพรรณบุรี",
  "นครนายก",
  "ฉะเชิงเทรา",
  "ชลบุรี",
  "ระยอง",
  "จันทบุรี",
  "ตราด",
  "ปราจีนบุรี",
  "สระแก้ว",
  "กาญจนบุรี",
  "ราชบุรี",
  "เพชรบุรี",
  "ประจวบคีรีขันธ์",
  "สมุทรสงคราม",
  "เชียงใหม่",
  "เชียงราย",
  "ลำปาง",
  "ลำพูน",
  "แม่ฮ่องสอน",
  "น่าน",
  "พะเยา",
  "แพร่",
  "พิษณุโลก",
  "สุโขทัย",
  "ตาก",
  "อุตรดิตถ์",
  "กำแพงเพชร",
  "พิจิตร",
  "นครสวรรค์",
  "เพชรบูรณ์",
  "นครราชสีมา",
  "ขอนแก่น",
  "อุบลราชธานี",
  "อุดรธานี",
  "บุรีรัมย์",
  "สุรินทร์",
  "ศรีสะเกษ",
  "ร้อยเอ็ด",
  "ชัยภูมิ",
  "สกลนคร",
  "มหาสารคาม",
  "กาฬสินธุ์",
  "นครพนม",
  "เลย",
  "ยโสธร",
  "มุกดาหาร",
  "หนองบัวลำภู",
  "หนองคาย",
  "อำนาจเจริญ",
  "บึงกาฬ",
  "สงขลา",
  "ภูเก็ต",
  "สุราษฎร์ธานี",
  "นครศรีธรรมราช",
  "ตรัง",
  "พัทลุง",
  "กระบี่",
  "พังงา",
  "ชุมพร",
  "ระนอง",
  "สตูล",
  "ปัตตานี",
  "ยะลา",
  "นราธิวาส"
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadExistingVenues() {
  if (fs.existsSync(JSON_FILE)) {
    try {
      const content = fs.readFileSync(JSON_FILE, "utf8");
      return JSON.parse(content);
    } catch (e) {
      console.warn("Could not parse existing JSON, starting fresh:", e.message);
    }
  }
  return [];
}

function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
    } catch (e) {}
  }
  return { completedProvinces: [] };
}

function saveCheckpoint(checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), "utf8");
}

function cleanText(str) {
  if (!str) return "";
  return str.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function normalizeName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/^สนาม(?:แบด|แบดมินตัน)\s*/i, "")
    .replace(/\s+/g, "")
    .replace(/[^ก-๙a-zA-Z0-9]/g, "");
}

// Extract Google Place Unique ID (Hex or CID) from URL
function extractPlaceId(url) {
  if (!url) return null;
  const hexMatch = url.match(/0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/);
  if (hexMatch) return hexMatch[0];
  const cidMatch = url.match(/1s0x[0-9a-fA-F]+/);
  if (cidMatch) return cidMatch[0];
  return null;
}

// Distance in meters between two lat/lng points (Haversine formula)
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if newVenue is a duplicate of any item in existingList
function isDuplicateVenue(newVenue, existingList) {
  const newPlaceId = extractPlaceId(newVenue.sourceUrl);
  const newNormName = normalizeName(newVenue.name);

  for (const existing of existingList) {
    // 1. Exact Place ID match (100% duplicate)
    if (newPlaceId && extractPlaceId(existing.sourceUrl) === newPlaceId) {
      return { duplicate: true, reason: `Match Place ID (${newPlaceId}) with "${existing.name}"` };
    }

    // 2. Location proximity check (< 100 meters apart)
    if (newVenue.latitude && newVenue.longitude && existing.latitude && existing.longitude) {
      const distMeters = calculateDistanceMeters(
        newVenue.latitude, newVenue.longitude,
        existing.latitude, existing.longitude
      );
      if (distMeters < 100) {
        return { duplicate: true, reason: `Location proximity (${distMeters.toFixed(0)}m) to "${existing.name}"` };
      }
    }

    // 3. Name match within same province
    if (existing.province === newVenue.province && newNormName.length > 3) {
      const existingNormName = normalizeName(existing.name);
      if (existingNormName === newNormName) {
        return { duplicate: true, reason: `Same normalized name in ${existing.province} with "${existing.name}"` };
      }
    }
  }

  return { duplicate: false };
}

function parseCoordinates(url) {
  if (!url) return { lat: null, lng: null };
  const m1 = url.match(/!8m2!3d(-?[0-9.]+)!4d(-?[0-9.]+)/);
  if (m1) {
    return {
      lat: Number(parseFloat(m1[1]).toFixed(6)),
      lng: Number(parseFloat(m1[2]).toFixed(6))
    };
  }
  const m2 = url.match(/@(-?[0-9.]+),(-?[0-9.]+)/);
  if (m2) {
    return {
      lat: Number(parseFloat(m2[1]).toFixed(6)),
      lng: Number(parseFloat(m2[2]).toFixed(6))
    };
  }
  return { lat: null, lng: null };
}

function extractDistrict(address, province) {
  if (!address) return null;
  const khetMatch = address.match(/(?:เขต|อำเภอ|อ\.)\s*([ก-๙a-zA-Z0-9_-]+)/);
  if (khetMatch) return khetMatch[0].trim();
  return null;
}

function extractSubdistrict(address) {
  if (!address) return null;
  const match = address.match(/(?:แขวง|ตำบล|ต\.)\s*([ก-๙a-zA-Z0-9_-]+)/);
  if (match) return match[0].trim();
  return null;
}

function escapeSql(str) {
  if (str === null || str === undefined) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

function saveVenuesFiles(venues) {
  ensureDir(DATA_DIR);

  // 1. JSON
  fs.writeFileSync(JSON_FILE, JSON.stringify(venues, null, 2), "utf8");

  // 2. CSV
  const headers = ["name", "province", "district", "subdistrict", "address", "latitude", "longitude", "rating", "sourceUrl"];
  const csvRows = [headers.join(",")];
  for (const v of venues) {
    const row = headers.map(h => {
      const val = v[h] !== null && v[h] !== undefined ? String(v[h]) : "";
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(row.join(","));
  }
  fs.writeFileSync(CSV_FILE, "\uFEFF" + csvRows.join("\n"), "utf8"); // BOM for Thai Excel support

  // 3. SQL Seed
  const sqlStatements = [
    "-- Generated Badminton Venues Seed File",
    "-- Total Venues: " + venues.length,
    "BEGIN;",
    ""
  ];

  for (const v of venues) {
    const name = escapeSql(v.name.slice(0, 160));
    const province = escapeSql(v.province);
    const district = escapeSql(v.district);
    const subdistrict = escapeSql(v.subdistrict);
    const address = escapeSql(v.address);
    const lat = v.latitude !== null ? v.latitude : "NULL";
    const lng = v.longitude !== null ? v.longitude : "NULL";
    const rating = v.rating !== null ? Number(v.rating).toFixed(1) : "'0'";
    const sourceUrl = escapeSql(v.sourceUrl);

    sqlStatements.push(
      `INSERT INTO venues (name, province, district, subdistrict, address, latitude, longitude, rating, availability, status, source_url) ` +
      `VALUES (${name}, ${province}, ${district}, ${subdistrict}, ${address}, ${lat}, ${lng}, ${rating}, 'unknown', 'active', ${sourceUrl}) ` +
      `ON CONFLICT DO NOTHING;`
    );
  }

  sqlStatements.push("");
  sqlStatements.push("COMMIT;");
  fs.writeFileSync(SQL_FILE, sqlStatements.join("\n"), "utf8");
}

export async function scrapeProvince(page, provinceName) {
  const query = `สนามแบดมินตัน ${provinceName}`;
  const encodedQuery = encodeURIComponent(query);
  const targetUrl = `https://www.google.co.th/maps/search/${encodedQuery}`;

  console.log(`[Google Maps] Searching: "${query}"...`);
  await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 35000 }).catch(e => {
    console.warn(`Navigation warning for ${provinceName}:`, e.message);
  });

  await new Promise(r => setTimeout(r, 2000));

  // Single place redirect detection
  const currentUrl = page.url();
  if (currentUrl.includes("/maps/place/")) {
    const singlePlace = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.innerText || "";
      const textBlock = document.body.innerText || "";
      return {
        name: h1.trim(),
        text: textBlock.slice(0, 500)
      };
    });

    if (singlePlace.name) {
      const coords = parseCoordinates(currentUrl);
      return [{
        name: cleanText(singlePlace.name),
        province: provinceName,
        district: extractDistrict(singlePlace.text, provinceName),
        subdistrict: extractSubdistrict(singlePlace.text),
        address: cleanText(singlePlace.text.split("\n").filter(l => l.includes("ต.") || l.includes("อ.") || l.includes("ซ.") || l.includes("ถ."))[0] || `${provinceName}`),
        latitude: coords.lat,
        longitude: coords.lng,
        rating: 4.0,
        sourceUrl: currentUrl
      }];
    }
  }

  // Multi-result feed: Scroll feed 3-4 times
  const results = await page.evaluate(async () => {
    const feed = document.querySelector('div[role="feed"]');
    if (feed) {
      for (let i = 0; i < 3; i++) {
        feed.scrollTop = feed.scrollHeight;
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    const cards = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
    const items = [];
    const seenNames = new Set();

    for (const a of cards) {
      const name = (a.getAttribute("aria-label") || a.innerText.split("\n")[0] || "").trim();
      if (!name || seenNames.has(name)) continue;
      seenNames.add(name);

      const card = a.closest('div[jsaction]') || a;
      const cardText = card.innerText || "";
      items.push({
        name,
        href: a.href,
        text: cardText
      });
    }
    return items;
  });

  const parsedItems = [];
  for (const item of results) {
    const coords = parseCoordinates(item.href);
    let rating = 0;
    const ratingMatch = item.text.match(/\b([1-5]\.[0-9])\b/);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
    }

    const lines = item.text.split("\n").map(l => l.trim()).filter(Boolean);
    let address = "";
    for (const line of lines) {
      if (line.includes("·") && (line.includes("ซ.") || line.includes("ถ.") || line.includes("หมู่") || line.includes("อ.") || line.includes("เลขที่"))) {
        const parts = line.split("·").map(p => p.trim());
        address = parts[parts.length - 1];
        break;
      }
    }
    if (!address) {
      address = `${provinceName}`;
    }

    parsedItems.push({
      name: cleanText(item.name).slice(0, 160),
      province: provinceName,
      district: extractDistrict(item.text + " " + address, provinceName),
      subdistrict: extractSubdistrict(item.text + " " + address),
      address: cleanText(address).slice(0, 240),
      latitude: coords.lat,
      longitude: coords.lng,
      rating: rating,
      sourceUrl: item.href
    });
  }

  return parsedItems;
}

export async function runScraper(targetProvinces = THAILAND_PROVINCES, isPilot = false) {
  ensureDir(DATA_DIR);
  let venues = loadExistingVenues();
  const checkpoint = loadCheckpoint();

  console.log(`Starting Badminton Courts Scraper with Smart Deduplication...`);
  console.log(`Current existing venues in DB file: ${venues.length}`);
  console.log(`Provinces to scrape: ${targetProvinces.length}`);

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--lang=th-TH,th",
      "--window-size=1280,800"
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
  );

  let totalNewAdded = 0;
  let totalDuplicatesFiltered = 0;

  try {
    for (let i = 0; i < targetProvinces.length; i++) {
      const province = targetProvinces[i];

      if (!isPilot && checkpoint.completedProvinces.includes(province)) {
        console.log(`[${i + 1}/${targetProvinces.length}] Skipping ${province} (Already completed)`);
        continue;
      }

      console.log(`\n========================================`);
      console.log(`[${i + 1}/${targetProvinces.length}] Processing: ${province}`);
      console.log(`========================================`);

      try {
        const foundVenues = await scrapeProvince(page, province);
        console.log(`--> Found ${foundVenues.length} raw results in ${province}`);

        let addedForProv = 0;
        let dupesForProv = 0;

        for (const v of foundVenues) {
          const dupCheck = isDuplicateVenue(v, venues);
          if (dupCheck.duplicate) {
            console.log(`   [SKIP DUPLICATE] "${v.name}": ${dupCheck.reason}`);
            dupesForProv++;
            totalDuplicatesFiltered++;
          } else {
            venues.push(v);
            addedForProv++;
            totalNewAdded++;
          }
        }

        console.log(`--> Added ${addedForProv} new unique courts. Filtered out ${dupesForProv} duplicates. (Total unique: ${venues.length})`);

        if (!checkpoint.completedProvinces.includes(province)) {
          checkpoint.completedProvinces.push(province);
          saveCheckpoint(checkpoint);
        }
        saveVenuesFiles(venues);

        // Anti-bot throttle delay
        const delayMs = Math.floor(Math.random() * 1500) + 2000;
        console.log(`Waiting ${(delayMs / 1000).toFixed(1)}s before next province...`);
        await new Promise(r => setTimeout(r, delayMs));

      } catch (err) {
        console.error(`Error scraping ${province}:`, err.message);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n========================================`);
  console.log(`Scraping Finished!`);
  console.log(`Total unique venues collected: ${venues.length}`);
  console.log(`New venues added: ${totalNewAdded}`);
  console.log(`Duplicates detected & skipped: ${totalDuplicatesFiltered}`);
  console.log(`Files saved to:`);
  console.log(` - ${JSON_FILE}`);
  console.log(` - ${CSV_FILE}`);
  console.log(` - ${SQL_FILE}`);
  console.log(`========================================\n`);

  return venues;
}

if (process.argv[1] && process.argv[1].endsWith("scrape-badminton-venues.mjs")) {
  const isPilot = process.argv.includes("--pilot");
  const provArg = process.argv.find(a => a.startsWith("--province="));
  
  let target = THAILAND_PROVINCES;
  if (provArg) {
    target = [provArg.split("=")[1]];
  } else if (isPilot) {
    target = ["นนทบุรี", "นครนายก"];
  }

  runScraper(target, isPilot)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}
