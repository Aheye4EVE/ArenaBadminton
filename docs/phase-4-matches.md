# Phase 4 — Match, Check-in และ EXP/BP Settlement

Phase 4 เปิด flow การแข่งขันจริงในก๊วน โดยยังไม่เปิด Shop, Payment, Item, Badge, Trophy หรือ Feed เป็นธุรกิจจริง

## Flow

1. ผู้จัดก๊วนเลือกสมาชิกที่มีสถานะ `registered` และสร้างแมตช์แบบ Singles หรือ Doubles
2. ผู้จัดกำหนดเฉพาะ Base EXP สำหรับทีมชนะและทีมแพ้ โดยอยู่ในช่วง 0–1,000,000
3. ผู้เล่นในแมตช์เช็กอินผ่าน `check_in_match`
4. เมื่อผู้เล่นทุกคนเช็กอินแล้ว ผู้เล่นในแมตช์หรือผู้จัดส่งผลคะแนนผ่าน `submit_match_result`
5. ผู้เล่นอีกคนหรือผู้จัดยืนยันผ่าน `confirm_match_result`
6. Database คำนวณ EXP/BP, เขียน ledger, อัปเดต profile และ recalculation level ใน transaction เดียว

## กติกา MVP

- Singles มีผู้เล่นทีมละ 1 คน; Doubles มีผู้เล่นทีมละ 2 คน
- ผู้เล่นคนเดียวกันอยู่ได้เพียงทีมเดียว และต้องเป็นสมาชิก `registered` ของก๊วน
- คะแนนต้องมีผู้ชนะ, ผู้ชนะอย่างน้อย 21 แต้ม และถ้าคะแนนสูงสุดน้อยกว่า 30 ต้องชนะห่างอย่างน้อย 2 แต้ม
- ผลอยู่ในสถานะ `awaiting_confirmation` จนกว่าจะมีผู้ยืนยันที่ไม่ใช่คนส่งผล
- ผู้ส่งผลยืนยันผลของตัวเองซ้ำไม่ได้
- การสร้างแมตช์และการยืนยันผลอ่านตัวตนจาก `auth.uid()` ไม่รับ user id ของผู้จัดจาก client

## BP rule `bp-v1`

BP ไม่ใช่สินค้าที่ซื้อ และผู้จัดไม่มีช่องกรอก BP ในหน้าสร้างแมตช์ ระบบอ่านกติกาจาก `bp_rule_configs`:

- เริ่มต้นทุกคนที่ 1,000 BP และ `balance_after` ต่ำกว่า 1,000 ไม่ได้
- คำนวณ Level เฉลี่ยของทีม แล้วปัดเป็นจำนวนเต็ม
- `level_gap = Level ฝั่งแพ้ - Level ฝั่งชนะ`
- ถ้าทีม Level ต่ำกว่าชนะ จะได้ `base_win_bp + level_gap × upset_bonus_per_level` และฝั่งแพ้เสียแต้มตาม upset loss factor
- ถ้าทีม Level สูงกว่าชนะ จะได้แต้มลดลงตาม favorite penalty และฝั่งแพ้เสียแต้มลดลงตาม protection factor
- ผลลัพธ์ถูก clamp ตาม `min/max delta` ของ rule และเก็บ `rule_version` ไว้ใน settlement/ledger เพื่ออธิบายย้อนหลัง

ค่าเริ่มต้นของ `bp-v1` คือ base win 25, base loss 15, upset bonus 2 ต่อ Level, favorite win penalty 1 ต่อ Level และ delta อยู่ระหว่าง 5–100

## ตารางที่เพิ่ม

- `matches` — แมตช์, รูปแบบ, สถานะ, คะแนน และ Base EXP
- `match_participants` — ผู้เล่นและทีม A/B
- `match_check_ins` — pending, checked_in, no_show, excused
- `bp_rule_configs` — กติกา BP ที่ระบบ/Admin เป็นเจ้าของ
- `match_settlements` — ใบสรุป settlement ต่อแมตช์แบบหนึ่งต่อหนึ่ง
- `exp_ledger` — ประวัติ EXP ต่อผู้เล่น/แมตช์/ประเภท reward
- `bp_ledger` — requested delta, applied delta, ยอดก่อนและหลัง

ทุกตารางเปิด RLS, ปิด anonymous และปิด direct DML ของ client สำหรับ match mutation/ledger โดยให้เฉพาะ RPC ที่ตรวจสิทธิ์เป็นทางเขียน

## หน้าจอ

- `/matches` — รายการแมตช์ที่ผู้ใช้เป็นผู้เล่นหรือผู้จัด
- `/matches/[id]` — scoreboard, รายชื่อ, check-in, ส่งผล, ยืนยันผล และ settlement receipt
- `/groups/[id]/matches/new` — ผู้จัดเลือกทีมและ Base EXP

การทดสอบ production แบบผู้เล่นหลายบัญชียังไม่รัน เพราะต้องใช้ test account ที่ผู้ใช้กำหนดแยกจากข้อมูลจริง
