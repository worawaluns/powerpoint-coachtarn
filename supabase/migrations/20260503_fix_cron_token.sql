-- ═══════════════════════════════════════════════════════════════════
--  Fix: cron-recheck token (พ.ค. 2026)
--
--  ปัญหา: cron command ของ recheck-slips ใช้ literal string '<RECHECK_TOKEN>'
--         (placeholder จาก migration เดิมที่ไม่ได้แทนค่าจริง)
--  → cron ส่ง header x-recheck-token = '<RECHECK_TOKEN>' ทุกรอบ
--  → Edge Function reject 403 forbidden ทุกครั้ง
--  → ไม่เคย recover order ได้สักเคสตั้งแต่ Phase 2 deploy
--
--  แก้: ลบ cron เก่า + สร้างใหม่ด้วย token จริง (sync กับ Edge Function secret)
-- ═══════════════════════════════════════════════════════════════════

SELECT cron.unschedule('recheck-slips');

SELECT cron.schedule(
  'recheck-slips',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://uyubtzyhuqalmjpjhmap.supabase.co/functions/v1/recheck-slips',
    headers := jsonb_build_object(
      'x-recheck-token', '1dbca677777dc27e5fb0904ffefdfa4e9455d199236b753443778378b97c3b50',
      'Content-Type'   , 'application/json'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
