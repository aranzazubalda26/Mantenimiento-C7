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

  return (
    <article
      className={`tarjeta flex flex-col overflow-hidden transition-colors hover:border-border-strong ${
        urgente ? "border-[#fda29b] shadow-[0_0_0_1px_#fda29b]" : ""
      }`}
    >
      <Link href={href} className="flex flex-col gap-3 p-4 pb-3 hover:bg-fila-hover pc:p-[18px] pc:pb-3">
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
            <span className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-background">
              {ORDEN_BARRA.map((e) =>
                n(e) ? <span key={e} style={{ flex: n(e), background: COLOR_ESTADO[e] }} /> : null,
              )}
            </span>
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

      {/* Muestra de tareas pendientes; las escuelas sin tareas quedan compactas */}
      {ordenes.length > 0 && (
        <>
          <div className="flex flex-1 flex-col border-t border-border">
            {pendientes.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-3.5 text-[13.5px] text-muted pc:px-[18px]">
                <IconoOk className="size-4 text-primary" />
                Sin tareas pendientes
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {pendientes.slice(0, MUESTRA).map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/ordenes/${o.id}`}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-fila-hover pc:px-[18px]"
                    >
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
            className="mt-auto flex min-h-11 items-center justify-between border-t border-border px-4 text-[13.5px] font-semibold text-primary hover:bg-primary-soft pc:px-[18px]"
          >
            {pendientes.length > MUESTRA
              ? `Ver las ${pendientes.length} pendientes`
              : `Ver ${ordenes.length === 1 ? "la tarea" : `las ${ordenes.length} tareas`}`}
            <IconoFlecha className="size-4" />
          </Link>
        </>
      )}
    </article>
  );
}
