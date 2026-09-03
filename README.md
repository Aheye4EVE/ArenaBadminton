# Arena-Badminton

เว็บชุมชนสำหรับค้นหาและสร้างก๊วนแบดมินตัน พร้อมแนวทางรองรับ Vercel, Supabase PostgreSQL และ Cloudflare R2

## สถานะปัจจุบัน

ตอนนี้โปรเจกต์ผ่านโครงสร้าง Phase 1–6 แล้ว โดยหน้าเว็บส่วนธุรกิจที่ยังไม่ถึง phase จะยังใช้ demo data จนกว่า flow จะผ่านการอนุมัติ:

- หน้า Home โทน pastel/chibi ตามภาพ reference พร้อม responsive layout
- หน้า preview สำหรับก๊วน, Organizer Hub, ร้านค้า, Ranking, Profile, Events, Venues, Community และ Messages
- Phase 1 migration สำหรับ `profiles`, `level_definitions`, `venues`, `groups` และ `group_members`
- Phase 2 Auth UI: Email & Password, Google OAuth และ LINE ผ่าน Supabase Custom OAuth/OIDC provider
- หน้า Profile Completion หลังสมัคร/เชื่อมต่อ พร้อมชื่อ, Email จาก Auth, LINE ID สำหรับติดต่อ, ที่อยู่ และพิกัด GPS แบบ opt-in
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
- BP rule `bp-v1` คำนวณจาก Level เฉลี่ยของสองทีม โดยผู้ชนะทีมที่ Level ต่ำกว่าจะได้ upset bonus และ BP มีพื้นขั้นต่ำ 1,000
- Level definitions ถูกเตรียมครบ Level 1–99 และ recalculation หลังได้รับ EXP ใช้ threshold จากฐานข้อมูล
- Supabase SSR client boundary สำหรับ Auth และ RLS
- RLS เปิดครบทุกตาราง และปิดสิทธิ์ anonymous ใน Data API
- Cloudflare R2 presigned-upload route ที่ตรวจ auth, MIME type, file size และสร้าง key แยกตาม user
- `/api/health` แสดงเฉพาะสถานะว่ามี environment variables ครบหรือไม่ โดยไม่ติดต่อบริการภายนอก
- Provider Google/LINE ต้องตั้งค่า Client ID/Secret และ callback ใน Supabase Dashboard ก่อนทดสอบ OAuth จริง
- Roadmap foundation เพิ่มแล้วสำหรับ Trophy record, Community feed (โพสต์/รูป/Comment/Like), Notification center, live Ranking, live Tournament ingest และ Admin BP rule editor
- ยังไม่มี Payment Gateway/webhook จริง, tournament create/bracket/reward workflow, moderation console, Google Maps key/provider setup หรือ deploy production

## รันบนเครื่อง

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

ตรวจคุณภาพโค้ด:

```bash
npm run lint
npm run typecheck
npm run build
```

## Environment

ไฟล์ `.env.local` ในเครื่องมีค่า Supabase ฝั่ง public และค่า R2 ที่ไม่ใช่ secret สำหรับ bucket แล้ว โดยถูก ignore โดย Git อยู่แล้ว ส่วน secret, database, Google Maps และ public media URL ให้เติมใน local secret/deployment environment ที่ใช้งานจริง

- `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` สำหรับ Supabase Auth/SSR
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` สำหรับแผนที่ฝั่ง browser โดยต้องจำกัด referrer/domain ใน Google Cloud
- `DATABASE_URL` ใช้ runtime connection pooler
- `MIGRATION_DATABASE_URL` ใช้ connection สำหรับ migration แยกจาก runtime
- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` ใช้เฉพาะฝั่ง server สำหรับ presigned upload
- `R2_PUBLIC_BASE_URL` เป็น HTTPS custom domain/R2 public hostname ที่ตั้งค่าอ่านรูปได้ ใช้กับ Community image post; ห้ามใช้ bucket ที่เปิด public โดยไม่จำกัดขอบเขต

ห้าม commit `.env.local`, secret key หรือ service-role key

## คำสั่งฐานข้อมูลที่เตรียมไว้

Drizzle ใช้สำหรับ schema และ query ในแอป ส่วน migration ที่ apply ไปยัง Supabase target แล้วเก็บ source ไว้ที่ `supabase/migrations/0001_core_preview.sql` ถึง `supabase/migrations/0012_security_invoker_profile_directory.sql`:

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
supabase/migrations/     Phase 1–6 migration ที่ apply กับ Supabase แล้ว
public/assets/           artwork ที่ใช้ในหน้า Home
```

## ลำดับงานถัดไป

1. ยืนยัน/คัดลอก R2 Access Key ID และ Secret ไปไว้ใน local/Vercel secret โดยไม่ส่งผ่านแชต และตั้ง `R2_PUBLIC_BASE_URL` + CORS ของ bucket
2. ใส่ Google Maps browser key แบบจำกัด domain และตั้ง Google/LINE provider, SMTP, redirect URL ใน Supabase Dashboard
3. Bootstrap Admin ด้วย Auth User UUID ที่ยืนยันแล้ว แล้วทดสอบ BP editor, Catalog, Trophy award และ internal credit ด้วย test account
4. ทำ tournament create/join/bracket/reward RPC แบบ atomic และ moderation console ก่อนเปิดใช้งานจริง
5. เชื่อม Payment Gateway/webhook แบบ server-only พร้อม signature verification, idempotency, refund และ reconciliation
6. เติม Vercel environment, deploy preview, รัน smoke/E2E กับ test account แล้วค่อย promote production
