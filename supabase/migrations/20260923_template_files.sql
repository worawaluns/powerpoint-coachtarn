-- per-set download links, served only through verify-code (service role); never exposed to anon
create table if not exists public.template_files (
  slug      text primary key,
  no        int  not null,
  file_url  text not null,
  drive_url text,
  updated_at timestamptz not null default now()
);
alter table public.template_files enable row level security;   -- no policies: service role only
grant select, insert, update, delete on public.template_files to service_role;
