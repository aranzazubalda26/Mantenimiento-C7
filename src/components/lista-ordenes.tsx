import Link from "next/link";
import { fechaCorta } from "@/lib/fechas";
import { conVolver } from "@/lib/navegacion";
import { esReabierta, numeroOrden, type Estado, type Prioridad } from "@/lib/ordenes";
import { nombreCompleto } from "@/lib/usuarios";
import { BORDE_REABIERTA, EstadoBadge, PrioridadBadge } from "./badges";

export type OrdenLista = {
  id: number;
  fecha: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  ubicacion: string;
  motivo_reapertura: string | null;
  escuelas: { direccion: string } | null;
  creador: { nombre: string; apellido: string } | null;
};

function iniciales(p: { nombre: string; apellido: string } | null) {
  return p ? `${p.nombre[0] ?? ""}${p.apellido[0] ?? ""}`.toUpperCase() : "?";
}

// Lista de ordenes. PC: columnas Orden · Escuela · Cargada por · Fecha.
// Celular: descripcion (con la escuela abajo) y la fecha a la derecha.
// Sin columna de estado: con solo dos estados, el filtro ya dice cual se esta viendo.
// Las reabiertas llevan un borde amarillo hasta que se vuelven a terminar.
//   `sinEscuela`: en la pantalla de una escuela no se repite la escuela en cada fila.
//   `marcarTerminadas`: en listas que mezclan estados, marca las terminadas y fuera de alcance con una etiqueta.
//   `origen`: ruta actual (con filtros); la orden la usa para "Volver a …".
export function ListaOrdenes({
  ordenes,
  vacio,
  origen,
  sinEscuela,
  marcarTerminadas,
}: {
  ordenes: OrdenLista[];
  vacio: React.ReactNode;
  origen: string;
  sinEscuela?: boolean;
  marcarTerminadas?: boolean;
}) {
  const columnas = `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 px-4 pc:gap-4 pc:px-5 ${
    sinEscuela ? "pc:grid-cols-[minmax(0,1fr)_180px_80px]" : "pc:grid-cols-[minmax(0,1fr)_200px_180px_80px]"
  }`;

  return (
    <div className="tarjeta overflow-hidden">
      <div
        aria-hidden
        className={`${columnas} hidden h-[42px] border-b border-border bg-fila-hover text-[12.5px] font-semibold text-muted pc:grid`}
      >
        <div>Orden</div>
        {!sinEscuela && <div>Escuela</div>}
        <div>Cargada por</div>
        <div className="text-right">Fecha</div>
      </div>

      {ordenes.length === 0 ? (
        <div className="px-5 py-12 text-center text-muted">{vacio}</div>
      ) : (
        <ul>
          {ordenes.map((o) => (
            <li key={o.id} className="border-b border-border last:border-b-0">
              <Link
                href={conVolver(`/ordenes/${o.id}`, origen)}
                className={`${columnas} min-h-[72px] hover:bg-fila-hover ${esReabierta(o) ? BORDE_REABIERTA : ""}`}
              >
                <div className="flex min-w-0 flex-col gap-[3px] py-3">
                  <span className="line-clamp-2 font-semibold pc:line-clamp-1">
                    {esReabierta(o) && <span className="sr-only">Reabierta: </span>}
                    {o.descripcion}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                    <span className="num">{numeroOrden(o.id)}</span>
                    <span>·</span>
                    {/* En el celular no hay columna Escuela: va aca */}
                    {!sinEscuela && (
                      <>
                        <b className="font-semibold text-foreground pc:hidden">{o.escuelas?.direccion}</b>
                        <span className="pc:hidden">·</span>
                      </>
                    )}
                    <span>{o.ubicacion}</span>
                    {(o.prioridad === "urgente" || o.prioridad === "alta") && (
                      <PrioridadBadge prioridad={o.prioridad} />
                    )}
                    {marcarTerminadas && o.estado !== "solicitada" && <EstadoBadge estado={o.estado} chico />}
                  </span>
                </div>
                {!sinEscuela && (
                  <div className="hidden truncate text-sm font-semibold pc:block">{o.escuelas?.direccion}</div>
                )}
                <div className="hidden items-center gap-2 text-sm pc:flex">
                  <span className="avatar size-7 text-xs">{iniciales(o.creador)}</span>
                  <span className="truncate font-medium">{nombreCompleto(o.creador)}</span>
                </div>
                <div className="text-right text-[13px] whitespace-nowrap text-muted">{fechaCorta(o.fecha)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
