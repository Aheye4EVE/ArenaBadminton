-- Initial public venue registry. The source pages are retained per row so an
-- administrator can re-check or correct a venue without treating this batch
-- as a claim about current opening hours, court count, or availability.
with seed(name, province, district, subdistrict, address, source_url) as (
  values
    ('ทรัมแบดมินตัน', 'กรุงเทพมหานคร', 'เขตบางเขน', 'อนุสาวรีย์', '35 ซอยรามอินทรา 31 เข้าซอยไป 600 เมตร กรุงเทพฯ 10220', 'https://www.trumqbadminton.com/facility'),
    ('สนามแบดมินตัน SCG', 'กรุงเทพมหานคร', 'เขตยานนาวา', 'ช่องนนทรี', '81 ซอยนางลิ้นจี่ 3 แขวงช่องนนทรี เขตยานนาวา กรุงเทพฯ 10120', 'https://page.line.me/913zzwkc?openQrModal=true'),
    ('CMI Badminton', 'เชียงใหม่', 'เมืองเชียงใหม่', 'ป่าตัน', '22/1 ซอยวัดป่าตัน ตำบลป่าตัน อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50300', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('FYC เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', null, '6 ซอย 4 ถนนอนุวิถี อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50000', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('JC Badminton เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'หนองป่าครั่ง', '11 ถนนเจริญยิ่ง ตำบลหนองป่าครั่ง อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50000', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('@CNX Badminton', 'เชียงใหม่', 'เมืองเชียงใหม่', 'ช้างเผือก', '2/2 ซอยโรงเรียนบ้านพระนอน ตำบลช้างเผือก อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50300', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตันสวนดอก', 'เชียงใหม่', 'เมืองเชียงใหม่', 'สุเทพ', 'อาคารสันทนาการ คณะแพทยศาสตร์ มหาวิทยาลัยเชียงใหม่ 110 ถนนอินทวโรรส ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตันมหาวิทยาลัยเชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'สุเทพ', '239 ถนนห้วยแก้ว ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตันพาณิชย์สามัคคี', 'เชียงใหม่', 'เมืองเชียงใหม่', 'วัดเกต', '71 ถนนทุ่งโฮเต็ล ตำบลวัดเกต อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50000', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตัน มกช. เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'ศรีภูมิ', '68/1 ถนนสนามกีฬา ตำบลศรีภูมิ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตันอิมพีเรียลเชียงใหม่', 'เชียงใหม่', 'แม่ริม', 'ดอนแก้ว', 'ดิ อิมพีเรียล เชียงใหม่ รีสอร์ต แอนด์ สปอร์ตคลับ 284 หมู่ 3 ตำบลดอนแก้ว อำเภอแม่ริม จังหวัดเชียงใหม่ 50180', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตันวิทยุการบิน เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'สุเทพ', '60 ถนนสนามบิน ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('GreenHill Badminton เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'ช้างเผือก', '15/38 หมู่ 5 ถนนซุปเปอร์ไฮเวย์ ตำบลช้างเผือก อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50300', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('ตีรดี แบดมินตัน', 'เชียงใหม่', 'เมืองเชียงใหม่', 'วัดเกต', '263 ถนนเมืองสาตร ตำบลวัดเกต อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50000', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('ATK Badminton', 'เชียงใหม่', 'แม่ริม', 'ดอนแก้ว', 'สนามกีฬาสมโภชเชียงใหม่ 700 ปี 185/1 หมู่ 5 ถนนซีเกมส์ ตำบลดอนแก้ว อำเภอแม่ริม จังหวัดเชียงใหม่ 50180', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('TOT สารภี แบดมินตัน', 'เชียงใหม่', 'สารภี', 'ยางเนิ้ง', 'บริษัททีโอที จำกัด (มหาชน) ฝ่ายบริการลูกค้าภูมิภาคที่ 3 ถนนซุปเปอร์ไฮเวย์เชียงใหม่-ลำปาง ตำบลยางเนิ้ง อำเภอสารภี จังหวัดเชียงใหม่ 50140', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดบ้านสวนกวาง', 'เชียงใหม่', 'สารภี', 'หนองผึ้ง', 'ซอยหมู่บ้านเอ็มเอสวิลเลจ 1 ตำบลหนองผึ้ง อำเภอสารภี จังหวัดเชียงใหม่ 50140', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตันมหาวิทยาลัยแม่โจ้', 'เชียงใหม่', 'สันทราย', 'หนองหาร', 'ศูนย์กีฬากาญจนาภิเษก มหาวิทยาลัยแม่โจ้ ตำบลหนองหาร อำเภอสันทราย จังหวัดเชียงใหม่ 50290', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('ลานนาแบดมินตันเชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'ช้างเผือก', 'ศูนย์กีฬาลานนา มณฑลทหารบกที่ 33 เลขที่ 33 ถนนโชตนา ตำบลช้างเผือก อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50300', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตันบ้านพฤกษ์ลดา 2', 'เชียงใหม่', 'สันทราย', 'หนองจ๊อม', 'บ้านพฤกษ์ลดา 2 ถนนเชียงใหม่-แม่โจ้ ตำบลหนองจ๊อม อำเภอสันทราย จังหวัดเชียงใหม่ 50210', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตันหมอแก้มหอม', 'เชียงใหม่', 'สารภี', 'ชมภู', 'อโรคยาเดอสารภี หมอแก้มหอม บ้านท่าต้นกวาว 333 หมู่ 4 ตำบลชมภู อำเภอสารภี จังหวัดเชียงใหม่ 50140', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สโมสรบ้านรุ่งอรุณ 3', 'เชียงใหม่', 'หางดง', 'หางดง', '147 ซอยเทศบาล 4 ถนนเชียงใหม่-ฮอด ตำบลหางดง อำเภอหางดง จังหวัดเชียงใหม่ 50230', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('ศูนย์กีฬาปิโตรเลียมภาคเหนือ บ่อน้ำมันฝาง', 'เชียงใหม่', 'ฝาง', 'แม่คะ', 'สนามกีฬา ศูนย์พัฒนาปิโตรเลียมภาคเหนือ บ่อน้ำมันฝาง ตำบลแม่คะ อำเภอฝาง จังหวัดเชียงใหม่ 50110', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('Bouncy Badminton เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'แม่เหียะ', '519/9 ถนนสมโภชเชียงใหม่ 700 ปี ตำบลแม่เหียะ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50100', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('North Arena Sport Club Serena Lake', 'เชียงใหม่', 'เมืองเชียงใหม่', 'แม่เหียะ', 'ถนนสมโภชเชียงใหม่ 700 ปี ตำบลแม่เหียะ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50100', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('OXY Badminton เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'ช้างเผือก', 'ถนนช่างเคี่ยน ตำบลช้างเผือก อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50300', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('Spirit Badminton Arena Chiangmai', 'เชียงใหม่', 'หางดง', 'สันผักหวาน', 'มหาวิทยาลัยฟาร์อีสเทิร์น วิทยาเขตสันผักหวาน 333 หมู่ 3 ตำบลสันผักหวาน อำเภอหางดง จังหวัดเชียงใหม่ 50230', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('Shin-Sho Badminton เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'ท่าศาลา', '359 ตำบลท่าศาลา อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('ล้านนาแบดมินตัน เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'ช้างเผือก', 'ถนนช่างเคี่ยน ตำบลช้างเผือก อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50300', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('ดอยหลวงแบดมินตันเชียงดาว', 'เชียงใหม่', 'เชียงดาว', 'แม่นะ', '441 ตำบลแม่นะ อำเภอเชียงดาว จังหวัดเชียงใหม่ 50170', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('On Court Badminton เชียงใหม่', 'เชียงใหม่', 'ดอยสะเก็ด', 'สันปูเลย', '241/3 ตำบลสันปูเลย อำเภอดอยสะเก็ด จังหวัดเชียงใหม่ 50220', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('Hitt Arena เชียงใหม่', 'เชียงใหม่', 'เมืองเชียงใหม่', 'สันผีเสื้อ', '138 หมู่ 9 ตำบลสันผีเสื้อ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50300', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('ไดมอนด์ ฝาง แบดมินตัน', 'เชียงใหม่', 'ฝาง', 'สันทราย', '400 ตำบลสันทราย อำเภอฝาง จังหวัดเชียงใหม่ 50110', 'https://northbadminton.blogspot.com/p/court-chiangmai.html'),
    ('สนามแบดมินตันสะพานหินภูเก็ต', 'ภูเก็ต', 'เมืองภูเก็ต', 'วิชิต', 'ศูนย์กีฬาสะพานหิน ตำบลวิชิต อำเภอเมืองภูเก็ต จังหวัดภูเก็ต 83000', 'https://northbadminton.blogspot.com/p/court-phuket.html'),
    ('โรงแบดภูเก็ต', 'ภูเก็ต', 'เมืองภูเก็ต', 'วิชิต', '72/35 ถนนเจ้าฟ้าตะวันออก ตำบลวิชิต อำเภอเมืองภูเก็ต จังหวัดภูเก็ต 83000', 'https://northbadminton.blogspot.com/p/court-phuket.html'),
    ('สนามแบดมินตัน เจ.เจ. ภูเก็ต', 'ภูเก็ต', 'เมืองภูเก็ต', 'รัษฎา', 'ถนนรัษฎานุสรณ์ ซอยม่วงอุทิศ ตำบลรัษฎา อำเภอเมืองภูเก็ต จังหวัดภูเก็ต 83000', 'https://northbadminton.blogspot.com/p/court-phuket.html'),
    ('PK Arena ภูเก็ต', 'ภูเก็ต', 'ถลาง', 'ศรีสุนทร', '19/13 ถนนเทพกระษัตรี ตำบลศรีสุนทร อำเภอถลาง จังหวัดภูเก็ต 83110', 'https://northbadminton.blogspot.com/p/court-phuket.html'),
    ('ฉลองแบดมินตัน ภูเก็ต', 'ภูเก็ต', 'เมืองภูเก็ต', 'ฉลอง', '45/11 หมู่ 10 ตำบลฉลอง อำเภอเมืองภูเก็ต จังหวัดภูเก็ต 83130', 'https://northbadminton.blogspot.com/p/court-phuket.html'),
    ('สนามแบดมินตันเทศบาลตำบลวิชิต', 'ภูเก็ต', 'เมืองภูเก็ต', 'วิชิต', 'ถนนเจ้าฟ้าตะวันออก หมู่ 1 ตำบลวิชิต อำเภอเมืองภูเก็ต จังหวัดภูเก็ต 83000', 'https://northbadminton.blogspot.com/p/court-phuket.html'),
    ('Sports Complex PSU Phuket', 'ภูเก็ต', 'กะทู้', 'กะทู้', '80 หมู่ 1 ตำบลกะทู้ อำเภอกะทู้ จังหวัดภูเก็ต 83120', 'https://northbadminton.blogspot.com/p/court-phuket.html'),
    ('PS Badminton Court ขอนแก่น', 'ขอนแก่น', 'เมืองขอนแก่น', 'ในเมือง', '140/88 สนาม PS Badminton Court หมู่ 17 ตำบลในเมือง อำเภอเมืองขอนแก่น จังหวัดขอนแก่น 40000', 'https://northeastacademyth.com/'),
    ('MTN Khon Kaen Badminton Hall', 'ขอนแก่น', 'เมืองขอนแก่น', 'ในเมือง', '165/201 ถนนแก่นตูมประชาราษฎร์ ตำบลในเมือง อำเภอเมืองขอนแก่น จังหวัดขอนแก่น 40000', 'https://www.localgymsandfitness.com/TH/Khon-Kaen/110427937794175/MTN-Khon-Kaen-Badminton-Hall'),
    ('KhonkaenRam Sport Complex', 'ขอนแก่น', 'เมืองขอนแก่น', null, 'ตั้งอยู่ติดกับโรงพยาบาลขอนแก่นราม จังหวัดขอนแก่น', 'https://sport.khonkaenram.com/'),
    ('สนามแบดมินตัน มทส.', 'นครราชสีมา', 'เมืองนครราชสีมา', 'สุรนารี', '111 ถนนมหาวิทยาลัย ตำบลสุรนารี อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000', 'https://shc.sut.ac.th/th/sports_field_services'),
    ('The Peak Club นครราชสีมา', 'นครราชสีมา', 'เมืองนครราชสีมา', 'หนองไผ่ล้อม', '100 ถนนริมบุ่ง ตำบลหนองไผ่ล้อม อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000', 'https://pbsport.co.th/portfolio-page/the-peak-club/'),
    ('ศูนย์กีฬาและสุขภาพ ม.อ. หาดใหญ่', 'สงขลา', 'หาดใหญ่', 'คอหงส์', '15 ถนนกาญจนวนิชย์ ตำบลคอหงส์ อำเภอหาดใหญ่ จังหวัดสงขลา 90110', 'https://www.hatyai.psu.ac.th/?news_code=843&page=news'),
    ('AC Sport Center หาดใหญ่', 'สงขลา', 'หาดใหญ่', 'คอหงส์', '224 ถนนปลักธง-ควนจง ตำบลคอหงส์ อำเภอหาดใหญ่ จังหวัดสงขลา 90110', 'https://acsportcenter.com/home')
)
insert into public.venues (created_by, name, province, district, subdistrict, address, availability, status, aliases, source_url, verified_at)
select null, seed.name, seed.province, seed.district, seed.subdistrict, seed.address, 'unknown', 'active', '{}'::text[], seed.source_url, now()
from seed
where not exists (
  select 1 from public.venues existing
  where lower(btrim(existing.name)) = lower(btrim(seed.name))
    and public.arena_area(existing.province) = public.arena_area(seed.province)
);
