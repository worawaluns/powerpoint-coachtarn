-- ═══════════════════════════════════════════════════════════════════
--  Phase 3: Recheck Logs + extended config (พ.ค. 2026)
--
--  วิธีใช้: copy ทั้งไฟล์ → paste ใน Supabase Dashboard → SQL Editor → Run
--
--  ก่อนรัน: ต้องมี Phase 2 setup เสร็จแล้ว (recheck_count, last_recheck_at columns)
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. recheck_logs table — เก็บประวัติทุกรอบที่ recheck-slips ตรวจ ──
CREATE TABLE IF NOT EXISTS public.recheck_logs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID         NOT NULL,                              -- no FK — preserve log แม้ order ถูกลบ
  customer_email  TEXT,                                                -- denormalized
  attempt         INT          NOT NULL,                               -- รอบที่เท่าไหร่ของ order นี้
  prev_reason     TEXT,                                                -- reject_reason ก่อน recheck
  result          TEXT         NOT NULL,                               -- 'verified' | 'rejected' | 'error'
  reason          TEXT,                                                -- detail reason ถ้าไม่ผ่าน
  checked_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recheck_logs_order      ON public.recheck_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_recheck_logs_checked_at ON public.recheck_logs(checked_at DESC);

ALTER TABLE public.recheck_logs ENABLE ROW LEVEL SECURITY;
-- Service role bypass RLS, no policy needed for app use


-- ── 2. Index สำหรับ daily-summary query "verified ภายหลัง" ─────────────
-- (filter: last_recheck_at = today AND status = 'verified' AND recheck_count > 0)
CREATE INDEX IF NOT EXISTS idx_orders_verified_later
  ON public.orders(last_recheck_at DESC)
  WHERE status = 'verified' AND recheck_count > 0;


-- ═══════════════════════════════════════════════════════════════════
--  Verification queries
-- ═══════════════════════════════════════════════════════════════════

-- ดู recheck logs ล่าสุด
-- SELECT * FROM recheck_logs ORDER BY checked_at DESC LIMIT 20;

-- ดู order ที่เคย recover สำเร็จ (เก็บประวัติเต็ม)
-- SELECT o.id, o.email, o.status, o.recheck_count,
--        rl.attempt, rl.result, rl.reason, rl.checked_at
-- FROM orders o
-- LEFT JOIN recheck_logs rl ON rl.order_id = o.id
-- WHERE o.recheck_count > 0
-- ORDER BY o.last_recheck_at DESC, rl.attempt;

-- เคสที่ verify ภายหลังในวันนี้
-- SELECT id, name, email, recheck_count, last_recheck_at
-- FROM orders
-- WHERE status = 'verified'
--   AND recheck_count > 0
--   AND last_recheck_at >= (NOW() AT TIME ZONE 'Asia/Bangkok')::date
-- ORDER BY last_recheck_at DESC;


-- ═══════════════════════════════════════════════════════════════════
--  Rollback
-- ═══════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS idx_orders_verified_later;
-- DROP INDEX IF EXISTS idx_recheck_logs_checked_at;
-- DROP INDEX IF EXISTS idx_recheck_logs_order;
-- DROP TABLE IF EXISTS public.recheck_logs;
