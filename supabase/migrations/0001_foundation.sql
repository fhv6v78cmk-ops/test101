create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'member');
create type public.job_status as enum ('created', 'uploading', 'processing', 'review_required', 'ready_for_approval', 'approved', 'generating', 'completed', 'failed');
create type public.document_kind as enum ('source_pdf', 'template_xlsm', 'generated_xlsm');

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organisation_users (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);

create table public.calculator_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  name text not null,
  version integer not null,
  storage_path text not null,
  vba_project_sha256 text not null,
  template_config jsonb not null,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organisation_id, name, version)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  status public.job_status not null default 'created',
  template_id uuid references public.calculator_templates(id),
  error_code text,
  error_message text,
  validation_summary jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  kind public.document_kind not null default 'source_pdf',
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  sha256 text not null,
  byte_size bigint not null,
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now()
);

create table public.statements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  source_document_id uuid not null references public.documents(id),
  source_page integer not null check (source_page > 0),
  original_extraction jsonb not null,
  reviewed_extraction jsonb,
  validation_results jsonb not null default '[]'::jsonb,
  review_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, source_document_id, source_page)
);

create table public.generated_outputs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  template_id uuid not null references public.calculator_templates(id),
  storage_bucket text not null default 'generated-calculators',
  storage_path text not null,
  sha256 text not null,
  vba_project_sha256 text not null,
  verification_results jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_organisation_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organisation_id
  from public.organisation_users
  where user_id = auth.uid()
$$;

create or replace function public.is_org_admin(target_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organisation_users
    where organisation_id = target_organisation_id
      and user_id = auth.uid()
      and role = 'admin'
  )
$$;

alter table public.organisations enable row level security;
alter table public.organisation_users enable row level security;
alter table public.jobs enable row level security;
alter table public.documents enable row level security;
alter table public.statements enable row level security;
alter table public.generated_outputs enable row level security;
alter table public.audit_events enable row level security;
alter table public.calculator_templates enable row level security;

create policy "organisation members can read organisations"
on public.organisations for select
using (id in (select public.current_user_organisation_ids()));

create policy "organisation members can read users"
on public.organisation_users for select
using (organisation_id in (select public.current_user_organisation_ids()));

create policy "organisation members can manage jobs"
on public.jobs for all
using (organisation_id in (select public.current_user_organisation_ids()))
with check (organisation_id in (select public.current_user_organisation_ids()));

create policy "organisation members can manage documents"
on public.documents for all
using (organisation_id in (select public.current_user_organisation_ids()))
with check (organisation_id in (select public.current_user_organisation_ids()));

create policy "organisation members can manage statements"
on public.statements for all
using (organisation_id in (select public.current_user_organisation_ids()))
with check (organisation_id in (select public.current_user_organisation_ids()));

create policy "organisation members can read generated outputs"
on public.generated_outputs for select
using (organisation_id in (select public.current_user_organisation_ids()));

create policy "organisation members can insert generated outputs"
on public.generated_outputs for insert
with check (organisation_id in (select public.current_user_organisation_ids()));

create policy "organisation members can read audit events"
on public.audit_events for select
using (organisation_id in (select public.current_user_organisation_ids()));

create policy "organisation members can insert audit events"
on public.audit_events for insert
with check (organisation_id in (select public.current_user_organisation_ids()));

create policy "organisation members can read templates"
on public.calculator_templates for select
using (organisation_id in (select public.current_user_organisation_ids()));

create policy "organisation admins can manage templates"
on public.calculator_templates for all
using (public.is_org_admin(organisation_id))
with check (public.is_org_admin(organisation_id));
