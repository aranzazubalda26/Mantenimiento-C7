-- Rol inspector/a: edita y borra ordenes pendientes de sus escuelas, reabre las
-- terminadas con motivo. Historial de cada orden (quien hizo que y cuando),
-- escrito por la base. Y cada usuario ve solo sus escuelas y la gente vinculada.
--
-- Quien puede que (ademas del RLS, que limita a las escuelas asignadas):
--   admin       : todo (en la app no reabre)
--   supervisor/a: pendiente -> terminada
--   inspector/a : editar y borrar mientras esta pendiente; reabrir una terminada con motivo

-- ---------------------------------------------------------------------------
-- Motivo de la ultima reapertura (se muestra destacado hasta que se vuelve a terminar)
-- ---------------------------------------------------------------------------
alter table public.ordenes_trabajo add column motivo_reapertura text;

-- ---------------------------------------------------------------------------
-- Reglas de cambios en ordenes (reemplaza la version anterior)
-- ---------------------------------------------------------------------------
create or replace function private.controlar_cambio_orden()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text;
  v_datos_cambian boolean;
begin
  if tg_op = 'INSERT' then
    -- Toda orden nueva arranca pendiente (salvo scripts sin sesion)
    if v_uid is not null then
      new.estado := 'solicitada';
      new.cerrada_at := null;
      new.cerrada_por := null;
      new.motivo_reapertura := null;
    end if;
    return new;
  end if;

  if v_uid is not null then
    v_rol := private.rol();

    if (new.escuela_id, new.creado_por, new.created_at) is distinct from (old.escuela_id, old.creado_por, old.created_at)
       and v_rol is distinct from 'admin' then
      raise exception 'No se puede cambiar la escuela ni el autor de la orden.' using errcode = '22023';
    end if;

    v_datos_cambian := (new.fecha, new.descripcion, new.prioridad, new.ubicacion)
      is distinct from (old.fecha, old.descripcion, old.prioridad, old.ubicacion);

    -- Editar datos: solo pendiente, admin o inspector/a, y sin cambiar el estado a la vez
    if v_datos_cambian then
      if old.estado <> 'solicitada' then
        raise exception 'Solo se pueden editar órdenes pendientes.' using errcode = '22023';
      end if;
      if v_rol not in ('admin', 'inspector') then
        raise exception 'No podés editar esta orden.' using errcode = '22023';
      end if;
      if new.estado <> old.estado then
        raise exception 'Editá la orden y cambiá el estado por separado.' using errcode = '22023';
      end if;
    end if;

    if new.estado <> old.estado then
      if new.estado = 'cerrada' and v_rol not in ('admin', 'supervisor') then
        raise exception 'Solo el supervisor/a puede marcar la orden como terminada.' using errcode = '22023';
      end if;
      if new.estado = 'solicitada' then
        if v_rol not in ('admin', 'inspector') then
          raise exception 'Solo el inspector/a puede reabrir una orden terminada.' using errcode = '22023';
        end if;
        if coalesce(length(trim(new.motivo_reapertura)), 0) = 0 then
          raise exception 'Escribí el motivo para reabrir la orden.' using errcode = '22023';
        end if;
      end if;
    elsif new.motivo_reapertura is distinct from old.motivo_reapertura then
      raise exception 'El motivo solo se carga al reabrir la orden.' using errcode = '22023';
    end if;
  end if;

  -- Datos de cierre y motivo: los pone la base
  if new.estado is distinct from old.estado then
    if new.estado = 'cerrada' then
      new.cerrada_at := now();
      new.cerrada_por := v_uid;
      new.motivo_reapertura := null;
    else
      new.cerrada_at := null;
      new.cerrada_por := null;
      new.motivo_reapertura := nullif(trim(new.motivo_reapertura), '');
    end if;
  elsif v_uid is not null then
    new.cerrada_at := old.cerrada_at;
    new.cerrada_por := old.cerrada_por;
  end if;

  return new;
