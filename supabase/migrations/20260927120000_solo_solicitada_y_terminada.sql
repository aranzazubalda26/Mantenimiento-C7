-- Se simplifican los estados: solo solicitada y cerrada (en la app: "Terminada").
-- "En proceso" no se usa: nadie en obra va a actualizarlo.

update public.ordenes_trabajo set estado = 'solicitada' where estado = 'en_proceso';

alter table public.ordenes_trabajo
  drop constraint ordenes_trabajo_estado_check,
  add constraint ordenes_trabajo_estado_check check (estado in ('solicitada', 'cerrada'));
