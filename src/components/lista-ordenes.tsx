import Link from "next/link";
import { fechaCorta } from "@/lib/fechas";
import { numeroOrden, type Estado, type Prioridad } from "@/lib/ordenes";
import { nombreCompleto } from "@/lib/usuarios";
import { EstadoBadge, PrioridadBadge } from "./badges";

export type OrdenLista = {
  id: number;
  fecha: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  ubicacion: string;
  escuelas: { direccion: string } | null;
  creador: { nombre: string; apellido: string } | null;
};

// Columnas de la tabla en PC; en el celular queda descripcion + estado
const COLUMNAS = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 px-4 pc:grid-cols-[minmax(0,1fr)_170px_120px_72px] pc:gap-4 pc:px-5";

function iniciales(p: { nombre: string; apellido: string } | null) {
  return p ? `${p.nombre[0] ?? ""}${p.apellido[0] ?? ""}`.toUpperCase() : "?";
}

// `sinEscuela`: dentro de la pantalla de una escuela no hace falta repetirla en cada fila
export function ListaOrdenes({
  ordenes,
  vacio,
  sinEscuela,
}: {
  ordenes: OrdenLista[];
  vacio: React.ReactNode;
  sinEscuela?: boolean;
}) {
  return (
    <div className="tarjeta overflow-hidden">
      <div
        aria-hidden
        className={`${COLUMNAS} hidden h-[42px] border-b border-border bg-fila-hover text-[12.5px] font-semibold text-muted pc:grid`}
      >
        <div>Orden</div>
        <div>Cargada por</div>
        <div>Estado</div>
        <div className="text-right">Fecha</div>
      </div>

      {ordenes.length === 0 ? (
        <div className="px-5 py-12 text-center text-muted">{vacio}</div>
      ) : (
        <ul>
          {ordenes.map((o) => (
            <li key={o.id} className="border-b border-border last:border-b-0">
              <Link href={`/ordenes/${o.id}`} className={`${COLUMNAS} min-h-[72px] hover:bg-fila-hover`}>
                <div className="flex min-w-0 flex-col gap-[3px] py-3">
                  <span className="line-clamp-2 font-semibold pc:line-clamp-1">{o.descripcion}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                    <span className="num">{numeroOrden(o.id)}</span>
                    <span>·</span>
                    {!sinEscuela && (
                      <>
                        <b className="font-semibold text-foreground">{o.escuelas?.direccion}</b>
                        <span>·</span>
                      </>
                    )}
                    <span>{o.ubicacion}</span>
                    {(o.prioridad === "urgente" || o.prioridad === "alta") && (
                      <PrioridadBadge prioridad={o.prioridad} />
                    )}
                  </span>
                </div>
                <div className="hidden items-center gap-2 text-sm pc:flex">
                  <span className="avatar size-7 text-xs">{iniciales(o.creador)}</span>
                  <span className="truncate font-medium">{nombreCompleto(o.creador)}</span>
                </div>
                <div>
                  <EstadoBadge estado={o.estado} />
                </div>
                <div className="hidden text-right text-[13px] text-muted pc:block">{fechaCorta(o.fecha)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
