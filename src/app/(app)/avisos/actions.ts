"use server";

import { refresh, revalidatePath } from "next/cache";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// El RLS deja marcar solo los avisos propios, y solo la columna leido_at

export async function marcarTodoLeido(): Promise<void> {
  await getUsuario();
  const supabase = await createClient();
  const { error } = await supabase.from("avisos").update({ leido_at: new Date().toISOString() }).is("leido_at", null);
  if (error) console.error("marcarTodoLeido:", error);
  revalidatePath("/", "layout");
}

// Avisos que no tienen a donde abrirse: de ordenes borradas, o de ordenes que el usuario ya
// no puede ver (p. ej. lo sacaron de esa escuela). Se dan por leidos al verlos.
//   `ocultos`: ids de avisos cuya orden ya no es visible (los detecta la pantalla)
export async function verAvisosSinOrden(ocultos: number[]): Promise<void> {
  await getUsuario();
  const ids = (Array.isArray(ocultos) ? ocultos : []).filter(Number.isInteger).slice(0, 200);
  const supabase = await createClient();
  let q = supabase.from("avisos").update({ leido_at: new Date().toISOString() }).is("leido_at", null);
  q = ids.length ? q.or(`orden_id.is.null,id.in.(${ids.join(",")})`) : q.is("orden_id", null);
  const { data, error } = await q.select("id");
  if (error) return console.error("verAvisosSinOrden:", error);
  if (data?.length) refresh();
}
