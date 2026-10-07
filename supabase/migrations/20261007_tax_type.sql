-- ใบกำกับภาษีออกในนามบุคคลธรรมดาได้ด้วย ไม่ใช่เฉพาะนิติบุคคล
-- ของเดิมฟอร์มบังคับชื่อบริษัท + เลขผู้เสียภาษี 13 หลัก คนที่ขอในนามตัวเองเลยกรอกไม่ได้
-- ใบกำกับภาษีเต็มรูปบังคับเลขผู้เสียภาษีและสาขาของผู้ซื้อเฉพาะตอนผู้ซื้อจด VAT
-- (ประกาศอธิบดีฯ ภาษีมูลค่าเพิ่ม ฉบับที่ 199 ข้อ 7 และ 9) บุคคลธรรมดาใช้แค่ชื่อกับที่อยู่
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_type text NOT NULL DEFAULT 'company'
  CHECK (tax_type IN ('company', 'personal'));

COMMENT ON COLUMN public.orders.tax_type IS 'ออกใบกำกับภาษีในนามใคร: company = นิติบุคคล (ต้องมี tax_id 13 หลัก + tax_branch), personal = บุคคลธรรมดา (tax_id ไม่บังคับ ไม่มีสาขา)';

-- ไม่ต้อง GRANT เพิ่ม: คอลัมน์ใหม่ใช้สิทธิ์ของตารางที่มีอยู่แล้ว และตัวที่กั้นจริงคือ RLS
-- (orders เปิด RLS อยู่ นโยบาย select/update/delete เป็น false สำหรับ public, anon insert ได้อย่างเดียว)
