import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader, Pagina } from "@/components/app-header";
import { IconoMas } from "@/components/iconos";
import { ListaOrdenes, type OrdenLista } from "@/components/lista-ordenes";
import { getUsuario, puedeCrearOrdenes } from "@/lib/auth";
import type { Prioridad } from "@/lib/ordenes";
import { haceDiasISO } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import { FiltrosOrdenes } from "./filtros";

export const metadata: Metadata = { title: "Órdenes · Mantenimiento C7" };

type Vista = "pendientes" | "terminadas" | "fuera" | "todas";
type Orden = OrdenLista & { created_at: string; cerrada_at: string | null };

const VISTAS: { valor: Vista; texto: string }[] = [
  { valor: "pendientes", texto: "Pendientes" },
  { valor: "terminadas", texto: "Terminadas" },
  { valor: "fuera", texto: "Fuera de alcance" },
  { valor: "todas", texto: "Todas" },
];

const PESO_PRIORIDAD: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
const LIMITE = 300; // terminadas y todas: las mas recientes

// Todas las ordenes que el usuario puede ver (RLS), en una sola lista con filtros
export default async function OrdenesPage(props: PageProps<"/ordenes">) {
  const usuario = await getUsuario();
  const { ver, escuela, fecha } = await props.searchParams;
  const vista: Vista = ver === "terminadas" || ver === "fuera" || ver === "todas" ? ver : "pendientes";

  // Filtros opcionales: escuela (numero) y fecha de la orden (hoy / ultimos 7 / ultimos 30 dias)
  const escuelaId = typeof escuela === "string" && /^\d+$/.test(escuela) ? Number(escuela) : null;
  const desde =
    fecha === "hoy" ? haceDiasISO(0) : fecha === "7" ? haceDiasISO(6) : fecha === "30" ? haceDiasISO(29) : null;

  const supabase = await createClient();

  // Escuelas del filtro: el admin ve todas; el resto, las asignadas
  let qEscuelas = supabase.from("escuelas").select("id, direccion").order("id");
  if (usuario.rol !== "admin") {
    qEscuelas = qEscuelas.or(`inspector_id.eq.${usuario.id},supervisor_id.eq.${usuario.id}`);
  }

  let query = supabase
    .from("ordenes_trabajo")
    .select(
      "id, fecha, descripcion, prioridad, estado, ubicacion, created_at, cerrada_at, motivo_reapertura, escuelas(direccion), creador:perfiles!ordenes_trabajo_creado_por_fkey(nombre, apellido)",
    );
  if (escuelaId) query = query.eq("escuela_id", escuelaId);
  if (desde) query = query.gte("fecha", desde);
  if (vista === "pendientes") query = query.eq("estado", "solicitada");
  if (vista === "terminadas") query = query.eq("estado", "cerrada").order("cerrada_at", { ascending: false });
  if (vista === "fuera") query = query.eq("estado", "fuera_de_alcance").order("cerrada_at", { ascending: false });
  if (vista !== "pendientes") query = query.order("created_at", { ascending: false }).limit(LIMITE);

  let qPendientes = supabase.from("ordenes_trabajo").select("*", { count: "exact", head: true }).eq("estado", "solicitada");
  if (escuelaId) qPendientes = qPendientes.eq("escuela_id", escuelaId);
  if (desde) qPendientes = qPendientes.gte("fecha", desde);

  const [{ data }, { count: pendientes }, { data: escuelas }] = await Promise.all([
    query.returns<Orden[]>(),
    qPendientes,
    qEscuelas,
  ]);

  // Links de Pendientes/Terminadas/Todas conservando los filtros
  const hrefVista = (v: Vista) => {
    const p = new URLSearchParams();
    if (v !== "pendientes") p.set("ver", v);
    if (escuelaId) p.set("escuela", String(escuelaId));
    if (desde && typeof fecha === "string") p.set("fecha", fecha);
    const qs = p.toString();
    return qs ? `/ordenes?${qs}` : "/ordenes";
  };
  const hayFiltros = !!escuelaId || !!desde;

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
        <div className="flex flex-col gap-2.5 pc:flex-row pc:items-center pc:justify-between">
          <div className="segmento w-max" role="group" aria-label="Filtrar órdenes">
            {VISTAS.map((v) => (
              <Link
                key={v.valor}
                href={hrefVista(v.valor)}
                aria-current={vista === v.valor ? "page" : undefined}
                replace
                scroll={false}
              >
                {v.texto}
                {v.valor === "pendientes" && <span className="text-xs font-normal text-muted">{pendientes ?? 0}</span>}
              </Link>
            ))}
          </div>
          {/* key: si la URL cambia desde afuera (Atras, un link) se reinician con esos valores */}
          <FiltrosOrdenes
            key={`${escuelaId ?? ""}-${desde ? fecha : ""}`}
            escuelas={escuelas ?? []}
            escuela={escuelaId ? String(escuelaId) : ""}
            fecha={desde && typeof fecha === "string" ? fecha : ""}
          />
        </div>

        <ListaOrdenes
          ordenes={ordenes}
          origen={hrefVista(vista)}
          marcarTerminadas={vista === "todas"}
          vacio={
            hayFiltros
              ? "No hay órdenes con estos filtros."
              : vista === "pendientes"
                ? "No hay órdenes pendientes."
                : vista === "fuera"
                  ? "No hay órdenes fuera de alcance."
                  : "No hay órdenes para mostrar."
          }
        />
      </Pagina>
    </>
  );
}
