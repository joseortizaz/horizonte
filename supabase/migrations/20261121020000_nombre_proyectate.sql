-- Cambio de nombre: Horizonte pasa a llamarse Proyéctate.
-- Solo se actualiza el mensaje que ve quien intenta registrarse con menos de 15 años.

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
    raise exception 'Proyéctate es para personas de 15 años en adelante';
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
