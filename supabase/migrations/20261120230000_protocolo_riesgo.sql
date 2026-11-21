-- ======================================================================
-- Protocolo de detección de riesgo (versión 1 — borrador clínico)
--
-- 1. El joven escribe notas en su Bitácora. Se guardan a través de una
--    función del servidor que las clasifica: ninguno | moderado | alto.
-- 2. Si hay señal de riesgo, el joven ve una pantalla de apoyo con recursos,
--    y se crea una alerta.
-- 3. Ven la alerta el orientador del grupo del joven y los administradores
--    clínicos. El texto solo se muestra en riesgo alto, y cada lectura queda
--    registrada.
-- Las frases que activan la alerta están en la tabla riesgo_patrones y
-- pueden ajustarse sin cambiar el código.
-- ======================================================================

-- Notas libres de la Bitácora (una por página)
create table public.bitacora_notas (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  seccion text not null,
  texto text not null default '',
  updated_at timestamptz not null default now(),
  primary key (profile_id, seccion)
);

alter table public.bitacora_notas enable row level security;
revoke all on public.bitacora_notas from anon, authenticated;
grant select on public.bitacora_notas to authenticated;

create policy "Ver mis notas" on public.bitacora_notas
  for select to authenticated
  using ((select auth.uid()) = profile_id);

-- Frases que indican posible riesgo (expresiones regulares sobre el texto
-- en minúsculas y sin tildes)
create table public.riesgo_patrones (
  id serial primary key,
  patron text not null,
  nivel text not null check (nivel in ('moderado', 'alto')),
  categoria text not null,
  activo boolean not null default true
);

alter table public.riesgo_patrones enable row level security;
revoke all on public.riesgo_patrones from anon, authenticated;

insert into public.riesgo_patrones (patron, nivel, categoria) values
  -- Ideación o intención suicida
  ('quiero morir', 'alto', 'suicidio'),
  ('(me quiero|quisiera|voy a|pienso en|ganas de|deseos de) (morir|matarme|matar)', 'alto', 'suicidio'),
  ('matarme', 'alto', 'suicidio'),
  ('suicid', 'alto', 'suicidio'),
  ('quitarme la vida', 'alto', 'suicidio'),
  ('acabar con (mi vida|todo esto)', 'alto', 'suicidio'),
  ('no quiero (vivir|seguir viviendo|seguir aqui|existir|despertar)', 'alto', 'suicidio'),
  ('ya no quiero estar (aqui|vivo|viva|en este mundo)', 'alto', 'suicidio'),
  ('mejor (muert[oa]|no haber nacido)', 'alto', 'suicidio'),
  -- Autolesiones
  ('(hacerme|me hago) dano', 'alto', 'autolesion'),
  ('cortarme|me corto|me corte', 'alto', 'autolesion'),
  ('lastimarme|me lastimo', 'alto', 'autolesion'),
  ('autolesion', 'alto', 'autolesion'),
  -- Violencia o abuso hacia el joven
  ('abus(a|an|o|aron) de mi', 'alto', 'abuso'),
  ('me (violo|violaron|abusa|abusan|abuso|abusaron|maltrata|maltratan|golpea|golpean|pega|pegan)\M', 'alto', 'abuso'),
  -- Desesperanza y malestar intenso
  ('no (vale|tiene) (la pena|sentido)', 'moderado', 'desesperanza'),
  ('no sirvo para nada', 'moderado', 'desesperanza'),
  ('nadie me quiere', 'moderado', 'desesperanza'),
  ('quiero desaparecer', 'moderado', 'desesperanza'),
  ('cansad[oa] de (todo|vivir)', 'moderado', 'desesperanza'),
  ('odio mi vida', 'moderado', 'desesperanza'),
  ('no (aguanto|puedo) mas', 'moderado', 'desesperanza'),
  ('me siento (muy |tan )?sol[oa]', 'moderado', 'desesperanza'),
  ('todo me da igual', 'moderado', 'desesperanza'),
  ('no tengo (futuro|salida|a nadie)', 'moderado', 'desesperanza'),
  ('sin salida', 'moderado', 'desesperanza'),
  ('soy una carga', 'moderado', 'desesperanza');

