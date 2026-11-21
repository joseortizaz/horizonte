-- ======================================================================
-- Diario de Navegación: metas (rutas) con el método WOOP y revisión semanal
--  · Hasta 3 rutas activas por joven
--  · Una revisión por ruta y semana (avance 0 a 3, nota opcional)
--  · Los textos pasan por el protocolo de detección de riesgo
--  · Insignia de Perseverancia al revisar en 3 semanas distintas
-- ======================================================================

create table public.metas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  area text not null check (area in ('estudios', 'vocacion', 'relaciones', 'salud', 'finanzas', 'proposito', 'otra')),
  deseo text not null,       -- W: qué quiero lograr
  resultado text not null,   -- O: cómo me imagino al lograrlo
  obstaculo text not null,   -- O: qué cosa mía podría frenarme
  plan text not null,        -- P: si aparece el obstáculo, entonces...
  fecha_objetivo date,
  estado text not null default 'activa' check (estado in ('activa', 'lograda', 'pausada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.metas_revisiones (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references public.metas(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  semana date not null,      -- lunes de la semana (hora de República Dominicana)
  avance smallint not null check (avance between 0 and 3),
  nota text not null default '',
  created_at timestamptz not null default now(),
  unique (meta_id, semana)
);

alter table public.metas enable row level security;
alter table public.metas_revisiones enable row level security;
revoke all on public.metas from anon, authenticated;
revoke all on public.metas_revisiones from anon, authenticated;

-- El joven puede leer lo suyo; todo cambio pasa por funciones que revisan el riesgo
grant select on public.metas, public.metas_revisiones to authenticated;

create policy "Ver mis metas" on public.metas
  for select to authenticated using ((select auth.uid()) = profile_id);
create policy "Ver mis revisiones" on public.metas_revisiones
  for select to authenticated using ((select auth.uid()) = profile_id);

-- Lunes de la semana actual en República Dominicana
create function public.semana_actual()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', (now() at time zone 'America/Santo_Domingo'))::date
$$;

-- Revisa un texto y, si hay riesgo, crea la alerta. Devuelve el nivel.
create function public.revisar_texto_riesgo(p_origen text, p_texto text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_nivel text;
  v_categoria text;
begin
  select d.nivel, d.categoria into v_nivel, v_categoria
  from public.clasificar_riesgo_detalle(p_texto) d;

  if v_nivel is null then
    return 'ninguno';
  end if;

  insert into public.riesgo_alertas (profile_id, origen, nivel, categoria, texto)
  values (auth.uid(), left(p_origen, 60), v_nivel, v_categoria, left(p_texto, 2000));

  return v_nivel;
end;
$$;

revoke execute on function public.revisar_texto_riesgo(text, text) from public, anon, authenticated;

-- El nivel más grave entre varios
create function public.nivel_mayor(a text, b text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when 'alto' in (a, b) then 'alto'
    when 'moderado' in (a, b) then 'moderado'
    else 'ninguno'
  end
$$;

-- Crear o editar una ruta. Devuelve { id, nivel }.
create function public.guardar_meta(
  p_id uuid,
  p_area text,
  p_deseo text,
  p_resultado text,
  p_obstaculo text,
  p_plan text,
  p_fecha date
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_texto text;
  v_nivel text;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;
  if coalesce(trim(p_deseo), '') = '' or coalesce(trim(p_obstaculo), '') = '' or coalesce(trim(p_plan), '') = '' then
    raise exception 'Faltan datos de la ruta';
  end if;

  if v_id is null then
    if (select count(*) from public.metas where profile_id = auth.uid() and estado = 'activa') >= 3 then
      raise exception 'Ya tienes 3 rutas activas';
    end if;
    insert into public.metas (profile_id, area, deseo, resultado, obstaculo, plan, fecha_objetivo)
    values (auth.uid(), p_area, left(trim(p_deseo), 200), left(trim(coalesce(p_resultado, '')), 500),
            left(trim(p_obstaculo), 500), left(trim(p_plan), 500), p_fecha)
    returning id into v_id;
  else
    update public.metas
    set area = p_area, deseo = left(trim(p_deseo), 200), resultado = left(trim(coalesce(p_resultado, '')), 500),
        obstaculo = left(trim(p_obstaculo), 500), plan = left(trim(p_plan), 500),
        fecha_objetivo = p_fecha, updated_at = now()
    where id = v_id and profile_id = auth.uid();
    if not found then
      raise exception 'Ruta no encontrada';
    end if;
  end if;

  v_texto := concat_ws(' · ', p_deseo, p_resultado, p_obstaculo, p_plan);
  v_nivel := public.revisar_texto_riesgo('diario:meta', v_texto);

  return jsonb_build_object('id', v_id, 'nivel', v_nivel);
end;
$$;

grant execute on function public.guardar_meta(uuid, text, text, text, text, text, date) to authenticated;

-- Marcar una ruta como lograda, pausada o activa otra vez
create function public.cambiar_estado_meta(p_id uuid, p_estado text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if p_estado = 'activa' and
     (select count(*) from public.metas where profile_id = auth.uid() and estado = 'activa') >= 3 then
    raise exception 'Ya tienes 3 rutas activas';
  end if;
  update public.metas set estado = p_estado, updated_at = now()
  where id = p_id and profile_id = auth.uid();
  if not found then
    raise exception 'Ruta no encontrada';
  end if;
end;
$$;

grant execute on function public.cambiar_estado_meta(uuid, text) to authenticated;

-- Revisión semanal de una ruta. Devuelve { nivel, insignia }.
create function public.revisar_meta(p_meta uuid, p_avance int, p_nota text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_nivel text := 'ninguno';
  v_semanas int;
  v_insignia boolean := false;
begin
  if not exists (select 1 from public.metas where id = p_meta and profile_id = auth.uid()) then
    raise exception 'Ruta no encontrada';
  end if;

  insert into public.metas_revisiones (meta_id, profile_id, semana, avance, nota)
  values (p_meta, auth.uid(), public.semana_actual(), p_avance, left(coalesce(p_nota, ''), 1000))
  on conflict (meta_id, semana)
  do update set avance = excluded.avance, nota = excluded.nota, created_at = now();

  if coalesce(trim(p_nota), '') <> '' then
    v_nivel := public.revisar_texto_riesgo('diario:revision', p_nota);
  end if;

  -- Insignia de Perseverancia: revisiones en 3 semanas distintas
  select count(distinct semana) into v_semanas from public.metas_revisiones where profile_id = auth.uid();
  if v_semanas >= 3 then
    insert into public.insignias (profile_id, cualidad, nivel, origen)
    values (auth.uid(), 'perseverancia', 'bronce', 'diario')
    on conflict (profile_id, cualidad, nivel) do nothing;
    v_insignia := found;
  end if;

  return jsonb_build_object('nivel', v_nivel, 'insignia', v_insignia);
end;
$$;

grant execute on function public.revisar_meta(uuid, int, text) to authenticated;

-- Todo el diario del joven en una sola consulta
create function public.mi_diario()
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  select jsonb_build_object(
    'semana_actual', public.semana_actual(),
    'semanas_navegadas', (
      select count(distinct semana) from public.metas_revisiones where profile_id = auth.uid()
    ),
    'metas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'area', m.area, 'deseo', m.deseo, 'resultado', m.resultado,
        'obstaculo', m.obstaculo, 'plan', m.plan, 'fecha_objetivo', m.fecha_objetivo,
        'estado', m.estado, 'creada', m.created_at,
        'revision_semana', (
          select jsonb_build_object('avance', r.avance, 'nota', r.nota)
          from public.metas_revisiones r
          where r.meta_id = m.id and r.semana = public.semana_actual()
        ),
        'historial', coalesce((
          select jsonb_agg(jsonb_build_object('semana', r.semana, 'avance', r.avance) order by r.semana)
          from (
            select semana, avance from public.metas_revisiones
            where meta_id = m.id order by semana desc limit 8
          ) r
        ), '[]'::jsonb)
      ) order by (m.estado = 'activa') desc, m.created_at)
      from public.metas m
      where m.profile_id = auth.uid()
    ), '[]'::jsonb)
  )
$$;

grant execute on function public.mi_diario() to authenticated;

-- Panel de orientadores: agregar rutas activas y última revisión del diario
drop function public.panel_grupo(uuid);

create function public.panel_grupo(p_grupo uuid)
returns table (
  nombre text, menor_de_edad boolean, autorizacion text,
  etapa text, recuerdos int, insignias int, ultima_actividad timestamptz,
  rutas_activas int, ultima_revision date
)
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.grupo_orientadores o
    where o.grupo_id = p_grupo and o.profile_id = auth.uid()
  ) then
    raise exception 'No tienes acceso a este grupo';
  end if;

  return query
  select
    coalesce(nullif(p.display_name, ''), 'Sin nombre'),
    p.birth_date > (current_date - interval '18 years'),
    case
      when p.birth_date <= (current_date - interval '18 years') then 'No requerida'
      when exists (
        select 1 from public.guardian_consents c where c.profile_id = p.id and c.estado = 'aceptado'
      ) then 'Autorizado'
      when exists (
        select 1 from public.guardian_consents c where c.profile_id = p.id and c.estado = 'pendiente'
      ) then 'Pendiente'
      when exists (
        select 1 from public.guardian_consents c where c.profile_id = p.id and c.estado = 'rechazado'
      ) then 'No autorizado'
      else 'Sin solicitar'
    end,
    e.etapa,
    e.recuerdos,
    (select count(*)::int from public.insignias i where i.profile_id = p.id),
    e.ultima_actividad,
    (select count(*)::int from public.metas m where m.profile_id = p.id and m.estado = 'activa'),
    (select max(r.semana) from public.metas_revisiones r where r.profile_id = p.id)
  from public.profiles p
  cross join lateral public.etapa_joven(p.id) e
  where p.grupo_id = p_grupo
  order by p.display_name;
end;
$$;

grant execute on function public.panel_grupo(uuid) to authenticated;
