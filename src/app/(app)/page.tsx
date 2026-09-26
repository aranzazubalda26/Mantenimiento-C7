import Link from "next/link";
import { AppHeader, Pagina } from "@/components/app-header";
import { PrioridadBadge } from "@/components/badges";
import {
  IconoAlerta,
  IconoFlecha,
  IconoLlave,
  IconoMas,
  IconoOk,
  IconoTareas,
} from "@/components/iconos";
import { ListaOrdenes, type OrdenLista } from "@/components/lista-ordenes";
import { getUsuario, puedeCrearOrdenes } from "@/lib/auth";
import { ESTADOS, ESTADO_LABEL, numeroOrden, type Estado, type Prioridad } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";

type Resumida = { id: number; escuela_id: number; estado: Estado; prioridad: Prioridad };
type Urgente = {
  id: number;
  descripcion: string;
  prioridad: Prioridad;
  ubicacion: string;
  escuela_id: number;
  escuelas: { direccion: string } | null;
};

const SELECT_LISTA =
  "id, fecha, descripcion, prioridad, estado, ubicacion, escuelas(direccion), creador:perfiles!ordenes_trabajo_creado_por_fkey(nombre, apellido)";

// Contadores por estado en cada escuela (mismos colores que las pastillas de estado)
const CONTADOR_ESTADO: Record<Estado, string> = {
  solicitada: "bg-[#fef0c7] text-[#93370d]",
  en_proceso: "bg-[#dce8fd] text-[#1e40af]",
  cerrada: "bg-[#eef0f3] text-[#475467]",
};

const PLURAL_ESTADO: Record<Estado, string> = {
  solicitada: "Solicitadas",
  en_proceso: "En proceso",
  cerrada: "Cerradas",
};

