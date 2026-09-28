import Link from "next/link";
import { AppHeader, Pagina } from "@/components/app-header";
import { IconoAlerta, IconoMas, IconoOk, IconoTareas } from "@/components/iconos";
import { TableroEscuelas, cargarTablero } from "@/components/tablero-escuelas";
import type { OrdenResumida } from "@/components/tarjeta-escuela";
import { getUsuario, puedeCrearOrdenes } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TareasSupervisor } from "./tareas-supervisor";

// Inicio. Supervisor/a: su lista de tareas. Admin e inspector/a: tablero de escuelas + resumen.
// El listado completo de ordenes esta en /ordenes
export default async function Home(props: PageProps<"/">) {
  const usuario = await getUsuario();
  if (usuario.rol === "supervisor") {
    const { escuela } = await props.searchParams;
    return <TareasSupervisor usuario={usuario} escuela={typeof escuela === "string" ? escuela : null} />;
  }

  const supabase = await createClient();
  const esAdmin = usuario.rol === "admin";
  const { ordenes, escuelas } = await cargarTablero(supabase, usuario);
  const cuenta = (f: (o: OrdenResumida) => boolean) => ordenes.filter(f).length;
  const nUrgentes = cuenta((o) => o.estado === "solicitada" && o.prioridad === "urgente");
  const nPendientes = cuenta((o) => o.estado === "solicitada");
  const nTerminadas = cuenta((o) => o.estado === "cerrada");

  const resumen = [
    { n: nUrgentes, titulo: "Urgentes", sub: nUrgentes ? "Necesitan atención ya" : "Todo bajo control", color: "#B42318", fondo: "#FEE4E2", icono: <IconoAlerta />, href: "/ordenes" },
    { n: nPendientes, titulo: "Pendientes", sub: nPendientes ? "Falta hacerlas" : "Nada pendiente", color: "#93370D", fondo: "#FEF0C7", icono: <IconoTareas />, href: "/ordenes" },
    { n: nTerminadas, titulo: "Terminadas", sub: "Desde el inicio", color: "#475467", fondo: "#EEF0F3", icono: <IconoOk />, href: "/ordenes?ver=terminadas" },
  ];

  return (
    <>
      <AppHeader titulo={usuario.nombre ? `Hola, ${usuario.nombre}` : "Inicio"}>
        {puedeCrearOrdenes(usuario) && (
          // En el celular esta el boton central de la barra de abajo
          <Link href="/ordenes/nueva" className="btn-primary hidden pc:inline-flex">
            <IconoMas className="size-[18px]" />
            Nueva orden
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
            {/* Resumen rapido arriba de todo */}
            <div className="grid grid-cols-3 gap-2.5 pc:gap-3.5">
              {resumen.map((r) => (
                <Link
                  key={r.titulo}
                  href={r.href}
                  className="tarjeta flex flex-col gap-1.5 px-3 py-2.5 transition-colors hover:border-border-strong pc:px-4 pc:py-3"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="grid size-7 place-items-center rounded-lg" style={{ background: r.fondo, color: r.color }}>
                      {r.icono}
                    </span>
                    <span className="text-2xl leading-none font-bold tracking-[-0.02em] tabular-nums">{r.n}</span>
                  </span>
                  <span className="text-[13.5px] font-semibold">{r.titulo}</span>
                  <span className="hidden text-[12.5px] text-muted sm:block">{r.sub}</span>
                </Link>
              ))}
            </div>

            <TableroEscuelas escuelas={escuelas} ordenes={ordenes} esAdmin={esAdmin} origen="/" />

          </>
        )}
      </Pagina>
    </>
  );
}
