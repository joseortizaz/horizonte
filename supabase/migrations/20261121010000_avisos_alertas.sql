-- Aviso inmediato por correo cuando se crea una alerta de riesgo alto.
-- La base de datos llama a la Edge Function "avisar-alerta", que envía el correo.
--
-- Requiere (una sola vez, desde el SQL Editor de Supabase, NO en este archivo):
--   select vault.create_secret('https://TU_PROJECT_REF.supabase.co/functions/v1/avisar-alerta', 'avisos_url');
--   select vault.create_secret('UNA_CLAVE_LARGA_Y_ALEATORIA', 'avisos_secreto');

create extension if not exists pg_net with schema extensions;

-- Correos de quienes deben recibir el aviso: orientadores del grupo y administradores.
-- Solo la puede usar el servidor (service_role), nunca la app.
create function public.destinatarios_alerta(p_alerta uuid)
returns table (correo text, nombre text)
language sql
stable
security definer set search_path = ''
as $$
  select distinct u.email::text, coalesce(p.display_name, '')
  from public.riesgo_alertas a
  join public.profiles j on j.id = a.profile_id
  join public.profiles p on (
    p.role = 'admin'
    or exists (
      select 1 from public.grupo_orientadores o
      where o.grupo_id = j.grupo_id and o.profile_id = p.id
    )
  )
  join auth.users u on u.id = p.id
  where a.id = p_alerta and u.email is not null
$$;

revoke execute on function public.destinatarios_alerta(uuid) from public, anon, authenticated;
grant execute on function public.destinatarios_alerta(uuid) to service_role;

-- Datos mínimos de la alerta para el correo (sin nombre ni texto del joven)
create function public.resumen_alerta(p_alerta uuid)
returns table (nivel text, categoria text, grupo text)
language sql
stable
security definer set search_path = ''
as $$
  select a.nivel, a.categoria, g.nombre || ' · ' || g.centro
  from public.riesgo_alertas a
  join public.profiles j on j.id = a.profile_id
  left join public.grupos g on g.id = j.grupo_id
  where a.id = p_alerta
$$;

revoke execute on function public.resumen_alerta(uuid) from public, anon, authenticated;
grant execute on function public.resumen_alerta(uuid) to service_role;

-- Al crear una alerta de riesgo alto, pedir el aviso
create function public.avisar_alerta_alta()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_url text;
  v_secreto text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'avisos_url';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'avisos_secreto';

  -- Si los avisos no están configurados, la alerta se guarda igual
  if v_url is null or v_secreto is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso-secreto', v_secreto),
    body := jsonb_build_object('alerta_id', new.id)
  );
  return new;
exception when others then
  -- Un fallo del aviso nunca debe impedir que se guarde la alerta
  return new;
end;
$$;

create trigger aviso_alerta_alta
  after insert on public.riesgo_alertas
  for each row
  when (new.nivel = 'alto')
  execute function public.avisar_alerta_alta();
