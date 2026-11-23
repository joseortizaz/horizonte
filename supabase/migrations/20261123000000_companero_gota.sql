-- Nuevo compañero ilustrado: Gota
alter table public.avatars drop constraint if exists avatars_companero_check;
alter table public.avatars add constraint avatars_companero_check
  check (companero in ('gota', 'chispa', 'pluma', 'coral'));
