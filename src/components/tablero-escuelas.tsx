import Link from "next/link";
import type { Usuario } from "@/lib/auth";
import type { createClient } from "@/lib/supabase/server";
import { IconoFlecha } from "./iconos";
import { TarjetaEscuela, type OrdenResumida } from "./tarjeta-escuela";

type Escuela = { id: number; direccion: string; nombre: string | null };

// Escuelas del tablero y sus ordenes: el admin ve todas; el resto, las asignadas (RLS filtra las ordenes)
export async function cargarTablero(supabase: Awaited<ReturnType<typeof createClient>>, usuario: Usuario) {
  let qEscuelas = supabase.from("escuelas").select("id, direccion, nombre").eq("activa", true).order("id");
  if (usuario.rol !== "admin") {
    qEscuelas = qEscuelas.or(`inspector_id.eq.${usuario.id},supervisor_id.eq.${usuario.id}`);
  }
  const [{ data: ordenes }, { data: escuelas }] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("id, escuela_id, estado, prioridad, descripcion, ubicacion, created_at, motivo_reapertura")
      .returns<OrdenResumida[]>(),
    qEscuelas.returns<Escuela[]>(),
  ]);
  return { ordenes: ordenes ?? [], escuelas: escuelas ?? [] };
}

// Tablero de escuelas: una tarjeta por escuela con lo que falta hacer.
//   `origen`: pantalla donde se muestra, para el "Volver a …" de las ordenes
export function TableroEscuelas({
  escuelas,
  ordenes,
  esAdmin,
  origen,
  titulo = true,
}: {
  escuelas: Escuela[];
  ordenes: OrdenResumida[];
  esAdmin: boolean;
  origen: string;
  titulo?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      {titulo && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-[-0.01em]">
            {esAdmin ? "Escuelas" : "Mis escuelas"}
            <span className="ml-2 text-sm font-normal text-muted">{escuelas.length}</span>
          </h2>
          {esAdmin && (
            <Link href="/admin/escuelas" className="flex min-h-8 items-center gap-1 text-[13.5px] font-medium text-primary hover:underline">
              Administrar
              <IconoFlecha className="size-3.5" />
            </Link>
          )}
        </div>
      )}

      {!escuelas.length ? (
        <p className="tarjeta px-5 py-10 text-center text-muted">
          {esAdmin ? "Todavía no hay escuelas cargadas." : "No tenés escuelas asignadas."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:items-start sm:gap-3.5">
          {escuelas.map((e) => (
            <TarjetaEscuela key={e.id} escuela={e} ordenes={ordenes.filter((o) => o.escuela_id === e.id)} origen={origen} />
          ))}
        </div>
      )}
    </section>
  );
}
