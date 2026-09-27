import {
  ESTADO_LABEL,
  PRIORIDAD_LABEL,
  type Estado,
  type Prioridad,
} from "@/lib/ordenes";

// Colores del diseño de referencia
const ESTADO_CLASES: Record<Estado, string> = {
  solicitada: "bg-[#fef0c7] text-[#93370d]",
  cerrada: "bg-[#eef0f3] text-[#475467]",
};

// Orden reabierta (ver esReabierta): borde amarillo en las listas, para distinguirla del resto
export const BORDE_REABIERTA = "shadow-[inset_0_0_0_2px_#fdb022]";

const PRIORIDAD_CLASES: Record<Prioridad, string> = {
  baja: "bg-[#eef0f3] text-[#475467]",
  media: "bg-[#eef0f3] text-[#344054]",
  alta: "bg-[#ffead5] text-[#b93815]",
  urgente: "bg-danger-soft text-danger",
};

export function EstadoBadge({ estado, chico }: { estado: Estado; chico?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold before:size-1.5 before:rounded-full before:bg-current ${
        chico ? "h-[22px] px-2 text-[11.5px]" : "h-[26px] px-2.5 text-[12.5px]"
      } ${ESTADO_CLASES[estado]}`}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  return (
    <span
      className={`inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full px-2 text-xs font-semibold ${PRIORIDAD_CLASES[prioridad]}`}
    >
      {PRIORIDAD_LABEL[prioridad]}
    </span>
  );
}
