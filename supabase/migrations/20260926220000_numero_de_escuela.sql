-- El id de la escuela pasa a ser su numero interno (el que usa la empresa en
-- sus planillas), asi hay una sola identificacion. Se carga a mano al crearla.

alter table public.escuelas alter column id drop identity;

alter table public.escuelas
  add constraint escuelas_id_positivo check (id > 0);

-- Si se corrige el numero de una escuela, sus ordenes lo siguen
alter table public.ordenes_trabajo
  drop constraint ordenes_trabajo_escuela_id_fkey,
  add constraint ordenes_trabajo_escuela_id_fkey
    foreign key (escuela_id) references public.escuelas (id) on update cascade;
