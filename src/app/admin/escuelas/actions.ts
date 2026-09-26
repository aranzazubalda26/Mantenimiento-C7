"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// `nombre`/`direccion` se devuelven para que el formulario no se vacie si hay error
export type EscuelaState = {
  error: string | null;
  ok: boolean;
  nombre: string;
  direccion: string;
};

function leer(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim().replace(/\s+/g, " "),
    direccion: String(formData.get("direccion") ?? "").trim(),
  };
}

function mensaje(code: string | undefined) {
  if (code === "23505") return "Ya existe una escuela con ese nombre.";
  return "No se pudo guardar. Probá de nuevo.";
}

export async function crearEscuela(
  _prev: EscuelaState,
  formData: FormData,
): Promise<EscuelaState> {
  await requireAdmin();
  const { nombre, direccion } = leer(formData);
  if (!nombre) {
    return { error: "Escribí el nombre de la escuela.", ok: false, nombre, direccion };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("escuelas")
    .insert({ nombre, direccion: direccion || null });
  if (error) return { error: mensaje(error.code), ok: false, nombre, direccion };

  revalidatePath("/admin/escuelas");
  revalidatePath("/");
  return { error: null, ok: true, nombre: "", direccion: "" };
}

export async function editarEscuela(
  id: number,
  _prev: EscuelaState,
  formData: FormData,
): Promise<EscuelaState> {
  await requireAdmin();
  const { nombre, direccion } = leer(formData);
  if (!nombre) {
    return { error: "El nombre no puede quedar vacío.", ok: false, nombre, direccion };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("escuelas")
    .update({ nombre, direccion: direccion || null })
    .eq("id", id);
  if (error) return { error: mensaje(error.code), ok: false, nombre, direccion };

  revalidatePath("/admin/escuelas");
  return { error: null, ok: true, nombre, direccion };
}

// Desactivar en vez de borrar: las ordenes viejas siguen apuntando a la escuela
export async function cambiarActiva(id: number, activa: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("escuelas").update({ activa }).eq("id", id);
  revalidatePath("/admin/escuelas");
}
