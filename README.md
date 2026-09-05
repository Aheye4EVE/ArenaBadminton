# Arena-Badminton

เว็บชุมชนสำหรับค้นหาและสร้างก๊วนแบดมินตัน พร้อมแนวทางรองรับ Vercel, Supabase PostgreSQL และ Cloudflare R2

## สถานะปัจจุบัน

ตอนนี้โปรเจกต์ผ่านโครงสร้าง Phase 1–6 แล้ว โดยหน้าเว็บส่วนธุรกิจที่ยังไม่ถึง phase จะยังใช้ demo data จนกว่า flow จะผ่านการอนุมัติ:

- หน้า Home โทน pastel/chibi ตามภาพ reference พร้อม responsive layout
- หน้า preview สำหรับก๊วน, Organizer Hub, ร้านค้า, Ranking, Profile, Events, Venues, Community และ Messages
- Phase 1 migration สำหรับ `profiles`, `level_definitions`, `venues`, `groups` และ `group_members`
- Phase 2 Auth UI: Email & Password, Google OAuth และ LINE ผ่าน Supabase Custom OAuth/OIDC provider
- หน้า Profile Completion หลังสมัคร/เชื่อมต่อ พร้อมชื่อ, Email จาก Auth, LINE ID สำหรับติดต่อ, ที่อยู่ และพิกัด GPS แบบ opt-in
- หน้าแก้ไข Profile พร้อม TAGNAME ที่ normalize เป็นตัวพิมพ์เล็กและตรวจชื่อซ้ำ, Dropdown จังหวัด/อำเภอ/ตำบลแบบสัมพันธ์กัน, Bio, ล้างพิกัด GPS และ Avatar Upload แบบ presigned ไป Cloudflare R2
- หน้า Profile เชื่อม Google/LINE เพิ่มในบัญชีเดิมได้ โดยไม่เปิดปุ่ม unlink จนกว่าจะมีช่องทางสำรอง และ Email ยังคงอ้างอิงจาก Auth
- Phase 2 migration สำหรับข้อมูล profile/location, LINE contact ID และ public profile view ที่ไม่เปิดข้อมูลส่วนตัว
- Phase 3 หน้าก๊วนจริง: ค้นหา, ดูรายละเอียด, สร้างก๊วน, เข้าร่วม, ออกจากก๊วน และยกเลิกก๊วน
- Phase 3 atomic capacity: owner ถูกเพิ่มเป็นสมาชิกอัตโนมัติ, ที่นั่งเต็มจะเข้าคิวรอ และการออกจะเลื่อนคิวถัดไป
- RPC transaction ที่ตรวจ session/profile/owner และปิด direct DML ที่อาจทำให้จำนวนสมาชิกเกิน
- Phase 4 ระบบแมตช์จริง: ผู้จัดเลือกผู้เล่นแบบ Singles/Doubles และกำหนด Base EXP ต่อผลการแข่งขัน
- Phase 4 check-in, ส่งผลคะแนน และยืนยันผลโดยผู้เล่นอีกฝั่งหรือผู้จัดก่อน settlement
- Phase 4 EXP/BP ledger: settlement ฝั่ง database transaction เดียว, เก็บยอดก่อน/หลัง และป้องกันการ settle ซ้ำ
- Phase 5 Shop จริง: Catalog Badge, Virtual Arena Gems, atomic purchase, wallet ledger และ Inventory
- Phase 5 Equip EXP Booster: เลือกใช้ Booster ได้ครั้งละหนึ่งชิ้น และ settlement แยก `Base EXP` กับ `Item Bonus` ก่อนรวมเข้า profile
- Phase 6 Admin Shop: สิทธิ์ Admin จาก `admin_users`, แก้ Catalog/ราคา/Effect และเปิด-ปิดขายโดยไม่ลบประวัติ
- Phase 6 internal Gems credit: เติม Gems ได้เฉพาะ Admin RPC พร้อม idempotency และ `wallet_ledger` audit
- Guild system: Directory, สร้าง Guild แบบใช้ Item/โปรโมชั่นฟรี, Logo, สมาชิกเริ่มต้น 32 คน, ขยายสมาชิกด้วย Shop Item, Join Request/Invite, บทบาท, ประกาศ และ Guild EXP จาก Match ที่ยืนยันผลแล้ว
- Guild reference ในฟอร์มสร้างก๊วน: เฉพาะ Guild Master/Officer ที่เลือก Guild ได้ และ Match จะอ้างอิง Guild ผ่าน Group เดียวกันเพื่อป้องกันข้อมูลรางวัลไม่ตรงกัน
- Admin Guild Control: เปิด/ปิดการสร้างฟรี, ตั้งช่วงเวลาโปรโมชั่น, เลือก Founder Item และตั้งเพดานสมาชิก 32–256 คน
- BP rule `bp-v1` คำนวณจาก Level เฉลี่ยของสองทีม โดยผู้ชนะทีมที่ Level ต่ำกว่าจะได้ upset bonus และ BP มีพื้นขั้นต่ำ 1,000
- Level definitions ถูกเตรียมครบ Level 1–99 และ recalculation หลังได้รับ EXP ใช้ threshold จากฐานข้อมูล
- Supabase SSR client boundary สำหรับ Auth และ RLS
- RLS เปิดครบทุกตาราง และปิดสิทธิ์ anonymous ใน Data API
- Cloudflare R2 presigned-upload route ที่ตรวจ auth, MIME type, file size และสร้าง key แยกตาม user
- `/api/health` แสดงเฉพาะสถานะว่ามี environment variables ครบหรือไม่ โดยไม่ติดต่อบริการภายนอก
- Google OAuth เปิดใช้งานและทดสอบกับบัญชี QA แล้ว; LINE ยังรอ Client ID/Secret และ callback จาก LINE Login Console
- Email Auth ใช้งานกับ Supabase provider แล้ว; Production ยังต้องตั้ง SMTP ของโดเมนจริงและทดสอบอีเมลยืนยัน/รีเซ็ตรหัสผ่าน
- หน้าแผนที่สนามใช้ Google Maps JavaScript API แสดงหมุดตามพิกัดของสนาม, ขอ Location แบบ opt-in และเปิดรายละเอียดบน Google Maps ได้; ถ้ายังไม่มี API Key จะมีลิงก์ Google Maps แบบภายนอกเป็น fallback
- ฟอร์ม Organizer เลือกสนาม Active จาก Supabase และส่ง `venue_id` เข้า RPC `create_group` โดยฐานข้อมูลตรวจสถานะสนามซ้ำอีกชั้น
- Admin Hub สำหรับบัญชีที่อยู่ใน `admin_users` พร้อมทางเข้า Profile Card ไปยัง Shop/Wallet และ BP Rule Editor
- Roadmap foundation เพิ่มแล้วสำหรับ Trophy record, Community feed (โพสต์/รูป/Comment/Like), Notification center, live Ranking, live Tournament ingest และ Admin BP rule editor
- Live Ranking ใน Profile ใช้ `get_current_user_rank()` และ Admin มีหน้าแจก Trophy ที่เรียกผ่าน Admin RPC เท่านั้น
- Tournament registration รุ่นแรก: ผู้ใช้ที่กรอก Profile แล้วสร้างกิจกรรมฟรีแบบ Published, เปิดหน้ารายละเอียด, สมัคร, ถอนชื่อ และเข้าคิวรอผ่าน Supabase RPC transaction; direct write ของ Tournament ถูกปิดไว้
- Tournament competition workflow: ผู้จัดสร้าง Single Elimination bracket, กรอกผลแบบรอยืนยัน, เลื่อนผู้ชนะขึ้นรอบถัดไป, แจก EXP/BP/Item ตามอันดับที่ตั้งค่า และบันทึก Tournament Award เป็น Record ของผู้เล่น
- Match MVP: สมาชิกก๊วนที่เข้าร่วมแมตช์โหวตได้คนละหนึ่งครั้ง ผู้จัด Finalize ผล และระบบแจก Bonus EXP/BP ผ่าน transaction พร้อมบันทึก Award
- Ranking directory: กรองระดับตำบล/อำเภอ/จังหวัด/ประเทศ พร้อม tie-break จาก BP, จำนวนแมตช์, Win Rate, Level และ EXP โดยสถิติถูก refresh หลัง settlement
- Venue detail/review: ดูคะแนนและรีวิวสนาม, เขียน/แก้รีวิวของตัวเอง, เปิด Google Maps และแจ้งรายงานสนามหรือรีวิวได้
- Guild Quest: ผู้ดูแล Guild สร้างภารกิจตามช่วงเวลา, สมาชิกดู progress และ Claim รางวัล Guild EXP/EXP/Item ผ่าน RPC
- Community safety: ผู้ใช้รายงาน Post, Comment, Group, Match, Tournament, Venue, Venue Review, Guild, Profile และ Marketplace Listing; Admin มี Moderation Queue สำหรับตรวจสอบ/ปิดเคส
- Marketplace: ลงขายอุปกรณ์มือสองพร้อมรูปจาก R2, กรองตามพื้นที่/หมวดหมู่/ราคา, ส่งคำขอซื้อ, รับ/ปฏิเสธ/ยกเลิก/ปิดการขาย และแจ้งเตือนคู่ซื้อขาย
- Direct Messages: สร้างบทสนทนาแบบ one-to-one, ส่ง/อ่านข้อความผ่าน RPC และรับข้อความใหม่ด้วย Supabase Realtime
- Payment-ready shop foundation: Shop/Gems/Inventory ใช้ ledger และ idempotency แล้ว แต่ยังไม่มี Payment Gateway/webhook จริง จึงไม่เปิดช่องเติมเงินจริงจนกว่าจะเลือก provider และตั้งค่า signature verification
- interactive Google Maps ยังต้องใส่ API Key และเปิด API ที่จำเป็นใน Google Cloud
- Migration 0013_venue_discovery_metadata.sql เพิ่มจังหวัด/อำเภอ/ตำบล/คะแนน/สถานะคิว และหน้า /venues อ่านสนาม active จาก Supabase เมื่อมี session
- Migration 0017_profile_edit_rpc.sql รวมการแก้ Profile เป็น authenticated RPC เดียวแบบ atomic; ไม่เปิด direct update และไม่แตะ Level, EXP, BP, provider subject หรือ completion state
- QA seed ที่ขึ้นต้น [QA ONLY] ถูกซ่อนจากหน้าผู้ใช้โดย default; เปิดเฉพาะ staging ด้วย ARENA_SHOW_QA_DATA=true

