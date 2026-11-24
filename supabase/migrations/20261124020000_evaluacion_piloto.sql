-- ======================================================================
-- Evaluación del piloto: cuestionario breve antes y después
--  · Tres momentos: inicio (antes del prólogo), fin del Acto I y
--    seguimiento a 4 semanas del fin del Acto I.
--  · Voluntario: "Ahora no" lo vuelve a ofrecer al día siguiente (máx. 3
--    veces); "Prefiero no responder" no lo vuelve a ofrecer.
--  · Ítems en la tabla eval_items (editable por el comité). Escala 1 a 5.
--    Los ítems marcados como invertidos se recodifican (6 − valor).
--  · Orientadores: solo promedios del grupo, con 5 respuestas o más.
--    Respuestas individuales: solo administradores (equipo investigador),
--    con un código anónimo en lugar del nombre.
--  · El texto abierto pasa por el protocolo de detección de riesgo.
-- ======================================================================

create table public.eval_items (
  id text primary key,
  orden int not null,
  dimension text not null,      -- claridad | autoconocimiento | planificacion | confianza | satisfaccion | abierta
  texto text not null,
  tipo text not null default 'likert' check (tipo in ('likert', 'texto')),
  invertido boolean not null default false,
  momentos text[] not null,     -- inicio | fin_acto1 | seguimiento
  activo boolean not null default true
);
alter table public.eval_items enable row level security;
revoke all on public.eval_items from anon, authenticated;

