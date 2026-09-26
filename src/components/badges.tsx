import {
  ESTADO_LABEL,
  PRIORIDAD_LABEL,
  type Estado,
  type Prioridad,
} from "@/lib/ordenes";

const PRIORIDAD_CLASES: Record<Prioridad, string> = {
  baja: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
  media: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  alta: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  urgente: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const ESTADO_CLASES: Record<Estado, string> = {
  pendiente: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  en_proceso: "border-sky-500/40 text-sky-700 dark:text-sky-300",
  finalizada: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
};

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORIDAD_CLASES[prioridad]}`}
    >
      {prioridad === "urgente" && <span aria-hidden>!</span>}
      {PRIORIDAD_LABEL[prioridad]}
    </span>
  );
}

export function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASES[estado]}`}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}
