-- ======================================================================
-- Umbral de detección de riesgo para el Diario de Navegación
--
-- Problema: el método WOOP pide al joven nombrar su obstáculo interior
-- ("me siento solo cuando...", "no puedo más con las tareas"). Esas frases
-- activaban alertas moderadas aunque describen justo lo que se le pidió.
--
-- Criterio (borrador para el comité clínico; los valores se ajustan en la
-- tabla riesgo_config sin cambiar código):
--  1. Riesgo ALTO: siempre genera alerta, en cualquier campo. Sin cambios.
--  2. Riesgo MODERADO en el Diario se acumula por puntos:
--       · en el «obstáculo» o en el plan («si me pasa X, entonces…») suma
--         1 punto por ruta, aunque la frase aparezca en los dos campos
--       · en el deseo, el resultado o la nota semanal suma 2
--     Se crea la alerta cuando los puntos de los últimos 14 días llegan a 2.
--     Una sola mención en el obstáculo queda registrada como señal leve,
--     sin alerta; si se repite en otra ruta o semana, sí hay alerta.
--     Volver a guardar la misma ruta no suma dos veces la misma frase.
--  3. Excepciones de lenguaje cotidiano (para todo el sistema, también la
--     Bitácora): "cortarme el pelo", "matar el tiempo", etc. Están en la
--     tabla riesgo_excepciones y se quitan del texto antes de buscar frases.
-- ======================================================================

-- 1. Parámetros ajustables
create table public.riesgo_config (
  clave text primary key,
  valor numeric not null,
  descripcion text not null
);
alter table public.riesgo_config enable row level security;
revoke all on public.riesgo_config from anon, authenticated;

insert into public.riesgo_config (clave, valor, descripcion) values
  ('diario_umbral', 2, 'Puntos de riesgo moderado que generan alerta en el Diario'),
  ('diario_ventana_dias', 14, 'Días hacia atrás en que se suman las señales leves'),
  ('diario_peso_obstaculo', 1, 'Puntos de una frase moderada en el obstáculo o el plan (una vez por ruta)'),
  ('diario_peso_otro', 2, 'Puntos de una frase moderada en deseo, resultado o nota semanal');

create function public.riesgo_param(p_clave text, p_defecto numeric)
returns numeric
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select valor from public.riesgo_config where clave = p_clave), p_defecto)
$$;
revoke execute on function public.riesgo_param(text, numeric) from public, anon, authenticated;

-- 2. Expresiones cotidianas que no son riesgo (texto en minúsculas y sin tildes)
create table public.riesgo_excepciones (
  id serial primary key,
  patron text not null,
  descripcion text not null,
  activo boolean not null default true
);
alter table public.riesgo_excepciones enable row level security;
revoke all on public.riesgo_excepciones from anon, authenticated;

insert into public.riesgo_excepciones (patron, descripcion) values
  ('(cortarme|me corto|me corte|me voy a cortar|cortar) (el|mi|los|las|un poco el) (pelo|cabello|fleco|flequillo|unas|barba|afro|rizos)',
   'Cortarse el pelo o las uñas'),
  ('matar (el tiempo|la sed|el hambre|el aburrimiento|la curiosidad|la nota|ese examen|el examen)',
   'Matar el tiempo / "matar" un examen (jerga)'),
  ('no (aguanto|puedo) mas (tarde|temprano|rapido|lento|de [0-9]|de (una|dos|tres|cuatro|cinco|media) )',
   '"No puedo más tarde", "no aguanto más de dos horas" (tiempo o cantidad, no agotamiento)');

