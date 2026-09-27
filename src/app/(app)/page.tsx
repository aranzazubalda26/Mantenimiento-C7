import Link from "next/link";
import { AppHeader, Pagina } from "@/components/app-header";
import { IconoAlerta, IconoFlecha, IconoOk, IconoTareas } from "@/components/iconos";
import { TarjetaEscuela, type OrdenResumida } from "@/components/tarjeta-escuela";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Inicio: tablero de escuelas + resumen. El listado de ordenes esta en /ordenes
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
  const [{ data: todas }, { data: escuelas }] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("id, escuela_id, estado, prioridad, descripcion, ubicacion, created_at")
      .returns<OrdenResumida[]>(),
    qEscuelas,
  ]);

  const ordenes = todas ?? [];
  const cuenta = (f: (o: OrdenResumida) => boolean) => ordenes.filter(f).length;
  const nUrgentes = cuenta((o) => o.estado === "solicitada" && o.prioridad === "urgente");
  const nSolicitadas = cuenta((o) => o.estado === "solicitada");
  const nTerminadas = cuenta((o) => o.estado === "cerrada");

  const resumen = [
    { n: nUrgentes, titulo: "Urgentes", sub: nUrgentes ? "Necesitan atención ya" : "Todo bajo control", color: "#B42318", fondo: "#FEE4E2", icono: <IconoAlerta />, href: "/ordenes" },
    { n: nSolicitadas, titulo: "Pendientes", sub: nSolicitadas ? "Falta hacerlas" : "Nada pendiente", color: "#93370D", fondo: "#FEF0C7", icono: <IconoTareas />, href: "/ordenes" },
    { n: nTerminadas, titulo: "Terminadas", sub: "Desde el inicio", color: "#475467", fondo: "#EEF0F3", icono: <IconoOk />, href: "/ordenes?ver=terminadas" },
  ];

  return (
    <>
      <AppHeader titulo={usuario.nombre ? `Hola, ${usuario.nombre}` : "Inicio"} />

      <Pagina>
        {!usuario.rol ? (
          <p className="tarjeta p-5 text-muted">
            Tu usuario no está habilitado. Pedile al administrador que lo revise.
          </p>
        ) : (
          <>
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
                <div className="grid grid-cols-2 gap-2.5 sm:items-start sm:gap-3.5">
                  {escuelas.map((e) => (
                    <TarjetaEscuela key={e.id} escuela={e} ordenes={ordenes.filter((o) => o.escuela_id === e.id)} />
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-3 gap-2.5 pc:gap-3.5">
              {resumen.map((r) => (
                <Link
                  key={r.titulo}
                  href={r.href}
                  className="tarjeta grid grid-cols-[auto_1fr] items-center gap-x-3 p-3.5 transition-colors hover:border-border-strong pc:px-[18px] pc:py-4"
                >
                  <span className="grid size-9 place-items-center rounded-[10px]" style={{ background: r.fondo, color: r.color }}>
                    {r.icono}
                  </span>
                  <span className="justify-self-end text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums pc:text-[30px]">
                    {r.n}
                  </span>
                  <span className="col-span-2 mt-3.5 text-[14.5px] font-semibold">{r.titulo}</span>
                  <span className="col-span-2 text-[13px] text-muted">{r.sub}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </Pagina>
    </>
  );
}
