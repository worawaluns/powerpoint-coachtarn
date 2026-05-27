-- ═══════════════════════════════════════════════════════════════════
--  Explicit GRANTs (เตรียมรับ Supabase enforcement 30 ต.ค. 2026)
--
--  Context: Supabase ประกาศว่าตั้งแต่ 30 ต.ค. 2026 table ใหม่ใน schema
--  "public" จะไม่มี GRANT default ให้ anon/authenticated อีก
--  ต้อง explicit GRANT ก่อนถึงใช้ผ่าน PostgREST / supabase-js ได้
--
--  Existing tables: ของเรา (orders, redeem_codes, code_usage_logs,
--  recheck_logs) คงสิทธิ์ implicit เดิมไปตลอด แม้หลัง 30 ต.ค.
--  แต่ migration นี้ "ระบุชัด" เพื่อ:
--    1. Documentation — ใครอ่านโค้ดเห็น GRANT ครบทุก table
--    2. Future-proof — ถ้า Supabase change rules เพิ่ม เราไม่พัง
--    3. Idempotent — GRANT ซ้ำไม่มี side-effect (เพิ่มอย่างเดียว)
-- ═══════════════════════════════════════════════════════════════════

-- ── Schema usage (จำเป็นทุก role ที่จะใช้ table ใน public) ──
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ── orders ────────────────────────────────────────────────────────
-- Frontend (anon) INSERT จาก order.html → ลูกค้าสั่งซื้อ
-- RLS policy ควบคุมว่า anon ทำอะไรได้บ้างจริง ๆ
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;

-- ── redeem_codes ──────────────────────────────────────────────────
-- Server-side only (verify-slip / verify-code Edge Functions)
-- ลูกค้าไม่ได้ access ตรง ๆ — ผ่าน Edge Function เท่านั้น
GRANT ALL ON public.redeem_codes TO service_role;

-- ── code_usage_logs ───────────────────────────────────────────────
-- Server-side only (verify-code logs ตอน redeem)
GRANT ALL ON public.code_usage_logs TO service_role;

-- ── recheck_logs ──────────────────────────────────────────────────
-- Server-side only (recheck-slips บันทึก cron attempts)
-- มี ENABLE ROW LEVEL SECURITY แล้ว — service_role bypass
GRANT ALL ON public.recheck_logs TO service_role;

-- ── Default privileges for future tables (optional safety net) ──
-- ถ้าสร้าง table ใหม่ใน public จะมี GRANT default ให้ service_role ทันที
-- (anon/authenticated ยังต้องระบุ explicit ต่อ table)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;


-- ═══════════════════════════════════════════════════════════════════
--  Verification — รัน query ด้านล่างใน SQL Editor เพื่อ check
-- ═══════════════════════════════════════════════════════════════════

-- ดู GRANTs ปัจจุบันของแต่ละ table
-- SELECT grantee, privilege_type, table_name
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
--   AND grantee IN ('anon', 'authenticated', 'service_role')
-- ORDER BY table_name, grantee, privilege_type;
