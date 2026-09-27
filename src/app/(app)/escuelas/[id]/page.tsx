import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader, Pagina } from "@/components/app-header";
import { IconoMas } from "@/components/iconos";
import { ListaOrdenes, type OrdenLista } from "@/components/lista-ordenes";
import { Volver } from "@/components/volver";
import { rutaCon } from "@/lib/navegacion";
import { getUsuario, puedeCrearOrdenes } from "@/lib/auth";
import { ESTADOS, type Estado } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";
import { nombreCompleto } from "@/lib/usuarios";

export const metadata: Metadata = { title: "Escuela · Mantenimiento C7" };

type Escuela = {
  id: number;
  direccion: string;
  nombre: string | null;
  activa: boolean;
  supervisor_id: string;
  inspector_id: string;
  supervisor: { nombre: string; apellido: string } | null;
  inspector: { nombre: string; apellido: string } | null;
};

const FILTROS: { valor: Estado | "todas"; texto: string }[] = [
  { valor: "todas", texto: "Todas" },
  { valor: "solicitada", texto: "Pendientes" },
  { valor: "cerrada", texto: "Terminadas" },
];

// Orden de la lista: primero lo que falta hacer, al final lo terminado
const ORDEN_ESTADO: Record<Estado, number> = { solicitada: 0, cerrada: 1 };

export default async function EscuelaPage(props: PageProps<"/escuelas/[id]">) {
  const usuario = await getUsuario();
  const { id } = await props.params;
  const { estado } = await props.searchParams;
  if (!/^\d+$/.test(id)) notFound();

  const filtro: Estado | "todas" = ESTADOS.includes(estado as Estado) ? (estado as Estado) : "todas";

  const supabase = await createClient();
  const { data: escuela } = await supabase
    .from("escuelas")
    .select(
      "id, direccion, nombre, activa, supervisor_id, inspector_id, supervisor:perfiles!escuelas_supervisor_id_fkey(nombre, apellido), inspector:perfiles!escuelas_inspector_id_fkey(nombre, apellido)",
    )
    .eq("id", Number(id))
    .maybeSingle<Escuela>();

  // El admin ve cualquier escuela; supervisor e inspector solo las asignadas
  const asignada = escuela && (escuela.supervisor_id === usuario.id || escuela.inspector_id === usuario.id);
  if (!escuela || (usuario.rol !== "admin" && !asignada)) notFound();

  // RLS filtra: solo vuelven las ordenes que el usuario puede ver
  const { data } = await supabase
    .from("ordenes_trabajo")
    .select(
      "id, fecha, descripcion, prioridad, estado, ubicacion, escuelas(direccion), creador:perfiles!ordenes_trabajo_creado_por_fkey(nombre, apellido)",
    )
    .eq("escuela_id", escuela.id)
    .order("created_at", { ascending: false })
    .returns<OrdenLista[]>();

  const ordenes = (data ?? []).sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]);
  const cuenta = (f: Estado | "todas") => (f === "todas" ? ordenes.length : ordenes.filter((o) => o.estado === f).length);
  const visibles = filtro === "todas" ? ordenes : ordenes.filter((o) => o.estado === filtro);
  const puedeCrear = puedeCrearOrdenes(usuario) && escuela.activa;

  return (
    <>
      <AppHeader
        titulo={escuela.direccion}
        subtitulo={escuela.nombre ?? undefined}
      >
        {puedeCrear && (
          <Link href={`/ordenes/nueva?escuela=${escuela.id}`} className="btn-primary" aria-label="Nueva orden en esta escuela">
            <IconoMas className="size-[18px]" />
            <span className="hidden pc:inline">Nueva orden</span>
          </Link>
        )}
      </AppHeader>

      <Pagina>
        <Volver href="/" a="inicio" />

        {/* Celular: datos de la escuela arriba y el equipo abajo; PC: todo en una fila */}
        <section className="tarjeta flex flex-col gap-3 p-4 pc:flex-row pc:items-center pc:gap-6 pc:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <p className="text-lg leading-tight font-bold tracking-[-0.01em]">{escuela.direccion}</p>
              {escuela.nombre && <p className="text-[13.5px] text-muted">{escuela.nombre}</p>}
              {!escuela.activa && <p className="mt-1 text-[13px] font-semibold text-danger">Escuela desactivada</p>}
            </div>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-sm pc:border-0 pc:pt-0">
            <div>
              <dt className="text-[12.5px] text-muted">Supervisor/a</dt>
              <dd className="font-medium">{nombreCompleto(escuela.supervisor)}</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-muted">Inspector/a</dt>
              <dd className="font-medium">{nombreCompleto(escuela.inspector)}</dd>
            </div>
          </dl>
        </section>

        <div className="segmento w-max" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={f.valor === "todas" ? `/escuelas/${escuela.id}` : `/escuelas/${escuela.id}?estado=${f.valor}`}
              aria-current={filtro === f.valor ? "page" : undefined}
              replace
              scroll={false}
            >
              {f.texto}
              <span className="text-xs font-normal text-muted">{cuenta(f.valor)}</span>
            </Link>
          ))}
        </div>

        <ListaOrdenes
          ordenes={visibles}
          origen={rutaCon(`/escuelas/${escuela.id}`, { estado: filtro === "todas" ? null : filtro })}
          sinEscuela
          marcarTerminadas={filtro === "todas"}
          vacio={
            <>
              {filtro === "todas"
                ? "Esta escuela todavía no tiene órdenes."
                : `No hay órdenes ${FILTROS.find((f) => f.valor === filtro)!.texto.toLowerCase()}.`}
              {puedeCrear && filtro === "todas" && (
                <>
                  <br />
                  <Link href={`/ordenes/nueva?escuela=${escuela.id}`} className="btn-secondary mt-3.5">
                    Crear una orden
                  </Link>
                </>
              )}
            </>
          }
        />
      </Pagina>
    </>
  );
}
