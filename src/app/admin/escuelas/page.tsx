import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EscuelasAdmin } from "./escuelas-admin";

export const metadata: Metadata = { title: "Escuelas · Mantenimiento C7" };

export default async function EscuelasPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: escuelas } = await supabase
    .from("escuelas")
    .select("id, nombre, direccion, activa")
    .order("nombre");

  return (
    <>
      <AppHeader titulo="Escuelas" volverA="/" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-5">
        <EscuelasAdmin escuelas={escuelas ?? []} />
      </main>
    </>
  );
}
