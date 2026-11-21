-- Panel de orientadores: grupos con código, y vista del avance de cada joven
-- SIN acceso a sus respuestas personales (Bitácora, decisiones de la historia).
-- Todo el acceso del orientador pasa por funciones que verifican sus permisos.

-- Grupos (por ejemplo, "4.º B" del "Liceo X")
create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  centro text not null,
  codigo text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Orientadores a cargo de cada grupo
create table public.grupo_orientadores (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (grupo_id, profile_id)
);

-- Grupo al que pertenece cada joven
alter table public.profiles add column grupo_id uuid references public.grupos(id) on delete set null;

-- Nadie accede a estas tablas directamente: solo a través de las funciones de abajo
alter table public.grupos enable row level security;
alter table public.grupo_orientadores enable row level security;
revoke all on public.grupos from anon, authenticated;
revoke all on public.grupo_orientadores from anon, authenticated;

-- ¿El usuario actual es orientador (o administrador)?
create function public.es_orientador()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('counselor', 'admin')
  )
$$;

grant execute on function public.es_orientador() to authenticated;

-- Código de 6 caracteres sin letras ni números que se confundan (O/0, I/1)
create function public.generar_codigo_grupo()
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  letras constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
begin
  loop
    v_codigo := '';
    for i in 1..6 loop
      v_codigo := v_codigo || substr(letras, 1 + floor(random() * length(letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.grupos g where g.codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$$;

revoke execute on function public.generar_codigo_grupo() from public, anon, authenticated;

-- Crear un grupo (solo orientadores); devuelve su código
create function public.crear_grupo(p_nombre text, p_centro text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_codigo text;
begin
  if not public.es_orientador() then
    raise exception 'Solo los orientadores pueden crear grupos';
  end if;
  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_centro), '') = '' then
    raise exception 'Faltan el nombre del grupo o del centro';
  end if;

  v_codigo := public.generar_codigo_grupo();
  insert into public.grupos (nombre, centro, codigo, created_by)
  values (left(trim(p_nombre), 80), left(trim(p_centro), 120), v_codigo, auth.uid())
  returning id into v_id;

  insert into public.grupo_orientadores (grupo_id, profile_id) values (v_id, auth.uid());
  return v_codigo;
end;
$$;

grant execute on function public.crear_grupo(text, text) to authenticated;

-- Avance de un joven: "etapa" y número de Recuerdos (sin leer sus respuestas)
create function public.etapa_joven(p_profile uuid)
returns table (etapa text, recuerdos int, ultima_actividad timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  select
    case
      when s.profile_id is null then 'Sin empezar'
      when exists (
        select 1 from public.insignias i
        where i.profile_id = p_profile and i.cualidad = 'autoconocimiento'
      ) then 'Acto I completado'
      when 'raices' = any (s.faros_encendidos) then 'Faro encendido'
      else 'Explorando la isla'
    end,
    coalesce((s.narrativa::jsonb -> 'variablesState' ->> 'recuerdos')::int, 0),
    s.updated_at
  from (select p_profile as id) p
  left join public.game_saves s on s.profile_id = p.id
$$;

revoke execute on function public.etapa_joven(uuid) from public, anon, authenticated;

-- Los grupos del orientador, con un resumen de cada uno
create function public.mis_grupos()
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
    count(p.id) filter (where e.etapa = 'Acto I completado')::int
  from public.grupos g
  join public.grupo_orientadores o on o.grupo_id = g.id and o.profile_id = auth.uid()
  left join public.profiles p on p.grupo_id = g.id
  left join lateral public.etapa_joven(p.id) e on p.id is not null
  group by g.id
  order by g.created_at desc
$$;

grant execute on function public.mis_grupos() to authenticated;

-- Jóvenes de un grupo y su avance (solo si el orientador está a cargo del grupo)
create function public.panel_grupo(p_grupo uuid)
returns table (
  nombre text, menor_de_edad boolean, autorizacion text,
  etapa text, recuerdos int, insignias int, ultima_actividad timestamptz
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
    e.ultima_actividad
  from public.profiles p
  cross join lateral public.etapa_joven(p.id) e
  where p.grupo_id = p_grupo
  order by p.display_name;
end;
$$;

grant execute on function public.panel_grupo(uuid) to authenticated;

-- Para el formulario de registro: ¿existe este código? (devuelve el nombre del grupo)
create function public.validar_codigo_grupo(p_codigo text)
returns text
language sql
stable
security definer set search_path = ''
as $$
  select g.nombre || ' · ' || g.centro
  from public.grupos g
  where g.codigo = upper(trim(p_codigo))
$$;

grant execute on function public.validar_codigo_grupo(text) to anon, authenticated;

-- Unirse a un grupo con el código (para quien no lo puso al registrarse)
create function public.unirme_a_grupo(p_codigo text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_grupo public.grupos%rowtype;
begin
  select * into v_grupo from public.grupos where codigo = upper(trim(p_codigo));
  if v_grupo.id is null then
    raise exception 'El código no existe';
  end if;
  update public.profiles set grupo_id = v_grupo.id where id = auth.uid();
  return v_grupo.nombre || ' · ' || v_grupo.centro;
end;
$$;

grant execute on function public.unirme_a_grupo(text) to authenticated;

-- Al registrarse: además del nombre y la fecha, se guarda el grupo si trae código
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

  insert into public.profiles (id, display_name, birth_date, grupo_id)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nacimiento,
    v_grupo
  );

  return new;
end;
$$;
