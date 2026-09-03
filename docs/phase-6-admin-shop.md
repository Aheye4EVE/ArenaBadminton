# Phase 6 — Admin Shop และ Wallet Controls

Phase 6 เพิ่มพื้นที่ควบคุมสำหรับผู้ดูแลระบบ โดยยังไม่ถือว่าเป็น Payment Gateway จริง การเติม Gems ในรอบนี้เป็น Internal/Admin credit เท่านั้น เพื่อให้ระบบ Shop มีจุดเชื่อมที่ปลอดภัยสำหรับ Payment phase ในอนาคต

## Admin authorization

- สิทธิ์เก็บใน `public.admin_users` ซึ่งอ้างอิง `profiles.id`
- `admin_users` เปิด RLS แต่ไม่มีสิทธิ์อ่าน/เขียนผ่าน Data API
- `is_current_user_admin()` คืนเพียง boolean และอ่านตัวตนจาก `auth.uid()`
- RPC ทุกตัวตรวจ Admin ซ้ำใน database ไม่เชื่อ `user_metadata` หรือค่าจาก browser
- ใน migration ยังไม่ seed Admin user ใด ๆ เพื่อไม่เดา account ของผู้ใช้

เมื่อมี App Auth User ที่ต้องการให้เป็น Admin แล้ว ให้ตรวจ UUID จากระบบ Auth ก่อน และเพิ่มผ่าน SQL Editor/secure operational channel ของ Supabase ด้วยคำสั่งลักษณะนี้ โดยแทนค่า placeholder เอง:

```sql
insert into public.admin_users (user_id, role)
values ('<VERIFIED_APP_USER_UUID>', 'admin')
on conflict (user_id) do update
set role = 'admin', is_active = true;
```

อย่านำ service-role/secret key ไปไว้ใน browser หรือ commit ลง repository

## Admin Shop

- `/admin/shop` — หน้า Admin ที่ป้องกันด้วย Auth และ `is_current_user_admin()`
- แก้ slug, ชื่อ, description, tier, icon, effect, ราคา Gems, ลำดับ และสถานะเปิดขาย
- ไม่มีปุ่มลบถาวร; ใช้ `is_active=false` เพื่อคงประวัติ Purchase/Inventory
- `admin_save_shop_item` เป็น security-definer RPC และตรวจ database constraint ซ้ำ

## Internal Gems credit

- หน้าเดียวกันมีฟอร์มเติม Gems สำหรับ Admin/Test เท่านั้น
- `admin_credit_gems` lock wallet, ตรวจ User ที่มีอยู่, บันทึกยอดก่อน/หลัง และเขียน `wallet_ledger.transaction_type='admin_credit'`
- request ใช้ idempotency key ต่อ user เพื่อป้องกันการเติมซ้ำเมื่อกดซ้ำหรือระบบ retry
- จำกัดต่อรายการไม่เกิน 1,000,000,000 Gems และป้องกันยอดล้น bigint
- ผู้ใช้ทั่วไปไม่มีสิทธิ์เรียกสำเร็จ แม้จะมองเห็น RPC ใน schema เพราะ function ตรวจ `admin_users` ภายใน

## Payment boundary ที่ยังไม่เปิด

Payment phase ต้องเพิ่ม provider-specific webhook ฝั่ง server/Edge Function ที่ตรวจลายเซ็น, สถานะชำระเงินจริง, order id, จำนวนเงิน, currency, duplicate event และ refund ก่อนเรียก internal credit operation โดยห้ามให้ browser ส่ง `admin_credit_gems` แทนการชำระเงินจริง

## หน้าจอและการตรวจสอบ

- `/admin/shop` — Admin Catalog Manager และ Internal Wallet Control
- `/shop` — User Shop เดิมยังเห็นเฉพาะ Item active และยอดของตัวเอง
- `admin_users`, `shop_items`, `user_wallets`, `wallet_ledger` เปิด RLS
- authenticated อ่าน `shop_items` ได้เฉพาะ active หรือ Admin อ่าน Catalog ทั้งหมด; ไม่มี direct INSERT/UPDATE ของ authenticated

การทดสอบเติมจริงยังไม่ทำ เพราะต้องใช้ Auth User UUID ที่ผู้ใช้กำหนดเป็น Admin และ test account แยกจาก production
