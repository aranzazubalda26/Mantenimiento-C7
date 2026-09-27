import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader, Pagina } from "@/components/app-header";
import { IconoMas } from "@/components/iconos";
import { ListaOrdenes, type OrdenLista } from "@/components/lista-ordenes";
import { getUsuario, puedeCrearOrdenes } from "@/lib/auth";
import type { Prioridad } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Órdenes · Mantenimiento C7" };

type Vista = "pendientes" | "terminadas" | "todas";
type Orden = OrdenLista & { created_at: string; cerrada_at: string | null };

const VISTAS: { valor: Vista; texto: string }[] = [
  { valor: "pendientes", texto: "Pendientes" },
  { valor: "terminadas", texto: "Terminadas" },
  { valor: "todas", texto: "Todas" },
];

const PESO_PRIORIDAD: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
const LIMITE = 300; // terminadas y todas: las mas recientes

// Todas las ordenes que el usuario puede ver (RLS), en una sola lista con filtros
export default async function OrdenesPage(props: PageProps<"/ordenes">) {
  const usuario = await getUsuario();
  const { ver } = await props.searchParams;
  const vista: Vista = ver === "terminadas" || ver === "todas" ? ver : "pendientes";

  const supabase = await createClient();
  let query = supabase
    .from("ordenes_trabajo")
    .select(
      "id, fecha, descripcion, prioridad, estado, ubicacion, created_at, cerrada_at, escuelas(direccion), creador:perfiles!ordenes_trabajo_creado_por_fkey(nombre, apellido)",
    );
  if (vista === "pendientes") query = query.eq("estado", "solicitada");
  if (vista === "terminadas") query = query.eq("estado", "cerrada").order("cerrada_at", { ascending: false });
  if (vista !== "pendientes") query = query.order("created_at", { ascending: false }).limit(LIMITE);

  const [{ data }, { count: pendientes }] = await Promise.all([
    query.returns<Orden[]>(),
    supabase.from("ordenes_trabajo").select("*", { count: "exact", head: true }).eq("estado", "solicitada"),
  ]);

  // Pendientes: lo mas urgente primero; a igual prioridad, lo mas viejo primero
  const ordenes =
    vista === "pendientes"
      ? (data ?? []).sort(
          (a, b) =>
            PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] ||
            a.created_at.localeCompare(b.created_at),
        )
      : (data ?? []);

  return (
    <>
      <AppHeader titulo="Órdenes" subtitulo={`${pendientes ?? 0} pendientes`}>
        {puedeCrearOrdenes(usuario) && (
          // En el celular esta el boton central de la barra de abajo
          <Link href="/ordenes/nueva" className="btn-primary hidden pc:inline-flex">
            <IconoMas className="size-[18px]" />
            Nueva orden
          </Link>
        )}
      </AppHeader>

      <Pagina>
        <div className="segmento w-max" role="group" aria-label="Filtrar órdenes">
          {VISTAS.map((v) => (
            <Link
              key={v.valor}
              href={v.valor === "pendientes" ? "/ordenes" : `/ordenes?ver=${v.valor}`}
              aria-current={vista === v.valor ? "page" : undefined}
              replace
              scroll={false}
            >
              {v.texto}
              {v.valor === "pendientes" && <span className="text-xs font-normal text-muted">{pendientes ?? 0}</span>}
            </Link>
          ))}
        </div>

        <ListaOrdenes
          ordenes={ordenes}
          vacio={vista === "pendientes" ? "No hay órdenes pendientes." : "No hay órdenes para mostrar."}
        />
      </Pagina>
    </>
  );
}
