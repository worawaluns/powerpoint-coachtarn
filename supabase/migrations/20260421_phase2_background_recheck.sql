-- ═══════════════════════════════════════════════════════════════════
--  Phase 2: Background Recheck (เม.ย. 2026)
--
--  วิธีใช้: copy ทั้งไฟล์ → paste ใน Supabase Dashboard → SQL Editor → Run
--
--  ข้อสำคัญก่อนรัน:
--    1. ตั้ง Edge Function secret `RECHECK_TOKEN` ใน Dashboard ก่อน
--    2. Deploy `recheck-slips` Edge Function ก่อน (terminal:
--       `supabase functions deploy recheck-slips --project-ref uyubtzyhuqalmjpjhmap`)
--    3. แทนที่ <RECHECK_TOKEN> ใน block ที่ 3 ด้านล่างด้วยค่าจริง
--       (ค่าเดียวกับที่ตั้งใน Edge Function secret)
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. เพิ่ม columns สำหรับ track recheck ─────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recheck_count   INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_recheck_at TIMESTAMPTZ;

-- ── 2. Partial index ให้ cron query เร็ว (ดู rejected เท่านั้น) ───────
CREATE INDEX IF NOT EXISTS idx_orders_recheck_candidates
  ON public.orders(reject_reason, created_at, recheck_count, last_recheck_at)
  WHERE status = 'rejected';

-- ── 3. Enable extensions สำหรับ cron + HTTP call ──────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 4. Schedule cron ทุก 15 นาที ──────────────────────────────────────
-- ⚠️ แทนที่ <RECHECK_TOKEN> ด้วยค่าจริงก่อนรัน
SELECT cron.schedule(
  'recheck-slips',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://uyubtzyhuqalmjpjhmap.supabase.co/functions/v1/recheck-slips',
    headers := jsonb_build_object(
      'x-recheck-token', '<RECHECK_TOKEN>',
      'Content-Type'   , 'application/json'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);


-- ═══════════════════════════════════════════════════════════════════
--  Verification queries (รันแยกหลัง setup เพื่อ check)
-- ═══════════════════════════════════════════════════════════════════

-- ดู cron jobs ทั้งหมด
-- SELECT * FROM cron.job;

-- ดู history การรันล่าสุด
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- ดู orders ที่ผ่าน recheck recovery สำเร็จ
-- SELECT id, name, email, status, reject_reason, recheck_count, last_recheck_at
-- FROM orders
-- WHERE recheck_count > 0
-- ORDER BY last_recheck_at DESC LIMIT 20;


-- ═══════════════════════════════════════════════════════════════════
--  Rollback (ถ้าต้องลบ cron / revert)
-- ═══════════════════════════════════════════════════════════════════
-- SELECT cron.unschedule('recheck-slips');
-- DROP INDEX IF EXISTS idx_orders_recheck_candidates;
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS recheck_count;
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS last_recheck_at;
