"use server";

import { refresh, revalidatePath } from "next/cache";
import { getUsuario } from "@/lib/auth";
import { BUCKET_FOTOS, MAX_FOTOS, MAX_FOTOS_CIERRE, MAX_NOTA_CIERRE, validarDatosOrden } from "@/lib/ordenes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Quien puede hacer que lo decide la base (RLS + triggers, ver migraciones
// 20260927180000 y 20260928120000): acá solo se traducen los errores y se refrescan las pantallas.
// La fecha, hora y autor de cada cambio los registra la base en el historial.

type Resultado = { error: string | null };

function mensaje(error: { code?: string; message: string }, accion: string): string {
  if (error.code === "22023") return error.message; // reglas de la base, pensadas para el usuario
  console.error(`${accion}:`, error);
  return "No se pudo guardar. Probá de nuevo.";
}

function refrescar(ordenId: number) {
  revalidatePath(`/ordenes/${ordenId}`);
  revalidatePath("/", "layout");
}

// Supervisor/a de la escuela (o admin): pendiente -> terminada, con fotos del trabajo
// hecho (ya subidas a Storage; el supervisor/a tiene que mandar al menos una) y nota opcional.
export async function terminarOrden(ordenId: number, nota: string, fotos: string[]): Promise<Resultado> {
  const usuario = await getUsuario();
  if (usuario.rol !== "admin" && usuario.rol !== "supervisor") {
    return { error: "Solo el supervisor/a puede marcar la orden como terminada." };
  }
  const texto = String(nota ?? "").trim();
  const paths = Array.isArray(fotos) ? fotos.map(String) : [];
  if (texto.length > MAX_NOTA_CIERRE) return { error: "La nota es demasiado larga." };
  if (usuario.rol === "supervisor" && !paths.length) return { error: "Sacá al menos una foto del trabajo terminado." };
  if (paths.length > MAX_FOTOS_CIERRE) return { error: `Máximo ${MAX_FOTOS_CIERRE} fotos.` };
  // Solo "<usuario>/<nombre>.<ext>" (lo que arma subirFotos): nada de subcarpetas ni ".."
  const valida = new RegExp(`^${usuario.id}/[A-Za-z0-9_-]+\\.(jpg|jpeg|png|webp)$`);
  if (paths.some((p) => !valida.test(p))) return { error: "Fotos inválidas." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("terminar_orden", { p_id: ordenId, p_nota: texto || null, p_fotos: paths });
  if (error) return { error: mensaje(error, "terminarOrden") };
  refrescar(ordenId);
  return { error: null };
}

// Supervisor/a de la escuela (o admin): pendiente -> fuera de alcance (obra que se factura
// aparte), con el motivo obligatorio
export async function marcarFueraDeAlcance(ordenId: number, motivo: string): Promise<Resultado> {
  const usuario = await getUsuario();
  if (usuario.rol !== "admin" && usuario.rol !== "supervisor") {
    return { error: "Solo el supervisor/a puede marcar la orden como fuera de alcance." };
  }
  const texto = String(motivo ?? "").trim();
  if (!texto) return { error: "Escribí por qué no corresponde a mantenimiento." };
  if (texto.length > MAX_NOTA_CIERRE) return { error: "El motivo es demasiado largo." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .update({ estado: "fuera_de_alcance", nota_cierre: texto })
    .eq("id", ordenId)
    .select("id");
  if (error) return { error: mensaje(error, "marcarFueraDeAlcance") };
  if (!data?.length) return { error: "No tenés permiso sobre esta orden." };
  refrescar(ordenId);
  return { error: null };
}

// Quien la cerro, dentro de los segundos que da la base: vuelve a pendiente sin dejar rastro
export async function deshacerCierre(ordenId: number): Promise<Resultado> {
  await getUsuario();
  const supabase = await createClient();
  const { data: quitadas, error } = await supabase.rpc("deshacer_cierre", { p_id: ordenId });
  if (error) return { error: mensaje(error, "deshacerCierre") };
  // La base ya quito las fotos del cierre: borrar sus archivos
  const paths = (quitadas as string[] | null) ?? [];
  if (paths.length) await createAdminClient().storage.from(BUCKET_FOTOS).remove(paths);
  refrescar(ordenId);
  return { error: null };
}

// Al abrir la orden: marca sus avisos como leidos y registra "vista" (supervisor/a).
// Se llama desde el navegador al mostrar la pantalla, no al prearmarla.
export async function abrirOrden(ordenId: number): Promise<void> {
  const usuario = await getUsuario();
  if (!usuario.rol || !Number.isInteger(ordenId)) return;
  const supabase = await createClient();
  const { data: cambio, error } = await supabase.rpc("abrir_orden", { p_id: ordenId });
  if (error) return console.error("abrirOrden:", error);
  // "Vista" nueva en el historial o avisos leidos: que la pantalla y los contadores lo muestren
  if (cambio) refresh();
}

// Inspector/a de la escuela: terminada -> pendiente, con motivo obligatorio
export async function reabrirOrden(ordenId: number, motivo: string): Promise<Resultado> {
  const usuario = await getUsuario();
  if (usuario.rol !== "inspector") return { error: "Solo el inspector/a puede reabrir una orden." };
  const texto = String(motivo ?? "").trim();
  if (!texto) return { error: "Escribí el motivo para reabrir la orden." };
  if (texto.length > 500) return { error: "El motivo es demasiado largo." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .update({ estado: "solicitada", motivo_reapertura: texto })
    .eq("id", ordenId)
    .select("id");
  if (error) return { error: mensaje(error, "reabrirOrden") };
  if (!data?.length) return { error: "No tenés permiso sobre esta orden." };
  refrescar(ordenId);
  return { error: null };
}

export type EdicionInput = {
  id: number;
  fecha: string;
  descripcion: string;
  prioridad: string;
  ubicacion: string;
  fotosNuevas: string[]; // paths ya subidos a Storage (bucket ordenes-fotos)
  fotosQuitar: number[]; // ids de orden_fotos
};

// Inspector/a de la escuela o admin, solo mientras esta pendiente. Datos y fotos
// se guardan juntos (funcion editar_orden); el historial anota solo lo que cambio.
export async function editarOrden(input: EdicionInput): Promise<Resultado> {
  const usuario = await getUsuario();
  if (usuario.rol !== "admin" && usuario.rol !== "inspector") {
    return { error: "No tenés permiso para editar órdenes." };
  }

  const descripcion = String(input.descripcion ?? "").trim();
  const ubicacion = String(input.ubicacion ?? "").trim();
  const nuevas = Array.isArray(input.fotosNuevas) ? input.fotosNuevas.map(String) : [];
  const quitar = Array.isArray(input.fotosQuitar) ? input.fotosQuitar.filter(Number.isInteger) : [];

  if (!Number.isInteger(input.id)) return { error: "La orden no es válida." };
  const invalido = validarDatosOrden({ fecha: input.fecha, descripcion, prioridad: input.prioridad, ubicacion });
  if (invalido) return { error: invalido };
  if (nuevas.length > MAX_FOTOS) return { error: `Máximo ${MAX_FOTOS} fotos.` };
  if (nuevas.some((p) => !p.startsWith(`${usuario.id}/`))) return { error: "Fotos inválidas." };

  const supabase = await createClient();
  const { data: quitadas, error } = await supabase.rpc("editar_orden", {
    p_id: input.id,
    p_fecha: input.fecha,
    p_descripcion: descripcion,
    p_prioridad: input.prioridad,
    p_ubicacion: ubicacion,
    p_fotos_nuevas: nuevas,
    p_fotos_quitar: quitar,
  });
  if (error) return { error: mensaje(error, "editarOrden") };

  // La base ya quito las fotos: borrar sus archivos (pueden ser de otro usuario)
  const paths = (quitadas as string[] | null) ?? [];
  if (paths.length) await createAdminClient().storage.from(BUCKET_FOTOS).remove(paths);
  refrescar(input.id);
  return { error: null };
}

// Inspector/a de la escuela o admin, solo mientras esta pendiente. Borra de verdad:
// la orden, sus fotos y su historial.
export async function borrarOrden(ordenId: number): Promise<Resultado> {
  const usuario = await getUsuario();
  if (usuario.rol !== "admin" && usuario.rol !== "inspector") {
    return { error: "No tenés permiso para borrar órdenes." };
  }
  const supabase = await createClient();
  const { data: fotos } = await supabase.from("orden_fotos").select("path").eq("orden_id", ordenId);

  const { data, error } = await supabase.from("ordenes_trabajo").delete().eq("id", ordenId).select("id");
  if (error) return { error: mensaje(error, "borrarOrden") };
  // RLS: si no era pendiente o no es de sus escuelas, no se borra nada
  if (!data?.length) return { error: "Solo se pueden borrar órdenes pendientes de tus escuelas." };

  // La base ya autorizo el borrado: limpiar los archivos de las fotos (pueden ser de otro usuario)
  if (fotos?.length) {
    await createAdminClient().storage.from(BUCKET_FOTOS).remove(fotos.map((f) => f.path));
  }
  revalidatePath("/", "layout");
  return { error: null };
}
