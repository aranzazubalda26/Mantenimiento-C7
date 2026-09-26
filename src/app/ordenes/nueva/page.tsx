import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getUsuario, puedeCrearOrdenes } from "@/lib/auth";
import { hoyISO } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import { NuevaOrdenForm } from "./nueva-orden-form";

export const metadata: Metadata = { title: "Nueva orden · Mantenimiento C7" };

export default async function NuevaOrdenPage() {
  const usuario = await getUsuario();
  if (!puedeCrearOrdenes(usuario)) redirect("/");

  const supabase = await createClient();
  let query = supabase
    .from("escuelas")
    .select("id, nombre, direccion")
    .eq("activa", true)
    .order("nombre");
  // El inspector solo carga ordenes en sus escuelas (la base tambien lo exige)
  if (usuario.rol === "inspector") query = query.eq("inspector_id", usuario.id);
  const { data: escuelas } = await query;

  return (
    <>
      <AppHeader titulo="Nueva orden" volverA="/" />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-5">
        <NuevaOrdenForm
          escuelas={escuelas ?? []}
          usuarioId={usuario.id}
          hoy={hoyISO()}
          esAdmin={usuario.rol === "admin"}
        />
      </main>
    </>
  );
}
