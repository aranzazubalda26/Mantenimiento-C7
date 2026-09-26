"use server";

import { revalidatePath } from "next/cache";
import { getUsuario } from "@/lib/auth";
import { ESTADOS, type Estado } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";

// Cambia el estado de una orden. Quien puede y que se puede cambiar lo decide la
// base (RLS + trigger): supervisor de la escuela o admin; cerrada solo la reabre el admin.
// La fecha, hora y autor del cierre los pone la base.
export async function cambiarEstado(
  ordenId: number,
  estado: Estado,
): Promise<{ error: string | null }> {
  const usuario = await getUsuario();
  if (usuario.rol !== "admin" && usuario.rol !== "supervisor") {
    return { error: "No tenés permiso para cambiar el estado." };
  }
  if (!ESTADOS.includes(estado)) return { error: "Estado inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .update({ estado })
    .eq("id", ordenId)
    .select("id");

  if (error) {
    if (error.code === "22023") return { error: error.message };
    console.error("cambiarEstado:", error);
    return { error: "No se pudo cambiar el estado. Probá de nuevo." };
  }
  // RLS: sin permiso sobre esa orden no se actualiza ninguna fila
  if (!data?.length) return { error: "No tenés permiso para cambiar el estado de esta orden." };

  revalidatePath(`/ordenes/${ordenId}`);
  revalidatePath("/", "layout");
  return { error: null };
}