-- Clasifica un texto: devuelve el nivel más alto que encuentre
create function public.clasificar_riesgo(p_texto text)
returns text
language sql
stable
security definer set search_path = ''
as $$
  with normal as (
    select lower(translate(coalesce(p_texto, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')) as t
  )
  select coalesce(
    (select case when bool_or(p.nivel = 'alto') then 'alto' else 'moderado' end
     from public.riesgo_patrones p, normal n
     where p.activo and n.t ~ p.patron
     having count(*) > 0),
    'ninguno'
  )
$$;

revoke execute on function public.clasificar_riesgo(text) from public, anon, authenticated;

-- Alertas
create table public.riesgo_alertas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  origen text not null,               -- p. ej. 'bitacora:raices'
  nivel text not null check (nivel in ('moderado', 'alto')),
  texto text not null,
  estado text not null default 'nueva' check (estado in ('nueva', 'atendida')),
  atendida_por uuid references public.profiles(id) on delete set null,
  atendida_en timestamptz,
  nota_seguimiento text,
  created_at timestamptz not null default now()
);

-- Registro de quién leyó el texto de una alerta y cuándo
create table public.riesgo_accesos (
  id bigserial primary key,
  alerta_id uuid not null references public.riesgo_alertas(id) on delete cascade,
  lector uuid not null references public.profiles(id) on delete cascade,
  leido_en timestamptz not null default now()
);

alter table public.riesgo_alertas enable row level security;
alter table public.riesgo_accesos enable row level security;
revoke all on public.riesgo_alertas from anon, authenticated;
revoke all on public.riesgo_accesos from anon, authenticated;

-- Guarda una nota de la Bitácora, la clasifica y, si hace falta, crea la alerta.
-- Devuelve el nivel para que la app muestre la pantalla de apoyo.
create function public.guardar_nota(p_seccion text, p_texto text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_texto text := left(coalesce(p_texto, ''), 2000);
  v_nivel text;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;

  insert into public.bitacora_notas (profile_id, seccion, texto, updated_at)
  values (auth.uid(), left(p_seccion, 40), v_texto, now())
  on conflict (profile_id, seccion)
  do update set texto = excluded.texto, updated_at = now();

  v_nivel := public.clasificar_riesgo(v_texto);

  if v_nivel <> 'ninguno' then
    insert into public.riesgo_alertas (profile_id, origen, nivel, texto)
    values (auth.uid(), 'bitacora:' || left(p_seccion, 40), v_nivel, v_texto);
  end if;

  return v_nivel;
end;
$$;

grant execute on function public.guardar_nota(text, text) to authenticated;

-- ¿Es administrador clínico?
create function public.es_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

grant execute on function public.es_admin() to authenticated;

-- Alertas visibles para quien consulta: las de su grupo (orientador) o todas (administrador).
-- El texto solo se entrega en riesgo alto, y cada entrega queda registrada.
create function public.mis_alertas()
returns table (
  id uuid, joven text, grupo text, nivel text, origen text, texto text,
  estado text, creada timestamptz, atendida_por text, atendida_en timestamptz, nota_seguimiento text
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_admin boolean := public.es_admin();
begin
  if not public.es_orientador() then
    raise exception 'Solo orientadores y administradores';
  end if;

  -- Registrar la lectura de los textos de riesgo alto que se van a mostrar
  insert into public.riesgo_accesos (alerta_id, lector)
  select a.id, auth.uid()
  from public.riesgo_alertas a
  join public.profiles p on p.id = a.profile_id
  where a.nivel = 'alto'
    and (v_admin or exists (
      select 1 from public.grupo_orientadores o
      where o.grupo_id = p.grupo_id and o.profile_id = auth.uid()
    ));

  return query
  select
    a.id,
    coalesce(nullif(p.display_name, ''), 'Sin nombre'),
    g.nombre || ' · ' || g.centro,
    a.nivel,
    a.origen,
    case when a.nivel = 'alto' then a.texto else null end,
    a.estado,
    a.created_at,
    ap.display_name,
    a.atendida_en,
    a.nota_seguimiento
  from public.riesgo_alertas a
  join public.profiles p on p.id = a.profile_id
  left join public.grupos g on g.id = p.grupo_id
  left join public.profiles ap on ap.id = a.atendida_por
  where v_admin or exists (
    select 1 from public.grupo_orientadores o
    where o.grupo_id = p.grupo_id and o.profile_id = auth.uid()
  )
  order by (a.estado = 'nueva') desc, (a.nivel = 'alto') desc, a.created_at desc;
end;
$$;

grant execute on function public.mis_alertas() to authenticated;

-- Marcar una alerta como atendida, con una nota de seguimiento
create function public.atender_alerta(p_id uuid, p_nota text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.riesgo_alertas a
  set estado = 'atendida',
      atendida_por = auth.uid(),
      atendida_en = now(),
      nota_seguimiento = left(coalesce(p_nota, ''), 1000)
  from public.profiles p
  where a.id = p_id
    and p.id = a.profile_id
    and (public.es_admin() or exists (
      select 1 from public.grupo_orientadores o
      where o.grupo_id = p.grupo_id and o.profile_id = auth.uid()
    ));

  if not found then
    raise exception 'No tienes acceso a esta alerta';
  end if;
end;
$$;

grant execute on function public.atender_alerta(uuid, text) to authenticated;
