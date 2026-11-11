-- ═══════════════════════════════════════════════════════════════════
--  โปร double digit / payday — ตารางโค้ดส่วนลด + คอลัมน์ใน orders
--
--  ตัวตัดสินราคาจริงคือ verify-slip ที่อ่านตารางนี้ด้วย service_role
--  หน้าเว็บอ่านได้แค่ SELECT เพื่อเอาไปแสดงผล ปลอมราคาไม่ได้
--  ลดเฉพาะแพ็ก 1 สิทธิ์ แพ็กทีม 5/10/20 ไม่แตะ (ตรวจใน verify-slip)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.promo_codes (
  code           text primary key,                    -- ตัวพิมพ์ใหญ่ เช่น DECK1111
  discount_price numeric      not null,               -- ราคาสุทธิหลังลด ไม่ใช่ส่วนลด
  label          text         not null,               -- ป้ายบนเว็บ แก้ได้ไม่ต้อง deploy
  starts_at      timestamptz  not null,
  ends_at        timestamptz  not null,
  grace_hours    int          not null default 6,     -- ยอมรับสลิปต่ออีกกี่ชั่วโมงหลังหมดเขต
  active         boolean      not null default true,  -- ปิดโค้ดทันทีโดยไม่ต้องลบ
  created_at     timestamptz  not null default now()
);

comment on column public.promo_codes.discount_price is 'ราคาสุทธิที่ลูกค้าต้องโอน (แพ็ก 1 สิทธิ์) — เก็บเป็นราคาปลายทาง ไม่ใช่ percent เพื่อไม่ให้มีปัญหาปัดเศษ';
comment on column public.promo_codes.grace_hours   is 'ผ่อนเวลาหลัง ends_at — verify-slip ตรวจที่ server เท่านั้น';

alter table public.promo_codes enable row level security;

-- หน้าเว็บ (anon) อ่านได้เฉพาะโค้ดที่เปิดอยู่ ข้อมูลนี้เป็นข้อมูลสาธารณะ
-- (ลูกค้าเห็นโค้ดกับราคาอยู่แล้วบนหน้าจอ)
drop policy if exists promo_codes_read_active on public.promo_codes;
create policy promo_codes_read_active on public.promo_codes
  for select to anon, authenticated using (active = true);

GRANT SELECT ON public.promo_codes TO anon, authenticated;
GRANT ALL    ON public.promo_codes TO service_role;

-- ── orders ────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists promo_code      text,     -- โค้ดที่ลูกค้าใช้ ไว้ทำรายงานย้อนหลัง
  add column if not exists ref             text,     -- ?ref=fbads-1111 แยกยอดตามแหล่งโฆษณา
  add column if not exists expected_amount numeric;  -- ราคาที่ server คำนวณได้ เขียนโดย verify-slip

comment on column public.orders.promo_code      is 'โค้ดส่วนลดที่ใช้ (null = ราคาปกติ)';
comment on column public.orders.ref             is 'แหล่งที่มาของทราฟฟิก จาก ?ref= ใน URL';
comment on column public.orders.expected_amount is 'ยอดที่ต้องโอนตามที่ verify-slip คำนวณ — รายงานใช้ค่านี้แทนการเดาจาก pack';

create index if not exists idx_orders_promo on public.orders (promo_code) where promo_code is not null;

-- ── โค้ดรอบที่ไอซ์สั่งแล้ว ─────────────────────────────────────────
-- ช่วงวันเป็นเวลาไทย (+07) แก้ได้จากตารางนี้ ไม่ต้องแก้โค้ด
insert into public.promo_codes (code, discount_price, label, starts_at, ends_at) values
  ('DECK1111',  355, '11.11 โปรวันคู่',  '2026-11-08 00:00:00+07', '2026-11-12 23:59:59+07'),
  ('PITCHNOV',  325, 'โปรวันเงินเดือนออก', '2026-11-24 00:00:00+07', '2026-12-02 23:59:59+07')
on conflict (code) do nothing;
