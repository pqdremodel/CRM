-- PQD CRM: upload browser data using the Supabase SQL Editor.
-- Replace ONLY the JSON between $pqd_local_backup$ markers with the exported JSON.
-- This imports into an isolated schema; it does not overwrite existing app tables,
-- grant browser access, create authentication accounts, or switch the app online.
-- The complete original export is retained, including local profiles and backups.
begin;

create schema if not exists crm_local_import;
revoke all on schema crm_local_import from public, anon, authenticated;

create table if not exists crm_local_import.workspace_backups (
    id bigint generated always as identity primary key,
    imported_at timestamptz not null default now(),
    payload jsonb not null
);
create table if not exists crm_local_import.projects (
    id text primary key,
    project_name text,
    client_id text,
    client_name text,
    address text,
    location text,
    price text,
    project_type text,
    status text,
    notes text,
    project_steps jsonb,
    source_record jsonb not null,
    backup_id bigint not null references crm_local_import.workspace_backups(id)
);
create table if not exists crm_local_import.client_contacts (
    id text primary key,
    name text,
    email text,
    phone text,
    source_record jsonb not null,
    backup_id bigint not null references crm_local_import.workspace_backups(id)
);
create table if not exists crm_local_import.project_defaults (
    id boolean primary key default true check (id),
    steps jsonb not null check (jsonb_typeof(steps) = 'array'),
    revision integer not null,
    source_record jsonb not null,
    backup_id bigint not null references crm_local_import.workspace_backups(id)
);

alter table crm_local_import.workspace_backups enable row level security;
alter table crm_local_import.projects enable row level security;
alter table crm_local_import.client_contacts enable row level security;
alter table crm_local_import.project_defaults enable row level security;
revoke all on all tables in schema crm_local_import from public, anon, authenticated;
revoke all on all sequences in schema crm_local_import from public, anon, authenticated;

-- Run as the SQL Editor's database administrator role.
do $pqd_import$
declare
    workspace jsonb := $pqd_local_backup$
{"REPLACE_THIS_WITH_YOUR_EXPORTED_LOCAL_DATA": true}
$pqd_local_backup$::jsonb;
    backup bigint;
    item jsonb;
begin
    if jsonb_typeof(workspace) is distinct from 'object'
       or jsonb_typeof(workspace->'clients') is distinct from 'array'
       or jsonb_typeof(workspace->'project_defaults') is distinct from 'array' then
        raise exception 'Paste the exported pqd-crm-local-v1 JSON between the backup markers first. No import was committed.';
    end if;
    if workspace ? 'client_contacts' and jsonb_typeof(workspace->'client_contacts') is distinct from 'array' then
        raise exception 'client_contacts must be an array.';
    end if;
    insert into crm_local_import.workspace_backups(payload) values(workspace) returning id into backup;

    for item in select value from jsonb_array_elements(coalesce(workspace->'client_contacts', '[]'::jsonb)) loop
        if nullif(item->>'id', '') is null then raise exception 'A client is missing its ID.'; end if;
        insert into crm_local_import.client_contacts(id,name,email,phone,source_record,backup_id)
        values(item->>'id',item->>'name',item->>'email',item->>'phone',item,backup)
        on conflict(id) do update set name=excluded.name,email=excluded.email,phone=excluded.phone,
            source_record=excluded.source_record,backup_id=excluded.backup_id;
    end loop;

    for item in select value from jsonb_array_elements(workspace->'clients') loop
        if nullif(item->>'id', '') is null then raise exception 'A project is missing its ID.'; end if;
        if item ? 'project_steps' and jsonb_typeof(item->'project_steps') not in ('array','null') then
            raise exception 'Invalid procedure for project %.', item->>'id';
        end if;
        insert into crm_local_import.projects(id,project_name,client_id,client_name,address,location,price,
            project_type,status,notes,project_steps,source_record,backup_id)
        values(item->>'id',coalesce(item->>'project_name',item->>'name'),item->>'client_id',item->>'client_name',
            item->>'address',item->>'location',item->>'price',item->>'type',item->>'status',item->>'notes',
            item->'project_steps',item,backup)
        on conflict(id) do update set project_name=excluded.project_name,client_id=excluded.client_id,
            client_name=excluded.client_name,address=excluded.address,location=excluded.location,price=excluded.price,
            project_type=excluded.project_type,status=excluded.status,notes=excluded.notes,
            project_steps=excluded.project_steps,source_record=excluded.source_record,backup_id=excluded.backup_id;
    end loop;

    if jsonb_array_length(workspace->'project_defaults') <> 1 then
        raise exception 'Expected one default procedure. No import was committed.';
    end if;
    item := workspace->'project_defaults'->0;
    insert into crm_local_import.project_defaults(id,steps,revision,source_record,backup_id)
    values(true,item->'steps',coalesce((item->>'revision')::integer,1),item,backup)
    on conflict(id) do update set steps=excluded.steps,revision=excluded.revision,
        source_record=excluded.source_record,backup_id=excluded.backup_id;
end;
$pqd_import$;
commit;

-- Counts for the most recent upload. The raw JSON backup also preserves any
-- other local fields, profile data, template versions, and defaultBackups.
select b.id as backup_id, b.imported_at,
    (select count(*) from crm_local_import.projects p where p.backup_id=b.id) as projects_uploaded,
    (select count(*) from crm_local_import.client_contacts c where c.backup_id=b.id) as clients_uploaded,
    (select count(*) from crm_local_import.project_defaults d where d.backup_id=b.id) as procedures_uploaded
from crm_local_import.workspace_backups b order by b.id desc limit 1;
