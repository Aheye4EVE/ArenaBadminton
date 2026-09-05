# Phase 8: Guild System

Guild เป็นชั้น Social/RPG ที่อยู่เหนือ Group โดยเว็บไซต์เป็นพื้นที่กลางให้ผู้ใช้สร้างทีมและจัดกิจกรรมได้เอง ภายใต้สิทธิ์และธุรกรรมที่ตรวจซ้ำใน Supabase

## ฟีเจอร์ที่ทำแล้ว

- Navbar เปลี่ยนจาก `ก๊วนของฉัน` เป็น `Guild` และเปิด Directory ที่ `/guilds`
- สร้าง Guild ได้หนึ่ง Guild ที่ใช้งานอยู่ต่อบัญชี โดยใช้ `Guild Founding Contract` 1 ชิ้น หรือสร้างฟรีเมื่อ Admin เปิดโปรโมชั่น
- Admin ตั้ง `creation_mode`, Founder Item, ช่วงเวลาฟรี และเพดานสมาชิกได้ที่ `/admin/guilds`
- Guild เริ่มที่ 32 สมาชิก และใช้ `Guild Expansion +8/+16/+32` จาก Inventory เพื่อขยายได้ถึงเพดาน 256 คน
- ตั้งชื่อ, คำอธิบาย, จังหวัด/อำเภอ/ตำบล, Public/Private, Open/Request/Invite only และอัปโหลด Logo ไป R2
- Directory และหน้า Detail แสดง Level, Guild EXP, Member capacity, Master, สมาชิก, Contribution และประกาศ
- Guild Master/Officer แก้ข้อมูล, ประกาศ, เชิญสมาชิกด้วย TAGNAME, อนุมัติคำขอ, เลื่อน/ลดตำแหน่ง และนำสมาชิกออกได้
- Invite มีหน้า Deep link ที่ `/guilds/invite?token=...` และตรวจว่า token เป็นของบัญชีผู้รับเท่านั้น
- ฟอร์มสร้าง Group เลือก Guild ที่ผู้ใช้เป็น Master/Officer ได้ และหน้า Group แสดง Guild ที่อ้างอิง
- เมื่อ `match_settlements` ถูกสร้างเป็น `applied`, สมาชิก Guild ที่ร่วม Match จะได้ Guild EXP 50 ต่อคน พร้อม Ledger, Contribution และ Level สูงสุด 99 แบบ idempotent

## ฐานข้อมูลและความปลอดภัย

- ตารางหลัก: `guild_settings`, `guilds`, `guild_members`, `guild_join_requests`, `guild_invites`, `guild_bans`, `guild_announcements`, `guild_exp_ledger`, `guild_audit_logs`
- ทุกตารางเปิด RLS; การเขียนสำคัญปิด direct DML และเรียกผ่าน RPC ที่ตรวจ `auth.uid()`, Profile completion, membership, role และ capacity
- การสร้าง Guild หัก Founder Item และสร้าง Guild Master ในธุรกรรมเดียว
- การขยายสมาชิกหัก Inventory และเพิ่ม capacity ในธุรกรรมเดียว
- Group อ้างอิง Guild ได้เฉพาะ Manager และ Guild EXP ใช้ Group เป็นแหล่งอ้างอิงเดียวของ Match
- เพิ่มดัชนี Foreign Key และ unique pending invite เพื่อป้องกันคำเชิญค้าง/ซ้ำ

## ไฟล์สำคัญ

- `src/app/guilds/` — Directory, Create, Detail, Manage และ Invite
- `src/app/admin/guilds/` — Admin Guild Control
- `src/app/guilds/actions.ts` — Server Action boundary
- `src/components/guild*.tsx` — UI ของ Guild และ Invite
- `supabase/migrations/20260905052213_guild_system.sql` — schema/RLS/RPC/trigger หลัก
- `supabase/migrations/20260905060000_guild_hardening.sql` — FK indexes และ capacity/invite hardening
- `supabase/migrations/20260905062000_guild_invite_expiry.sql` — expire pending invite เดิมก่อนออกคำเชิญใหม่
- `supabase/migrations/20260905063000_guild_creation_state.sql` — effective timed-promotion state สำหรับ UI

## สิ่งที่ต้องทดสอบก่อนเปิด Guild จริง

1. ซื้อ Founder/Expansion Item ด้วย Shop และตรวจ Inventory ลดลงครั้งเดียวเมื่อกดซ้ำ
2. สร้าง Guild, แก้ชื่อ/Logo/พื้นที่ และตรวจ R2 CORS + public URL
3. ทดสอบ Open, Request และ Invite only ด้วยบัญชีคนละบัญชี
4. ทดสอบ Officer/Member permissions และห้ามข้ามเพดานสมาชิก
5. สร้าง Group ที่ผูก Guild, สร้าง/ยืนยัน Match และตรวจ `guild_exp_ledger` กับ Level
6. ทดสอบ Admin promotion/free window และปิดการแสดงข้อมูล `[QA ONLY]` ก่อน Production
