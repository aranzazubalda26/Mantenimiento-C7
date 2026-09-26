// Valores validos: deben coincidir con los CHECK de la tabla ordenes_trabajo.

export const PRIORIDADES = ["baja", "media", "alta", "urgente"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export const ESTADOS = ["pendiente", "en_proceso", "finalizada"] as const;
export type Estado = (typeof ESTADOS)[number];

export const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  finalizada: "Finalizada",
};

export const MAX_FOTOS = 10;
export const MAX_DESCRIPCION = 2000;
export const MAX_UBICACION = 200;

export function esPrioridad(v: unknown): v is Prioridad {
  return PRIORIDADES.includes(v as Prioridad);
}
