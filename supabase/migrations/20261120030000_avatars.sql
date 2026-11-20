-- Personaje (avatar) de cada usuario y su compañero guía
create table public.avatars (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  apariencia jsonb not null,
  companero text not null check (companero in ('chispa', 'pluma', 'coral')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.avatars enable row level security;

grant select, insert, update on public.avatars to authenticated;

create policy "Ver mi avatar" on public.avatars
  for select to authenticated
  using ((select auth.uid()) = profile_id);

create policy "Crear mi avatar" on public.avatars
  for insert to authenticated
  with check ((select auth.uid()) = profile_id);

create policy "Editar mi avatar" on public.avatars
  for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