insert into public.eval_items (id, orden, dimension, texto, tipo, invertido, momentos) values
  ('c1', 1, 'claridad', 'Tengo claro qué quiero lograr en los próximos años.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('a1', 2, 'autoconocimiento', 'Conozco bien mis intereses y lo que me apasiona.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('p1', 3, 'planificacion', 'Sé qué pasos tengo que dar para alcanzar mis metas.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('f1', 4, 'confianza', 'Creo que puedo lograr las metas que me propongo.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('c2', 5, 'claridad', 'Sé qué tipo de persona quiero llegar a ser.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('a2', 6, 'autoconocimiento', 'Puedo nombrar mis principales cualidades y fortalezas.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('p2', 7, 'planificacion', 'Cuando algo me frena, busco otra forma de seguir adelante.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('f2', 8, 'confianza', 'Cuando pienso en mi futuro, siento esperanza.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('c3', 9, 'claridad', 'Me cuesta imaginar cómo será mi vida dentro de unos años.', 'likert', true, '{inicio,fin_acto1,seguimiento}'),
  ('a3', 10, 'autoconocimiento', 'Sé qué valores son importantes para mí.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('p3', 11, 'planificacion', 'Reviso con frecuencia si estoy avanzando en lo que me propongo.', 'likert', false, '{inicio,fin_acto1,seguimiento}'),
  ('f3', 12, 'confianza', 'Siento que mi futuro depende más de la suerte que de mí.', 'likert', true, '{inicio,fin_acto1,seguimiento}'),
  ('s1', 13, 'satisfaccion', 'Me gustó jugar Proyéctate.', 'likert', false, '{fin_acto1}'),
  ('s2', 14, 'satisfaccion', 'El juego me ayudó a pensar en mi futuro.', 'likert', false, '{fin_acto1}'),
  ('s3', 15, 'satisfaccion', 'Recomendaría Proyéctate a otros jóvenes.', 'likert', false, '{fin_acto1}'),
  ('t1', 16, 'abierta', '¿Qué cambiarías o agregarías al juego? (opcional)', 'texto', false, '{fin_acto1}'),
  ('t2', 17, 'abierta', '¿Te ha servido el Diario de Navegación? Cuéntanos cómo. (opcional)', 'texto', false, '{seguimiento}');

create table public.eval_participacion (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  momento text not null check (momento in ('inicio', 'fin_acto1', 'seguimiento')),
  estado text not null check (estado in ('respondido', 'pospuesto', 'rechazado')),
  respuestas jsonb,
  veces_pospuesto int not null default 0,
  actualizado_at timestamptz not null default now(),
  primary key (profile_id, momento)
);
alter table public.eval_participacion enable row level security;
revoke all on public.eval_participacion from anon, authenticated;

-- ¿Qué cuestionario le toca ahora al joven? Devuelve { momento, items } o null
create function public.evaluacion_pendiente()
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_fin_acto timestamptz;
  v_momento text;
  p record;
begin
  if auth.uid() is null then
    return null;
  end if;

  select min(created_at) into v_fin_acto
  from public.insignias where profile_id = auth.uid() and cualidad = 'autoconocimiento';

  v_momento := case
    when v_fin_acto is null then 'inicio'
    when v_fin_acto > now() - interval '28 days' then 'fin_acto1'
    -- Pasadas 4 semanas del fin del Acto I toca el seguimiento (aunque el anterior quedara sin responder)
    else 'seguimiento'
  end;

  select * into p from public.eval_participacion where profile_id = auth.uid() and momento = v_momento;
  if found and (
    p.estado in ('respondido', 'rechazado')
    or p.veces_pospuesto >= 3
    or p.actualizado_at > now() - interval '20 hours'
  ) then
    return null;
  end if;

  return jsonb_build_object(
    'momento', v_momento,
    'items', (
      select jsonb_agg(jsonb_build_object('id', i.id, 'texto', i.texto, 'tipo', i.tipo) order by i.orden)
      from public.eval_items i
      where i.activo and v_momento = any (i.momentos)
    )
  );
end;
$$;
grant execute on function public.evaluacion_pendiente() to authenticated;

-- Guardar respuestas: { "c1": 4, ..., "t1": "texto" }. Devuelve el nivel de riesgo del texto abierto.
create function public.responder_evaluacion(p_momento text, p_respuestas jsonb)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_limpias jsonb := '{}'::jsonb;
  v_texto text := '';
  i record;
  v_valor jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;
  if p_momento not in ('inicio', 'fin_acto1', 'seguimiento') then
    raise exception 'Momento no válido';
  end if;

  -- Solo se guardan ítems de ese momento y valores válidos
  for i in select id, tipo from public.eval_items where activo and p_momento = any (momentos) loop
    v_valor := p_respuestas -> i.id;
    continue when v_valor is null or v_valor = 'null'::jsonb;
    if i.tipo = 'likert' and jsonb_typeof(v_valor) = 'number' and (v_valor #>> '{}')::int between 1 and 5 then
      v_limpias := v_limpias || jsonb_build_object(i.id, (v_valor #>> '{}')::int);
    elsif i.tipo = 'texto' and jsonb_typeof(v_valor) = 'string' and trim(v_valor #>> '{}') <> '' then
      v_limpias := v_limpias || jsonb_build_object(i.id, left(trim(v_valor #>> '{}'), 1000));
      v_texto := v_texto || ' ' || left(trim(v_valor #>> '{}'), 1000);
    end if;
  end loop;

  insert into public.eval_participacion (profile_id, momento, estado, respuestas, actualizado_at)
  values (auth.uid(), p_momento, 'respondido', v_limpias, now())
  on conflict (profile_id, momento)
  do update set estado = 'respondido', respuestas = excluded.respuestas, actualizado_at = now();

  if trim(v_texto) <> '' then
    return public.revisar_texto_riesgo('evaluacion:' || p_momento, trim(v_texto));
  end if;
  return 'ninguno';
end;
$$;
grant execute on function public.responder_evaluacion(text, jsonb) to authenticated;

-- "Ahora no" (definitivo = false) o "Prefiero no responder" (definitivo = true)
create function public.posponer_evaluacion(p_momento text, p_definitivo boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if p_momento not in ('inicio', 'fin_acto1', 'seguimiento') then
    raise exception 'Momento no válido';
  end if;
  insert into public.eval_participacion (profile_id, momento, estado, veces_pospuesto, actualizado_at)
  values (auth.uid(), p_momento, case when p_definitivo then 'rechazado' else 'pospuesto' end,
          case when p_definitivo then 0 else 1 end, now())
  on conflict (profile_id, momento) do update
  set estado = case when p_definitivo then 'rechazado' else 'pospuesto' end,
      veces_pospuesto = public.eval_participacion.veces_pospuesto + case when p_definitivo then 0 else 1 end,
      actualizado_at = now()
  where public.eval_participacion.estado = 'pospuesto';
end;
$$;
grant execute on function public.posponer_evaluacion(text, boolean) to authenticated;

-- Puntaje de una persona en una dimensión (promedio de sus ítems, con los invertidos recodificados)
create function public.eval_puntaje(p_respuestas jsonb, p_dimension text)
returns numeric
language sql
stable
security definer set search_path = ''
as $$
  select avg(case when i.invertido then 6 - (p_respuestas ->> i.id)::int else (p_respuestas ->> i.id)::int end)
  from public.eval_items i
  where i.dimension = p_dimension and i.tipo = 'likert' and p_respuestas ? i.id
$$;
revoke execute on function public.eval_puntaje(jsonb, text) from public, anon, authenticated;

-- Para el panel: promedio del grupo por dimensión y momento (solo con 5 respuestas o más)
create function public.evaluacion_grupo(p_grupo uuid)
returns table (momento text, dimension text, promedio numeric, respuestas int)
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  if not (public.es_admin() or exists (
    select 1 from public.grupo_orientadores o where o.grupo_id = p_grupo and o.profile_id = auth.uid()
  )) then
    raise exception 'No tienes acceso a este grupo';
  end if;

  return query
  with dims as (
    select distinct d.dimension from public.eval_items d where d.tipo = 'likert' and d.activo
  ),
  puntajes as (
    select e.momento, dm.dimension, public.eval_puntaje(e.respuestas, dm.dimension) as puntaje
    from public.eval_participacion e
    join public.profiles p on p.id = e.profile_id
    cross join dims dm
    where p.grupo_id = p_grupo and e.estado = 'respondido'
  )
  select x.momento, x.dimension,
         case when count(x.puntaje) >= 5 then round(avg(x.puntaje), 2) end,
         count(x.puntaje)::int
  from puntajes x
  where x.puntaje is not null
  group by x.momento, x.dimension;
end;
$$;
grant execute on function public.evaluacion_grupo(uuid) to authenticated;

-- Para el equipo investigador (administradores): respuestas con código anónimo
create function public.evaluacion_exportar()
returns table (codigo text, grupo text, centro text, edad int, momento text, estado text, fecha date, respuestas jsonb)
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el equipo investigador puede exportar';
  end if;
  return query
  select left(md5(e.profile_id::text), 10), g.nombre, g.centro,
         extract(year from age(e.actualizado_at::date, p.birth_date))::int,
         e.momento, e.estado, e.actualizado_at::date, e.respuestas
  from public.eval_participacion e
  join public.profiles p on p.id = e.profile_id
  left join public.grupos g on g.id = p.grupo_id
  order by 1, e.momento;
end;
$$;
grant execute on function public.evaluacion_exportar() to authenticated;

-- Lista de ítems para encabezados del archivo exportado y el panel
create function public.evaluacion_items()
returns table (id text, orden int, dimension text, texto text, tipo text, invertido boolean)
language sql
stable
security definer set search_path = ''
as $$
  select id, orden, dimension, texto, tipo, invertido from public.eval_items where activo order by orden
$$;
grant execute on function public.evaluacion_items() to authenticated;
