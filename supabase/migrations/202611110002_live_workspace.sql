-- Live CRM workspace for pqdremodels@gmail.com.
-- Keeps the uploaded backup and existing legacy tables unchanged.
begin;
do $$ begin
  if not exists (select 1 from auth.users where id = '76eaf234-32f5-4f42-9158-f1e8e6ec4a05' and email = 'pqdremodels@gmail.com') then
    raise exception 'Expected workspace owner was not found';
  end if;
end $$;
create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) > 0),
  email text, phone text, created_at timestamptz not null default now()
);
create table if not exists public.crm_procedure_defaults (
  id boolean primary key default true check (id), steps jsonb not null check (jsonb_typeof(steps) = 'array'),
  revision integer not null default 1
);
create table if not exists public.crm_projects (
  id uuid primary key default gen_random_uuid(), name text not null, project_name text not null,
  client_id uuid not null references public.crm_contacts(id), client_name text not null,
  type text, location text, address text, price text, status text default 'Ongoing', notes text,
  project_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(project_steps) = 'array'),
  created_at timestamptz not null default now()
);
alter table public.crm_contacts enable row level security;
alter table public.crm_procedure_defaults enable row level security;
alter table public.crm_projects enable row level security;
revoke all on public.crm_contacts, public.crm_procedure_defaults, public.crm_projects from public, anon, authenticated;
grant select, insert, update, delete on public.crm_contacts, public.crm_projects to authenticated;
grant select, update on public.crm_procedure_defaults to authenticated;
-- Re-running this file does not replace any live records.
do $$ declare t text; begin
  foreach t in array array['crm_contacts','crm_procedure_defaults','crm_projects'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='workspace_owner') then
      execute format('create policy workspace_owner on public.%I for all to authenticated using ((select auth.uid()) = %L::uuid) with check ((select auth.uid()) = %L::uuid)', t, '76eaf234-32f5-4f42-9158-f1e8e6ec4a05', '76eaf234-32f5-4f42-9158-f1e8e6ec4a05');
    end if;
  end loop;
end $$;
insert into public.crm_contacts(id,name,email,phone)
select id::uuid,name,email,phone from crm_local_import.client_contacts on conflict(id) do nothing;
insert into public.crm_procedure_defaults(id,steps,revision)
select id,steps,revision from crm_local_import.project_defaults on conflict(id) do nothing;
insert into public.crm_projects(id,name,project_name,client_id,client_name,type,location,address,price,status,notes,project_steps,created_at)
select id::uuid,project_name,project_name,client_id::uuid,client_name,project_type,location,address,price,status,notes,
coalesce(project_steps,'[]'::jsonb),coalesce((source_record->>'created_at')::timestamptz,now())
from crm_local_import.projects on conflict(id) do nothing;

-- Atomic creation: client and project either both save or neither saves.
create or replace function public.crm_create_project(project jsonb)
returns setof public.crm_projects language plpgsql security invoker set search_path = '' as $$
declare contact public.crm_contacts; procedure_steps jsonb; begin
  if auth.uid() is distinct from '76eaf234-32f5-4f42-9158-f1e8e6ec4a05'::uuid then
    raise exception 'This account does not have access to the CRM workspace' using errcode='42501';
  end if;
  if nullif(trim(project->>'project_name'),'') is null then raise exception 'Project name is required'; end if;
  if project ? 'new_client' then
    insert into public.crm_contacts(name,email,phone)
    values(trim(project->'new_client'->>'name'),project->'new_client'->>'email',project->'new_client'->>'phone') returning * into contact;
  else
    select * into contact from public.crm_contacts where id=(project->>'client_id')::uuid;
    if not found then raise exception 'Choose an existing client or create a new one'; end if;
  end if;
  select steps into procedure_steps from public.crm_procedure_defaults where id=true;
  if not found then raise exception 'Project procedure is not configured'; end if;
  return query insert into public.crm_projects(name,project_name,client_id,client_name,type,location,address,price,status,project_steps)
    values(trim(project->>'project_name'),trim(project->>'project_name'),contact.id,contact.name,project->>'type',project->>'location',project->>'address',project->>'price',coalesce(project->>'status','Ongoing'),procedure_steps)
    returning *;
end $$;
revoke all on function public.crm_create_project(jsonb) from public, anon;
grant execute on function public.crm_create_project(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
select (select count(*) from public.crm_projects) as projects,
       (select count(*) from public.crm_contacts) as clients,
       (select count(*) from public.crm_procedure_defaults) as procedures;