## ตรวจสอบก่อน Deploy Production

โปรเจกต์นี้ไม่ใช้ Local Server เป็นสภาพแวดล้อมหลักแล้ว การตรวจเว็บจริงให้ทำบน Vercel Production เท่านั้น ส่วนการตรวจคุณภาพโค้ดก่อนส่งขึ้น Vercel ใช้คำสั่ง:

```bash
npm run lint
npm run typecheck
npm run smoke:production
npm run build
```

`npm run smoke:production` จะตรวจหน้า public และ protected redirect บน `https://arena-badminton.vercel.app` โดยอัตโนมัติ และตรวจ `/api/health` เฉพาะโครงสร้างสถานะ โดยไม่พิมพ์ค่า secret ออกมา หากต้องการตรวจ Preview หรือ URL อื่น ให้กำหนด `SMOKE_BASE_URL` เช่น `SMOKE_BASE_URL=https://your-preview.vercel.app npm run smoke:production` การ Login, การแก้ Profile และการอัปโหลดไฟล์ยังต้องทดสอบด้วยบัญชีจริงใน browser เพราะต้องใช้ session และข้อมูลลับที่ไม่ควรใส่ในสคริปต์

ลำดับการทำงานคือแก้ทีละจุด → ตรวจคุณภาพโค้ด → commit/push ไป GitHub → Deploy Production บน Vercel → ตรวจ Smoke test บน URL จริง