export default async function Home() {
  const usuario = await getUsuario();
  const supabase = await createClient();
  const esAdmin = usuario.rol === "admin";

  // Escuelas del tablero: el admin ve todas; el resto, las asignadas
  let qEscuelas = supabase.from("escuelas").select("id, direccion, nombre").eq("activa", true).order("id");
  if (!esAdmin) {
    qEscuelas = qEscuelas.or(`inspector_id.eq.${usuario.id},supervisor_id.eq.${usuario.id}`);
  }

  // RLS filtra las ordenes: el admin todas; supervisor/inspector las de sus escuelas
  const [{ data: todas }, { data: recientes }, { data: urgentes }, { data: escuelas }] = await Promise.all([
    supabase.from("ordenes_trabajo").select("id, escuela_id, estado, prioridad").returns<Resumida[]>(),
    supabase
      .from("ordenes_trabajo")
      .select(SELECT_LISTA)
      .order("created_at", { ascending: false })
      .limit(15)
      .returns<OrdenLista[]>(),
    supabase
      .from("ordenes_trabajo")
      .select("id, descripcion, prioridad, ubicacion, escuela_id, escuelas(direccion)")
      .eq("estado", "solicitada")
      .in("prioridad", ["urgente", "alta"])
      .order("prioridad", { ascending: false }) // "urgente" > "alta" alfabeticamente
      .order("created_at", { ascending: true })
      .limit(8)
      .returns<Urgente[]>(),
    qEscuelas,
  ]);

  const ordenes = todas ?? [];
  const cuenta = (f: (o: Resumida) => boolean) => ordenes.filter(f).length;
  const nUrgentes = cuenta((o) => o.estado === "solicitada" && o.prioridad === "urgente");
  const nSolicitadas = cuenta((o) => o.estado === "solicitada");
  const nEnProceso = cuenta((o) => o.estado === "en_proceso");
  const nCerradas = cuenta((o) => o.estado === "cerrada");

  const resumen = [
    { n: nUrgentes, titulo: "Urgentes solicitadas", sub: nUrgentes ? "Necesitan atención ya" : "Todo bajo control", color: "#B42318", fondo: "#FEE4E2", icono: <IconoAlerta /> },
    { n: nSolicitadas, titulo: "Solicitadas", sub: nSolicitadas ? "Todavía no se empezaron" : "Nada pendiente", color: "#93370D", fondo: "#FEF0C7", icono: <IconoTareas /> },
    { n: nEnProceso, titulo: "En proceso", sub: nEnProceso ? "Se están trabajando" : "Nada en curso", color: "#1E40AF", fondo: "#DCE8FD", icono: <IconoLlave /> },
    { n: nCerradas, titulo: "Cerradas", sub: "Desde el inicio", color: "#475467", fondo: "#EEF0F3", icono: <IconoOk /> },
  ];

  return (
    <>
      <AppHeader titulo={usuario.nombre ? `Hola, ${usuario.nombre}` : "Inicio"}>
        {puedeCrearOrdenes(usuario) && (
          <Link href="/ordenes/nueva" className="btn-primary" aria-label="Nueva orden">
            <IconoMas className="size-[18px]" />
            <span className="hidden pc:inline">Nueva orden</span>
          </Link>
        )}
      </AppHeader>

      <Pagina>
        {!usuario.rol ? (
          <p className="tarjeta p-5 text-muted">
            Tu usuario no está habilitado. Pedile al administrador que lo revise.
          </p>
        ) : (
          <>
            {/* Lo primero: las escuelas. Tocando una se ven todas sus ordenes */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold tracking-[-0.01em]">
                  {esAdmin ? "Escuelas" : "Mis escuelas"}
                  <span className="ml-2 text-sm font-normal text-muted">{escuelas?.length ?? 0}</span>
                </h2>
                {esAdmin && (
                  <Link href="/admin/escuelas" className="flex min-h-8 items-center gap-1 text-[13.5px] font-medium text-primary hover:underline">
                    Administrar
                    <IconoFlecha className="size-3.5" />
                  </Link>
                )}
              </div>

              {!escuelas?.length ? (
                <p className="tarjeta px-5 py-10 text-center text-muted">
                  {esAdmin ? "Todavía no hay escuelas cargadas." : "No tenés escuelas asignadas."}
                </p>
              ) : (
                <ul className="tarjeta divide-y divide-border overflow-hidden">
                  {escuelas.map((e) => {
                    const suyas = ordenes.filter((o) => o.escuela_id === e.id);
                    const n = (est: Estado) => suyas.filter((o) => o.estado === est).length;
                    const urgente = suyas.some((o) => o.estado === "solicitada" && o.prioridad === "urgente");
                    return (
                      <li key={e.id}>
                        <Link
                          href={`/escuelas/${e.id}`}
                          className="flex items-center gap-3 px-4 py-3.5 hover:bg-fila-hover pc:gap-4 pc:px-5"
                        >
                          <span className="esc-num h-9 min-w-9 text-sm">{e.id}</span>
                          <span className="flex min-w-0 flex-1 flex-col gap-1.5 pc:flex-row pc:items-center pc:gap-4">
                            <span className="min-w-0 pc:flex-1">
                              <span className="block font-semibold leading-snug">{e.direccion}</span>
                              {e.nombre && <span className="block truncate text-[13px] text-muted">{e.nombre}</span>}
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5">
                              {urgente && <PrioridadBadge prioridad="urgente" />}
                              {suyas.length === 0 ? (
                                <span className="text-[13px] text-muted">Sin órdenes</span>
                              ) : (
                                ESTADOS.map((est) =>
                                  n(est) ? (
                                    <span key={est} className={`inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-xs font-semibold ${CONTADOR_ESTADO[est]}`}>
                                      <b className="tabular-nums">{n(est)}</b>
                                      {(n(est) === 1 ? ESTADO_LABEL[est] : PLURAL_ESTADO[est]).toLowerCase()}
                                    </span>
                                  ) : null,
                                )
                              )}
                            </span>
                          </span>
                          <IconoFlecha className="size-5 text-muted" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="grid grid-cols-2 gap-2.5 min-[1180px]:grid-cols-4 min-[1180px]:gap-3.5">
              {resumen.map((r) => (
                <div key={r.titulo} className="tarjeta grid grid-cols-[auto_1fr] items-center gap-x-3 p-3.5 pc:px-[18px] pc:py-4">
                  <span className="grid size-9 place-items-center rounded-[10px]" style={{ background: r.fondo, color: r.color }}>
                    {r.icono}
                  </span>
                  <span className="justify-self-end text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums pc:text-[30px]">
                    {r.n}
                  </span>
                  <span className="col-span-2 mt-3.5 text-[14.5px] font-semibold">{r.titulo}</span>
                  <span className="col-span-2 text-[13px] text-muted">{r.sub}</span>
                </div>
              ))}
            </div>

            <Panel titulo="Urgentes y altas solicitadas" contador={urgentes?.length}>
              {!urgentes?.length ? (
                <p className="px-5 py-6 text-sm text-muted">No hay nada urgente esperando.</p>
              ) : (
                <ul>
                  {urgentes.map((o) => (
                    <li key={o.id} className="border-b border-border last:border-b-0">
                      <Link href={`/ordenes/${o.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-fila-hover pc:items-center pc:px-5">
                        <span className="esc-num">{o.escuela_id}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold pc:truncate">{o.descripcion}</span>
                          <span className="block text-[13px] text-muted">
                            <span className="num">{numeroOrden(o.id)}</span> · {o.escuelas?.direccion}, {o.ubicacion}
                          </span>
                        </span>
                        <PrioridadBadge prioridad={o.prioridad} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold tracking-[-0.01em]">Últimas órdenes</h2>
              <ListaOrdenes
                ordenes={recientes ?? []}
                vacio={
                  <>
                    Todavía no hay órdenes de trabajo.
                    {puedeCrearOrdenes(usuario) && (
                      <>
                        <br />
                        <Link href="/ordenes/nueva" className="btn-secondary mt-3.5">
                          Crear una orden
                        </Link>
                      </>
                    )}
                  </>
                }
              />
            </section>
          </>
        )}
      </Pagina>
    </>
  );
}

function Panel({
  titulo,
  contador,
  accion,
  children,
}: {
  titulo: string;
  contador?: number;
  accion?: { href: string; texto: string };
  children: React.ReactNode;
}) {
  return (
    <section className="tarjeta overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4 pc:px-5">
        <h2 className="text-base font-semibold tracking-[-0.01em]">{titulo}</h2>
        {!!contador && (
          <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-danger px-[7px] text-xs font-semibold text-white">
            {contador}
          </span>
        )}
        {accion && (
          <Link href={accion.href} className="ml-auto flex min-h-8 items-center gap-1 text-[13.5px] font-medium text-primary hover:underline">
            {accion.texto}
            <IconoFlecha className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
