-- Anonymous visit counter for the landing page social proof.
-- One row per browser tab-session. No visitor id, no IP, no user agent: just a timestamp.
create table if not exists public.site_hits (
  id         bigserial primary key,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_hits_created_at on public.site_hits (created_at desc);

-- rows are written and read only by the edge function (service role)
alter table public.site_hits enable row level security;

grant select, insert, delete on public.site_hits to service_role;
grant usage, select on sequence public.site_hits_id_seq to service_role;
