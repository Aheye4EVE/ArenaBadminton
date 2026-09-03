# Phase 5 — Shop, Inventory และ EXP Booster

Phase 5 เปิดร้านค้าและ Inventory ที่ใช้ข้อมูลจริงจาก Supabase โดยตั้งใจแยก “เงินในระบบ” ออกจาก BP และ EXP progression ให้ชัดเจน

## ขอบเขต

- `Arena Gems` เป็น virtual currency สำหรับโครงสร้างร้านค้าในช่วงนี้
- Catalog seed มี Badge 3 ระดับ: +10%, +15% และ +20% EXP
- ผู้ใช้ซื้อ Item ได้เมื่อมียอด Gems เพียงพอ และ Item จะเพิ่มเข้า Inventory ใน transaction เดียวกับการหักยอด
- ผู้ใช้ Equip EXP Booster ได้ครั้งละหนึ่งชิ้น; การ Equip ชิ้นใหม่จะถอดชิ้นเดิมอัตโนมัติ
- BP ไม่ใช่สินค้า และไม่มี `bp_boost` ใน effect ที่อนุญาต
- ยังไม่มี Payment gateway, top-up, refund อัตโนมัติ หรือ admin UI สำหรับเติม Gems

## ตารางและความปลอดภัย

- `shop_items` — catalog, rarity, price และ effect ที่เปิดใช้งาน
- `user_wallets` — ยอด Gems ของแต่ละ user
- `wallet_ledger` — ประวัติการตัด/เพิ่มยอด พร้อมยอดก่อนและหลัง
- `shop_purchases` — ใบสั่งซื้อและ idempotency key
- `user_item_inventory` — จำนวน Item และสถานะ Equip
- `match_settlements.winner_item_bonus_exp` / `loser_item_bonus_exp` — โบนัส EXP ที่เกิดจาก Item แยกจาก Base EXP

ทุกตารางเปิด RLS และ authenticated อ่านได้เฉพาะ Catalog ที่ active หรือข้อมูลของตัวเอง ส่วน client ไม่มีสิทธิ์ INSERT/UPDATE/DELETE โดยตรง การซื้อใช้ `purchase_shop_item` และการ Equip ใช้ `set_shop_item_equipped` ซึ่งเป็น security-definer RPC ที่ตรวจ `auth.uid()` และล็อกแถวภายใน transaction

## สูตร EXP ตอน settle

```text
Base EXP = ค่าที่ผู้จัดกำหนดตอนสร้างแมตช์
Item Bonus = floor(Base EXP × equipped_boost_percent / 100)
Total EXP = Base EXP + Item Bonus
```

ระบบเขียน `match_win`/`match_loss` เป็น Base ledger และเขียน `item_bonus` แยกอีกแถวเมื่อมีโบนัส จากนั้นจึงเพิ่ม `Total EXP` เข้า `profiles.exp_total` และคำนวณ Level ใหม่ใน transaction เดียว การยืนยันซ้ำจะคืน settlement เดิมและไม่เพิ่มแต้มซ้ำ

## หน้าจอ

- `/shop` — Catalog, ยอด Arena Gems, ซื้อ Item, Inventory และ Equip/ถอด Equip
- `/matches/[id]` — Settlement receipt แสดง Base EXP, Item Bonus และ Total EXP

หากเปิด `/shop` โดยยังไม่เข้าสู่ระบบ ระบบจะพาไป Auth ตาม guard เดียวกับหน้า business อื่น ๆ ส่วนการทดสอบซื้อจริงต้องใช้ test account ที่มีการเติม Gems ผ่านช่องทางที่ได้รับอนุมัติใน Payment phase
