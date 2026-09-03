# Arena-Badminton Phase 3: Groups และ Capacity

Phase 3 เปลี่ยน `/groups` และ `/organizer` จาก preview form เป็น flow ที่อ่าน/เขียน Supabase จริง โดยยังไม่เปิด domain แข่งขันและรางวัล

## Routes

- `/groups` — รายการก๊วนที่มีสถานะ `published` หรือ `full` พร้อมค้นหาจากชื่อ/สถานที่
- `/organizer` — ฟอร์มสร้างก๊วนสำหรับสมาชิกที่กรอก Profile ครบแล้ว
- `/groups/[id]` — รายละเอียดก๊วน, รายการสมาชิก, ที่นั่ง, คิวรอ, join/leave/cancel

ทุก route ที่ใช้ข้อมูลจริงต้องมี authenticated session และ `profile_completed_at` ก่อน หากยังไม่ครบจะกลับไป `/profile/setup`

## Data flow

1. Organizer เลือกสนาม Active จากระบบหรือกรอกสถานที่/จุดนัดพบ, วันเวลาไทย, ชั่วโมง, capacity, Level range, ประเภท, ค่าเข้าร่วม และหมายเหตุ
2. Server Action validate ด้วย Zod และแปลงวันเวลา `Asia/Bangkok` เป็น ISO/timestamptz
3. `create_group(..., p_venue_id)` ตรวจสนาม Active, สร้าง `groups` พร้อม `venue_id` และเพิ่ม owner ใน `group_members` ใน transaction เดียว
4. สมาชิกกด join แล้ว `join_group(...)` lock แถวก๊วนก่อนนับสมาชิก
5. ถ้ามีที่นั่งจะเป็น `registered`; ถ้าเต็มจะเป็น `waitlisted`
6. `leave_group(...)` เปลี่ยนสมาชิกเป็น `cancelled` และเลื่อนคิวแรกเข้าแทนเมื่อมีที่นั่ง
7. ผู้จัดใช้ `cancel_group(...)`; ระบบปิดก๊วนและยกเลิกสมาชิกที่ active ทั้งหมด

## Invariants ที่ฐานข้อมูลบังคับ

- capacity อยู่ระหว่าง 2–200
- สร้างก๊วนได้เฉพาะบัญชีที่ Profile ครบ
- เริ่มก๊วนต้องล่วงหน้าอย่างน้อย 15 นาที
- owner ถูกเพิ่มเป็นสมาชิก `registered` อัตโนมัติ
- group row ถูก lock ระหว่าง join/leave เพื่อกัน concurrent join เกิน capacity
- direct `INSERT/UPDATE` ของ `groups` และ direct `INSERT/UPDATE/DELETE` ของ `group_members` ถูก revoke จาก `authenticated`
- mutation ใช้ RPC ที่ตรวจ `auth.uid()` และ owner ภายใน function; ไม่มีการเชื่อค่า owner จาก browser
- `public_group_members` เปิดเฉพาะชื่อ/handle/avatar/level และไม่เปิด draft หรือข้อมูล address/GPS

## Migration

ไฟล์ [0004_group_transactions.sql](../supabase/migrations/0004_group_transactions.sql) เพิ่ม:

- capacity constraint
- guarded RPC: `create_group`, `join_group`, `leave_group`, `cancel_group`
- read-only view `public_group_members`
- grants สำหรับ authenticated และปิด execute จาก `anon/public`

ฟังก์ชันเป็น `SECURITY DEFINER` เฉพาะเพราะ direct DML ถูกปิดและต้องทำหลาย write ใน transaction เดียว โดยทุกฟังก์ชันตรวจ authentication และ ownership เอง พร้อม `search_path = public, pg_temp`

## ขอบเขตที่ยังไม่รวมใน Phase 3

- การแก้ไขก๊วนหลังสร้าง และการเลือกหมุดโดยลากบนแผนที่โดยตรงยังไม่รวม; ปัจจุบันเลือกสนาม Active จาก dropdown ที่ผูกกับฐานข้อมูลและเปิด Google Maps จากหมุดได้
- การแก้ไขก๊วนหลังสร้าง
- check-in, match bracket, result confirmation และ BP/EXP settlement
- payment/entry fee collection และ refund
- notification/realtime เมื่อมีสมาชิกใหม่หรือคิวเลื่อน
