-- Perfil de cada usuario, vinculado a su cuenta de Supabase Auth
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  birth_date date,
  role text not null default 'player'
    check (role in ('player', 'counselor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seguridad por fila: cada usuario solo ve y edita su propio perfil
alter table public.profiles enable row level security;

create policy "Ver mi perfil" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Editar mi perfil" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- El usuario puede cambiar su nombre y fecha de nacimiento, pero no su rol
revoke update on public.profiles from authenticated;
grant update (display_name, birth_date) on public.profiles to authenticated;

-- Crea el perfil automáticamente cuando alguien se registra
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();