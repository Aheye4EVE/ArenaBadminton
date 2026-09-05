# Phase 7: Roadmap foundation และ Pre-production checklist

เอกสารนี้สรุปงานที่ทำต่อจาก Phase 1–6 และแยกสิ่งที่พร้อมทดสอบออกจากสิ่งที่ต้องตั้งค่าหรือพัฒนาต่อก่อน Production

## ทำแล้ว

- `0008_group_recommendation_indexes.sql` และ `0009_roadmap_foundation.sql` ถูก apply กับ Supabase target แล้ว
- `0010_production_security_hardening.sql` ถูก apply แล้ว: ปิดการ mint Trophy จาก client, จำกัด Notification ให้แก้ได้เฉพาะ `read_at`, รวม Shop SELECT policy และเพิ่ม FK indexes
- `0011_roadmap_fk_indexes.sql` ถูก apply แล้วเพื่อ cover foreign key ของ Tournament เพิ่มเติม
- `0012_security_invoker_profile_directory.sql` ถูก apply แล้ว: แยก public profile directory และเปลี่ยน public profile/group/match views เป็น `security_invoker=true`
- `0015_profile_rank_rpc.sql`, `0016_profile_completion_rpc.sql` และ `0017_profile_edit_rpc.sql` ถูก apply แล้ว: Profile อ่าน Ranking จริง, TAGNAME แก้ไขได้ผ่าน RPC แบบ atomic และไม่เปิดให้แก้ Level/EXP/BP/identity subject ผ่าน Data API
- Community feed อ่านจาก `social_posts` พร้อมสร้างโพสต์, แนบรูปผ่าน presigned R2 flow, Comment และ Like
- Notification center อ่านตามเจ้าของและ mark as read ได้
- Profile อ่าน Trophy records ที่ได้รับแล้ว
- `/ranking` อ่าน `public_profiles` และจัดอันดับตาม Skill BP/Level/EXP เมื่อมี session
- `/events` อ่าน Tournament ที่มีสถานะ `published` จาก Supabase เมื่อผู้ใช้เข้าสู่ระบบ และใช้ demo preview เฉพาะผู้ใช้ที่ยังไม่ login
- QA data ใน Supabase ใช้ prefix `[QA ONLY]` และไม่แก้ข้อมูล Profile เดิม
- 0013_venue_discovery_metadata.sql เพิ่ม metadata การค้นหาสนาม และ /venues อ่านสนาม active จาก Supabase เมื่อมี authenticated session
- Google Maps JavaScript API ถูกกำหนดเป็น map provider หลัก; ถ้ายังไม่มี API Key หน้าเว็บจะแสดงลิงก์ Google Maps ภายนอกแทน interactive map
- Migration 0014 ผูกฟอร์มสร้างก๊วนกับ `venues.id` ผ่าน `groups.venue_id` และตรวจสนาม Active ภายใน `create_group` RPC
- Admin account ที่ยืนยันแล้วถูก bootstrap ใน `admin_users` และมี Admin Hub/ปุ่มจาก Profile Card
- Guild system ถูก apply แล้ว: Directory, founding mode, Logo, member capacity, roles, Join Request/Invite, announcements, Group reference และ Guild EXP trigger
- Google OAuth flow มีอยู่ใน Production และ R2 upload route พร้อมใช้งานเมื่อ Vercel มี server secrets, public URL และ CORS ครบ; ยังต้องทำ E2E upload ด้วย test account หลัง Deploy
- Tournament registration รุ่นแรกพร้อมแล้ว: สร้างกิจกรรมฟรีแบบ Published, เปิดรายละเอียด, สมัคร, ถอนชื่อ และเลื่อนคิวรอด้วย RPC transaction; direct authenticated write ถูกปิดไว้

## Environment

ตั้งค่าใน local/deployment secret เท่านั้น:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY= # required for interactive Google Maps; restrict HTTP referrers
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=arena-badminton-media
R2_PUBLIC_BASE_URL=
```

R2 bucket สร้างแล้วและจำกัด token ที่เตรียมไว้ให้เฉพาะ Object Read & Write ของ bucket นี้เท่านั้น การสร้าง token จะแสดง Secret ครั้งเดียว ผู้ดูแลต้องคัดลอกเข้าตัวจัดการ Secret เอง ห้ามใส่ใน Git หรือแชต

หลังมี `R2_PUBLIC_BASE_URL` ต้องตั้ง R2 CORS ให้รับ `PUT` จาก Preview และ Production domain พร้อม headers `Content-Type`; public URL ควรเป็น custom domain/hostname ที่ตั้งใจให้ browser อ่านได้

## QA data

ข้อมูลทดสอบที่เพิ่มบน Supabase:

- 3 สนาม และ 5 ก๊วน โดยชื่อขึ้นต้น `[QA ONLY]`
- 4 ก๊วน published, 1 ก๊วน full เพื่อทดสอบการไม่แนะนำก๊วนเต็ม
- 1 Tournament published ชื่อ `[QA ONLY] Arena Community Cup`
- ใช้ Profile เดิมที่มีอยู่เป็น owner เพียงรายเดียว ไม่สร้าง Auth user ปลอม

ก่อนเปิด Production ให้คง ARENA_SHOW_QA_DATA=false และลบข้อมูล QA ด้วยตัวกรอง prefix นี้หลังจบ staging QA เท่านั้น โดยตรวจ foreign key และ snapshot ก่อนลบทุกครั้ง

## Vercel Production verification

ไม่ใช้ `npm run dev` หรือ `npm run start` เป็น workflow หลักอีกต่อไป ให้ตรวจคุณภาพโค้ดในเครื่อง แล้ว Deploy Production ขึ้น Vercel เพื่อทดสอบเว็บจริง:

```bash
npm run lint
npm run typecheck
npx drizzle-kit check
npm run build
```

หลัง Deploy ให้ตรวจ `/api/health` บน Vercel Production และทำ Smoke/E2E test โดย endpoint นี้แสดงเฉพาะสถานะ integration และไม่ติดต่อบริการภายนอก; `status` จะเป็น `production` เมื่อรันบน Vercel Production

## ต้องทำก่อน Production

1. Google OAuth และ redirect URL หลักตั้งค่าแล้ว; ตั้ง LINE provider, SMTP, email confirmation และ redirect URLs ของ Preview/Production ให้ครบ; ใส่ Google Maps key และเปิด Maps JavaScript API ตามการใช้งาน
2. ตั้ง R2 credentials, public URL และ CORS ใน Vercel; ทดสอบ upload จริงด้วย test account
3. Bootstrap `admin_users` ด้วย UUID ของ Auth user ที่ยืนยันแล้ว และทดสอบ Admin BP/Shop/Trophy/Guild ใน staging
4. ทดสอบ Guild create/Logo/Join Request/Invite/role/Group reference/Match EXP ด้วยบัญชีจริง
5. ทำ tournament bracket/reward ผ่าน RPC ที่ lock capacity และมี audit ก่อนเปิดหน้าใช้งานจริง; create/join/withdraw รุ่นแรกทำแล้วและยังรองรับเฉพาะกิจกรรมฟรี
6. เชื่อม Payment Gateway/webhook แบบ server-only มี signature verification, idempotency, refund และ reconciliation; ห้ามใช้ Admin credit เป็น payment แทน
7. ทดสอบ login Email/Google/LINE, profile completion, recommendation, join/leave, match settlement, shop, image upload, notification และ Guild end-to-end แล้วค่อย deploy
