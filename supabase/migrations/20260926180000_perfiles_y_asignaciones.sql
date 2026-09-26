-- Perfiles de usuario (fuente de verdad del rol) y asignacion de
-- supervisor + inspector obligatorios a cada escuela.
--
-- El rol deja de leerse del JWT (app_metadata): se lee de public.perfiles,
-- asi un cambio de rol o una desactivacion aplica al instante.

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  apellido text not null check (length(trim(apellido)) > 0),
  email text not null,
  rol text not null check (rol in ('admin', 'supervisor', 'inspector')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index perfiles_rol_idx on public.perfiles (rol) where activo;

create trigger perfiles_updated_at
  before update on public.perfiles
  for each row execute function private.set_updated_at();

alter table public.perfiles enable row level security;

-- Todos los usuarios activos ven los perfiles (nombres para asignaciones y ordenes).
-- Altas y cambios solo desde el servidor con service_role (sin policies de escritura).
create policy "perfiles: usuarios activos ven todos"
  on public.perfiles for select to authenticated
  using ((select private.rol()) is not null);

revoke all on public.perfiles from anon;
revoke insert, update, delete on public.perfiles from authenticated;
grant select on public.perfiles to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers de rol: ahora leen perfiles. security definer para no depender del
-- RLS de perfiles (y evitar recursion). Viven en el schema privado.
-- Usuario inactivo o sin perfil => rol null => sin acceso a nada.
-- ---------------------------------------------------------------------------
create or replace function private.rol()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol from public.perfiles p
  where p.id = (select auth.uid()) and p.activo
$$;

revoke execute on function private.rol() from public, anon;
grant execute on function private.rol() to authenticated;

-- ---------------------------------------------------------------------------
-- Escuelas: solo usuarios activos las ven
-- ---------------------------------------------------------------------------
drop policy "escuelas: usuarios logueados ven todas" on public.escuelas;
create policy "escuelas: usuarios activos ven todas"
  on public.escuelas for select to authenticated
  using ((select private.rol()) is not null);

-- ---------------------------------------------------------------------------
-- Escuelas: supervisor e inspector obligatorios
-- ---------------------------------------------------------------------------
alter table public.escuelas
  add column supervisor_id uuid not null references public.perfiles (id),
  add column inspector_id uuid not null references public.perfiles (id);

create index escuelas_supervisor_idx on public.escuelas (supervisor_id);
create index escuelas_inspector_idx on public.escuelas (inspector_id);

create or replace function private.validar_asignaciones_escuela()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.perfiles
    where id = new.supervisor_id and rol = 'supervisor' and activo
  ) then
    raise exception 'El supervisor elegido no es válido o está desactivado.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.perfiles
    where id = new.inspector_id and rol = 'inspector' and activo
  ) then
    raise exception 'El inspector elegido no es válido o está desactivado.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger escuelas_validar_asignaciones
  before insert or update of supervisor_id, inspector_id on public.escuelas
  for each row execute function private.validar_asignaciones_escuela();

-- No dejar escuelas con un supervisor/inspector que cambio de rol o se desactivo
create or replace function private.validar_cambio_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.rol is distinct from old.rol or (old.activo and not new.activo))
     and exists (
       select 1 from public.escuelas
       where supervisor_id = old.id or inspector_id = old.id
     ) then
    raise exception 'Este usuario tiene escuelas asignadas. Reasignalas antes de cambiarle el rol o desactivarlo.'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger perfiles_validar_cambio
  before update of rol, activo on public.perfiles
  for each row execute function private.validar_cambio_perfil();

-- ---------------------------------------------------------------------------
-- Ordenes: el creador apunta a perfiles (para mostrar nombre) y
-- la visibilidad depende de las asignaciones de la escuela
-- ---------------------------------------------------------------------------
alter table public.ordenes_trabajo
  drop constraint ordenes_trabajo_creado_por_fkey,
  add constraint ordenes_trabajo_creado_por_fkey
    foreign key (creado_por) references public.perfiles (id);

drop policy "ordenes: admin ve todas, inspector las suyas" on public.ordenes_trabajo;
create policy "ordenes: admin todas; resto las propias y las de sus escuelas"
  on public.ordenes_trabajo for select to authenticated
  using (
    (select private.es_admin())
    or (
      (select private.rol()) is not null
      and (
        creado_por = (select auth.uid())
        or exists (
          select 1 from public.escuelas e
          where e.id = escuela_id
            and (e.inspector_id = (select auth.uid()) or e.supervisor_id = (select auth.uid()))
        )
      )
    )
  );

drop policy "ordenes: admin o inspector crea a su nombre" on public.ordenes_trabajo;
create policy "ordenes: admin en cualquier escuela, inspector en las asignadas"
  on public.ordenes_trabajo for insert to authenticated
  with check (
    creado_por = (select auth.uid())
    and (
      (select private.es_admin())
      or (
        (select private.rol()) = 'inspector'
        and exists (
          select 1 from public.escuelas e
          where e.id = escuela_id and e.inspector_id = (select auth.uid())
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: el supervisor tiene que poder ver las fotos que subio el inspector.
-- Se puede ver un archivo si es propio o si pertenece a una orden visible.
-- ---------------------------------------------------------------------------
drop policy "ordenes-fotos: admin ve todas, cada uno las suyas" on storage.objects;
create policy "ordenes-fotos: propias o de ordenes visibles"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ordenes-fotos'
    and (
      (select private.es_admin())
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.orden_fotos f where f.path = name)
    )
  );
