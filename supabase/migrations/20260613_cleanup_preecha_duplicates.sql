-- ═══════════════════════════════════════════════════════════════════
--  Cleanup duplicate rejected orders ของคุณปรีชา วิชัย
--
--  Context: ลูกค้าได้รับ verified order ตอน 00:32 (ec31a997...)
--  แต่ไม่เห็น email เพราะระบบเก่า (Gmail SMTP) ส่งเข้า Spam → ลูกค้า
--  ส่งสลิปซ้ำ 5 ครั้ง ทุกครั้งติด trans_ref_duplicate (DB เห็นว่า
--  trans_ref นี้มี verified order อยู่แล้ว)
--
--  หลังย้ายไป Resend (สีเขียวเข้า Inbox) — ส่งเมลซ้ำผ่าน peek-slip
--  mode resend_email สำเร็จ → ลูกค้าได้รับ code TARN-8PHSRHUA แล้ว
--  → 5 rows ที่ค้างเป็น noise ใน daily summary → ลบทิ้ง
-- ═══════════════════════════════════════════════════════════════════

DELETE FROM public.orders
WHERE id IN (
  '5dee3f6b-b1b6-4732-a26c-269b7c212283',
  '898c677d-47c9-4e1b-a023-2ac551fc9657',
  'b7e0a645-7470-4f20-b3f6-d527dbe79dc3',
  '67d1568a-2759-48db-baa9-d22968711e60',
  '469b3469-4c50-44e6-853a-a75e8d415a7a'
)
AND status = 'rejected'
AND reject_reason = 'trans_ref_duplicate'
AND email = 'Preecha271118@gmail.com';

-- Sanity check: verified order ec31a997 ต้องยังอยู่
-- SELECT id, status FROM orders WHERE id = 'ec31a997-7207-4239-8ec7-f63a6c39f749';
