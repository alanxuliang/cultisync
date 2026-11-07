-- Run with execute_sql / psql against an isolated project; all changes roll back.
begin;
select set_config('test.a',gen_random_uuid()::text,true), set_config('test.b',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('test.a')::uuid),(current_setting('test.b')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
insert into public.profiles(id,terms_version,location_service_consent) values(auth.uid(),'beta-2026-09-17',true);
insert into public.fields(name,boundary) values('Test A','{"type":"Polygon","coordinates":[[[-122.350,38.420],[-122.348,38.420],[-122.348,38.422],[-122.350,38.422],[-122.350,38.420]]]}');
select set_config('test.field',(select id::text from public.fields limit 1),true);
do $$ begin
  if not exists(select 1 from public.fields where area_ha between 3.7 and 4.1) then raise exception 'Area units incorrect'; end if;
  if has_table_privilege('authenticated','public.fields','TRUNCATE') then raise exception 'Unsafe TRUNCATE grant'; end if;
  if has_column_privilege('authenticated','public.fields','owner_id','INSERT') then raise exception 'Unsafe owner grant'; end if;
  if has_table_privilege('authenticated','public.field_snapshots','INSERT') then raise exception 'Unsafe snapshot grant'; end if;
  begin
    insert into public.fields(name,boundary) values('Invalid','{"type":"Polygon","coordinates":[[[-122.35,38.42],[-122.348,38.422],[-122.348,38.42],[-122.35,38.422],[-122.35,38.42]]]}');
    raise exception using errcode='ZX001',message='Self-intersection accepted';
  exception when raise_exception then null;
  end;
end $$;
insert into public.fields(name,boundary) select 'Test B',boundary from public.fields limit 1;
insert into public.fields(name,boundary) select 'Test C',boundary from public.fields limit 1;
do $$ begin
  begin
    insert into public.fields(name,boundary) select 'Fourth field',boundary from public.fields limit 1;
    raise exception using errcode='ZX001',message='Field limit failed';
  exception when raise_exception then null;
  end;
end $$;
insert into public.feedback(message) values('Disposable acceptance test feedback');
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
do $$ declare deleted integer; begin
  if exists(select 1 from public.fields) or exists(select 1 from public.feedback) then raise exception 'Cross-owner read'; end if;
  delete from public.fields where id=current_setting('test.field')::uuid;
  get diagnostics deleted=row_count;
  if deleted<>0 then raise exception 'Cross-owner delete'; end if;
  begin
    insert into public.profiles(id,terms_version,location_service_consent) values(current_setting('test.a')::uuid,'beta-2026-09-17',true);
    raise exception using errcode='ZX001',message='Spoofed profile accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
insert into public.field_snapshots(field_id,payload) values(current_setting('test.field')::uuid,'{}');
select public.claim_field_refresh(current_setting('test.field')::uuid) as first_claim;
do $$ begin
  if public.claim_field_refresh(current_setting('test.field')::uuid) then raise exception 'Refresh cooldown failed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
delete from public.fields where id=current_setting('test.field')::uuid;
reset role;
do $$ begin
  if exists(select 1 from public.field_snapshots where field_id=current_setting('test.field')::uuid)
    or exists(select 1 from private.refresh_attempts where field_id=current_setting('test.field')::uuid)
  then raise exception 'Cascade deletion failed'; end if;
end $$;
-- Account cap: fill to 100 profiles as the service; then a 101st consent, made as an authenticated
-- user exactly like the app's Consent form (so RLS applies), must fail with the capacity message.
do $$ declare missing integer; begin
  missing := 100 - (select count(*) from public.profiles);
  if missing > 0 then
    insert into auth.users(id) select gen_random_uuid() from generate_series(1, missing);
    insert into public.profiles(id, terms_version, location_service_consent)
      select u.id, 'beta-2026-09-17', true from auth.users u
      where not exists (select 1 from public.profiles p where p.id = u.id) limit missing;
  end if;
end $$;
select set_config('test.c',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('test.c')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
do $$ begin
  begin
    insert into public.profiles(id,terms_version,location_service_consent) values(auth.uid(),'beta-2026-09-17',true);
    raise exception using errcode='ZX001', message='Account cap failed';
  exception when raise_exception then
    -- Only the cap's own message counts; the UI matches on it.
    if sqlerrm <> 'CultiSync is at capacity' then raise; end if;
  end;
end $$;
reset role;
select 'PASS: ownership, column grants, area, invalid geometry, field cap, refresh cooldown, cascade deletion, account cap' as result;
rollback;
