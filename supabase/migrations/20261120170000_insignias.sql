-- Insignias de cualidades que gana cada usuario
create table public.insignias (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cualidad text not null,
  nivel text not null default 'bronce' check (nivel in ('bronce', 'plata', 'oro')),
  origen text,
  created_at timestamptz not null default now(),
  unique (profile_id, cualidad, nivel)
);

alter table public.insignias enable row level security;

grant select, insert on public.insignias to authenticated;

create policy "Ver mis insignias" on public.insignias
  for select to authenticated
  using ((select auth.uid()) = profile_id);

create policy "Ganar mis insignias" on public.insignias
  for insert to authenticated
  with check ((select auth.uid()) = profile_id);