-- Texto normalizado y sin las excepciones
create function public.texto_para_riesgo(p_texto text)
returns text
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v text := lower(translate(coalesce(p_texto, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun'));
  e record;
begin
  for e in select patron from public.riesgo_excepciones where activo loop
    v := regexp_replace(v, e.patron, ' ', 'g');
  end loop;
  return v;
end;
$$;
revoke execute on function public.texto_para_riesgo(text) from public, anon, authenticated;

-- Las dos clasificadoras usan ahora el texto sin excepciones
create or replace function public.clasificar_riesgo(p_texto text)
returns text
language sql
stable
security definer set search_path = ''
as $$
  with normal as (select public.texto_para_riesgo(p_texto) as t)
  select coalesce(
    (select case when bool_or(p.nivel = 'alto') then 'alto' else 'moderado' end
     from public.riesgo_patrones p, normal n
     where p.activo and n.t ~ p.patron
     having count(*) > 0),
    'ninguno'
  )
$$;

create or replace function public.clasificar_riesgo_detalle(p_texto text)
returns table (nivel text, categoria text)
language sql
stable
security definer set search_path = ''
as $$
  with normal as (select public.texto_para_riesgo(p_texto) as t)
  select p.nivel, p.categoria
  from public.riesgo_patrones p, normal n
  where p.activo and n.t ~ p.patron
  order by
    (p.nivel = 'alto') desc,
    case p.categoria when 'abuso' then 1 when 'suicidio' then 2 when 'autolesion' then 3 else 4 end
  limit 1
$$;

-- 3. Señales moderadas del Diario (con o sin alerta), para acumular puntos
create table public.riesgo_senales (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  origen text not null,      -- ruta o revisión concreta (diario:meta:<id>, diario:revision:<id>:<semana>)
  campo text not null,
  categoria text not null,
  puntos numeric not null,
  created_at timestamptz not null default now(),
  unique (profile_id, origen, campo)
);
alter table public.riesgo_senales enable row level security;
revoke all on public.riesgo_senales from anon, authenticated;
create index riesgo_senales_reciente on public.riesgo_senales (profile_id, created_at);

-- Revisa los campos de un texto del Diario y decide si hay alerta.
-- p_campos: {"deseo": "...", "obstaculo": "...", ...}. Devuelve el nivel para la pantalla de apoyo.
create function public.revisar_diario_riesgo(p_tipo text, p_origen text, p_campos jsonb)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  c record;
  d record;
  v_alto_cat text;
  v_mod_cat text;
  v_puntos numeric := 0;
  v_previos numeric;
  v_texto text;
  v_peso numeric;
  v_grupo text;
begin
  -- Lo que se guardó antes para esta misma ruta o revisión se recalcula desde cero
  delete from public.riesgo_senales where profile_id = auth.uid() and origen = p_origen;

  for c in select key, value from jsonb_each_text(p_campos) where coalesce(trim(value), '') <> '' loop
    select * into d from public.clasificar_riesgo_detalle(c.value);
    continue when d.nivel is null;

    if d.nivel = 'alto' then
      v_alto_cat := coalesce(v_alto_cat, d.categoria);
    else
      -- El plan WOOP repite el obstáculo ("si me siento solo, entonces..."): cuentan juntos una vez
      v_grupo := case when c.key in ('obstaculo', 'plan') then 'obstaculo' else c.key end;
      v_peso := case when v_grupo = 'obstaculo'
                     then public.riesgo_param('diario_peso_obstaculo', 1)
                     else public.riesgo_param('diario_peso_otro', 2) end;
      v_mod_cat := coalesce(v_mod_cat, d.categoria);
      insert into public.riesgo_senales (profile_id, origen, campo, categoria, puntos)
      values (auth.uid(), p_origen, v_grupo, d.categoria, v_peso)
      on conflict (profile_id, origen, campo) do nothing;
      if found then
        v_puntos := v_puntos + v_peso;
      end if;
    end if;
  end loop;

  -- Texto completo con el nombre de cada campo (solo se muestra al equipo en riesgo alto)
  select string_agg(
           case key when 'deseo' then 'Deseo' when 'resultado' then 'Resultado'
                    when 'obstaculo' then 'Obstáculo' when 'plan' then 'Plan'
                    when 'nota' then 'Nota semanal' else key end || ': ' || value, E'\n') into v_texto
  from jsonb_each_text(p_campos) where coalesce(trim(value), '') <> '';

  if v_alto_cat is not null then
    insert into public.riesgo_alertas (profile_id, origen, nivel, categoria, texto)
    values (auth.uid(), p_tipo, 'alto', v_alto_cat, left(v_texto, 2000));
    return 'alto';
  end if;

  if v_puntos = 0 then
    return 'ninguno';
  end if;

  select coalesce(sum(puntos), 0) into v_previos
  from public.riesgo_senales
  where profile_id = auth.uid()
    and origen <> p_origen
    and created_at > now() - make_interval(days => public.riesgo_param('diario_ventana_dias', 14)::int);

  if v_puntos + v_previos >= public.riesgo_param('diario_umbral', 2) then
    insert into public.riesgo_alertas (profile_id, origen, nivel, categoria, texto)
    values (auth.uid(), p_tipo, 'moderado', v_mod_cat, left(v_texto, 2000));
    return 'moderado';
  end if;

  return 'ninguno';  -- señal leve: queda registrada, sin alerta
end;
$$;
revoke execute on function public.revisar_diario_riesgo(text, text, jsonb) from public, anon, authenticated;

-- 4. Las funciones del Diario usan el nuevo criterio
create or replace function public.guardar_meta(
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

  v_nivel := public.revisar_diario_riesgo(
    'diario:meta',
    'diario:meta:' || v_id,
    jsonb_build_object('deseo', p_deseo, 'resultado', p_resultado, 'obstaculo', p_obstaculo, 'plan', p_plan)
  );

  return jsonb_build_object('id', v_id, 'nivel', v_nivel);
end;
$$;

create or replace function public.revisar_meta(p_meta uuid, p_avance int, p_nota text)
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

  v_nivel := public.revisar_diario_riesgo(
    'diario:revision',
    'diario:revision:' || p_meta || ':' || public.semana_actual(),
    jsonb_build_object('nota', p_nota)
  );

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