## Environment

ไฟล์ `.env.local` ในเครื่องมีค่า Supabase ฝั่ง public และค่า R2 ที่ไม่ใช่ secret สำหรับ bucket แล้ว โดยถูก ignore โดย Git อยู่แล้ว ส่วน secret, database, Google Maps และ public media URL ให้เติมใน local secret/deployment environment ที่ใช้งานจริง

- `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` สำหรับ Supabase Auth/SSR
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` สำหรับ Google Maps JavaScript API; ต้องจำกัด HTTP referrer ให้เฉพาะ Preview/Production ที่ใช้งาน
- DATABASE_URL ใช้ runtime transaction pooler เช่น aws-0-ap-southeast-1.pooler.supabase.com:6543
- MIGRATION_DATABASE_URL ใช้ session pooler สำหรับ migration แยกจาก runtime เช่น aws-0-ap-southeast-1.pooler.supabase.com:5432
- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` ใช้เฉพาะฝั่ง server สำหรับ presigned upload
- `R2_PUBLIC_BASE_URL` เป็น HTTPS custom domain/R2 public hostname ที่ตั้งค่าอ่านรูปได้ ใช้กับ Community image post และ Avatar; ห้ามใช้ bucket ที่เปิด public โดยไม่จำกัดขอบเขต

