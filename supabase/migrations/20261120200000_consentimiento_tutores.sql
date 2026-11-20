-- Autorización de madre, padre o tutor para usuarios de 15 a 17 años.
-- El joven genera un enlace único y se lo envía a su tutor; el tutor lo abre
-- sin necesidad de cuenta y responde. También se puede registrar una
-- autorización firmada en papel (origen = 'papel') desde el panel de Supabase.

create table public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aceptado', 'rechazado')),
  origen text not null default 'enlace' check (origen in ('enlace', 'papel')),
  tutor_nombre text,
  tutor_relacion text,
  terminos_version text not null default '2026-11-borrador-1',
  respondido_en timestamptz,
  created_at timestamptz not null default now()
);

alter table public.guardian_consents enable row level security;

-- Supabase da permisos amplios por defecto a las tablas nuevas: se quitan todos.
revoke all on public.guardian_consents from anon, authenticated;

-- El joven puede ver sus solicitudes y crear una nueva, pero solo indicando
-- su propio id: no puede marcarse a sí mismo como autorizado.
grant select on public.guardian_consents to authenticated;
grant insert (profile_id) on public.guardian_consents to authenticated;

create policy "Ver mis autorizaciones" on public.guardian_consents
  for select to authenticated
  using ((select auth.uid()) = profile_id);

create policy "Solicitar mi autorización" on public.guardian_consents
  for insert to authenticated
  with check ((select auth.uid()) = profile_id);

-- Estado de la autorización del usuario que tiene la sesión iniciada:
-- no-requerido | aceptado | pendiente | rechazado | sin-solicitud
create function public.mi_estado_consentimiento()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select case
    when p.birth_date is null or p.birth_date <= (current_date - interval '18 years') then 'no-requerido'
    when exists (
      select 1 from public.guardian_consents c
      where c.profile_id = p.id and c.estado = 'aceptado'
    ) then 'aceptado'
    else coalesce((
      select c.estado from public.guardian_consents c
      where c.profile_id = p.id
      order by c.created_at desc
      limit 1
    ), 'sin-solicitud')
  end
  from public.profiles p
  where p.id = auth.uid()
$$;

grant execute on function public.mi_estado_consentimiento() to authenticated;

-- Para la página del tutor (sin cuenta): datos mínimos de una solicitud
create function public.ver_consentimiento(p_token text)
returns table (nombre text, estado text)
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(nullif(p.display_name, ''), 'tu hijo o hija'), c.estado
  from public.guardian_consents c
  join public.profiles p on p.id = c.profile_id
  where c.token = p_token
$$;

grant execute on function public.ver_consentimiento(text) to anon, authenticated;

-- Respuesta del tutor: solo se puede responder una vez
create function public.responder_consentimiento(
  p_token text,
  p_nombre text,
  p_relacion text,
  p_acepta boolean
)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_estado text;
begin
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre de quien autoriza';
  end if;

  update public.guardian_consents
  set estado = case when p_acepta then 'aceptado' else 'rechazado' end,
      tutor_nombre = left(trim(p_nombre), 120),
      tutor_relacion = left(coalesce(p_relacion, ''), 40),
      respondido_en = now()
  where token = p_token and estado = 'pendiente'
  returning estado into v_estado;

  if v_estado is null then
    raise exception 'El enlace no es válido o ya fue utilizado';
  end if;

  return v_estado;
end;
$$;

grant execute on function public.responder_consentimiento(text, text, text, boolean) to anon, authenticated;
