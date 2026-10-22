-- O'Run 1.0. Run on a dedicated EU Supabase project, never on an unrelated app.
-- Source schema: generate a migration with `supabase migration new orun_initial`
-- then copy this file into the CLI-generated migration and deploy with db push.
begin;
create schema if not exists orun_private;
revoke all on schema orun_private from public, anon;
create table orun_private.rooms (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 document jsonb not null, version bigint not null default 0,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '90 days'
);
create index orun_rooms_owner on orun_private.rooms(owner_id);
create index orun_rooms_expiry on orun_private.rooms(expires_at);
create table public.orun_members (
 room_id uuid not null references orun_private.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('teacher','departure','arrival')),
 primary key(room_id,user_id)
);
create index orun_members_user on public.orun_members(user_id,room_id);
create table public.orun_notifications (
 room_id uuid primary key references orun_private.rooms(id) on delete cascade, version bigint not null default 0
);
create table orun_private.receipts (
 room_id uuid not null references orun_private.rooms(id) on delete cascade,
 operation_id text not null, actor uuid not null, kind text not null, recorded_at timestamptz not null default now(),
 primary key(room_id,operation_id)
);
alter table orun_private.rooms enable row level security;
alter table orun_private.receipts enable row level security;
alter table public.orun_members enable row level security;
alter table public.orun_notifications enable row level security;
revoke all on all tables in schema orun_private from public,anon,authenticated;
revoke all on public.orun_members,public.orun_notifications from public,anon,authenticated;
grant select on public.orun_members,public.orun_notifications to authenticated;
create policy own_membership on public.orun_members for select to authenticated using(user_id=(select auth.uid()));
create policy permitted_notifications on public.orun_notifications for select to authenticated using(exists(select 1 from public.orun_members m where m.room_id=orun_notifications.room_id and m.user_id=(select auth.uid())));

create function orun_private.member_role(rid uuid) returns text language plpgsql security definer set search_path='' as $$
declare result text;
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 select m.role into result from public.orun_members m join orun_private.rooms r on r.id=m.room_id where m.room_id=rid and m.user_id=auth.uid() and r.expires_at>now();
 if result is null then raise exception 'Accès refusé ou espace expiré'; end if;
 return result;
end $$;

create function orun_private.validate_document(d jsonb) returns void language plpgsql set search_path='' as $$
declare c jsonb;ss jsonb;st jsonb;
begin
 if (d->>'schema')::int is distinct from 1 or jsonb_typeof(d->'students') is distinct from 'array' or jsonb_typeof(d->'courses') is distinct from 'array' or jsonb_typeof(d->'sessions') is distinct from 'array' or jsonb_typeof(d->'runs') is distinct from 'array' or jsonb_typeof(d->'sequences') is distinct from 'array' then raise exception 'Document invalide'; end if;
 if jsonb_array_length(d->'sessions')<>1 then raise exception 'Un espace partagé contient une seule séance'; end if;
 if octet_length(d::text)>20000000 then raise exception 'Espace trop volumineux'; end if;
 if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(d->'students') x) or (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(d->'courses') x) then raise exception 'Identifiants en doublon'; end if;
 for st in select value from jsonb_array_elements(d->'students') loop
  if coalesce(length(trim(st->>'firstName')),0)=0 or coalesce(length(trim(st->>'lastName')),0)=0 or coalesce(length(trim(st->>'className')),0)=0 then raise exception 'Élève incomplet'; end if;
 end loop;
 for c in select value from jsonb_array_elements(d->'courses') loop
  if not coalesce((c->>'distance')::numeric>0 and (c->>'controls')::int>0 and (c->>'penalty')::numeric>=0 and length(trim(c->>'name'))>0,false) then raise exception 'Parcours invalide'; end if;
  if jsonb_array_length(c->'rubric'->'thresholds')<>3 or jsonb_array_length(c->'rubric'->'maxErrors')<>3 or not coalesce((c->'rubric'->'thresholds'->>0)::numeric>0 and (c->'rubric'->'thresholds'->>1)::numeric>=(c->'rubric'->'thresholds'->>0)::numeric and (c->'rubric'->'thresholds'->>2)::numeric>=(c->'rubric'->'thresholds'->>1)::numeric,false) then raise exception 'Barème invalide'; end if;
 end loop;
 ss=d->'sessions'->0;
 if exists(select 1 from jsonb_array_elements_text(ss->'studentIds') x where not exists(select 1 from jsonb_array_elements(d->'students') stu_item where stu_item->>'id'=x)) or exists(select 1 from jsonb_array_elements_text(ss->'courseIds') x where not exists(select 1 from jsonb_array_elements(d->'courses') course_item where course_item->>'id'=x)) then raise exception 'Référence de séance invalide'; end if;
