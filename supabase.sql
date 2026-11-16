-- CanadaConnect applicant portal schema
-- Run this in Supabase SQL Editor. Do NOT expose service_role keys in app.js.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 90),
  status text not null default 'pending' check (status in ('accepted','pending','rejected')),
  age integer check (age is null or age between 1 and 120),
  phone text,
  passport_status text not null default 'On process',
  location text not null default 'Canada',
  photo_path text,
  show_age boolean not null default false,
  show_phone boolean not null default false,
  show_passport_status boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.applicants enable row level security;

-- Only signed-in users explicitly inserted into admin_users can read admin membership.
drop policy if exists "admins can read own admin row" on public.admin_users;
create policy "admins can read own admin row" on public.admin_users
for select to authenticated using (user_id = auth.uid());

-- Admin-only full access to applicant records.
drop policy if exists "admins manage applicants" on public.applicants;
create policy "admins manage applicants" on public.applicants
for all to authenticated
using (exists(select 1 from public.admin_users au where au.user_id = auth.uid()))
with check (exists(select 1 from public.admin_users au where au.user_id = auth.uid()));

-- Public view deliberately excludes phone by default and never exposes passport numbers.
-- Phone is returned only if an admin explicitly enables it. Consider leaving show_phone false.
create or replace view public.public_applicants as
select id, name, status, location, photo_path, created_at,
       case when status = 'accepted' and show_age then age else null end as public_age,
       case when status = 'accepted' and show_phone then phone else null end as public_phone,
       case when status = 'accepted' and show_passport_status then passport_status else 'On process' end as public_passport_status
from public.applicants
where is_published = true;

grant select on public.public_applicants to anon, authenticated;
revoke all on public.applicants from anon;
revoke all on public.admin_users from anon;

-- Photo bucket: uploaded images are publicly viewable because they appear on the public directory.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('applicant-photos','applicant-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "admins upload applicant photos" on storage.objects;
create policy "admins upload applicant photos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'applicant-photos'
  and exists(select 1 from public.admin_users au where au.user_id = auth.uid())
);
drop policy if exists "admins update applicant photos" on storage.objects;
create policy "admins update applicant photos" on storage.objects
for update to authenticated using (
  bucket_id = 'applicant-photos'
  and exists(select 1 from public.admin_users au where au.user_id = auth.uid())
);
drop policy if exists "admins delete applicant photos" on storage.objects;
create policy "admins delete applicant photos" on storage.objects
for delete to authenticated using (
  bucket_id = 'applicant-photos'
  and exists(select 1 from public.admin_users au where au.user_id = auth.uid())
);

-- IMPORTANT: Create the first admin in Supabase Dashboard > Authentication > Users.
-- Then copy that user's UUID and run:
-- insert into public.admin_users(user_id) values ('PASTE_AUTH_USER_UUID_HERE');
