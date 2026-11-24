-- ======================================================================
-- Recordatorio semanal del Diario de Navegación
--  · Sábados a las 10:00 a. m. (hora de República Dominicana = 14:00 UTC)
--  · Solo al joven, a su propio correo, si tiene rutas activas sin revisar
--    esta semana. El correo no muestra el contenido de sus rutas.
--  · Menores de edad: solo si su tutor ya autorizó el uso de la app.
--  · El joven puede desactivarlo desde el Diario.
--  · Un solo correo por semana, aunque la tarea se ejecute dos veces.
-- La base de datos llama a la Edge Function "recordatorio-diario" con el
-- mismo secreto del Vault que usan los avisos de alertas (avisos_secreto).
-- ======================================================================

-- Preferencia del joven (activado por defecto)
alter table public.profiles add column recordatorios boolean not null default true;
grant update (recordatorios) on public.profiles to authenticated;

-- Registro de envíos (evita correos repetidos en la misma semana)
create table public.recordatorios_enviados (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  semana date not null,
  enviado_at timestamptz not null default now(),
  primary key (profile_id, semana)
);
alter table public.recordatorios_enviados enable row level security;
revoke all on public.recordatorios_enviados from anon, authenticated;

-- Quiénes deben recibir el recordatorio esta semana (solo para el servidor)
create function public.recordatorios_pendientes()
returns table (profile_id uuid, correo text, nombre text, rutas int)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, u.email::text, coalesce(nullif(trim(p.display_name), ''), ''), count(m.id)::int
  from public.profiles p
  join auth.users u on u.id = p.id
  join public.metas m on m.profile_id = p.id and m.estado = 'activa'
  where p.role = 'player'
    and p.recordatorios
    and u.email is not null
    -- Menores: solo con la autorización del tutor aceptada
    and (
      p.birth_date is null
      or p.birth_date <= (current_date - interval '18 years')
      or exists (select 1 from public.guardian_consents c where c.profile_id = p.id and c.estado = 'aceptado')
    )
    and not exists (
      select 1 from public.metas_revisiones r
      where r.meta_id = m.id and r.semana = public.semana_actual()
    )
    and not exists (
      select 1 from public.recordatorios_enviados e
      where e.profile_id = p.id and e.semana = public.semana_actual()
    )
  group by p.id, u.email, p.display_name
$$;
revoke execute on function public.recordatorios_pendientes() from public, anon, authenticated;
grant execute on function public.recordatorios_pendientes() to service_role;

create function public.marcar_recordatorios(p_ids uuid[])
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.recordatorios_enviados (profile_id, semana)
  select unnest(p_ids), public.semana_actual()
  on conflict do nothing
$$;
revoke execute on function public.marcar_recordatorios(uuid[]) from public, anon, authenticated;
grant execute on function public.marcar_recordatorios(uuid[]) to service_role;

-- Pide a la Edge Function que envíe los recordatorios
create function public.pedir_recordatorios()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_url text;
  v_secreto text;
begin
  select replace(decrypted_secret, 'avisar-alerta', 'recordatorio-diario') into v_url
  from vault.decrypted_secrets where name = 'avisos_url';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'avisos_secreto';
  if v_url is null or v_secreto is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso-secreto', v_secreto),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;
revoke execute on function public.pedir_recordatorios() from public, anon, authenticated;

-- Tarea programada: sábados 14:00 UTC = 10:00 a. m. en República Dominicana
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('recordatorio-diario-sabado', '0 14 * * 6', 'select public.pedir_recordatorios()');
