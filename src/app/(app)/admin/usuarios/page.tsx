import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/usuarios";
import { UsuariosAdmin, type UsuarioFila } from "./usuarios-admin";

export const metadata: Metadata = { title: "Usuarios · Mantenimiento C7" };

export default async function UsuariosPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const [{ data: perfiles }, { data: escuelas }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre, apellido, email, rol, activo")
      .order("apellido")
      .order("nombre"),
    supabase.from("escuelas").select("supervisor_id, inspector_id"),
  ]);

  // Cantidad de escuelas asignadas a cada usuario
  const asignadas = new Map<string, number>();
  for (const e of escuelas ?? []) {
    for (const id of [e.supervisor_id, e.inspector_id]) {
      asignadas.set(id, (asignadas.get(id) ?? 0) + 1);
    }
  }

  const usuarios: UsuarioFila[] = (perfiles ?? []).map((p) => ({
    ...p,
    rol: p.rol as Rol,
    escuelas: asignadas.get(p.id) ?? 0,
  }));

  return (
    <>
      <AppHeader titulo="Usuarios" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-5">
        <UsuariosAdmin usuarios={usuarios} miId={admin.id} />
      </main>
    </>
  );
}
