// Valores validos: deben coincidir con los CHECK de la tabla ordenes_trabajo.

export const PRIORIDADES = ["baja", "media", "alta", "urgente"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

// solicitada -> cerrada | fuera_de_alcance. En la app: "Pendiente", "Terminada" y
// "Fuera de alcance" (obra que se factura aparte). Las cierra el supervisor/a; la base
// guarda cuando y quien (cerrada_at / cerrada_por) y la nota o el motivo (nota_cierre).
export const ESTADOS = ["solicitada", "cerrada", "fuera_de_alcance"] as const;
export type Estado = (typeof ESTADOS)[number];

export const ESTADO_LABEL: Record<Estado, string> = {
  solicitada: "Pendiente",
  cerrada: "Terminada",
  fuera_de_alcance: "Fuera de alcance",
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

// Bucket privado de Storage con las fotos de las ordenes (problema y cierre)
export const BUCKET_FOTOS = "ordenes-fotos";

export const MAX_FOTOS = 10;
export const MAX_FOTOS_CIERRE = 5;
export const MAX_NOTA_CIERRE = 500;
export const MAX_DESCRIPCION = 2000;
export const MAX_UBICACION = 200;

// 142 -> "#0142"
export function numeroOrden(n: number) {
  return "#" + String(n).padStart(4, "0");
}

export function esPrioridad(v: unknown): v is Prioridad {
  return PRIORIDADES.includes(v as Prioridad);
}

// Reabierta por el inspector/a y todavia pendiente (al terminarla, la base borra el motivo)
export function esReabierta(o: { estado: Estado; motivo_reapertura: string | null }) {
  return o.estado === "solicitada" && !!o.motivo_reapertura;
}

// Datos de una orden al crearla o editarla (texto ya recortado): el primer error, o null
export function validarDatosOrden(d: { fecha: string; descripcion: string; prioridad: string; ubicacion: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) return "La fecha no es válida.";
  if (!esPrioridad(d.prioridad)) return "Elegí una prioridad.";
  if (!d.ubicacion) return "Indicá la ubicación dentro del edificio.";
  if (d.ubicacion.length > MAX_UBICACION) return "La ubicación es demasiado larga.";
  if (!d.descripcion) return "Describí la tarea.";
  if (d.descripcion.length > MAX_DESCRIPCION) return "La descripción es demasiado larga.";
  return null;
}