end $$;

create function orun_private.snapshot(rid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_role text;d jsonb;v bigint;
begin
 actor_role=orun_private.member_role(rid);
 select document,version into d,v from orun_private.rooms where id=rid;
 if actor_role<>'teacher' then
  select jsonb_set(d,'{students}',coalesce(jsonb_agg(jsonb_build_object('id',st->>'id','firstName',st->>'firstName','lastName','','className',st->>'className','label',base||case when cnt>1 then ' '||rn::text else '' end) order by ord),'[]'::jsonb)) into d
  from (select st,ord,st->>'firstName'||' '||upper(left(st->>'lastName',1))||'.' as base,count(*) over(partition by st->>'firstName',upper(left(st->>'lastName',1))) as cnt,row_number() over(partition by st->>'firstName',upper(left(st->>'lastName',1)) order by ord) as rn from jsonb_array_elements(d->'students') with ordinality as pupils(st,ord)) labels;
  d=jsonb_set(d,'{audit}','[]'::jsonb);
 end if;
 return jsonb_build_object('document',d,'role',actor_role,'version',v,'server_time',floor(extract(epoch from clock_timestamp())*1000));
end $$;

create function orun_private.create_room(initial_document jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid;d jsonb;
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 perform orun_private.validate_document(initial_document);
 d=jsonb_set(jsonb_set(initial_document,'{applied}','[]'),'{audit}','[]');
 d=jsonb_set(d,'{version}','0');
 insert into orun_private.rooms(owner_id,document) values(auth.uid(),d) returning id into rid;
 insert into public.orun_members values(rid,auth.uid(),'teacher');
 insert into public.orun_notifications values(rid,0);
 return rid;
end $$;

create function orun_private.grant_member(rid uuid,mid uuid,mrole text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from orun_private.rooms where id=rid and owner_id=auth.uid() and expires_at>now()) then raise exception 'Propriétaire requis'; end if;
 if mrole not in ('teacher','departure','arrival') then raise exception 'Rôle invalide'; end if;
 if mid=auth.uid() and mrole<>'teacher' then raise exception 'Le propriétaire conserve ses droits'; end if;
 insert into public.orun_members(room_id,user_id,role) values(rid,mid,mrole) on conflict(room_id,user_id) do update set role=excluded.role;
end $$;

create function orun_private.apply_command(rid uuid,cmd jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_role text;d jsonb;v bigint;k text;op text;t numeric;ct numeric;course jsonb;ss jsonb;pupil jsonb;r jsonb;run_index int;pauses jsonb;pause_count int;is_paused boolean;stop_at numeric;i int;idx int;details text;replacement jsonb;run_id text;class_name text;removed_students jsonb;removed_runs jsonb;removed_courses jsonb;
begin
 actor_role=orun_private.member_role(rid); k=cmd->>'kind';op=cmd->>'id';t=(cmd->>'at')::numeric;ct=extract(epoch from clock_timestamp())*1000;
 if actor_role<>'teacher' and not (actor_role='departure' and k='start') and not (actor_role='arrival' and k in ('pause','resume','stop')) then raise exception 'Action non autorisée pour ce compte'; end if;
 if k not in ('start','pause','resume','stop','reopen','correct','level','config','purge','deleteClass') or op is null or length(op)>100 or t is null or t<=0 or t>ct+5000 or t<ct-86400000 then raise exception 'Commande ou horloge invalide'; end if;
 select document,version into d,v from orun_private.rooms where id=rid for update;
 -- Row lock precedes the receipt check, making retries and concurrent starts atomic.
 if exists(select 1 from orun_private.receipts where room_id=rid and operation_id=op) then return orun_private.snapshot(rid); end if;
 if k='start' then
  select value into ss from jsonb_array_elements(d->'sessions') where value->>'id'=cmd->>'sessionId';
  select value into course from jsonb_array_elements(d->'courses') where value->>'id'=cmd->>'courseId';
  if ss is null or course is null or not(ss->'courseIds' ? (course->>'id')) or jsonb_array_length(cmd->'students')<1 or jsonb_array_length(cmd->'students')<>jsonb_array_length(cmd->'runIds') then raise exception 'Départ invalide'; end if;
  if (select count(*)<>count(distinct value) from jsonb_array_elements_text(cmd->'students')) then raise exception 'Élève en double'; end if;
  for i in 0..jsonb_array_length(cmd->'students')-1 loop
   if not(ss->'studentIds' ? (cmd->'students'->>i)) then raise exception 'Élève absent de la séance'; end if;
   if exists(select 1 from jsonb_array_elements(d->'runs') x where x->>'studentId'=cmd->'students'->>i and not(x?'end')) then raise exception 'Élève déjà en course'; end if;
   run_id=cmd->'runIds'->>i;
   if run_id is null or exists(select 1 from jsonb_array_elements(d->'runs') x where x->>'id'=run_id) then raise exception 'Identifiant de passage utilisé'; end if;
   r=jsonb_build_object('id',run_id,'studentId',cmd->'students'->>i,'sessionId',ss->>'id','courseId',course->>'id','courseSnapshot',course,'start',t,'pauses','[]'::jsonb,'errors',null,'manualLevel',null,'revision',0);
   d=jsonb_set(d,'{runs}',(d->'runs')||jsonb_build_array(r));
  end loop;
  details=jsonb_array_length(cmd->'students')||' départ(s) · '||(course->>'name');
 elsif k='config' then
  if (cmd->>'baseVersion')::bigint is distinct from v then raise exception 'Configuration modifiée sur un autre poste : réconciliation requise'; end if;
  replacement=d||jsonb_build_object('students',cmd->'students','sequences',cmd->'sequences','sessions',cmd->'sessions','courses',cmd->'courses');
  perform orun_private.validate_document(replacement);
  if exists(select 1 from jsonb_array_elements(d->'runs') x where not exists(select 1 from jsonb_array_elements(cmd->'students') st where st->>'id'=x->>'studentId') or not exists(select 1 from jsonb_array_elements(cmd->'sessions') session_item where session_item->>'id'=x->>'sessionId')) then raise exception 'Des passages font encore référence à ces données'; end if;
  d=replacement;details=coalesce(cmd->>'detail','Configuration modifiée');
 elsif k='deleteClass' then
  if (cmd->>'baseVersion')::bigint is distinct from v then raise exception 'La classe a changé sur un autre poste'; end if;
  class_name=cmd->>'className';
  if class_name is null or not (exists(select 1 from jsonb_array_elements(d->'students') x where x->>'className'=class_name) or exists(select 1 from jsonb_array_elements(d->'sequences') x where x->'classes' ? class_name)) then raise exception 'Classe introuvable'; end if;
  removed_students=coalesce((select jsonb_agg(x->>'id') from jsonb_array_elements(d->'students') x where x->>'className'=class_name),'[]'::jsonb);
  if exists(select 1 from jsonb_array_elements(d->'runs') x where removed_students ? (x->>'studentId') and not(x?'end')) then raise exception 'Arrêtez les chronos de cette classe avant de la supprimer'; end if;
  replacement=d;
  d=jsonb_set(d,'{students}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'students') x where x->>'className'<>class_name),'[]'::jsonb));
  d=jsonb_set(d,'{sequences}',coalesce((select jsonb_agg(jsonb_set(x,'{classes}',coalesce((select jsonb_agg(n) from jsonb_array_elements_text(x->'classes') n where n<>class_name),'[]'::jsonb))) from jsonb_array_elements(d->'sequences') x),'[]'::jsonb));
  d=jsonb_set(d,'{sessions}',coalesce((select jsonb_agg(jsonb_set(x,'{studentIds}',coalesce((select jsonb_agg(n) from jsonb_array_elements_text(x->'studentIds') n where not(removed_students ? n)),'[]'::jsonb))) from jsonb_array_elements(d->'sessions') x where (x->>'className' is not null and x->>'className'<>class_name) or (x->>'className' is null and (exists(select 1 from jsonb_array_elements_text(x->'studentIds') n where not(removed_students ? n)) or exists(select 1 from jsonb_array_elements(d->'sequences') q where q->>'id'=x->>'sequenceId' and jsonb_array_length(q->'classes')>0)))),'[]'::jsonb));
  removed_runs=coalesce((select jsonb_agg(x->>'id') from jsonb_array_elements(d->'runs') x where removed_students ? (x->>'studentId') or not exists(select 1 from jsonb_array_elements(d->'sessions') l where l->>'id'=x->>'sessionId')),'[]'::jsonb);
  removed_courses=coalesce((select jsonb_agg(c) from jsonb_array_elements(replacement->'sessions') l cross join lateral jsonb_array_elements_text(l->'courseIds') c where not exists(select 1 from jsonb_array_elements(d->'sessions') n where n->>'id'=l->>'id')),'[]'::jsonb);
  d=jsonb_set(d,'{runs}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'runs') x where not(removed_runs ? (x->>'id'))),'[]'::jsonb));
  d=jsonb_set(d,'{audit}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'audit') x where x->>'runId' is null or not(removed_runs ? (x->>'runId'))),'[]'::jsonb));
  d=jsonb_set(d,'{courses}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'courses') x where not(removed_courses ? (x->>'id')) or exists(select 1 from jsonb_array_elements(d->'sessions') l where l->'courseIds' ? (x->>'id'))),'[]'::jsonb));
  d=jsonb_set(d,'{sequences}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'sequences') x where jsonb_array_length(x->'classes')>0 or exists(select 1 from jsonb_array_elements(d->'sessions') l where l->>'sequenceId'=x->>'id')),'[]'::jsonb));
  details='Classe supprimée : '||class_name;
 elsif k='purge' then
  d=jsonb_set(d,'{runs}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'runs') x where x->>'sessionId'<>cmd->>'sessionId'),'[]'::jsonb));details='Résultats de la séance supprimés';
 else
  select value,(ordinality-1)::int into r,run_index from jsonb_array_elements(d->'runs') with ordinality where value->>'id'=cmd->>'runId';
  if r is null then raise exception 'Passage introuvable'; end if;
  pauses=r->'pauses';pause_count=jsonb_array_length(pauses);is_paused=pause_count>0 and not((pauses->(pause_count-1))?'end');
  if k in ('pause','resume','stop') then
   if k='stop' and r?'end' then return orun_private.snapshot(rid); end if;
   if r?'end' then raise exception 'Passage déjà terminé'; end if;
   stop_at=coalesce((pauses->(pause_count-1)->>'end')::numeric,(pauses->(pause_count-1)->>'start')::numeric,(r->>'start')::numeric);
   if t<(r->>'start')::numeric or t<stop_at then raise exception 'Chronologie incohérente'; end if;
  end if;
  if k='pause' then
   if is_paused then raise exception 'Chrono déjà en pause'; end if;
   r=jsonb_set(r,'{pauses}',pauses||jsonb_build_array(jsonb_build_object('start',t)));details='Chrono en pause';
  elsif k='resume' then
   if not is_paused then raise exception 'Chrono déjà actif'; end if;
   r=jsonb_set(r,array['pauses',(pause_count-1)::text,'end'],to_jsonb(t));details='Chrono repris';
  elsif k='stop' then
   if is_paused then r=jsonb_set(r,array['pauses',(pause_count-1)::text,'end'],to_jsonb(t));end if;
   r=jsonb_set(r,'{end}',to_jsonb(t));details='Arrivée enregistrée';
  elsif k='reopen' then
   if not(r?'end') or coalesce(length(trim(cmd->>'reason')),0)=0 then raise exception 'Arrivée et motif requis'; end if;
   if exists(select 1 from jsonb_array_elements(d->'runs') x where x->>'id'<>r->>'id' and x->>'studentId'=r->>'studentId' and not(x?'end')) then raise exception 'Un autre passage est actif'; end if;
   r=(r-'end')||jsonb_build_object('errors',null,'manualLevel',null);details='Arrivée annulée : '||(cmd->>'reason');
  elsif k in ('correct','level') then
   if not(r?'end') then raise exception 'Course non terminée'; end if;
   if (r->>'revision')::int is distinct from (cmd->>'expectedRevision')::int then raise exception 'Correction modifiée sur un autre poste'; end if;
   if k='correct' then
    if not coalesce((cmd->>'errors')::numeric=floor((cmd->>'errors')::numeric) and (cmd->>'errors')::int between 0 and (r->'courseSnapshot'->>'controls')::int,false) then raise exception 'Nombre de balises fausses invalide'; end if;
    details='Balises fausses : '||coalesce(r->>'errors','non corrigé')||' → '||(cmd->>'errors');r=jsonb_set(r,'{errors}',cmd->'errors');
   else
    if coalesce(length(trim(cmd->>'reason')),0)=0 or (cmd->>'level' is not null and cmd->>'level' not in ('1','2','3','4')) then raise exception 'Niveau ou motif invalide'; end if;
    r=jsonb_set(r,'{manualLevel}',coalesce(cmd->'level','null'::jsonb));details='Niveau manuel · '||(cmd->>'reason');
   end if;
  end if;
  r=jsonb_set(r,'{revision}',to_jsonb((r->>'revision')::int+1));d=jsonb_set(d,array['runs',run_index::text],r);
 end if;
 d=jsonb_set(d,'{version}',to_jsonb(v+1));d=jsonb_set(d,'{updatedAt}',to_jsonb(t));
 d=jsonb_set(d,'{applied}',(d->'applied')||jsonb_build_array(op));
 d=jsonb_set(d,'{audit}',(d->'audit')||jsonb_build_array(jsonb_build_object('id',op,'at',t,'action',k,'runId',cmd->>'runId','actor',auth.uid()::text,'detail',details)));
 insert into orun_private.receipts(room_id,operation_id,actor,kind) values(rid,op,auth.uid(),k);
 update orun_private.rooms set document=d,version=v+1 where id=rid;
 update public.orun_notifications set version=v+1 where room_id=rid;
 return orun_private.snapshot(rid);
end $$;

-- Only invoker wrappers live in the exposed public schema.
create function public.orun_snapshot(room_id uuid) returns jsonb language sql security invoker set search_path='' as $$select orun_private.snapshot(room_id)$$;
create function public.orun_create_room(initial_document jsonb) returns uuid language sql security invoker set search_path='' as $$select orun_private.create_room(initial_document)$$;
create function public.orun_apply(room_id uuid,command jsonb) returns jsonb language sql security invoker set search_path='' as $$select orun_private.apply_command(room_id,command)$$;
create function public.orun_grant(room_id uuid,member_id uuid,member_role text) returns void language sql security invoker set search_path='' as $$select orun_private.grant_member(room_id,member_id,member_role)$$;
revoke all on all functions in schema orun_private from public,anon,authenticated;
revoke all on function public.orun_snapshot(uuid),public.orun_create_room(jsonb),public.orun_apply(uuid,jsonb),public.orun_grant(uuid,uuid,text) from public,anon,authenticated;
grant usage on schema orun_private to authenticated;
grant execute on function orun_private.snapshot(uuid),orun_private.create_room(jsonb),orun_private.apply_command(uuid,jsonb),orun_private.grant_member(uuid,uuid,text) to authenticated;
grant execute on function public.orun_snapshot(uuid),public.orun_create_room(jsonb),public.orun_apply(uuid,jsonb),public.orun_grant(uuid,uuid,text) to authenticated;
-- Deletes full records, membership and receipts after the proposed retention duration.
-- Schedule from a trusted administrative job only, after the establishment approves the duration.
create function orun_private.purge_expired() returns bigint language plpgsql security definer set search_path='' as $$declare n bigint;begin delete from orun_private.rooms where expires_at<=now();get diagnostics n=row_count;return n;end$$;
revoke all on function orun_private.purge_expired() from public,anon,authenticated;
grant usage on schema orun_private to service_role;
grant execute on function orun_private.purge_expired() to service_role;
-- Publication may be absent in a local SQL test environment.
do $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.orun_notifications;end if;end$$;
commit;
