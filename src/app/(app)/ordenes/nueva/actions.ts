"use server";

import { revalidatePath } from "next/cache";
import { getUsuario, puedeCrearOrdenes } from "@/lib/auth";
import {
  MAX_DESCRIPCION,
  MAX_FOTOS,
  MAX_UBICACION,
  esPrioridad,
} from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";

export type NuevaOrdenInput = {
  escuelaId: number;
  fecha: string;
  descripcion: string;
  prioridad: string;
  ubicacion: string;
  fotos: string[]; // paths ya subidos a Storage (bucket ordenes-fotos); puede ir vacio
};

type Resultado = { ok: true; id: number } | { ok: false; error: string };

export async function crearOrden(input: NuevaOrdenInput): Promise<Resultado> {
  const usuario = await getUsuario();
  if (!puedeCrearOrdenes(usuario)) {
    return { ok: false, error: "No tenés permiso para crear órdenes." };
  }

  const descripcion = String(input.descripcion ?? "").trim();
  const ubicacion = String(input.ubicacion ?? "").trim();
  const fotos = Array.isArray(input.fotos) ? input.fotos.map(String) : [];

  if (!Number.isInteger(input.escuelaId)) return { ok: false, error: "Elegí una escuela." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) return { ok: false, error: "La fecha no es válida." };
  if (!esPrioridad(input.prioridad)) return { ok: false, error: "Elegí una prioridad." };
  if (!ubicacion) return { ok: false, error: "Indicá la ubicación dentro del edificio." };
  if (ubicacion.length > MAX_UBICACION) return { ok: false, error: "La ubicación es demasiado larga." };
  if (!descripcion) return { ok: false, error: "Describí la tarea." };
  if (descripcion.length > MAX_DESCRIPCION) return { ok: false, error: "La descripción es demasiado larga." };
  if (fotos.length > MAX_FOTOS) return { ok: false, error: `Máximo ${MAX_FOTOS} fotos.` };
  if (fotos.some((p) => !p.startsWith(`${usuario.id}/`))) {
    return { ok: false, error: "Fotos inválidas." };
  }

  // La funcion corre con los permisos del usuario (RLS) e inserta orden + fotos juntas
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_orden", {
    p_escuela_id: input.escuelaId,
    p_fecha: input.fecha,
    p_descripcion: descripcion,
    p_prioridad: input.prioridad,
    p_ubicacion: ubicacion,
    p_fotos: fotos,
  });

  if (error) {
    console.error("crear_orden:", error);
    // 22023 = mensajes propios de la funcion, pensados para el usuario
    return {
      ok: false,
      error: error.code === "22023" ? error.message : "No se pudo guardar la orden. Probá de nuevo.",
    };
  }

  revalidatePath("/");
  return { ok: true, id: data as number };
}
