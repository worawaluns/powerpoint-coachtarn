-- tax invoice details collected at checkout + manual review queue for slips Slip2Go cannot read
alter table public.orders
  add column if not exists tax_invoice boolean not null default false,
  add column if not exists tax_name text,      -- ชื่อบริษัท/หน่วยงาน
  add column if not exists tax_branch text,    -- สำนักงานใหญ่ / สาขาที่
  add column if not exists tax_id text,        -- เลขประจำตัวผู้เสียภาษี 13 หลัก
  add column if not exists tax_address text,   -- ที่อยู่สำหรับจัดส่งเอกสาร
  add column if not exists tax_email text,     -- อีเมลฝ่ายบัญชี (ถ้าต่างจากผู้ซื้อ)
  add column if not exists review_token text,  -- ลิงก์ยืนยันในอีเมลแอดมิน ใช้ครั้งเดียว
  add column if not exists review_sent_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

create unique index if not exists idx_orders_review_token on public.orders (review_token) where review_token is not null;
create index if not exists idx_orders_pending_review on public.orders (created_at desc) where status = 'pending_review';
