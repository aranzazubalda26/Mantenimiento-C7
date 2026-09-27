import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader, Pagina } from "@/components/app-header";
import { EstadoBadge, PrioridadBadge } from "@/components/badges";
import { IconoAlerta, IconoLugar, IconoOk } from "@/components/iconos";
import { Volver } from "@/components/volver";
import { conVolver, volverSeguro } from "@/lib/navegacion";
import { getUsuario } from "@/lib/auth";
import { duracion, fechaCorta, formatFecha, formatFechaDe, formatFechaHora, formatHora } from "@/lib/fechas";
import { numeroOrden, type Estado, type Prioridad } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";
import { nombreCompleto } from "@/lib/usuarios";
import { AccionesOrden } from "./acciones-orden";
import { Historial, type Evento } from "./historial";

export const metadata: Metadata = { title: "Orden · Mantenimiento C7" };

type Orden = {
  id: number;
  fecha: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  ubicacion: string;
  created_at: string;
  cerrada_at: string | null;
  motivo_reapertura: string | null;
  escuelas: { id: number; direccion: string; nombre: string | null; supervisor_id: string; inspector_id: string } | null;
  creador: { nombre: string; apellido: string } | null;
  cerrador: { nombre: string; apellido: string } | null;
  orden_fotos: { id: number; path: string }[];
};

