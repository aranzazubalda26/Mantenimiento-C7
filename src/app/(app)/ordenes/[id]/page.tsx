import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader, Pagina } from "@/components/app-header";
import { EstadoBadge, PrioridadBadge } from "@/components/badges";
import { IconoAtras, IconoLugar, IconoOk } from "@/components/iconos";
import { getUsuario } from "@/lib/auth";
import { fechaCorta, formatFecha, formatFechaHora, formatHora } from "@/lib/fechas";
import { numeroOrden, type Estado, type Prioridad } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";
import { nombreCompleto } from "@/lib/usuarios";

export const metadata: Metadata = { title: "Orden · Mantenimiento C7" };

type Orden = {
  id: number;
  fecha: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  ubicacion: string;
  created_at: string;
  escuelas: { id: number; nombre: string; direccion: string | null } | null;
  creador: { nombre: string; apellido: string } | null;
  orden_fotos: { id: number; path: string }[];
};

export default async function OrdenPage(props: PageProps<"/ordenes/[id]">) {
  await getUsuario();
  const { id } = await props.params;
  const { creada } = await props.searchParams;
  if (!/^\d+$/.test(id)) notFound();

  const supabase = await createClient();
  // RLS: si el usuario no puede ver la orden no vuelve nada -> 404
  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select(
      "id, fecha, descripcion, prioridad, estado, ubicacion, created_at, escuelas(id, nombre, direccion), creador:perfiles!ordenes_trabajo_creado_por_fkey(nombre, apellido), orden_fotos(id, path)",
    )
    .eq("id", Number(id))
    .maybeSingle<Orden>();

  if (!orden) notFound();

  const { data: urls } = orden.orden_fotos.length
    ? await supabase.storage
        .from("ordenes-fotos")
        .createSignedUrls(orden.orden_fotos.map((f) => f.path), 60 * 60)
    : { data: [] };

  const iniciales = orden.creador
    ? `${orden.creador.nombre[0] ?? ""}${orden.creador.apellido[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <>
      <AppHeader
        titulo={`Orden ${numeroOrden(orden.id)}`}
        subtitulo={`${orden.escuelas?.nombre ?? ""} · ${orden.ubicacion}`}
      />
      <Pagina>
        <div className="flex w-full max-w-[720px] flex-col gap-4">
          <Link href="/" className="inline-flex min-h-10 w-max items-center gap-1.5 font-medium text-muted hover:text-foreground">
            <IconoAtras className="size-[18px]" />
            Inicio
          </Link>

          {creada && (
            <p role="status" className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
              <IconoOk className="size-[18px]" />
              Orden {numeroOrden(orden.id)} creada correctamente.
            </p>
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
                  <b className="font-semibold text-foreground">{orden.escuelas?.nombre}</b>
                  {orden.escuelas?.direccion && ` (${orden.escuelas.direccion})`}, {orden.ubicacion}
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

              <p className="text-xs text-muted">Creada el {formatFechaHora(orden.created_at)}</p>
            </div>
          </article>
        </div>
      </Pagina>
    </>
  );
}
