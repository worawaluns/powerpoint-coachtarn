-- ════════════════════════════════════════════════════════════════════════
--  เพิ่ม diagnostic columns ลง orders เพื่อให้ debug ปัญหา verify-slip
--  ได้จาก DB โดยตรงโดยไม่ต้องเปิด Edge Function logs
--
--  - slip2go_code     : response code จาก Slip2Go (เช่น "200200", "200401")
--  - slip2go_message  : message จาก Slip2Go (เช่น "Slip is valid.")
--  - verify_detail    : รายละเอียดผลตรวจ manual (amountOk/bankOk/accountOk + ค่าจริง)
--
--  วิธี run: เปิด Supabase Dashboard → SQL Editor → paste ไฟล์นี้ → Run
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS slip2go_code     TEXT,
  ADD COLUMN IF NOT EXISTS slip2go_message  TEXT,
  ADD COLUMN IF NOT EXISTS verify_detail    JSONB;

COMMENT ON COLUMN public.orders.slip2go_code    IS 'Slip2Go response code (200200/200401/200402/200404/200500/200501)';
COMMENT ON COLUMN public.orders.slip2go_message IS 'Slip2Go response message text';
COMMENT ON COLUMN public.orders.verify_detail   IS 'Manual check details: { amountOk, bankOk, accountOk, bankId, accountDigits, actualAmount, transRef, ... }';
