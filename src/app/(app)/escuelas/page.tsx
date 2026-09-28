import type { Metadata } from "next";
import { AppHeader, Pagina } from "@/components/app-header";
import { TableroEscuelas, cargarTablero } from "@/components/tablero-escuelas";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Escuelas · Mantenimiento C7" };

// Tablero de escuelas (pestaña "Escuelas" del supervisor/a; el resto lo tiene en el inicio)
export default async function EscuelasPage() {
  const usuario = await getUsuario();
  const supabase = await createClient();
  const { ordenes, escuelas } = await cargarTablero(supabase, usuario);
  const esAdmin = usuario.rol === "admin";

  return (
    <>
      <AppHeader titulo={esAdmin ? "Escuelas" : "Mis escuelas"} subtitulo={`${escuelas.length} ${escuelas.length === 1 ? "escuela" : "escuelas"}`} />
      <Pagina>
        <TableroEscuelas escuelas={escuelas} ordenes={ordenes} esAdmin={esAdmin} origen="/escuelas" titulo={false} />
      </Pagina>
    </>
  );
}