export default async function OrdenPage(props: PageProps<"/ordenes/[id]">) {
  const usuario = await getUsuario();
  const { id } = await props.params;
  const { creada, editada, volver } = await props.searchParams;
  if (!/^\d+$/.test(id)) notFound();

  const supabase = await createClient();
  // RLS: si el usuario no puede ver la orden no vuelve nada -> 404
  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select(
      "id, fecha, descripcion, prioridad, estado, ubicacion, created_at, cerrada_at, motivo_reapertura, escuelas(id, nombre, direccion, supervisor_id, inspector_id), creador:perfiles!ordenes_trabajo_creado_por_fkey(nombre, apellido), cerrador:perfiles!ordenes_trabajo_cerrada_por_fkey(nombre, apellido), orden_fotos(id, path)",
    )
    .eq("id", Number(id))
    .maybeSingle<Orden>();

  if (!orden) notFound();

  const [{ data: urls }, { data: eventos }] = await Promise.all([
    orden.orden_fotos.length
      ? supabase.storage.from("ordenes-fotos").createSignedUrls(orden.orden_fotos.map((f) => f.path), 60 * 60)
      : Promise.resolve({ data: [] }),
    supabase
      .from("orden_eventos")
      .select("id, tipo, detalle, created_at, autor:perfiles!orden_eventos_autor_fkey(nombre, apellido)")
      .eq("orden_id", orden.id)
      .order("created_at")
      .order("id")
      .returns<Evento[]>(),
  ]);

  // Que puede hacer cada uno (la base tambien lo exige)
  const esAdmin = usuario.rol === "admin";
  const esSupervisorDeLaEscuela = usuario.rol === "supervisor" && orden.escuelas?.supervisor_id === usuario.id;
  const esInspectorDeLaEscuela = usuario.rol === "inspector" && orden.escuelas?.inspector_id === usuario.id;
  const pendiente = orden.estado === "solicitada";
  const puedeTerminar = pendiente && (esAdmin || esSupervisorDeLaEscuela);
  const puedeEditar = pendiente && (esAdmin || esInspectorDeLaEscuela);
  const puedeReabrir = !pendiente && esInspectorDeLaEscuela;

  const origen = volverSeguro(volver);
  const volverA = destinoVolver(origen, orden.escuelas);
  const detalleHref = origen ? conVolver(`/ordenes/${orden.id}`, origen) : `/ordenes/${orden.id}`;
  const reapertura = pendiente && orden.motivo_reapertura ? eventos?.findLast((e) => e.tipo === "reabierta") : undefined;

  const iniciales = orden.creador
    ? `${orden.creador.nombre[0] ?? ""}${orden.creador.apellido[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <>
      <AppHeader
        titulo={`Orden ${numeroOrden(orden.id)}`}
        subtitulo={`${orden.escuelas?.direccion ?? ""} · ${orden.ubicacion}`}
      />
      <Pagina>
        <div className="flex w-full max-w-[720px] flex-col gap-4">
          <Volver {...volverA} />

          {creada && (
            <p role="status" className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
              <IconoOk className="size-[18px]" />
              Orden {numeroOrden(orden.id)} creada correctamente.
            </p>
          )}
          {editada && (
            <p role="status" className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
              <IconoOk className="size-[18px]" />
              Cambios guardados.
            </p>
          )}

          {/* Reabierta: el motivo queda a la vista hasta que se vuelve a terminar */}
          {pendiente && orden.motivo_reapertura && (
            <div role="note" className="flex items-start gap-3 rounded-xl border border-[#fda29b] bg-[#fff4ed] px-4 py-3">
              <IconoAlerta className="mt-0.5 size-5 text-[#b42318]" />
              <div className="min-w-0">
                <p className="font-semibold text-[#b42318]">Reabierta</p>
                <p className="break-words">“{orden.motivo_reapertura}”</p>
                {reapertura && (
                  <p className="text-[13px] text-muted">
                    {reapertura.autor && `${nombreCompleto(reapertura.autor)} · `}
                    {formatFechaHora(reapertura.created_at)}
                  </p>
                )}
              </div>
            </div>
          )}

          <article className="tarjeta overflow-hidden">
            <div className="flex flex-col gap-2.5 border-b border-border p-[18px] pc:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="num text-[13px] text-muted">{numeroOrden(orden.id)}</span>
                <EstadoBadge estado={orden.estado} />
                <PrioridadBadge prioridad={orden.prioridad} />
              </div>
              <h2 className="whitespace-pre-wrap text-xl leading-tight font-bold tracking-[-0.01em]">
                {orden.descripcion}
              </h2>
              <p className="flex items-start gap-1.5 text-sm text-muted">
                <IconoLugar className="mt-0.5 size-4" />
                <span>
                  <b className="font-semibold text-foreground">{orden.escuelas?.direccion}</b>
                  {orden.escuelas?.nombre && ` (${orden.escuelas.nombre})`}, {orden.ubicacion}
                </span>
              </p>
              {orden.creador && (
                <p className="flex items-center gap-2 text-[13.5px] text-muted">
                  <span className="avatar size-6 text-[11px]">{iniciales}</span>
                  Cargada por {nombreCompleto(orden.creador)} · {fechaCorta(orden.fecha).toLowerCase()}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-[18px] p-[18px] pc:p-5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[10px] bg-background px-3.5 py-3">
                  <span className="text-[12.5px] text-muted">Fecha</span>
                  <b className="block text-lg font-semibold tabular-nums">{formatFecha(orden.fecha)}</b>
                </div>
                <div className="rounded-[10px] bg-background px-3.5 py-3">
                  <span className="text-[12.5px] text-muted">Cargada a las</span>
                  <b className="block text-lg font-semibold tabular-nums">{formatHora(orden.created_at)}</b>
                </div>
              </div>

              {orden.estado === "cerrada" && orden.cerrada_at && (
                <div className="flex items-start gap-3 rounded-[10px] bg-[#eef0f3] px-3.5 py-3">
                  <IconoOk className="mt-0.5 size-5 text-[#475467]" />
                  <div>
                    <p className="font-semibold">
                      Terminada el {formatFechaDe(orden.cerrada_at)} a las {formatHora(orden.cerrada_at)}
                    </p>
                    <p className="text-[13.5px] text-muted">
                      {orden.cerrador && `Por ${nombreCompleto(orden.cerrador)} · `}
                      {duracion(orden.created_at, orden.cerrada_at)} desde que se cargó
                    </p>
                  </div>
                </div>
              )}

              {!!urls?.length && (
                <div>
                  <p className="dato-titulo">Fotos ({urls.length})</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {urls.map((u, i) =>
                      u.signedUrl ? (
                        <a
                          key={u.path ?? i}
                          href={u.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-[4/3] overflow-hidden rounded-[10px] bg-[#eef0f3]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage */}
                          <img src={u.signedUrl} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                        </a>
                      ) : null,
                    )}
                  </div>
                </div>
              )}

              <Historial eventos={eventos ?? []} />
            </div>

            {(puedeTerminar || puedeEditar || puedeReabrir) && (
              <div className="border-t border-border p-[18px] pc:p-5">
                <AccionesOrden
                  ordenId={orden.id}
                  estado={orden.estado}
                  puedeTerminar={puedeTerminar}
                  puedeEditar={puedeEditar}
                  puedeReabrir={puedeReabrir}
                  hrefEditar={conVolver(`/ordenes/${orden.id}/editar`, detalleHref)}
                  hrefTrasBorrar={volverA.href}
                />
              </div>
            )}
          </article>
        </div>
      </Pagina>
    </>
  );
}

// "Volver a …": a donde estaba el usuario si se sabe; si no, a la escuela de la orden
function destinoVolver(origen: string | null, escuela: { id: number; direccion: string } | null) {
  if (origen) {
    const ruta = origen.split("?")[0];
    if (ruta === "/") return { href: origen, a: "inicio" };
    if (ruta === "/ordenes") return { href: origen, a: "órdenes" };
    if (escuela && ruta === `/escuelas/${escuela.id}`) return { href: origen, a: escuela.direccion };
    return { href: origen, a: "la pantalla anterior" };
  }
  return escuela ? { href: `/escuelas/${escuela.id}`, a: escuela.direccion } : { href: "/", a: "inicio" };
}
