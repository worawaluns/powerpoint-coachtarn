-- Coach Tarn มี 2 เพจ = ManyChat 2 บัญชี Contact Id ใช้ข้ามเพจไม่ได้ และ API token ก็แยกตามเพจ
-- ปุ่มในแชทส่ง ?mc_page=<id เพจ> มากับลิงก์ เก็บไว้กับออเดอร์เพื่อให้ verify-slip เลือก token ถูกตัว
-- ออเดอร์เก่าที่ไม่มีค่านี้ verify-slip จะถอยไปใช้ MANYCHAT_API_TOKEN ตัวเดิม
alter table public.orders add column if not exists manychat_page_id text;

-- ไม่ต้อง GRANT เพิ่ม: กฎ GRANT ในโปรเจกต์ใช้กับ "ตารางใหม่" ส่วนคอลัมน์ใหม่รับสิทธิ์ของตาราง orders ที่มีอยู่แล้ว
-- และ RLS ของ orders ยังเป็น insert ได้อย่างเดียว อ่าน/แก้/ลบ จาก public ถูกปิดไว้ทั้งหมด
