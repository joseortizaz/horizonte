-- ======================================================================
-- Contacto y seguimiento ante alertas de riesgo
--  · Teléfono del tutor en la autorización (obligatorio para menores)
--  · Contacto de confianza opcional para mayores de 18
--  · Categoría de cada alerta (suicidio, autolesión, abuso, desesperanza)
--  · Ficha de contacto en las alertas (solo para quien las recibe)
--  · Registro de acciones de seguimiento
--  · Mensajes de acompañamiento predefinidos dentro de la app
-- ======================================================================

-- 1. Teléfono del tutor
alter table public.guardian_consents add column tutor_telefono text;
alter table public.guardian_consents alter column terminos_version set default '2026-11-borrador-2';

drop function public.responder_consentimiento(text, text, text, boolean);

create function public.responder_consentimiento(
  p_token text,
  p_nombre text,
  p_relacion text,
  p_telefono text,
  p_acepta boolean
)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_estado text;
  v_telefono text := regexp_replace(coalesce(p_telefono, ''), '[^0-9+]', '', 'g');
begin
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre de quien autoriza';
  end if;
  if p_acepta and length(regexp_replace(v_telefono, '[^0-9]', '', 'g')) < 10 then
    raise exception 'Falta un teléfono de contacto válido';
  end if;

  update public.guardian_consents
  set estado = case when p_acepta then 'aceptado' else 'rechazado' end,
      tutor_nombre = left(trim(p_nombre), 120),
      tutor_relacion = left(coalesce(p_relacion, ''), 40),
      tutor_telefono = nullif(left(v_telefono, 20), ''),
      terminos_version = '2026-11-borrador-2',
      respondido_en = now()
  where token = p_token and estado = 'pendiente'
  returning estado into v_estado;

  if v_estado is null then
    raise exception 'El enlace no es válido o ya fue utilizado';
  end if;

  return v_estado;
end;
$$;

grant execute on function public.responder_consentimiento(text, text, text, text, boolean) to anon, authenticated;

-- 2. Contacto de confianza (mayores de 18, opcional)
alter table public.profiles add column contacto_nombre text;
alter table public.profiles add column contacto_telefono text;
grant update (display_name, birth_date, contacto_nombre, contacto_telefono) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  nacimiento date;
  v_grupo uuid;
begin
  nacimiento := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;

  if nacimiento is null then
    raise exception 'Se requiere la fecha de nacimiento';
  end if;

  if nacimiento > (current_date - interval '15 years') then
    raise exception 'Horizonte es para personas de 15 años en adelante';
  end if;

  select g.id into v_grupo
  from public.grupos g
  where g.codigo = upper(trim(coalesce(new.raw_user_meta_data ->> 'codigo_grupo', '')));

  insert into public.profiles (id, display_name, birth_date, grupo_id, contacto_nombre, contacto_telefono)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nacimiento,
    v_grupo,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'contacto_nombre', '')), 120), ''),
    nullif(left(regexp_replace(coalesce(new.raw_user_meta_data ->> 'contacto_telefono', ''), '[^0-9+]', '', 'g'), 20), '')
  );

  return new;
end;
$$;

-- 3. Categoría de las alertas
alter table public.riesgo_alertas add column categoria text;

