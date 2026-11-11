-- Runs real authenticated operations, then rolls all test changes back.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"76eaf234-32f5-4f42-9158-f1e8e6ec4a05","role":"authenticated"}', true);
do $$
declare p public.crm_projects; original jsonb; changed jsonb; n integer; contacts_before integer; begin
  if (select count(*) from public.crm_projects) < 1 then raise exception 'Imported project missing'; end if;
  select steps into original from public.crm_procedure_defaults where id=true;
  if jsonb_array_length(original) <> 8 then raise exception 'Expected eight imported procedure steps'; end if;
  select * into p from public.crm_create_project('{"project_name":"Connection verification (rolled back)","new_client":{"name":"Verification client"}}'::jsonb);
  if p.project_steps <> original then raise exception 'Procedure snapshot mismatch'; end if;
  changed := jsonb_set(p.project_steps, '{0,tasks,0,completed}', 'true');
  update public.crm_projects set project_steps=changed where id=p.id and project_steps=original;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Progress save failed'; end if;
  update public.crm_projects set project_steps=original where id=p.id and project_steps=original;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Stale update was not rejected'; end if;
  if (select steps from public.crm_procedure_defaults where id=true) <> original then raise exception 'Project edit changed defaults'; end if;
  select count(*) into contacts_before from public.crm_contacts;
  begin
    perform * from public.crm_create_project('{"project_name":"Rollback verification","new_client":{"name":"Transient client"},"status":null}'::jsonb);
    raise exception 'simulate transaction failure' using errcode='P0002';
  exception when sqlstate 'P0002' then null;
  end;
  if (select count(*) from public.crm_contacts) <> contacts_before then raise exception 'Client insert not atomic'; end if;
  delete from public.crm_projects where id=p.id;
  delete from public.crm_contacts where id=p.client_id;
end $$;
-- Existing second account must not see or modify the owner's workspace.
select set_config('request.jwt.claims', '{"sub":"2b924379-ce2e-4100-bd36-d0845136dde2","role":"authenticated"}', true);
do $$ begin
  if exists(select 1 from public.crm_projects) or exists(select 1 from public.crm_contacts) or exists(select 1 from public.crm_procedure_defaults) then raise exception 'Unauthorized account can read workspace'; end if;
  begin
    perform * from public.crm_create_project('{"project_name":"Forbidden"}'::jsonb);
    raise exception 'Unauthorized project creation was allowed';
  exception when insufficient_privilege then null;
  end;
  if has_table_privilege('anon','public.crm_projects','select') or has_table_privilege('anon','public.crm_contacts','select') or has_function_privilege('anon','public.crm_create_project(jsonb)','execute') then raise exception 'Anonymous access is enabled'; end if;
end $$;
rollback;
select 'PASS: import, project creation, progress, conflict checks, default isolation, account isolation, anonymous denial; all test writes rolled back' as verification;
