"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Valores = {
  nombre: string;
  direccion: string;
  supervisorId: string;
  inspectorId: string;
};

// `valores` se devuelven para que el formulario no se vacie si hay error.
// `intento` cambia en cada respuesta: el formulario lo usa como key para re-montar
// los campos con `valores` (React resetea el form y los <select> pierden lo elegido)
export type EscuelaState = {
  error: string | null;
  ok: boolean;
  valores: Valores;
  intento: number;
};

function leer(formData: FormData): Valores {
  return {
    nombre: String(formData.get("nombre") ?? "").trim().replace(/\s+/g, " "),
    direccion: String(formData.get("direccion") ?? "").trim(),
    supervisorId: String(formData.get("supervisor_id") ?? ""),
    inspectorId: String(formData.get("inspector_id") ?? ""),
  };
}

function validar(v: Valores) {
  if (!v.nombre) return "Escribí el nombre de la escuela.";
  if (!v.supervisorId) return "Elegí el supervisor.";
  if (!v.inspectorId) return "Elegí el inspector.";
  return null;
}

function aFila(v: Valores) {
  return {
    nombre: v.nombre,
    direccion: v.direccion || null,
    supervisor_id: v.supervisorId,
    inspector_id: v.inspectorId,
  };
}

function mensaje(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Ya existe una escuela con ese nombre.";
  if (error.code === "22023") return error.message; // validacion de asignaciones en la base
  console.error(error);
  return "No se pudo guardar. Probá de nuevo.";
}

function revalidar() {
  revalidatePath("/admin/escuelas");
  revalidatePath("/admin/usuarios");
  revalidatePath("/");
}

export async function crearEscuela(
  prev: EscuelaState,
  formData: FormData,
): Promise<EscuelaState> {
  await requireAdmin();
  const valores = leer(formData);
  const invalido = validar(valores);
  if (invalido) return { error: invalido, ok: false, valores, intento: prev.intento + 1 };

  const supabase = await createClient();
  const { error } = await supabase.from("escuelas").insert(aFila(valores));
  if (error) return { error: mensaje(error), ok: false, valores, intento: prev.intento + 1 };

  revalidar();
  return {
    error: null,
    ok: true,
    // Supervisor e inspector quedan elegidos: suelen cargar varias escuelas seguidas del mismo equipo
    valores: { ...valores, nombre: "", direccion: "" },
    intento: prev.intento + 1,
  };
}

export async function editarEscuela(
  id: number,
  prev: EscuelaState,
  formData: FormData,
): Promise<EscuelaState> {
  await requireAdmin();
  const valores = leer(formData);
  const invalido = validar(valores);
  if (invalido) return { error: invalido, ok: false, valores, intento: prev.intento + 1 };

  const supabase = await createClient();
  const { error } = await supabase.from("escuelas").update(aFila(valores)).eq("id", id);
  if (error) return { error: mensaje(error), ok: false, valores, intento: prev.intento + 1 };

  revalidar();
  return { error: null, ok: true, valores, intento: prev.intento + 1 };
}

// Desactivar en vez de borrar: las ordenes viejas siguen apuntando a la escuela
export async function cambiarActiva(id: number, activa: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("escuelas").update({ activa }).eq("id", id);
  revalidar();
}