-- Devuelve el nivel y la categoría más importante encontrada.
-- Prioridad: abuso > suicidio > autolesión > desesperanza.
create function public.clasificar_riesgo_detalle(p_texto text)
returns table (nivel text, categoria text)
language sql
stable
security definer set search_path = ''
as $$
  with normal as (
    select lower(translate(coalesce(p_texto, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')) as t
  )
  select p.nivel, p.categoria
  from public.riesgo_patrones p, normal n
  where p.activo and n.t ~ p.patron
  order by
    (p.nivel = 'alto') desc,
    case p.categoria when 'abuso' then 1 when 'suicidio' then 2 when 'autolesion' then 3 else 4 end
  limit 1
$$;

revoke execute on function public.clasificar_riesgo_detalle(text) from public, anon, authenticated;

create or replace function public.guardar_nota(p_seccion text, p_texto text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_texto text := left(coalesce(p_texto, ''), 2000);
  v_nivel text;
  v_categoria text;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;

  insert into public.bitacora_notas (profile_id, seccion, texto, updated_at)
  values (auth.uid(), left(p_seccion, 40), v_texto, now())
  on conflict (profile_id, seccion)
  do update set texto = excluded.texto, updated_at = now();

  select d.nivel, d.categoria into v_nivel, v_categoria
  from public.clasificar_riesgo_detalle(v_texto) d;

  if v_nivel is null then
    return 'ninguno';
  end if;

  insert into public.riesgo_alertas (profile_id, origen, nivel, categoria, texto)
  values (auth.uid(), 'bitacora:' || left(p_seccion, 40), v_nivel, v_categoria, v_texto);

  return v_nivel;
end;
$$;

-- 4. Registro de acciones de seguimiento
create table public.riesgo_acciones (
  id uuid primary key default gen_random_uuid(),
  alerta_id uuid not null references public.riesgo_alertas(id) on delete cascade,
  autor uuid references public.profiles(id) on delete set null,
  tipo text not null check (tipo in (
    'contacto_joven', 'contacto_tutor', 'contacto_confianza', 'mensaje_app',
    'referimiento', 'ruta_proteccion', 'otro'
  )),
  detalle text,
  created_at timestamptz not null default now()
);

alter table public.riesgo_acciones enable row level security;
revoke all on public.riesgo_acciones from anon, authenticated;

-- ¿Puede el usuario actual gestionar esta alerta?
create function public.puede_ver_alerta(p_alerta uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select public.es_admin() or exists (
    select 1
    from public.riesgo_alertas a
    join public.profiles p on p.id = a.profile_id
    join public.grupo_orientadores o on o.grupo_id = p.grupo_id
    where a.id = p_alerta and o.profile_id = auth.uid()
  )
$$;

revoke execute on function public.puede_ver_alerta(uuid) from public, anon, authenticated;

create function public.registrar_accion(p_alerta uuid, p_tipo text, p_detalle text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.puede_ver_alerta(p_alerta) then
    raise exception 'No tienes acceso a esta alerta';
  end if;
  insert into public.riesgo_acciones (alerta_id, autor, tipo, detalle)
  values (p_alerta, auth.uid(), p_tipo, left(coalesce(p_detalle, ''), 1000));
end;
$$;

grant execute on function public.registrar_accion(uuid, text, text) to authenticated;

-- 5. Mensajes de acompañamiento (predefinidos; no es un chat)
create table public.mensajes_acompanamiento (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  autor uuid references public.profiles(id) on delete set null,
  alerta_id uuid references public.riesgo_alertas(id) on delete set null,
  plantilla int not null,
  leido_en timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mensajes_acompanamiento enable row level security;
revoke all on public.mensajes_acompanamiento from anon, authenticated;

-- Los textos viven en el servidor: el orientador solo elige cuál enviar
create function public.texto_mensaje(p_plantilla int)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_plantilla
    when 1 then 'Me gustaría conversar contigo. ¿Podemos vernos mañana en el centro?'
    when 2 then 'Quería saber cómo estás. Cuando puedas, búscame para conversar un rato.'
    when 3 then 'Estoy aquí si necesitas hablar. Puedes buscarme cuando quieras.'
  end
$$;

create function public.enviar_mensaje_acompanamiento(p_alerta uuid, p_plantilla int)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_joven uuid;
begin
  if public.texto_mensaje(p_plantilla) is null then
    raise exception 'Mensaje no válido';
  end if;
  if not public.puede_ver_alerta(p_alerta) then
    raise exception 'No tienes acceso a esta alerta';
  end if;

  select profile_id into v_joven from public.riesgo_alertas where id = p_alerta;

  insert into public.mensajes_acompanamiento (profile_id, autor, alerta_id, plantilla)
  values (v_joven, auth.uid(), p_alerta, p_plantilla);

  insert into public.riesgo_acciones (alerta_id, autor, tipo, detalle)
  values (p_alerta, auth.uid(), 'mensaje_app', public.texto_mensaje(p_plantilla));
end;
$$;

grant execute on function public.enviar_mensaje_acompanamiento(uuid, int) to authenticated;

-- Para el joven: sus mensajes sin leer
create function public.mis_mensajes()
returns table (id uuid, autor text, texto text, enviado timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  select m.id, coalesce(nullif(a.display_name, ''), 'Tu orientador'), public.texto_mensaje(m.plantilla), m.created_at
  from public.mensajes_acompanamiento m
  left join public.profiles a on a.id = m.autor
  where m.profile_id = auth.uid() and m.leido_en is null
  order by m.created_at
$$;

grant execute on function public.mis_mensajes() to authenticated;

create function public.marcar_mensaje_leido(p_id uuid)
returns void
language sql
security definer set search_path = ''
as $$
  update public.mensajes_acompanamiento
  set leido_en = now()
  where id = p_id and profile_id = auth.uid() and leido_en is null
$$;

grant execute on function public.marcar_mensaje_leido(uuid) to authenticated;

-- 6. Alertas con ficha de contacto y acciones
drop function public.mis_alertas();

create function public.mis_alertas()
returns table (
  id uuid, joven text, joven_correo text, menor_de_edad boolean, grupo text,
  nivel text, categoria text, origen text, texto text, estado text, creada timestamptz,
  tutor_nombre text, tutor_relacion text, tutor_telefono text,
  contacto_nombre text, contacto_telefono text,
  acciones jsonb,
  atendida_por text, atendida_en timestamptz, nota_seguimiento text
)
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.es_orientador() then
    raise exception 'Solo orientadores y administradores';
  end if;

  -- Registrar el acceso a cada alerta (incluye datos de contacto)
  insert into public.riesgo_accesos (alerta_id, lector)
  select a.id, auth.uid()
  from public.riesgo_alertas a
  where public.puede_ver_alerta(a.id);

  return query
  select
    a.id,
    coalesce(nullif(p.display_name, ''), 'Sin nombre'),
    u.email::text,
    p.birth_date > (current_date - interval '18 years'),
    g.nombre || ' · ' || g.centro,
    a.nivel,
    a.categoria,
    a.origen,
    case when a.nivel = 'alto' then a.texto else null end,
    a.estado,
    a.created_at,
    c.tutor_nombre,
    c.tutor_relacion,
    c.tutor_telefono,
    p.contacto_nombre,
    p.contacto_telefono,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'tipo', r.tipo,
        'detalle', r.detalle,
        'autor', coalesce(ra.display_name, 'Equipo'),
        'fecha', r.created_at
      ) order by r.created_at)
      from public.riesgo_acciones r
      left join public.profiles ra on ra.id = r.autor
      where r.alerta_id = a.id
    ), '[]'::jsonb),
    ap.display_name,
    a.atendida_en,
    a.nota_seguimiento
  from public.riesgo_alertas a
  join public.profiles p on p.id = a.profile_id
  left join auth.users u on u.id = p.id
  left join public.grupos g on g.id = p.grupo_id
  left join public.profiles ap on ap.id = a.atendida_por
  left join lateral (
    select gc.tutor_nombre, gc.tutor_relacion, gc.tutor_telefono
    from public.guardian_consents gc
    where gc.profile_id = p.id and gc.estado = 'aceptado'
    order by gc.respondido_en desc nulls last
    limit 1
  ) c on true
  where public.puede_ver_alerta(a.id)
  order by (a.estado = 'nueva') desc, (a.nivel = 'alto') desc, a.created_at desc;
end;
$$;

grant execute on function public.mis_alertas() to authenticated;
