-- Estados de las ordenes: solicitada -> en_proceso -> cerrada.
-- El supervisor de la escuela (o el admin) la cierra; la base registra sola
-- cuando y quien la cerro.

alter table public.ordenes_trabajo drop constraint ordenes_trabajo_estado_check;

alter table public.ordenes_trabajo
  add column cerrada_at timestamptz,
  add column cerrada_por uuid references public.perfiles (id);

-- Por si hubiera datos con los estados viejos
update public.ordenes_trabajo
set estado = case estado when 'pendiente' then 'solicitada' when 'finalizada' then 'cerrada' else estado end,
    cerrada_at = case when estado = 'finalizada' then updated_at end;

alter table public.ordenes_trabajo
  alter column estado set default 'solicitada',
  add constraint ordenes_trabajo_estado_check
    check (estado in ('solicitada', 'en_proceso', 'cerrada')),
  add constraint ordenes_trabajo_cierre_check
    check ((estado = 'cerrada') = (cerrada_at is not null));

-- ---------------------------------------------------------------------------
-- Reglas de cambios (se aplican a cualquier camino: app, API, SQL con sesion)
--  - Quien no es admin solo puede cambiar el estado, nunca otros datos.
--  - Una orden cerrada solo la reabre un admin.
--  - Fecha/hora y autor del cierre los pone la base, no el usuario.
--  - Sin sesion (scripts con service_role / SQL directo) no se restringe.
-- ---------------------------------------------------------------------------
create or replace function private.controlar_cambio_orden()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := private.es_admin();
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

  if v_uid is not null and not v_admin then
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

create trigger ordenes_trabajo_controlar_cambio
  before insert or update on public.ordenes_trabajo
  for each row execute function private.controlar_cambio_orden();

-- El supervisor de la escuela puede actualizar sus ordenes (el trigger limita a estado)
create policy "ordenes: supervisor de la escuela cambia el estado"
  on public.ordenes_trabajo for update to authenticated
  using (
    (select private.rol()) = 'supervisor'
    and exists (
      select 1 from public.escuelas e
      where e.id = escuela_id and e.supervisor_id = (select auth.uid())
    )
  )
  with check (
    (select private.rol()) = 'supervisor'
    and exists (
      select 1 from public.escuelas e
      where e.id = escuela_id and e.supervisor_id = (select auth.uid())
    )
  );

create index ordenes_trabajo_estado_idx on public.ordenes_trabajo (estado);
