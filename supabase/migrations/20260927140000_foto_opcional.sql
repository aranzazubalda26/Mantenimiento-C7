-- La foto deja de ser obligatoria al crear una orden (no siempre hace falta).
-- Se mantiene el maximo de 10.

create or replace function public.crear_orden(
  p_escuela_id bigint,
  p_fecha date,
  p_descripcion text,
  p_prioridad text,
  p_ubicacion text,
  p_fotos text[]
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id bigint;
  v_cant int := coalesce(array_length(p_fotos, 1), 0);
begin
  if v_cant > 10 then
    raise exception 'Máximo 10 fotos por orden.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.escuelas where id = p_escuela_id and activa) then
    raise exception 'La escuela no existe o está desactivada.' using errcode = '22023';
  end if;

  insert into public.ordenes_trabajo (escuela_id, fecha, descripcion, prioridad, ubicacion)
  values (p_escuela_id, p_fecha, trim(p_descripcion), p_prioridad, trim(p_ubicacion))
  returning id into v_id;

  if v_cant > 0 then
    insert into public.orden_fotos (orden_id, path)
    select v_id, f from unnest(p_fotos) as f;
  end if;

  return v_id;
end;
$$;
