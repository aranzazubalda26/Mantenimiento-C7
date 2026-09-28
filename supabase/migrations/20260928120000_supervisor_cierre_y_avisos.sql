-- Rol supervisor/a: cierre con foto, "fuera de alcance", deshacer, "vista" y avisos.
--
--   - Estado nuevo 'fuera_de_alcance' (en la app: "Fuera de alcance"): lo que se cargo
--     como mantenimiento pero es obra y se factura aparte. Motivo obligatorio.
--   - Terminar pide al menos una foto del trabajo hecho (supervisor/a) y una nota
--     opcional. Las fotos de cierre se guardan en orden_fotos con tipo 'cierre'.
--   - Quien cerro (terminada o fuera de alcance) puede deshacerlo durante unos
--     segundos: la orden vuelve a pendiente como si nada (sin registro en el historial).
--   - "Vista": la primera vez que el supervisor/a abre la orden queda en el historial.
--   - Avisos (campanita): los escribe la base a partir del historial. Al supervisor/a
--     le llega lo que hace el inspector/a en sus escuelas y al reves.
--
-- cerrada_at / cerrada_por pasan a ser "cuando y quien la resolvio" (terminada o
-- fuera de alcance). nota_cierre: nota al terminar (opcional) o motivo de fuera de
-- alcance (obligatorio).

-- ---------------------------------------------------------------------------
-- Estados y datos de cierre
-- ---------------------------------------------------------------------------
alter table public.ordenes_trabajo add column nota_cierre text;

alter table public.ordenes_trabajo
  drop constraint ordenes_trabajo_estado_check,
  add constraint ordenes_trabajo_estado_check check (estado in ('solicitada', 'cerrada', 'fuera_de_alcance')),
  drop constraint ordenes_trabajo_cierre_check,
  add constraint ordenes_trabajo_cierre_check check ((estado <> 'solicitada') = (cerrada_at is not null)),
  add constraint ordenes_trabajo_fuera_motivo_check
    check (estado <> 'fuera_de_alcance' or coalesce(length(trim(nota_cierre)), 0) > 0),
  add constraint ordenes_trabajo_nota_cierre_largo check (length(nota_cierre) <= 500);