ห้าม commit `.env.local`, secret key หรือ service-role key

## คำสั่งฐานข้อมูลที่เตรียมไว้

Drizzle ใช้สำหรับ schema และ query ในแอป ส่วน migration ที่ apply ไปยัง Supabase target แล้วเก็บ source ไว้ที่ `supabase/migrations/` รวมถึง Guild system/hardening:

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
npx drizzle-kit check
```

รายละเอียดการตั้งค่า Auth อยู่ที่ [docs/phase-2-auth-setup.md](docs/phase-2-auth-setup.md), flow ก๊วนอยู่ที่ [docs/phase-3-groups.md](docs/phase-3-groups.md), กติกาแมตช์/settlement อยู่ที่ [docs/phase-4-matches.md](docs/phase-4-matches.md), Shop/EXP Booster อยู่ที่ [docs/phase-5-shop.md](docs/phase-5-shop.md), Admin/Wallet controls อยู่ที่ [docs/phase-6-admin-shop.md](docs/phase-6-admin-shop.md) และสถานะ Roadmap/Pre-production อยู่ที่ [docs/phase-7-roadmap.md](docs/phase-7-roadmap.md)

## แนวทางสถาปัตยกรรม

- Next.js App Router: หน้าอ่านข้อมูลใช้ Server Components เมื่อเชื่อม DB จริง
- Server Actions: ใช้เป็น action boundary ของหน้าเว็บ ส่วน authorization และ transaction สำคัญบังคับซ้ำใน Supabase RPC
- Phase 3 group mutations เรียกผ่าน Supabase RPC ที่เป็น transaction เดียว; client ไม่มีสิทธิ์ insert/update/delete สมาชิกโดยตรง
- Phase 4 match mutations เรียกผ่าน RPC ที่ตรวจ owner/participant, lock แถวที่เกี่ยวข้อง และคืนผลลัพธ์ที่จำเป็นต่อ UI เท่านั้น
- Route Handlers: ใช้กับ webhook, presigned upload และ API ที่ต้องคุยกับ client ภายนอก
- Drizzle ORM: schema, migration และ type-safe query บน Supabase PostgreSQL
- EXP แยกจาก Skill BP; Skill BP เริ่มที่ 1,000 และห้ามต่ำกว่านี้
- BP คำนวณโดยระบบจากกติกาที่ Admin ตั้งค่า ไม่ให้ผู้จัดกรอกค่า BP โดยตรง
- Phase 4 ผู้จัดกำหนดได้เฉพาะ Base EXP ชนะ/แพ้; BP rule อยู่ใน `bp_rule_configs` และ ledger เป็นแหล่งตรวจสอบย้อนหลัง
- Gems เป็น virtual currency ใน Phase 5; Phase 6 เพิ่มเฉพาะ Admin/Internal credit boundary ยังไม่มี endpoint เติมเงินจริงหรือ payment gateway
- Admin authorization ใช้ `admin_users` ใน database ไม่ใช้ `user_metadata`; ต้อง bootstrap UUID ของ app user ผ่าน secure SQL/operational flow
- Purchase, wallet ledger และ inventory เพิ่มพร้อมกันใน RPC transaction เดียว; client ไม่มี direct DML
- EXP Booster จากร้านค้าคิดเพิ่มหลัง Base EXP และแสดงแยกเป็น `Base EXP + Item Bonus`
- Trophy เป็นประวัติ achievement ที่ผู้ใช้ลบหรือแก้ย้อนหลังเองไม่ได้
- Community image flow ใช้ presigned PUT ไป R2 แล้วบันทึกเฉพาะ URL จาก `R2_PUBLIC_BASE_URL` ลง Post; server action ปฏิเสธ URL จากแหล่งอื่น
- Notifications อ่านได้เฉพาะเจ้าของ และ client แก้ได้เฉพาะ `read_at`; BP rule/Trophy award อยู่หลัง Admin RPC
- Public profile/group/match views อ่านจาก `public_profile_directory` และใช้ `security_invoker=true`; ข้อมูล address/GPS/LINE provider ยังอยู่ใน `profiles` ฝั่งเจ้าของเท่านั้น

## โครงสร้างที่สำคัญ

```text
src/app/                 routes, metadata และ API route handlers
src/components/          Home และ preview UI
src/db/                  Drizzle schema และ database client boundary
src/lib/                 demo data, Supabase server client และ config helpers
supabase/migrations/     Phase 1–7 migration ที่ apply กับ Supabase แล้ว
public/assets/           artwork ที่ใช้ในหน้า Home
```

## งานที่ยังต้องตั้งค่าก่อนเปิดใช้งานจริง

1. ยืนยัน/คัดลอก R2 Access Key ID และ Secret ไปไว้ใน local/Vercel secret โดยไม่ส่งผ่านแชต และตั้ง `R2_PUBLIC_BASE_URL` + CORS ของ bucket
2. ตั้ง Google/LINE provider, SMTP และ redirect URL ใน Supabase Dashboard; ใส่ Google Maps API Key และจำกัด referrer ก่อนใช้ interactive map
3. ตั้งค่า SMTP/LINE/Google Maps/R2 public URL ตามบริการที่เลือก และทดสอบ login, profile edit และ upload ด้วย test account บน Vercel
4. ทดสอบ Guild ด้วยบัญชีจริง: สร้าง/ใช้ Item, อัปโหลด Logo, Join Request/Invite, อนุมัติสมาชิก, สร้าง Quest, ผูกก๊วน และยืนยัน Match ให้ Guild EXP
5. ทดสอบ Tournament: สมัครอย่างน้อย 4 คน, Generate Bracket, ส่ง/ยืนยันผลทุกคู่, ตรวจ Award/Record และ MVP bonus
6. ทดสอบ Marketplace, Messages, Venue Review และ Moderation ด้วยบัญชีทดสอบอย่างน้อย 2 บัญชี
7. เชื่อม Payment Gateway/webhook แบบ server-only พร้อม signature verification, idempotency, refund และ reconciliation เมื่อเลือกผู้ให้บริการและมี credentials แล้ว
