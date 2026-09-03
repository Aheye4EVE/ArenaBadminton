# Arena-Badminton Phase 2: Auth และ Profile Completion

เอกสารนี้อธิบายสิ่งที่ทำในโค้ดแล้ว และรายการตั้งค่าที่ต้องทำใน Supabase Dashboard ก่อนเปิดใช้งานการสมัครสมาชิกจริง

## สิ่งที่ทำแล้วในโค้ด

- `/auth/login` รองรับ Email & Password, Google และ LINE
- `/auth/callback` แลก OAuth authorization code เป็น Supabase session โดยรับเฉพาะ `next` ที่เป็น path ภายในระบบ
- `src/proxy.ts` refresh session cookie ทุก request ที่เหมาะสม โดยไม่ตัดสินสิทธิ์แทนหน้าและ RLS
- หลังสมัครหรือเชื่อมต่อสำเร็จ จะพาไป `/profile/setup`
- หน้า Profile Completion บังคับกรอกชื่อ, ที่อยู่, จังหวัด, อำเภอ/เขต, ตำบล/แขวง และรหัสไปรษณีย์
- `/profile/edit` แก้ชื่อ, Bio, LINE ID สำหรับติดต่อ, ที่อยู่แบบ Dropdown สัมพันธ์กัน, รหัสไปรษณีย์, GPS และ Avatar ได้
- Avatar ใช้ presigned PUT ไป R2 โดยจำกัด JPG/PNG/WebP ไม่เกิน 5 MB และ server รับเฉพาะ object key ใต้ `avatars/{userId}/`
- `complete_profile` RPC เป็นช่องทางสร้าง/เติม Profile; Data API ไม่ให้ผู้ใช้แก้ handle, LINE provider subject, Level, EXP, BP หรือสถานะ Profile โดยตรง
- ผู้ใช้ที่มีบัญชีอยู่แล้วสามารถเชื่อม Google/LINE เพิ่มจาก `/profile/edit` ได้; ระบบยังไม่ให้ unlink จนกว่าจะมีช่องทางสำรอง
- Email แสดงจาก `auth.users`/session และไม่ทำสำเนาไว้ใน `public.profiles`
- LINE provider subject (`sub` หรือ `user_id`) เก็บภายใน `public.profiles.line_user_id` และไม่รับจาก form เพื่อป้องกันการสวมตัวตน
- LINE ID ที่ผู้ใช้กรอกเพื่อให้เพื่อนติดต่อเก็บแยกใน `public.profiles.line_contact_id`
- ปุ่ม GPS ขอพิกัดจาก browser ได้ แต่พิกัดเป็นข้อมูลเสริม; ข้อมูลที่อยู่ยังเป็นข้อมูลหลักสำหรับการกรองพื้นที่
- ฝั่ง server validate ด้วย Zod และเขียนผ่าน Supabase Data API ที่อยู่ภายใต้ RLS
- ข้อมูล private ใน `profiles` อ่านได้เฉพาะเจ้าของ; public surface ใช้ view `public_profiles` ที่ตัดที่อยู่, GPS และ provider subject ออก

## Supabase Dashboard checklist

ทำใน Supabase project ของ Arena-Badminton:

1. ไปที่ Authentication > URL Configuration
   - ตั้ง Site URL เป็นโดเมน Vercel Production ที่ใช้งานจริง
   - เพิ่ม Redirect URL ของ Production เป็น `https://<production-domain>/auth/callback`
   - เพิ่ม Preview URL เฉพาะ environment ที่จะทดสอบจริง
2. เปิด Email provider
   - กำหนด password policy ให้สอดคล้องกับระบบอย่างน้อย 8 ตัวอักษร
   - Development ใช้ email confirmation ของ Supabase ได้
   - Production ควรตั้ง SMTP ของโดเมนจริง และทดสอบลิงก์ยืนยันอีเมล
