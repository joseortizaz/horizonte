-- ======================================================================
-- Acto II: Archipiélago de los Oficios
-- Resultado de cada taller (uno por tipo de interés de Holland):
--   disfrute  1 a 4 (cuánto lo disfrutó, según el joven)
--   habilidad 1 a 4 (qué tan bien sintió que le salió, según el joven)
--   desempeno 0 a 100 (cómo le fue en el minijuego, medido por el juego)
-- Alimenta el "Mapa de oficios" de la Bitácora. Solo lo ve el joven.
-- ======================================================================

create table public.oficios_talleres (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  taller text not null check (taller in ('realista', 'investigador', 'artistico', 'social', 'emprendedor', 'convencional')),
  disfrute smallint not null check (disfrute between 1 and 4),
  habilidad smallint not null check (habilidad between 1 and 4),
  desempeno smallint check (desempeno between 0 and 100),
  extra jsonb,               -- p. ej. el diseño de la vela
  veces int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (profile_id, taller)
);

alter table public.oficios_talleres enable row level security;
revoke all on public.oficios_talleres from anon, authenticated;
grant select on public.oficios_talleres to authenticated;
create policy "Ver mis talleres" on public.oficios_talleres
  for select to authenticated using ((select auth.uid()) = profile_id);

create function public.guardar_taller(p_taller text, p_disfrute int, p_habilidad int, p_desempeno int, p_extra jsonb)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;
  insert into public.oficios_talleres (profile_id, taller, disfrute, habilidad, desempeno, extra)
  values (auth.uid(), p_taller, p_disfrute, p_habilidad,
          case when p_desempeno is null then null else greatest(0, least(100, p_desempeno)) end, p_extra)
  on conflict (profile_id, taller) do update
  set disfrute = excluded.disfrute, habilidad = excluded.habilidad, desempeno = excluded.desempeno,
      extra = coalesce(excluded.extra, public.oficios_talleres.extra),
      veces = public.oficios_talleres.veces + 1, updated_at = now();
end;
$$;
grant execute on function public.guardar_taller(text, int, int, int, jsonb) to authenticated;

-- El panel de orientadores muestra también las etapas del Acto II
create or replace function public.etapa_joven(p_profile uuid)
returns table (etapa text, recuerdos int, ultima_actividad timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  select
    case
      when s.profile_id is null then 'Sin empezar'
      when exists (
        select 1 from public.insignias i where i.profile_id = p_profile and i.cualidad = 'curiosidad'
      ) then 'Acto II completado'
      when s.region = 'oficios' or exists (
        select 1 from public.oficios_talleres t where t.profile_id = p_profile
      ) then 'En el Archipiélago'
      when exists (
        select 1 from public.insignias i where i.profile_id = p_profile and i.cualidad = 'autoconocimiento'
      ) then 'Acto I completado'
      when 'raices' = any (s.faros_encendidos) then 'Faro encendido'
      else 'Explorando la isla'
    end,
    coalesce((s.narrativa::jsonb -> 'variablesState' ->> 'recuerdos')::int, 0),
    s.updated_at
  from (select p_profile as id) p
  left join public.game_saves s on s.profile_id = p.id
$$;

-- "Completaron el Acto I" incluye a quienes ya siguieron al Acto II
create or replace function public.mis_grupos()
returns table (
  id uuid, nombre text, centro text, codigo text,
  registrados int, autorizacion_pendiente int, activos_7_dias int, acto1_completado int
)
language sql
stable
security definer set search_path = ''
as $$
  select
    g.id, g.nombre, g.centro, g.codigo,
    count(p.id)::int,
    count(p.id) filter (
      where p.birth_date > (current_date - interval '18 years')
        and not exists (
          select 1 from public.guardian_consents c
          where c.profile_id = p.id and c.estado = 'aceptado'
        )
    )::int,
    count(p.id) filter (where e.ultima_actividad > now() - interval '7 days')::int,
    count(p.id) filter (where e.etapa in ('Acto I completado', 'En el Archipiélago', 'Acto II completado'))::int
  from public.grupos g
  join public.grupo_orientadores o on o.grupo_id = g.id and o.profile_id = auth.uid()
  left join public.profiles p on p.grupo_id = g.id
  left join lateral public.etapa_joven(p.id) e on p.id is not null
  group by g.id
  order by g.created_at desc
$$;
