import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EscuelasAdmin, type Escuela, type Persona } from "./escuelas-admin";

export const metadata: Metadata = { title: "Escuelas · Mantenimiento C7" };

export default async function EscuelasPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: escuelas }, { data: personas }] = await Promise.all([
    supabase
      .from("escuelas")
      .select(
        "id, nombre, direccion, activa, supervisor_id, inspector_id, supervisor:perfiles!escuelas_supervisor_id_fkey(nombre, apellido), inspector:perfiles!escuelas_inspector_id_fkey(nombre, apellido)",
      )
      .order("nombre")
      .returns<Escuela[]>(),
    supabase
      .from("perfiles")
      .select("id, nombre, apellido, rol")
      .in("rol", ["supervisor", "inspector"])
      .eq("activo", true)
      .order("apellido")
      .order("nombre")
      .returns<Persona[]>(),
  ]);

  return (
    <>
      <AppHeader titulo="Escuelas" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-5">
        <EscuelasAdmin
          escuelas={escuelas ?? []}
          supervisores={(personas ?? []).filter((p) => p.rol === "supervisor")}
          inspectores={(personas ?? []).filter((p) => p.rol === "inspector")}
        />
      </main>
    </>
  );
}
