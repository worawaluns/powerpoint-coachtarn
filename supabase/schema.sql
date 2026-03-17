-- ═══════════════════════════════════════════════════════════════════
--  PowerPoint Template by Coach Tarn — Supabase Schema
--  วิธีใช้: copy ทั้งหมดไปรัน ใน Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── Enable UUID extension ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TABLE: orders ────────────────────────────────────────────────────
-- เก็บทุก order ที่ลูกค้า submit (ทั้ง pending และ verified)
CREATE TABLE public.orders (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,                          -- ชื่อลูกค้า
  email        TEXT        NOT NULL,                          -- อีเมลลูกค้า
  slip_url     TEXT,                                          -- path ของสลิปใน Storage
  status       TEXT        NOT NULL DEFAULT 'pending',        -- pending | verified | rejected
  trans_ref    TEXT,                                          -- รหัสอ้างอิงจาก Slip2Go (ป้องกันซ้ำ)
  ref_source   TEXT        DEFAULT 'direct',                  -- ช่องทางที่มา
  reject_reason TEXT,                                         -- เหตุผลที่ reject
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ป้องกันสลิปซ้ำ (trans_ref unique เฉพาะแถวที่ไม่ NULL)
CREATE UNIQUE INDEX idx_orders_trans_ref
  ON public.orders(trans_ref)
  WHERE trans_ref IS NOT NULL;

-- Index สำหรับ query รายงาน
CREATE INDEX idx_orders_status_date
  ON public.orders(status, created_at DESC);

CREATE INDEX idx_orders_email
  ON public.orders(email);

-- ── TABLE: redeem_codes ──────────────────────────────────────────────
-- เก็บ code ที่สร้างให้ลูกค้าแต่ละคน (1 order = 1 code)
CREATE TABLE public.redeem_codes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name TEXT        NOT NULL,
  code          TEXT        NOT NULL UNIQUE,                  -- TARN-XXXXXXXX
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ                                   -- log เวลาล่าสุดที่ใช้ (ไม่ block)
);

CREATE INDEX idx_redeem_codes_code
  ON public.redeem_codes(code);

-- ── TABLE: code_usage_logs ───────────────────────────────────────────
-- log ทุกครั้งที่ลูกค้าใช้ code เพื่อดาวน์โหลด (audit trail)
CREATE TABLE public.code_usage_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id      UUID        NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  used_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address   TEXT,
  user_agent   TEXT
);

-- ── STORAGE bucket: slips ────────────────────────────────────────────
-- Private bucket สำหรับเก็บรูปสลิป
INSERT INTO storage.buckets (id, name, public)
VALUES ('slips', 'slips', false)
ON CONFLICT (id) DO NOTHING;

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────
ALTER TABLE public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redeem_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_usage_logs ENABLE ROW LEVEL SECURITY;

-- orders: anon INSERT ได้อย่างเดียว (ลูกค้า submit form)
CREATE POLICY "anon can insert orders"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (true);

-- orders: ห้าม SELECT/UPDATE/DELETE จาก client (ทำผ่าน Edge Function เท่านั้น)
CREATE POLICY "no public read orders"
  ON public.orders FOR SELECT TO public
  USING (false);

CREATE POLICY "no public update orders"
  ON public.orders FOR UPDATE TO public
  USING (false);

CREATE POLICY "no public delete orders"
  ON public.orders FOR DELETE TO public
  USING (false);

-- redeem_codes: ห้าม client เข้าถึงโดยตรง (verify ผ่าน Edge Function)
CREATE POLICY "no public access redeem_codes"
  ON public.redeem_codes FOR ALL TO public
  USING (false);

-- code_usage_logs: ห้าม client เข้าถึงโดยตรง
CREATE POLICY "no public access code_usage_logs"
  ON public.code_usage_logs FOR ALL TO public
  USING (false);

-- Storage: anon upload สลิปได้ (INSERT only)
CREATE POLICY "anon can upload slips"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'slips');

-- Storage: ห้าม public read สลิป (ต้องใช้ Signed URL จาก Edge Function)
CREATE POLICY "no public read slips"
  ON storage.objects FOR SELECT TO public
  USING (false);

-- ── Helper function: updated_at auto-update ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