3. ตั้งค่า Google provider
   - สร้าง OAuth Web Client ใน Google Cloud Console
   - ใส่ Supabase Auth callback URL ที่ Dashboard แสดงให้ใน Google Authorized redirect URIs
   - ใส่ Client ID/Secret ใน Supabase Authentication > Providers > Google (โปรเจกต์นี้ตั้งค่าและทดสอบ Google OAuth แล้ว)
   - ในแอป callback สุดท้ายยังกลับมาที่ `/auth/callback` ของเว็บ เพื่อให้ SSR cookie ถูกตั้งในโดเมนแอป
4. ตั้งค่า LINE provider
   - สร้าง LINE Login channel และเปิด OIDC ตาม LINE Login Console
   - เพิ่ม Supabase Auth callback URL ที่ custom provider แสดงให้ใน LINE Login channel
   - ใน Supabase Authentication > Providers เพิ่ม Custom OAuth/OIDC provider โดยใช้ identifier `line`
   - แอปนี้เรียก provider เป็น `custom:line`; หากใช้ identifier อื่น ต้องเปลี่ยน `NEXT_PUBLIC_SUPABASE_LINE_PROVIDER` ให้ตรงกัน
   - ใช้ scope `openid profile`; ขอ `email` เฉพาะเมื่อ LINE channel ได้รับ permission สำหรับ email แล้ว
   - ระบบรับ subject จาก OIDC (`sub`) เป็น identity ภายใน และไม่ใช้ LINE display name เป็น identity ถาวร

ค่า Client ID, Client Secret, secret key และ service-role key ต้องใส่ใน Dashboard/Deployment Secret เท่านั้น ห้ามใส่ใน Git หรือ `NEXT_PUBLIC_*` ยกเว้น URL และ publishable key

## Environment ที่ใช้ในเครื่อง

`.env.example` มีชื่อ key ที่ต้องใช้แล้ว:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_LINE_PROVIDER=custom:line
DATABASE_URL=
MIGRATION_DATABASE_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

Phase 2 ฝั่ง browser ใช้เฉพาะ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ส่วน secret/database connection ใช้เฉพาะฝั่ง server

## Vercel verification

```bash
npm run lint
npm run typecheck
npx drizzle-kit check
npm run build
```

หลัง Deploy ให้ตรวจบนโดเมน Vercel จริง:

- Email signup แสดงข้อความให้ยืนยันอีเมลเมื่อ Supabase เปิด email confirmation
- Email login หลังสำเร็จไป `/profile/setup`
- Google OAuth เริ่มใช้งานและทดสอบแล้ว; LINE จะเริ่มได้เมื่อ provider และ callback ใน Dashboard ถูกตั้งค่า
- ผู้ใช้ที่ยังไม่กรอก profile จะถูกนำไป `/profile/setup`
- ผู้ใช้ที่กรอก profile แล้วจะไม่ถูกบังคับกรอกซ้ำ
- `/profile/edit` แสดง Dropdown พื้นที่, Avatar Upload, ปุ่มล้าง GPS และสถานะ Provider ที่เชื่อมอยู่

## ขอบเขตความปลอดภัยของ Phase 2

- หน้าและ Server Action ไม่เชื่อถือค่าจาก browser; validate ซ้ำฝั่ง server
- การอ่าน/เขียน `profiles` ต้องผ่าน authenticated session และ RLS
- ไม่เก็บ email ซ้ำใน public profile เพื่อไม่สร้างข้อมูลสองแหล่งที่ไม่ตรงกัน
- `line_user_id` มี partial unique index เพื่อป้องกันการผูก LINE ID ซ้ำ
- ที่อยู่/GPS/LINE provider subject อยู่ใน owner-only table surface; `public_profiles` เปิดเฉพาะข้อมูลที่จำเป็นต่อ feed/profile
- ระบบลืมรหัสผ่านมีอยู่แล้ว; การเปลี่ยน email ยังต้องทำผ่าน Auth flow ที่ยืนยันอีเมลใหม่ และการ unlink provider ถูกพักไว้เพื่อป้องกันล็อกบัญชี
