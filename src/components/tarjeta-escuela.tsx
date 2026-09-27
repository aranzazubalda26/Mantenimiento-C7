import Link from "next/link";
import { numeroOrden, type Estado, type Prioridad } from "@/lib/ordenes";
import { PrioridadBadge } from "./badges";
import { IconoFlecha, IconoOk } from "./iconos";

export type OrdenResumida = {
  id: number;
  escuela_id: number;
  estado: Estado;
  prioridad: Prioridad;
  descripcion: string;
  ubicacion: string;
  created_at: string;
};

// Colores de la barrita (mismos que las pastillas de estado)
const COLOR_ESTADO: Record<Estado, string> = {
  solicitada: "#F79009",
  cerrada: "#D0D5DD",
};

const ETIQUETA: Record<Estado, [string, string]> = {
  solicitada: ["solicitada", "solicitadas"],
  cerrada: ["terminada", "terminadas"],
};

const ORDEN_BARRA: Estado[] = ["solicitada", "cerrada"];

const PESO_PRIORIDAD: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
const MUESTRA = 3; // cuantas tareas pendientes se ven en la tarjeta

// Tarjeta de escuela del inicio: estado general + muestra de lo que falta hacer
export function TarjetaEscuela({
  escuela,
  ordenes,
}: {
  escuela: { id: number; direccion: string; nombre: string | null };
  ordenes: OrdenResumida[]; // todas las ordenes de esta escuela
}) {
  const n = (e: Estado) => ordenes.filter((o) => o.estado === e).length;
  const pendientes = ordenes
    .filter((o) => o.estado !== "cerrada")
    // Lo mas urgente primero; a igual prioridad, lo mas viejo primero
    .sort(
      (a, b) =>
        PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] ||
        a.created_at.localeCompare(b.created_at),
    );
  const urgente = pendientes.some((o) => o.prioridad === "urgente");
  const href = `/escuelas/${escuela.id}`;

  const barrita = ordenes.length > 0 && (
    <span className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-background">
      {ORDEN_BARRA.map((e) =>
        n(e) ? <span key={e} style={{ flex: n(e), background: COLOR_ESTADO[e] }} /> : null,
      )}
    </span>
  );

  return (
    <article
      className={`tarjeta flex flex-col overflow-hidden transition-colors hover:border-border-strong ${
        urgente ? "border-[#fda29b] shadow-[0_0_0_1px_#fda29b]" : ""
      }`}
    >
      {/* Celular: tarjeta compacta de tablero (dos por fila). Toda la tarjeta abre la escuela */}
      <Link href={href} className="flex flex-1 flex-col gap-2 p-3 active:bg-fila-hover sm:hidden">
        <span className="flex items-center justify-between gap-1">
          <span className="esc-num">{escuela.id}</span>
          {urgente && <PrioridadBadge prioridad="urgente" />}
        </span>
        <span className="line-clamp-2 text-[14.5px] leading-snug font-bold tracking-[-0.01em]">
          {escuela.direccion}
        </span>
        <span className="mt-auto flex items-baseline gap-1.5 pt-1">
          <b
            className={`text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums ${
              pendientes.length ? "" : "text-muted/50"
            }`}
          >
            {pendientes.length}
          </b>
          <span className="text-[12.5px] text-muted">
            {pendientes.length === 1 ? "pendiente" : "pendientes"}
          </span>
        </span>
        {barrita || <span className="h-1.5 rounded-full bg-background" />}
      </Link>

      {/* PC / tablet: ademas muestra las tareas pendientes */}
      <Link href={href} className="hidden flex-col gap-3 p-[18px] pb-3 hover:bg-fila-hover sm:flex">
        <div className="flex items-start gap-3">
          <span className="esc-num h-9 min-w-9 text-sm">{escuela.id}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[16.5px] leading-snug font-bold tracking-[-0.01em]">{escuela.direccion}</p>
            {escuela.nombre && <p className="truncate text-[13px] text-muted">{escuela.nombre}</p>}
            {ordenes.length === 0 && <p className="text-[13px] text-muted">Sin tareas cargadas</p>}
          </div>
          {urgente && <PrioridadBadge prioridad="urgente" />}
        </div>

        {ordenes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {barrita}
            <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-muted">
              {ORDEN_BARRA.map((e) =>
                n(e) ? (
                  <span key={e} className="inline-flex items-center gap-1.5">
                    <i className="inline-block size-2 rounded-[3px]" style={{ background: COLOR_ESTADO[e] }} />
                    <b className="font-semibold text-foreground tabular-nums">{n(e)}</b>
                    {ETIQUETA[e][n(e) === 1 ? 0 : 1]}
                  </span>
                ) : null,
              )}
            </span>
          </div>
        )}
      </Link>

      {ordenes.length > 0 && (
        <div className="hidden flex-1 flex-col sm:flex">
          <div className="flex flex-1 flex-col border-t border-border">
            {pendientes.length === 0 ? (
              <p className="flex items-center gap-2 px-[18px] py-3.5 text-[13.5px] text-muted">
                <IconoOk className="size-4 text-primary" />
                Sin tareas pendientes
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {pendientes.slice(0, MUESTRA).map((o) => (
                  <li key={o.id}>
                    <Link href={`/ordenes/${o.id}`} className="flex items-center gap-2.5 px-[18px] py-2.5 hover:bg-fila-hover">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{o.descripcion}</span>
                        <span className="block truncate text-xs text-muted">
                          <span className="num">{numeroOrden(o.id)}</span> · {o.ubicacion}
                        </span>
                      </span>
                      {(o.prioridad === "urgente" || o.prioridad === "alta") && (
                        <PrioridadBadge prioridad={o.prioridad} />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href={href}
            className="mt-auto flex min-h-11 items-center justify-between border-t border-border px-[18px] text-[13.5px] font-semibold text-primary hover:bg-primary-soft"
          >
            {pendientes.length > MUESTRA
              ? `Ver las ${pendientes.length} pendientes`
              : `Ver ${ordenes.length === 1 ? "la tarea" : `las ${ordenes.length} tareas`}`}
            <IconoFlecha className="size-4" />
          </Link>
        </div>
      )}
    </article>
  );
}
