-- team packs: how many seats an order buys (1 = the normal 499฿ order)
-- verify-slip reads it to know the expected transfer amount and how many redeem codes to issue
alter table public.orders add column if not exists pack integer not null default 1;
comment on column public.orders.pack is 'จำนวนสิทธิ์ที่ซื้อ (team pack) — 1/5/10/20';
