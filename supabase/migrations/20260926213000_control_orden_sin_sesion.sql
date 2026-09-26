-- El control de cambios de ordenes consultaba el rol antes de saber si habia
-- sesion: los procesos del servidor con service_role (scripts, importaciones)
-- no tienen permiso sobre el schema private y fallaban. Ahora solo se consulta
-- el rol cuando hay un usuario logueado.

create or replace function private.controlar_cambio_orden()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    -- Toda orden nueva arranca solicitada (salvo scripts sin sesion)
    if v_uid is not null then
      new.estado := 'solicitada';
      new.cerrada_at := null;
      new.cerrada_por := null;
    end if;
    return new;
  end if;

  if v_uid is not null and not private.es_admin() then
    if (new.escuela_id, new.fecha, new.descripcion, new.prioridad, new.ubicacion, new.creado_por, new.created_at)
       is distinct from
       (old.escuela_id, old.fecha, old.descripcion, old.prioridad, old.ubicacion, old.creado_por, old.created_at) then
      raise exception 'Solo podés cambiar el estado de la orden.' using errcode = '22023';
    end if;
    if old.estado = 'cerrada' then
      raise exception 'La orden ya está cerrada. Solo un administrador puede reabrirla.' using errcode = '22023';
    end if;
  end if;

  if new.estado is distinct from old.estado then
    if new.estado = 'cerrada' then
      new.cerrada_at := now();
      new.cerrada_por := v_uid;
    else
      new.cerrada_at := null;
      new.cerrada_por := null;
    end if;
  elsif v_uid is not null then
    -- Los datos de cierre no se editan a mano
    new.cerrada_at := old.cerrada_at;
    new.cerrada_por := old.cerrada_por;
  end if;

  return new;
end;
$$;
