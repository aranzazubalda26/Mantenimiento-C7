-- Las escuelas se identifican por la direccion (asi las conoce la gente que
-- trabaja ahi); el nombre oficial pasa a ser opcional.

alter table public.escuelas
  alter column direccion set not null,
  add constraint escuelas_direccion_check check (length(trim(direccion)) > 0),
  alter column nombre drop not null;

drop index public.escuelas_nombre_unico;
create unique index escuelas_direccion_unica on public.escuelas (lower(trim(direccion)));
