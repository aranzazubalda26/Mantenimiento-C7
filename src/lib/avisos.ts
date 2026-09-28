import { ESTADO_LABEL, PRIORIDAD_LABEL, esPrioridad, numeroOrden, type Estado } from "@/lib/ordenes";

// Avisos de la campanita (tabla avisos, los escribe la base desde el historial):
//   al supervisor/a: creada, editada, reabierta, borrada (lo que hace el inspector/a)
//   al inspector/a : terminada, fuera_de_alcance (lo que hace el supervisor/a)

export type TipoAviso = "creada" | "editada" | "reabierta" | "borrada" | "terminada" | "fuera_de_alcance";

export type Aviso = {
  id: number;
  tipo: TipoAviso;
  urgente: boolean;
  leido_at: string | null;
  created_at: string;
  orden_id: number | null;
  detalle: Record<string, unknown> | null; // borrada: {orden, descripcion, escuela}
  autor: { nombre: string; apellido: string } | null;
  orden: { id: number; descripcion: string; estado: Estado; escuelas: { direccion: string } | null } | null;
  evento: { detalle: Record<string, unknown> | null } | null;
};

const CAMPO: Record<string, string> = {
  descripcion: "la descripción",
  ubicacion: "el lugar",
  prioridad: "la prioridad",
  fecha: "la fecha",
};

const texto = (v: unknown) => (typeof v === "string" ? v : null);

// Que cambio en una edicion, en una linea: "Cambió la prioridad a Urgente y agregó 2 fotos"
function cambios(detalle: Record<string, unknown> | null) {
  if (!detalle) return null;
  const partes: string[] = [];
  for (const campo of Object.keys(CAMPO)) {
    const par = detalle[campo];
    if (!Array.isArray(par)) continue;
    if (campo === "prioridad" && esPrioridad(par[1])) partes.push(`cambió la prioridad a ${PRIORIDAD_LABEL[par[1]]}`);
    else partes.push(`cambió ${CAMPO[campo]}`);
  }
  const fotos = (n: number, verbo: string) => (n === 1 ? `${verbo} una foto` : `${verbo} ${n} fotos`);
  const agregadas = Number(detalle.fotos_agregadas) || 0;
  const quitadas = Number(detalle.fotos_quitadas) || 0;
  if (agregadas) partes.push(fotos(agregadas, "agregó"));
  if (quitadas) partes.push(fotos(quitadas, "quitó"));
  if (!partes.length) return null;
  const frase = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

// Titulo y detalle de un aviso, pensados para leerse de un vistazo en el celular.
// La orden tiene que ser visible (a.orden) salvo en 'borrada', que trae sus datos en detalle.
export function describirAviso(a: Aviso): { titulo: string; cita: string | null; extra: string | null } {
  const num = numeroOrden(a.orden?.id ?? (Number(a.detalle?.orden) || 0));
  const escuela = a.orden?.escuelas?.direccion ?? texto(a.detalle?.escuela) ?? "";
  const descripcion = a.orden?.descripcion ?? texto(a.detalle?.descripcion);
  const ev = a.evento?.detalle ?? null;
  // Estado de hoy, si ya no es el que dejo el aviso (ej.: tarea nueva que despues se termino,
  // o terminada que despues se reabrio)
  const dejo: Estado = a.tipo === "terminada" ? "cerrada" : a.tipo === "fuera_de_alcance" ? "fuera_de_alcance" : "solicitada";
  const ahora = a.orden && a.orden.estado !== dejo ? `Hoy: ${ESTADO_LABEL[a.orden.estado]}` : null;
  const junto = (...partes: (string | null | undefined)[]) => partes.filter(Boolean).join(" · ") || null;

  switch (a.tipo) {
    case "creada":
      return { titulo: `${a.urgente ? "Nueva tarea urgente" : "Nueva tarea"} en ${escuela}`, cita: descripcion, extra: ahora };
    case "editada":
      return { titulo: `Editó ${num} en ${escuela}`, cita: cambios(ev), extra: junto(ahora, descripcion) };
    case "reabierta":
      return { titulo: `Reabrió ${num} en ${escuela}`, cita: texto(ev?.motivo), extra: junto(ahora, descripcion) };
    case "borrada":
      return { titulo: `Borró ${num} de ${escuela}`, cita: descripcion, extra: null };
    case "terminada":
      return { titulo: `Terminó ${num} en ${escuela}`, cita: texto(ev?.nota), extra: junto(ahora, descripcion) };
    case "fuera_de_alcance":
      return { titulo: `Marcó ${num} fuera de alcance`, cita: texto(ev?.motivo), extra: junto(ahora, escuela, descripcion) };
  }
}
