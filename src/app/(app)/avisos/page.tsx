import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader, Pagina } from "@/components/app-header";
import { IconoAlerta, IconoCampana, IconoLapiz, IconoMas, IconoOk, IconoProhibido, IconoX } from "@/components/iconos";
import { getUsuario } from "@/lib/auth";
import { describirAviso, type Aviso, type TipoAviso } from "@/lib/avisos";
import { diaDe, fechaCorta, formatHora, hoyISO } from "@/lib/fechas";
import { conVolver } from "@/lib/navegacion";
import { createClient } from "@/lib/supabase/server";
import { marcarTodoLeido } from "./actions";
import { VerAvisos } from "./ver-avisos";

export const metadata: Metadata = { title: "Avisos · Mantenimiento C7" };

const LIMITE = 100;

const ESTILO: Record<TipoAviso, { icono: React.ReactNode; clase: string }> = {
  creada: { icono: <IconoMas className="size-4" />, clase: "bg-primary-soft text-primary" },
  editada: { icono: <IconoLapiz className="size-4" />, clase: "bg-[#dce8fd] text-[#1e40af]" },
  reabierta: { icono: <IconoAlerta className="size-4" />, clase: "bg-danger-soft text-danger" },
  borrada: { icono: <IconoX className="size-4" />, clase: "bg-[#eef0f3] text-[#475467]" },
  terminada: { icono: <IconoOk className="size-4" />, clase: "bg-primary-soft text-primary" },
  fuera_de_alcance: { icono: <IconoProhibido className="size-4" />, clase: "bg-[#ede9fe] text-[#5b21b6]" },
};

// Campanita: lo que hizo la otra parte en tus escuelas (supervisor/a <-> inspector/a).
// Tocar un aviso abre la orden y lo marca como leido (ver abrir_orden).
export default async function AvisosPage() {
  const usuario = await getUsuario();
  if (usuario.rol !== "supervisor" && usuario.rol !== "inspector") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("avisos")
    .select(
      "id, tipo, urgente, leido_at, created_at, orden_id, detalle, autor:perfiles!avisos_autor_fkey(nombre, apellido), orden:ordenes_trabajo(id, descripcion, estado, escuelas(direccion)), evento:orden_eventos(detalle)",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(LIMITE)
    .returns<Aviso[]>();

  // Avisos de ordenes que ya no se pueden ver (RLS): no se muestran y se dan por leidos
  const todos = data ?? [];
  const ocultos = todos.filter((a) => a.orden_id && !a.orden).map((a) => a.id);
  const avisos = todos.filter((a) => !(a.orden_id && !a.orden));
  const sinLeer = avisos.filter((a) => !a.leido_at).length;
  const hoy = hoyISO();

  // Agrupados por dia: Hoy, Ayer, Lun 21…
  const dias: { dia: string; avisos: Aviso[] }[] = [];
  for (const a of avisos) {
    const dia = diaDe(a.created_at);
    if (dias.at(-1)?.dia !== dia) dias.push({ dia, avisos: [] });
    dias.at(-1)!.avisos.push(a);
  }

  const deQuien = usuario.rol === "supervisor" ? "el inspector/a" : "el supervisor/a";

  return (
    <>
      <AppHeader titulo="Avisos" subtitulo={sinLeer ? `${sinLeer} sin leer` : "Todo leído"}>
        {sinLeer > 0 && (
          <form action={marcarTodoLeido} className="hidden pc:block">
            <button type="submit" className="btn-secondary btn-chico">
              Marcar todo como leído
            </button>
          </form>
        )}
      </AppHeader>
      <VerAvisos ocultos={ocultos} />
      <Pagina>
        <div className="flex w-full max-w-[720px] flex-col gap-4">
          <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
            <span>Lo que hace {deQuien} en tus escuelas</span>
            {sinLeer > 0 && (
              <form action={marcarTodoLeido} className="pc:hidden">
                <button type="submit" className="-my-2 min-h-10 font-semibold text-primary">
                  Marcar todo como leído
                </button>
              </form>
            )}
          </div>

          {!avisos.length ? (
            <div className="tarjeta flex flex-col items-center gap-2 px-5 py-10 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-background text-muted">
                <IconoCampana className="size-6" />
              </span>
              <p className="font-semibold">Sin avisos</p>
              <p className="text-sm text-muted">Acá vas a ver lo que haga {deQuien} en tus escuelas.</p>
            </div>
          ) : (
            dias.map((d) => (
              <section key={d.dia} className="flex flex-col gap-2">
                <h2 className="px-0.5 text-xs font-bold tracking-[0.04em] text-muted uppercase">
                  {d.dia === hoy ? "Hoy" : fechaCorta(d.dia)}
                </h2>
                <ul className="flex flex-col gap-2">
                  {d.avisos.map((a) => {
                    const { titulo, cita, extra } = describirAviso(a);
                    const leido = !!a.leido_at;
                    const estilo = ESTILO[a.tipo];
                    const contenido = (
                      <>
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-full ${
                            a.urgente && !leido ? "bg-danger text-white" : estilo.clase
                          }`}
                        >
                          {estilo.icono}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className={`text-[14.5px] leading-snug ${leido ? "font-medium text-muted" : "font-semibold"}`}>
                            {!leido && <span className="sr-only">Sin leer: </span>}
                            {titulo}
                          </span>
                          {cita && <span className="line-clamp-2 break-words text-[13.5px] text-foreground/90">“{cita}”</span>}
                          {extra && <span className="truncate text-[12.5px] text-muted">{extra}</span>}
                          <span className="text-xs text-muted">
                            {a.autor ? `${a.autor.nombre} ${a.autor.apellido} · ` : ""}
                            {formatHora(a.created_at)}
                          </span>
                        </span>
                        {!leido && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                      </>
                    );
                    const clase = `flex items-start gap-3 rounded-xl p-3 ${
                      leido ? "" : `tarjeta ${a.urgente ? "border-[#fda29b]" : ""}`
                    }`;
                    return (
                      <li key={a.id}>
                        {a.orden_id ? (
                          <Link href={conVolver(`/ordenes/${a.orden_id}`, "/avisos")} className={`${clase} transition-colors hover:bg-fila-hover`}>
                            {contenido}
                          </Link>
                        ) : (
                          <div className={clase}>{contenido}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
          {todos.length === LIMITE && (
            <p className="text-center text-[13px] text-muted">Se muestran los últimos {LIMITE} avisos.</p>
          )}
        </div>
      </Pagina>
    </>
  );
}
