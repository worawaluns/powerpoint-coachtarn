-- A Thai tax invoice carries the buyer's registered address, but the paper does
-- not always go there, so the delivery address is asked for separately.
alter table public.orders
  add column if not exists tax_ship_address text;

comment on column public.orders.tax_address is
  'ที่อยู่บริษัทตามที่จดทะเบียน ใช้พิมพ์บนใบกำกับภาษี';
comment on column public.orders.tax_ship_address is
  'ที่อยู่สำหรับจัดส่งเอกสาร ถ้าเว้นว่างคือส่งตามที่อยู่บริษัท';

grant select, insert, update on public.orders to anon, authenticated, service_role;
