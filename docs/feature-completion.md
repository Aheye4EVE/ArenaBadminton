# Feature completion map

เอกสารนี้สรุป vertical slices ที่เพิ่มในรอบ Competitive + Community completion และเส้นทางทดสอบบน Vercel Production

## Tournament และการแข่งขัน

- `/events` และ `/events/[id]` แสดงกิจกรรมจริงจาก Supabase
- ผู้จัดกิจกรรมสร้าง Single Elimination bracket ได้เมื่อมีผู้สมัครอย่างน้อย 2 คน
- ผู้จัดกรอกผลแต่ละคู่ได้ และผู้เล่นอีกฝั่งหรือผู้จัดยืนยันผลก่อนเลื่อนรอบ
- ผู้จัดตั้งรางวัลตามอันดับได้ (`EXP`, `BP`, `Item`, label)
- เมื่อรอบสุดท้ายจบ ระบบคำนวณอันดับที่ผู้เล่นตกรอบและ award เฉพาะรางวัลที่ตั้งค่าไว้ผ่าน RPC transaction
- Award แสดงใน Tournament และ `/profile/history`

## MVP และ Ranking

- `/matches/[id]` ให้สมาชิกก๊วนที่เข้าร่วมแมตช์โหวตผู้เล่นได้หนึ่งคนต่อแมตช์
- ผู้จัด Finalize MVP ได้เมื่อแมตช์ settle แล้ว ระบบคำนวณคะแนนโหวต แจก bonus และบันทึก award
- `/ranking` กรอง `ตำบล/แขวง`, `อำเภอ/เขต`, `จังหวัด`, `ประเทศ`
- Tie-break ใช้ BP, จำนวนแมตช์, Win Rate, Level และ EXP
- สถิติถูก sync จาก Profile และ refresh หลัง match settlement

## สนามและ Guild

- `/venues/[id]` แสดงรายละเอียด, Google Maps link, rating และรีวิว
- ผู้เล่นแก้รีวิวของตัวเองได้หนึ่งรายการต่อสนาม
- `/guilds/[id]` มี Guild Quest ตามประเภทและช่วงเวลา
- Manager สร้าง Quest; สมาชิก Claim ได้เมื่อ progress ถึงเป้าหมาย
- รางวัล Quest ลง Guild EXP/ผู้เล่น EXP/Inventory ผ่าน RPC

## Community safety, Marketplace และ Messages

- `/moderation/report` เป็นฟอร์มรายงาน content ที่รู้จัก target type และตรวจ target ใน database
- `/admin/moderation` เป็นคิวสำหรับ Admin เปลี่ยนสถานะ `reviewing`, `resolved`, `dismissed`
- `/marketplace`, `/marketplace/create`, `/marketplace/[id]` รองรับประกาศมือสอง, รูป R2, พื้นที่, request, accept/reject/cancel/complete
- Marketplace แจ้งเตือน seller/buyer และยกเลิกคำขออื่นเมื่อปิดการขาย
- `/messages` เป็น DM แบบ one-to-one; ข้อความใหม่ใช้ Supabase Realtime publication `direct_messages`

## Boundary ที่ยังจงใจไม่เปิด

- Shop/Gems มี catalog, inventory และ ledger แล้ว แต่ยังไม่มีช่องเติมเงินจริง
- การเปิด Payment Gateway ต้องเลือก provider ก่อน แล้วเพิ่ม server-only webhook, signature verification, idempotency, refund และ reconciliation
- Interactive Google Maps ต้องมี API key ที่จำกัด referrer; หากไม่มี key ระบบยังเปิด Google Maps ภายนอกได้
- Leaked Password Protection และ provider/SMTP production settings เป็นงานตั้งค่าที่ Supabase Dashboard ไม่ใช่ source-code migration

## Verification checklist

```text
npm run lint
npm run typecheck
npx drizzle-kit check
npm run build
npm run smoke:production
```

ทดสอบ manual ด้วยบัญชีจริง 2 บัญชี: Login, ลงก๊วน, สร้าง Match, settle, โหวต MVP, สร้าง Tournament, Generate Bracket, รีวิวสนาม, ลงขาย/ขอซื้อ, ส่ง DM, รายงาน และตรวจ Admin Queue

