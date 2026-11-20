-- Al registrarse, el perfil guarda el nombre y la fecha de nacimiento
-- que el usuario escribió en el formulario. También se valida la edad
-- mínima (15 años) en el servidor, no solo en la app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  nacimiento date;
begin
  nacimiento := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;

  if nacimiento is null then
    raise exception 'Se requiere la fecha de nacimiento';
  end if;

  if nacimiento > (current_date - interval '15 years') then
    raise exception 'Horizonte es para personas de 15 años en adelante';
  end if;

  insert into public.profiles (id, display_name, birth_date)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nacimiento
  );

  return new;
end;
$$;
