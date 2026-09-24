-- The buyer says up front whether the money came from a personal or a company account.
-- Company slips have no QR for the checker to read, so they go straight to a person.
alter table public.orders
  add column if not exists pay_channel text not null default 'personal';

comment on column public.orders.pay_channel is
  'personal = โอนจากบัญชีส่วนตัว ตรวจอัตโนมัติ / corporate = โอนจากบัญชีบริษัท ทีมงานตรวจ';

grant select, insert, update on public.orders to anon, authenticated, service_role;

-- the value arrives from the browser, so pin it to the two it may be
alter table public.orders
  add constraint orders_pay_channel_check
  check (pay_channel in ('personal', 'corporate'));
