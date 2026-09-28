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

// Los avisos de ordenes borradas no tienen a donde abrirse: se dan por leidos al verlos
export async function verAvisosSinOrden(): Promise<void> {
  await getUsuario();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("avisos")
    .update({ leido_at: new Date().toISOString() })
    .is("leido_at", null)
    .is("orden_id", null)
    .select("id");
  if (error) return console.error("verAvisosSinOrden:", error);
  if (data?.length) refresh();
}
