import Link from "next/link";
import { numeroOrden, type Estado, type Prioridad } from "@/lib/ordenes";
import { PrioridadBadge } from "./badges";
import { IconoFlecha } from "./iconos";

export type OrdenResumida = {
  id: number;
  escuela_id: number;
  estado: Estado;
  prioridad: Prioridad;
  descripcion: string;
  ubicacion: string;
  created_at: string;
};

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

  const cantidad = (
    <span className="flex items-baseline gap-1.5">
      <b
        className={`text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums ${
          pendientes.length ? "" : "text-muted/50"
        }`}
      >
        {pendientes.length}
      </b>
      <span className="text-[12.5px] text-muted">{pendientes.length === 1 ? "pendiente" : "pendientes"}</span>
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
        <span className="mt-auto pt-1">{cantidad}</span>
      </Link>

      {/* PC / tablet: ademas muestra las tareas pendientes */}
      <Link href={href} className="hidden flex-col gap-3 p-[18px] pb-3 hover:bg-fila-hover sm:flex">
        <div className="flex items-start gap-3">
          <span className="esc-num h-9 min-w-9 text-sm">{escuela.id}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[16.5px] leading-snug font-bold tracking-[-0.01em]">{escuela.direccion}</p>
            {escuela.nombre && <p className="truncate text-[13px] text-muted">{escuela.nombre}</p>}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {urgente && <PrioridadBadge prioridad="urgente" />}
            {cantidad}
          </div>
        </div>
      </Link>

      {pendientes.length > 0 && (
        <div className="hidden flex-1 flex-col sm:flex">
          <div className="flex flex-1 flex-col border-t border-border">
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
          </div>

          <Link
            href={href}
            className="mt-auto flex min-h-11 items-center justify-between border-t border-border px-[18px] text-[13.5px] font-semibold text-primary hover:bg-primary-soft"
          >
            {pendientes.length > MUESTRA ? `Ver las ${pendientes.length} pendientes` : "Ver escuela"}
            <IconoFlecha className="size-4" />
          </Link>
        </div>
      )}
    </article>
  );
}
