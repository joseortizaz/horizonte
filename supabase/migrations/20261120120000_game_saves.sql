-- Partida guardada de cada usuario: región, faros encendidos y posición
create table public.game_saves (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  region text not null default 'raices',
  faros_encendidos text[] not null default '{}',
  posicion jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

grant select, insert, update on public.game_saves to authenticated;

create policy "Ver mi partida" on public.game_saves
  for select to authenticated
  using ((select auth.uid()) = profile_id);

create policy "Crear mi partida" on public.game_saves
  for insert to authenticated
  with check ((select auth.uid()) = profile_id);

create policy "Editar mi partida" on public.game_saves
  for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