-- Ventana para deshacer un cierre (la app muestra 10 segundos desde que carga la pantalla
-- siguiente; el resto es margen para conexiones lentas en la calle)
create or replace function private.es_deshacer(p_cerrada_por uuid, p_cerrada_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null
     and p_cerrada_por = auth.uid()
     and p_cerrada_at is not null
     and now() - p_cerrada_at <= interval '30 seconds'
$$;

grant execute on function private.es_deshacer(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Fotos: 'problema' (las del inspector/a) o 'cierre' (las del trabajo hecho)
-- ---------------------------------------------------------------------------
alter table public.orden_fotos
  add column tipo text not null default 'problema' check (tipo in ('problema', 'cierre'));

-- El inspector/a solo agrega y quita fotos del problema (las de cierre entran por terminar_orden)
drop policy "fotos: se agregan a ordenes pendientes editables" on public.orden_fotos;
create policy "fotos: se agregan a ordenes pendientes editables"
  on public.orden_fotos for insert to authenticated
  with check (
    tipo = 'problema'
    and path like (select auth.uid())::text || '/%'
    and exists (
      select 1 from public.ordenes_trabajo o
      join public.escuelas e on e.id = o.escuela_id
      where o.id = orden_id
        and o.estado = 'solicitada'
        and ((select private.es_admin())
             or ((select private.rol()) = 'inspector' and e.inspector_id = (select auth.uid())))
    )
  );

drop policy "fotos: se quitan de ordenes pendientes editables" on public.orden_fotos;
create policy "fotos: se quitan de ordenes pendientes editables"
  on public.orden_fotos for delete to authenticated
  using (
    (select private.es_admin())
    or (
      tipo = 'problema'
      and exists (
        select 1 from public.ordenes_trabajo o
        join public.escuelas e on e.id = o.escuela_id
        where o.id = orden_id
          and o.estado = 'solicitada'
          and (select private.rol()) = 'inspector'
          and e.inspector_id = (select auth.uid())
      )
    )
  );

-- El supervisor/a sube las fotos del trabajo hecho (a su carpeta, como todos)
drop policy "ordenes-fotos: admin o inspector sube a su carpeta" on storage.objects;
create policy "ordenes-fotos: cada usuario activo sube a su carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ordenes-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.rol()) in ('admin', 'inspector', 'supervisor')
  );

-- ---------------------------------------------------------------------------
-- Historial: tipos nuevos
-- ---------------------------------------------------------------------------
alter table public.orden_eventos
  drop constraint orden_eventos_tipo_check,
  add constraint orden_eventos_tipo_check
    check (tipo in ('creada', 'editada', 'terminada', 'fuera_de_alcance', 'reabierta', 'vista'));

-- ---------------------------------------------------------------------------
-- Reglas de cambios en ordenes (reemplaza la version anterior)
--   admin        : todo
--   supervisor/a : pendiente -> terminada (con foto de cierre) o fuera de alcance (con motivo)
--   inspector/a  : editar mientras esta pendiente; reabrir una resuelta con motivo
--   quien cerro  : deshacer el cierre dentro de la ventana (private.es_deshacer)
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
  v_deshacer boolean := false;
begin
  if tg_op = 'INSERT' then
    -- Toda orden nueva arranca pendiente (salvo scripts sin sesion)
    if v_uid is not null then
      new.estado := 'solicitada';
      new.cerrada_at := null;
      new.cerrada_por := null;
      new.motivo_reapertura := null;
      new.nota_cierre := null;
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
      if new.estado in ('cerrada', 'fuera_de_alcance') then
        if old.estado <> 'solicitada' and v_rol <> 'admin' then
          raise exception 'La orden ya no está pendiente.' using errcode = '22023';
        end if;
        if v_rol not in ('admin', 'supervisor') then
          raise exception 'Solo el supervisor/a puede cerrar la orden.' using errcode = '22023';
        end if;
        if new.estado = 'fuera_de_alcance' and coalesce(length(trim(new.nota_cierre)), 0) = 0 then
          raise exception 'Escribí por qué no corresponde a mantenimiento.' using errcode = '22023';
        end if;
        -- Terminar: el supervisor/a adjunta al menos una foto del trabajo hecho (ver terminar_orden)
        if new.estado = 'cerrada' and v_rol = 'supervisor' and not exists (
          select 1 from public.orden_fotos f
          where f.orden_id = new.id and f.tipo = 'cierre' and f.created_at = now()
        ) then
          raise exception 'Sacá al menos una foto del trabajo terminado.' using errcode = '22023';
        end if;
      else
        -- Volver a pendiente: deshacer (quien cerro, dentro de la ventana) o reabrir (inspector/a)
        v_deshacer := private.es_deshacer(old.cerrada_por, old.cerrada_at);
        if not v_deshacer then
          if v_rol not in ('admin', 'inspector') then
            raise exception 'Solo el inspector/a puede reabrir la orden.' using errcode = '22023';
          end if;
          if coalesce(length(trim(new.motivo_reapertura)), 0) = 0 then
            raise exception 'Escribí el motivo para reabrir la orden.' using errcode = '22023';
          end if;
        end if;
      end if;
    else
      if new.motivo_reapertura is distinct from old.motivo_reapertura then
        raise exception 'El motivo solo se carga al reabrir la orden.' using errcode = '22023';
      end if;
      if new.nota_cierre is distinct from old.nota_cierre then
        raise exception 'La nota solo se carga al cerrar la orden.' using errcode = '22023';
      end if;
    end if;
  end if;

  -- Datos de cierre, nota y motivo: los pone la base
  if new.estado is distinct from old.estado then
    if new.estado <> 'solicitada' then
      new.cerrada_at := now();
      new.cerrada_por := v_uid;
      new.motivo_reapertura := null;
      new.nota_cierre := nullif(trim(new.nota_cierre), '');
    else
      new.cerrada_at := null;
      new.cerrada_por := null;
      new.nota_cierre := null;
      if v_deshacer then
        -- Queda como estaba antes del cierre: si venia reabierta, recupera su motivo
        new.motivo_reapertura := (
          select case when v.tipo = 'reabierta' then v.detalle ->> 'motivo' end
          from public.orden_eventos v
          where v.orden_id = new.id and v.tipo in ('creada', 'reabierta')
          order by v.created_at desc, v.id desc
          limit 1
        );
      else
        new.motivo_reapertura := nullif(trim(new.motivo_reapertura), '');
      end if;
    end if;
  elsif v_uid is not null then
    new.cerrada_at := old.cerrada_at;
    new.cerrada_por := old.cerrada_por;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Historial de la orden (reemplaza la version anterior)
-- Deshacer no deja rastro: borra el registro del cierre, sus fotos y sus avisos.
-- ---------------------------------------------------------------------------
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
      insert into public.orden_eventos (orden_id, tipo, autor, detalle)
      values (new.id, 'terminada', v_uid,
              case when new.nota_cierre is not null then jsonb_build_object('nota', new.nota_cierre) end);
    elsif new.estado = 'fuera_de_alcance' then
      insert into public.orden_eventos (orden_id, tipo, autor, detalle)
      values (new.id, 'fuera_de_alcance', v_uid, jsonb_build_object('motivo', new.nota_cierre));
    elsif old.cerrada_at is not null and private.es_deshacer(old.cerrada_por, old.cerrada_at) then
      delete from public.orden_eventos
      where orden_id = new.id and tipo in ('terminada', 'fuera_de_alcance') and created_at = old.cerrada_at;
      delete from public.orden_fotos
      where orden_id = new.id and tipo = 'cierre' and created_at = old.cerrada_at;
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

-- Fotos en el historial: solo las del problema cuentan como edicion
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
    if new.tipo = 'cierre' then
      return null;
    end if;
    -- Las fotos de la carga inicial (misma transaccion que la orden) no son una edicion
    if exists (select 1 from public.ordenes_trabajo o where o.id = new.orden_id and o.created_at = now()) then
      return null;
    end if;
    v_orden := new.orden_id;
    v_clave := 'fotos_agregadas';
  else
    if old.tipo = 'cierre' then
      return null;
    end if;
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

-- ---------------------------------------------------------------------------
-- Editar una orden: el maximo de 10 y las fotos a quitar son solo las del problema
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
  where orden_id = p_id and tipo = 'problema' and not (id = any (coalesce(p_fotos_quitar, '{}')));
  if v_quedan + coalesce(array_length(p_fotos_nuevas, 1), 0) > 10 then
    raise exception 'Máximo 10 fotos por orden.' using errcode = '22023';
  end if;

  -- Primero los datos y despues las fotos: el historial suma todo en un registro
  update public.ordenes_trabajo
  set fecha = p_fecha, descripcion = trim(p_descripcion), prioridad = p_prioridad, ubicacion = trim(p_ubicacion)
  where id = p_id;

  with quitadas as (
    delete from public.orden_fotos
    where orden_id = p_id and tipo = 'problema' and id = any (coalesce(p_fotos_quitar, '{}'))
    returning path
  )
  select coalesce(array_agg(path), '{}') into v_quitadas from quitadas;

  insert into public.orden_fotos (orden_id, path)
  select p_id, f from unnest(coalesce(p_fotos_nuevas, '{}')) as f;

  return v_quitadas;
end;
$$;

-- ---------------------------------------------------------------------------
-- Terminar una orden: fotos de cierre + estado en una sola transaccion.
-- security definer porque nadie puede insertar fotos de cierre por su cuenta
-- (asi no quedan fotos "del despues" sueltas en ordenes pendientes). Controla
-- a mano lo que haria el RLS; el trigger de ordenes vuelve a validar el cambio.
-- ---------------------------------------------------------------------------
create or replace function public.terminar_orden(p_id bigint, p_nota text, p_fotos text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol text := private.rol();
  v_estado text;
  v_supervisor uuid;
  v_cant int := coalesce(array_length(p_fotos, 1), 0);
begin
  select o.estado, e.supervisor_id into v_estado, v_supervisor
  from public.ordenes_trabajo o
  join public.escuelas e on e.id = o.escuela_id
  where o.id = p_id
  for update of o;

  if v_estado is null or v_uid is null
     or not (v_rol = 'admin' or (v_rol = 'supervisor' and v_supervisor = v_uid)) then
    raise exception 'No tenés permiso sobre esta orden.' using errcode = '22023';
  end if;
  if v_estado <> 'solicitada' then
    raise exception 'La orden ya no está pendiente.' using errcode = '22023';
  end if;
  if v_cant > 5 then
    raise exception 'Máximo 5 fotos del trabajo terminado.' using errcode = '22023';
  end if;
  -- Solo "<usuario>/<nombre>.<ext>" en la carpeta propia: nada de subcarpetas ni ".."
  if exists (
    select 1 from unnest(coalesce(p_fotos, '{}')) f
    where f !~ ('^' || v_uid::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')
  ) then
    raise exception 'Fotos inválidas.' using errcode = '22023';
  end if;
  if length(p_nota) > 500 then
    raise exception 'La nota es demasiado larga.' using errcode = '22023';
  end if;

  insert into public.orden_fotos (orden_id, path, tipo)
  select p_id, f, 'cierre' from unnest(coalesce(p_fotos, '{}')) as f;

  update public.ordenes_trabajo set estado = 'cerrada', nota_cierre = p_nota where id = p_id;
end;
$$;

revoke execute on function public.terminar_orden from public, anon;
grant execute on function public.terminar_orden to authenticated;

-- ---------------------------------------------------------------------------
-- Deshacer un cierre (terminada o fuera de alcance) dentro de la ventana.
-- Devuelve las rutas de las fotos de cierre que se quitaron, para borrar los archivos.
-- ---------------------------------------------------------------------------
create or replace function public.deshacer_cierre(p_id bigint)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_orden record;
  v_paths text[];
begin
  select estado, cerrada_por, cerrada_at into v_orden
  from public.ordenes_trabajo where id = p_id for update;

  if v_orden.estado is null or v_orden.estado = 'solicitada'
     or not private.es_deshacer(v_orden.cerrada_por, v_orden.cerrada_at) then
    raise exception 'Ya no se puede deshacer.' using errcode = '22023';
  end if;

  select coalesce(array_agg(path), '{}') into v_paths
  from public.orden_fotos
  where orden_id = p_id and tipo = 'cierre' and created_at = v_orden.cerrada_at;

  -- El trigger del historial borra el registro del cierre, sus fotos y sus avisos
  update public.ordenes_trabajo set estado = 'solicitada' where id = p_id;
  if not found then
    raise exception 'No tenés permiso sobre esta orden.' using errcode = '22023';
  end if;

  return v_paths;
end;
$$;

revoke execute on function public.deshacer_cierre from public, anon;
grant execute on function public.deshacer_cierre to authenticated;

-- ---------------------------------------------------------------------------
-- Avisos (campanita). Solo los escribe la base; cada uno ve y marca los suyos.
--   al supervisor/a: creada, editada, reabierta, borrada
--   al inspector/a : terminada, fuera_de_alcance
-- orden_id queda null si la orden se borro (el aviso 'borrada' guarda en
-- detalle el numero, la descripcion y la escuela). evento_id: el registro del
-- historial que lo genero (si se borra, p. ej. al deshacer, se va el aviso).
-- ---------------------------------------------------------------------------
create table public.avisos (
  id bigint generated always as identity primary key,
  destinatario uuid not null references public.perfiles (id) on delete cascade,
  tipo text not null check (tipo in ('creada', 'editada', 'reabierta', 'borrada', 'terminada', 'fuera_de_alcance')),
  orden_id bigint references public.ordenes_trabajo (id) on delete set null,
  evento_id bigint references public.orden_eventos (id) on delete cascade,
  autor uuid references public.perfiles (id) on delete set null,
  urgente boolean not null default false,
  detalle jsonb,
  leido_at timestamptz,
  created_at timestamptz not null default now()
);

create index avisos_destinatario_idx on public.avisos (destinatario, created_at desc);
create index avisos_no_leidos_idx on public.avisos (destinatario) where leido_at is null;
create index avisos_orden_idx on public.avisos (orden_id);
create index avisos_evento_idx on public.avisos (evento_id);

alter table public.avisos enable row level security;

create policy "avisos: cada uno los suyos"
  on public.avisos for select to authenticated
  using (destinatario = (select auth.uid()) and (select private.rol()) is not null);

-- Marcar como leido: solo la columna leido_at, solo los propios
create policy "avisos: cada uno marca los suyos"
  on public.avisos for update to authenticated
  using (destinatario = (select auth.uid()))
  with check (destinatario = (select auth.uid()));

revoke all on public.avisos from anon, authenticated;
grant select on public.avisos to authenticated;
grant update (leido_at) on public.avisos to authenticated;

-- Genera el aviso de cada registro nuevo del historial
create or replace function private.avisar_evento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destinatario uuid;
  v_urgente boolean := false;
  v_prioridad text;
begin
  select case when new.tipo in ('terminada', 'fuera_de_alcance') then e.inspector_id
              when new.tipo in ('creada', 'editada', 'reabierta') then e.supervisor_id end,
         o.prioridad
  into v_destinatario, v_prioridad
  from public.ordenes_trabajo o
  join public.escuelas e on e.id = o.escuela_id
  where o.id = new.orden_id;

  -- 'vista' no avisa; nadie recibe avisos de lo que hizo el mismo
  if v_destinatario is null or v_destinatario is not distinct from new.autor then
    return null;
  end if;

  v_urgente := case new.tipo
    when 'creada' then v_prioridad = 'urgente'
    when 'editada' then new.detalle -> 'prioridad' ->> 1 = 'urgente'
    when 'reabierta' then true
    when 'fuera_de_alcance' then true
    else false
  end;

  insert into public.avisos (destinatario, tipo, orden_id, evento_id, autor, urgente, created_at)
  values (v_destinatario, new.tipo, new.orden_id, new.id, new.autor, coalesce(v_urgente, false), new.created_at);
  return null;
end;
$$;

create trigger orden_eventos_avisar
  after insert on public.orden_eventos
  for each row execute function private.avisar_evento();

-- Una edicion suma fotos al mismo registro (update): si ese cambio la hace urgente, el aviso tambien
create or replace function private.avisar_evento_editado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.detalle -> 'prioridad' ->> 1 = 'urgente' then
    update public.avisos set urgente = true where evento_id = new.id;
  end if;
  return null;
end;
$$;

create trigger orden_eventos_avisar_editado
  after update of detalle on public.orden_eventos
  for each row execute function private.avisar_evento_editado();

-- Orden borrada: aviso al supervisor/a con los datos que se pierden
create or replace function private.avisar_borrado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_supervisor uuid;
  v_direccion text;
begin
  select supervisor_id, direccion into v_supervisor, v_direccion from public.escuelas where id = old.escuela_id;
  if v_uid is null or v_supervisor is null or v_supervisor = v_uid then
    return null;
  end if;
  insert into public.avisos (destinatario, tipo, autor, urgente, detalle)
  values (v_supervisor, 'borrada', v_uid, false,
          jsonb_build_object('orden', old.id, 'descripcion', old.descripcion, 'escuela', v_direccion,
                             'escuela_id', old.escuela_id, 'ubicacion', old.ubicacion));
  return null;
end;
$$;

create trigger ordenes_trabajo_avisar_borrado
  after delete on public.ordenes_trabajo
  for each row execute function private.avisar_borrado();

-- ---------------------------------------------------------------------------
-- Abrir una orden: marca sus avisos como leidos y, si es el supervisor/a de la
-- escuela y la orden esta pendiente, registra "vista" (una vez desde que se
-- cargo o se reabrio). Devuelve true si cambio algo (para refrescar la pantalla).
-- ---------------------------------------------------------------------------
create or replace function public.abrir_orden(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_estado text;
  v_supervisor uuid;
  v_leidos int;
begin
  if v_uid is null or private.rol() is null then
    return false;
  end if;

  update public.avisos set leido_at = now()
  where destinatario = v_uid and orden_id = p_id and leido_at is null;
  get diagnostics v_leidos = row_count;

  if private.rol() <> 'supervisor' then
    return v_leidos > 0;
  end if;

  -- Dos pestañas abiertas a la vez no registran dos veces
  perform pg_advisory_xact_lock(hashtextextended('abrir_orden', p_id));

  select o.estado, e.supervisor_id into v_estado, v_supervisor
  from public.ordenes_trabajo o
  join public.escuelas e on e.id = o.escuela_id
  where o.id = p_id;

  if v_estado = 'solicitada' and v_supervisor = v_uid and not exists (
    select 1 from public.orden_eventos v
    where v.orden_id = p_id and v.tipo = 'vista' and v.autor = v_uid
      and v.created_at >= (
        select max(x.created_at) from public.orden_eventos x
        where x.orden_id = p_id and x.tipo in ('creada', 'reabierta')
      )
  ) then
    insert into public.orden_eventos (orden_id, tipo, autor) values (p_id, 'vista', v_uid);
    return true;
  end if;
  return v_leidos > 0;
end;
$$;

revoke execute on function public.abrir_orden from public, anon;
grant execute on function public.abrir_orden to authenticated;

-- Contador de la campanita en vivo (Supabase Realtime respeta el RLS de la tabla)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.avisos;
  end if;
end;
$$;
