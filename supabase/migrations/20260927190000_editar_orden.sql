-- Editar una orden pendiente: datos y fotos se guardan juntos (todo o nada) y
-- quedan en un solo registro del historial.

-- ---------------------------------------------------------------------------
-- Corre con los permisos del usuario: el RLS y el trigger de ordenes deciden
-- quien puede (admin o inspector/a de la escuela, solo mientras esta pendiente).
-- Devuelve las rutas de las fotos quitadas, para borrar los archivos.
-- ---------------------------------------------------------------------------
create or replace function public.editar_orden(
  p_id bigint,
  p_fecha date,
  p_descripcion text,
  p_prioridad text,
  p_ubicacion text,
  p_fotos_nuevas text[],
  p_fotos_quitar bigint[]
)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_estado text;
  v_quedan int;
  v_quitadas text[];
begin
  -- Bloquea la orden: que nadie la termine mientras se guarda
  select estado into v_estado from public.ordenes_trabajo where id = p_id for update;
  if v_estado is null or coalesce(private.rol(), '') not in ('admin', 'inspector') then
    raise exception 'No podés editar esta orden.' using errcode = '22023';
  end if;
  if v_estado <> 'solicitada' then
    raise exception 'Solo se pueden editar órdenes pendientes.' using errcode = '22023';
  end if;

  select count(*) into v_quedan from public.orden_fotos
  where orden_id = p_id and not (id = any (coalesce(p_fotos_quitar, '{}')));
  if v_quedan + coalesce(array_length(p_fotos_nuevas, 1), 0) > 10 then
    raise exception 'Máximo 10 fotos por orden.' using errcode = '22023';
  end if;

  -- Primero los datos y despues las fotos: el historial suma todo en un registro
  update public.ordenes_trabajo
  set fecha = p_fecha, descripcion = trim(p_descripcion), prioridad = p_prioridad, ubicacion = trim(p_ubicacion)
  where id = p_id;

  with quitadas as (
    delete from public.orden_fotos
    where orden_id = p_id and id = any (coalesce(p_fotos_quitar, '{}'))
    returning path
  )
  select coalesce(array_agg(path), '{}') into v_quitadas from quitadas;

  insert into public.orden_fotos (orden_id, path)
  select p_id, f from unnest(coalesce(p_fotos_nuevas, '{}')) as f;

  return v_quitadas;
end;
$$;

revoke execute on function public.editar_orden from public, anon;
grant execute on function public.editar_orden to authenticated;

-- ---------------------------------------------------------------------------
-- Historial de fotos: cuenta las agregadas y quitadas dentro del registro
-- "editada" de la misma edicion (misma transaccion y autor), o crea uno.
-- detalle: {"fotos_agregadas": n, "fotos_quitadas": n} junto a los campos cambiados
-- ---------------------------------------------------------------------------
create or replace function private.registrar_evento_foto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orden bigint;
  v_clave text;
begin
  if tg_op = 'INSERT' then
    -- Las fotos de la carga inicial (misma transaccion que la orden) no son una edicion
    if exists (select 1 from public.ordenes_trabajo o where o.id = new.orden_id and o.created_at = now()) then
      return null;
    end if;
    v_orden := new.orden_id;
    v_clave := 'fotos_agregadas';
  else
    -- Borrado en cascada de la orden entera: no hay a quien registrarlo
    if not exists (select 1 from public.ordenes_trabajo where id = old.orden_id) then
      return null;
    end if;
    v_orden := old.orden_id;
    v_clave := 'fotos_quitadas';
  end if;

  update public.orden_eventos
  set detalle = coalesce(detalle, '{}'::jsonb)
                || jsonb_build_object(v_clave, coalesce((detalle ->> v_clave)::int, 0) + 1)
  where orden_id = v_orden
    and tipo = 'editada'
    and autor is not distinct from auth.uid()
    and created_at = now();
  if not found then
    insert into public.orden_eventos (orden_id, tipo, autor, detalle)
    values (v_orden, 'editada', auth.uid(), jsonb_build_object(v_clave, 1));
  end if;
  return null;
end;
$$;
