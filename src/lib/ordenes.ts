// Valores validos: deben coincidir con los CHECK de la tabla ordenes_trabajo.

export const PRIORIDADES = ["baja", "media", "alta", "urgente"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

// solicitada -> en_proceso -> cerrada (la cierra el supervisor; la base guarda cuando y quien)
export const ESTADOS = ["solicitada", "en_proceso", "cerrada"] as const;
export type Estado = (typeof ESTADOS)[number];

export const ESTADO_LABEL: Record<Estado, string> = {
  solicitada: "Solicitada",
  en_proceso: "En proceso",
  cerrada: "Cerrada",
};

// Sugerencias para "Dónde, dentro de la escuela" (se puede escribir cualquier otra cosa)
export const LUGARES_COMUNES = [
  "Aula",
  "Baños planta baja",
  "Baños 1er piso",
  "Cocina / comedor",
  "Patio",
  "Hall de entrada",
  "Dirección",
  "Preceptoría",
  "Gimnasio",
  "Pasillo",
  "SUM",
  "Terraza",
];

export const MAX_FOTOS = 10;
export const MAX_DESCRIPCION = 2000;
export const MAX_UBICACION = 200;

// 142 -> "#0142"
export function numeroOrden(n: number) {
  return "#" + String(n).padStart(4, "0");
}

export function esPrioridad(v: unknown): v is Prioridad {
  return PRIORIDADES.includes(v as Prioridad);
}
