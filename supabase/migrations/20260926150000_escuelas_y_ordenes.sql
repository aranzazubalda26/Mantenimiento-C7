-- Escuelas, ordenes de trabajo y sus fotos.
-- Roles: se leen de auth.jwt() -> app_metadata ->> 'role' ('admin' | 'inspector').
-- app_metadata solo lo puede modificar el servidor (service_role), no el usuario.

-- ---------------------------------------------------------------------------
-- Helpers (schema privado: no se expone por la Data API)
-- ---------------------------------------------------------------------------
create schema if not exists private;

create or replace function private.rol()
returns text
language sql
stable
set search_path = ''
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

create or replace function private.es_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(private.rol() = 'admin', false)
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant usage on schema private to authenticated;
grant execute on function private.rol(), private.es_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Escuelas
-- ---------------------------------------------------------------------------
create table public.escuelas (
  id bigint generated always as identity primary key,
  nombre text not null check (length(trim(nombre)) > 0),
  direccion text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index escuelas_nombre_unico on public.escuelas (lower(trim(nombre)));

create trigger escuelas_updated_at
  before update on public.escuelas
  for each row execute function private.set_updated_at();

alter table public.escuelas enable row level security;

create policy "escuelas: usuarios logueados ven todas"
  on public.escuelas for select to authenticated
  using (true);

create policy "escuelas: admin crea"
  on public.escuelas for insert to authenticated
  with check ((select private.es_admin()));

create policy "escuelas: admin edita"
  on public.escuelas for update to authenticated
  using ((select private.es_admin()))
  with check ((select private.es_admin()));

create policy "escuelas: admin borra"
  on public.escuelas for delete to authenticated
  using ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Ordenes de trabajo
-- ---------------------------------------------------------------------------
create table public.ordenes_trabajo (
  id bigint generated always as identity primary key,
  escuela_id bigint not null references public.escuelas (id),
  fecha date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  descripcion text not null check (length(trim(descripcion)) > 0),
  prioridad text not null check (prioridad in ('baja', 'media', 'alta', 'urgente')),
  ubicacion text not null check (length(trim(ubicacion)) > 0),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_proceso', 'finalizada')),
  creado_por uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ordenes_trabajo_escuela_idx on public.ordenes_trabajo (escuela_id);
create index ordenes_trabajo_creado_por_idx on public.ordenes_trabajo (creado_por);
create index ordenes_trabajo_created_at_idx on public.ordenes_trabajo (created_at desc);

create trigger ordenes_trabajo_updated_at
  before update on public.ordenes_trabajo
  for each row execute function private.set_updated_at();

alter table public.ordenes_trabajo enable row level security;

create policy "ordenes: admin ve todas, inspector las suyas"
  on public.ordenes_trabajo for select to authenticated
  using ((select private.es_admin()) or creado_por = (select auth.uid()));

create policy "ordenes: admin o inspector crea a su nombre"
  on public.ordenes_trabajo for insert to authenticated
  with check (
    creado_por = (select auth.uid())
    and (select private.rol()) in ('admin', 'inspector')
  );

create policy "ordenes: admin edita"
  on public.ordenes_trabajo for update to authenticated
  using ((select private.es_admin()))
  with check ((select private.es_admin()));

create policy "ordenes: admin borra"
  on public.ordenes_trabajo for delete to authenticated
  using ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Fotos de las ordenes (el archivo vive en Storage, bucket ordenes-fotos)
-- ---------------------------------------------------------------------------
create table public.orden_fotos (
  id bigint generated always as identity primary key,
  orden_id bigint not null references public.ordenes_trabajo (id) on delete cascade,
  path text not null unique,
  created_at timestamptz not null default now()
);

create index orden_fotos_orden_idx on public.orden_fotos (orden_id);

alter table public.orden_fotos enable row level security;

-- La subconsulta respeta el RLS de ordenes_trabajo: ve las fotos de las ordenes que puede ver
create policy "fotos: visibles si se ve la orden"
  on public.orden_fotos for select to authenticated
  using (exists (select 1 from public.ordenes_trabajo o where o.id = orden_id));

create policy "fotos: el creador de la orden las agrega desde su carpeta"
  on public.orden_fotos for insert to authenticated
  with check (
    path like (select auth.uid())::text || '/%'
    and exists (
      select 1 from public.ordenes_trabajo o
      where o.id = orden_id
        and (o.creado_por = (select auth.uid()) or (select private.es_admin()))
    )
  );

create policy "fotos: admin borra"
  on public.orden_fotos for delete to authenticated
  using ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Permisos de la Data API: solo usuarios logueados, nunca anonimos
-- ---------------------------------------------------------------------------
revoke all on public.escuelas, public.ordenes_trabajo, public.orden_fotos from anon;
grant select, insert, update, delete on public.escuelas, public.ordenes_trabajo, public.orden_fotos to authenticated;

-- ---------------------------------------------------------------------------
-- Crear orden + fotos en una sola transaccion (security invoker: aplica RLS)
-- ---------------------------------------------------------------------------
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
  if v_cant = 0 then
    raise exception 'Adjuntá al menos una foto.' using errcode = '22023';
  end if;
  if v_cant > 10 then
    raise exception 'Máximo 10 fotos por orden.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.escuelas where id = p_escuela_id and activa) then
    raise exception 'La escuela no existe o está desactivada.' using errcode = '22023';
  end if;

  insert into public.ordenes_trabajo (escuela_id, fecha, descripcion, prioridad, ubicacion)
  values (p_escuela_id, p_fecha, trim(p_descripcion), p_prioridad, trim(p_ubicacion))
  returning id into v_id;

  insert into public.orden_fotos (orden_id, path)
  select v_id, f from unnest(p_fotos) as f;

  return v_id;
end;
$$;

revoke execute on function public.crear_orden from public, anon;
grant execute on function public.crear_orden to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket privado para las fotos. Ruta: <user_id>/<uuid>.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ordenes-fotos', 'ordenes-fotos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "ordenes-fotos: admin o inspector sube a su carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ordenes-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.rol()) in ('admin', 'inspector')
  );

create policy "ordenes-fotos: admin ve todas, cada uno las suyas"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ordenes-fotos'
    and ((select private.es_admin()) or (storage.foldername(name))[1] = (select auth.uid())::text)
  );

create policy "ordenes-fotos: borrar las propias o admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'ordenes-fotos'
    and ((select private.es_admin()) or (storage.foldername(name))[1] = (select auth.uid())::text)
  );