end;
$$;

-- El inspector/a de la escuela puede actualizar sus ordenes (el trigger limita que)
create policy "ordenes: inspector de la escuela edita y reabre"
  on public.ordenes_trabajo for update to authenticated
  using (
    (select private.rol()) = 'inspector'
    and exists (select 1 from public.escuelas e where e.id = escuela_id and e.inspector_id = (select auth.uid()))
  )
  with check (
    (select private.rol()) = 'inspector'
    and exists (select 1 from public.escuelas e where e.id = escuela_id and e.inspector_id = (select auth.uid()))
  );

-- ... y borrarlas mientras estan pendientes
create policy "ordenes: inspector de la escuela borra pendientes"
  on public.ordenes_trabajo for delete to authenticated
  using (
    estado = 'solicitada'
    and (select private.rol()) = 'inspector'
    and exists (select 1 from public.escuelas e where e.id = escuela_id and e.inspector_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Fotos: agregar y quitar mientras la orden esta pendiente (admin o inspector/a de la escuela)
-- ---------------------------------------------------------------------------
drop policy "fotos: el creador de la orden las agrega desde su carpeta" on public.orden_fotos;
create policy "fotos: se agregan a ordenes pendientes editables"
  on public.orden_fotos for insert to authenticated
  with check (
    path like (select auth.uid())::text || '/%'
    and exists (
      select 1 from public.ordenes_trabajo o
      join public.escuelas e on e.id = o.escuela_id
      where o.id = orden_id
        and o.estado = 'solicitada'
        and ((select private.es_admin())
             or ((select private.rol()) = 'inspector' and e.inspector_id = (select auth.uid())))
    )
  );

drop policy "fotos: admin borra" on public.orden_fotos;
create policy "fotos: se quitan de ordenes pendientes editables"
  on public.orden_fotos for delete to authenticated
  using (
    (select private.es_admin())
    or exists (
      select 1 from public.ordenes_trabajo o
      join public.escuelas e on e.id = o.escuela_id
      where o.id = orden_id
        and o.estado = 'solicitada'
        and (select private.rol()) = 'inspector'
        and e.inspector_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Historial de cada orden (solo lo escribe la base, con triggers)
-- ---------------------------------------------------------------------------
create table public.orden_eventos (
  id bigint generated always as identity primary key,
  orden_id bigint not null references public.ordenes_trabajo (id) on delete cascade,
  tipo text not null check (tipo in ('creada', 'editada', 'terminada', 'reabierta')),
  autor uuid references public.perfiles (id),
  -- editada: {"campo": [antes, despues]} o {"fotos": "agregada"|"quitada"}; reabierta: {"motivo": "..."}
  detalle jsonb,
  created_at timestamptz not null default now()
);

create index orden_eventos_orden_idx on public.orden_eventos (orden_id, created_at);

alter table public.orden_eventos enable row level security;

create policy "eventos: visibles si se ve la orden"
  on public.orden_eventos for select to authenticated
  using (exists (select 1 from public.ordenes_trabajo o where o.id = orden_id));

revoke all on public.orden_eventos from anon;
revoke insert, update, delete on public.orden_eventos from authenticated;
grant select on public.orden_eventos to authenticated;

create or replace function private.registrar_evento_orden()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cambios jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.orden_eventos (orden_id, tipo, autor, created_at)
    values (new.id, 'creada', new.creado_por, new.created_at);
    return null;
  end if;

  if new.estado is distinct from old.estado then
    if new.estado = 'cerrada' then
      insert into public.orden_eventos (orden_id, tipo, autor) values (new.id, 'terminada', v_uid);
    else
      insert into public.orden_eventos (orden_id, tipo, autor, detalle)
      values (new.id, 'reabierta', v_uid, jsonb_build_object('motivo', new.motivo_reapertura));
    end if;
  end if;

  if new.descripcion is distinct from old.descripcion then
    v_cambios := v_cambios || jsonb_build_object('descripcion', jsonb_build_array(old.descripcion, new.descripcion));
  end if;
  if new.ubicacion is distinct from old.ubicacion then
    v_cambios := v_cambios || jsonb_build_object('ubicacion', jsonb_build_array(old.ubicacion, new.ubicacion));
  end if;
  if new.prioridad is distinct from old.prioridad then
    v_cambios := v_cambios || jsonb_build_object('prioridad', jsonb_build_array(old.prioridad, new.prioridad));
  end if;
  if new.fecha is distinct from old.fecha then
    v_cambios := v_cambios || jsonb_build_object('fecha', jsonb_build_array(old.fecha, new.fecha));
  end if;
  if v_cambios <> '{}'::jsonb then
    insert into public.orden_eventos (orden_id, tipo, autor, detalle) values (new.id, 'editada', v_uid, v_cambios);
  end if;

  return null;
end;
$$;

create trigger ordenes_trabajo_eventos
  after insert or update on public.ordenes_trabajo
  for each row execute function private.registrar_evento_orden();

create or replace function private.registrar_evento_foto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Las fotos de la carga inicial (misma transaccion que la orden) no son una edicion
    if exists (select 1 from public.ordenes_trabajo o where o.id = new.orden_id and o.created_at = now()) then
      return null;
    end if;
    insert into public.orden_eventos (orden_id, tipo, autor, detalle)
    values (new.orden_id, 'editada', auth.uid(), jsonb_build_object('fotos', 'agregada'));
  else
    -- Borrado en cascada de la orden entera: no hay a quien registrarlo
    if not exists (select 1 from public.ordenes_trabajo where id = old.orden_id) then
      return null;
    end if;
    insert into public.orden_eventos (orden_id, tipo, autor, detalle)
    values (old.orden_id, 'editada', auth.uid(), jsonb_build_object('fotos', 'quitada'));
  end if;
  return null;
end;
$$;

create trigger orden_fotos_eventos
  after insert or delete on public.orden_fotos
  for each row execute function private.registrar_evento_foto();

-- Historial de las ordenes que ya existen
insert into public.orden_eventos (orden_id, tipo, autor, created_at)
select id, 'creada', creado_por, created_at from public.ordenes_trabajo;
insert into public.orden_eventos (orden_id, tipo, autor, created_at)
select id, 'terminada', cerrada_por, cerrada_at from public.ordenes_trabajo where estado = 'cerrada';

-- ---------------------------------------------------------------------------
-- Cada usuario ve solo sus escuelas y la gente vinculada (no todo)
-- ---------------------------------------------------------------------------
drop policy "escuelas: usuarios activos ven todas" on public.escuelas;
create policy "escuelas: admin todas; el resto las asignadas"
  on public.escuelas for select to authenticated
  using (
    (select private.es_admin())
    or ((select private.rol()) is not null
        and (supervisor_id = (select auth.uid()) or inspector_id = (select auth.uid())))
  );

drop policy "perfiles: usuarios activos ven todos" on public.perfiles;
create policy "perfiles: admin todos; el resto uno mismo y la gente vinculada"
  on public.perfiles for select to authenticated
  using (
    (select private.es_admin())
    or id = (select auth.uid())
    or ((select private.rol()) is not null and (
      -- supervisor/a e inspector/a de mis escuelas (el RLS de escuelas ya filtra)
      exists (select 1 from public.escuelas e where e.supervisor_id = perfiles.id or e.inspector_id = perfiles.id)
      -- quien cargo o termino ordenes que puedo ver
      or exists (select 1 from public.ordenes_trabajo o where o.creado_por = perfiles.id or o.cerrada_por = perfiles.id)
      -- autores del historial de ordenes que puedo ver
      or exists (select 1 from public.orden_eventos v where v.autor = perfiles.id)
    ))
  );
