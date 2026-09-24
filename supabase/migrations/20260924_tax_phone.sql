-- The accounting team needs a phone number to chase a tax invoice, not a second
-- email address, so the checkout asks for that instead.
alter table public.orders
  add column if not exists tax_phone text;

comment on column public.orders.tax_phone is
  'เบอร์โทรติดต่อสำหรับออกและจัดส่งใบกำกับภาษี';

grant select, insert, update on public.orders to anon, authenticated, service_role;
