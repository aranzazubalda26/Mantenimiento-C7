import Link from "next/link";
import { AppHeader, Pagina } from "@/components/app-header";
import { BORDE_REABIERTA, PrioridadBadge } from "@/components/badges";
import { IconoAlerta, IconoCamara, IconoOk, IconoTareas } from "@/components/iconos";
import type { Usuario } from "@/lib/auth";
import { hace, momentoHaceDias } from "@/lib/fechas";
import { conVolver, rutaCon } from "@/lib/navegacion";
import { BUCKET_FOTOS, numeroOrden, type Prioridad } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";

type Tarea = {
  id: number;
  escuela_id: number;
  descripcion: string;
  prioridad: Prioridad;
  ubicacion: string;
  created_at: string;
  motivo_reapertura: string | null;
  escuelas: { direccion: string } | null;
  orden_fotos: { path: string }[];
};

const PESO_PRIORIDAD: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
const DIAS_HECHAS = 7;

// Inicio del supervisor/a: lo que hay que hacer, en el orden en que conviene hacerlo.
//   Reabiertas arriba (con el motivo a la vista); despues urgente -> baja y, a igual
//   prioridad, la mas vieja primero. Filtro rapido por escuela (?escuela=id).
//   Punto verde: tiene avisos sin leer (tarea nueva o cambios desde la ultima vez que la abrio).
export async function TareasSupervisor({ usuario, escuela }: { usuario: Usuario; escuela: string | null }) {
  const supabase = await createClient();
  const desde = momentoHaceDias(DIAS_HECHAS);

  const [{ data: escuelas }, { data: pendientes }, { count: hechas }, { data: avisos }] = await Promise.all([
    supabase.from("escuelas").select("id, direccion").eq("supervisor_id", usuario.id).order("id"),
    supabase
      .from("ordenes_trabajo")
      .select(
        "id, escuela_id, descripcion, prioridad, ubicacion, created_at, motivo_reapertura, escuelas(direccion), orden_fotos(path)",
      )
      .eq("estado", "solicitada")
      .eq("orden_fotos.tipo", "problema")
      .order("id", { referencedTable: "orden_fotos" })
      .limit(1, { referencedTable: "orden_fotos" })
      .returns<Tarea[]>(),
    supabase
      .from("ordenes_trabajo")
      .select("*", { count: "exact", head: true })
      .eq("estado", "cerrada")
      .gte("cerrada_at", desde),
    supabase.from("avisos").select("orden_id").is("leido_at", null),
  ]);

  const todas = (pendientes ?? []).sort(
    (a, b) =>
      Number(!!b.motivo_reapertura) - Number(!!a.motivo_reapertura) ||
      PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] ||
      a.created_at.localeCompare(b.created_at),
  );
  const escuelaId = escuela && /^\d+$/.test(escuela) && escuelas?.some((e) => e.id === Number(escuela)) ? Number(escuela) : null;
  const tareas = escuelaId ? todas.filter((t) => t.escuela_id === escuelaId) : todas;
  const reabiertas = tareas.filter((t) => t.motivo_reapertura);
  const resto = tareas.filter((t) => !t.motivo_reapertura);
  const nuevas = new Set((avisos ?? []).map((a) => a.orden_id));

  // Miniatura: la primera foto del problema de cada tarea
  const paths = tareas.flatMap((t) => t.orden_fotos.map((f) => f.path));
  const { data: urls } = paths.length
    ? await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(paths, 60 * 60)
    : { data: [] };
  const miniatura = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));

  const nUrgentes = todas.filter((t) => t.prioridad === "urgente").length;
  const conTareas = new Set(todas.map((t) => t.escuela_id)).size;
  const origen = rutaCon("/", { escuela: escuelaId ? String(escuelaId) : null });

  const resumen = [
    { n: nUrgentes, titulo: "Urgentes", sub: "", color: "#B42318", fondo: "#FEE4E2", icono: <IconoAlerta />, href: "/" },
    { n: todas.length, titulo: "Pendientes", sub: "", color: "#93370D", fondo: "#FEF0C7", icono: <IconoTareas />, href: "/" },
    { n: hechas ?? 0, titulo: "Hechas", sub: `últimos ${DIAS_HECHAS} días`, color: "#475467", fondo: "#EEF0F3", icono: <IconoOk />, href: "/ordenes?ver=terminadas" },
  ];

  const tarjeta = (t: Tarea) => {
    const foto = t.orden_fotos[0] ? miniatura.get(t.orden_fotos[0].path) : null;
    return (
      <li key={t.id}>
        <Link
          href={conVolver(`/ordenes/${t.id}`, origen)}
          className={`tarjeta relative flex gap-3 overflow-hidden p-2.5 pr-3 transition-colors hover:border-border-strong active:bg-fila-hover ${
            t.motivo_reapertura ? BORDE_REABIERTA : ""
          }`}
        >
          {/* Urgente: franja roja a la izquierda (no depende del borde, que cambia al tocar) */}
          {!t.motivo_reapertura && t.prioridad === "urgente" && (
            <span className="absolute inset-y-0 left-0 w-1 bg-danger" aria-hidden />
          )}
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#eef0f3] text-muted/60">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage */}
            {foto ? <img src={foto} alt="" className="size-full object-cover" /> : <IconoCamara className="size-5" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="line-clamp-2 pr-3 text-[14.5px] leading-snug font-semibold">
              {nuevas.has(t.id) && <span className="sr-only">Nueva: </span>}
              {t.descripcion}
            </span>
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-muted">
              {(t.prioridad === "urgente" || t.prioridad === "alta") && <PrioridadBadge prioridad={t.prioridad} />}
              {!escuelaId && <b className="font-semibold text-foreground">{t.escuelas?.direccion}</b>}
              {!escuelaId && <span>·</span>}
              <span>{t.ubicacion}</span>
              <span>·</span>
              <span>{hace(t.created_at)}</span>
            </span>
            {t.motivo_reapertura && (
              <span className="mt-0.5 rounded-lg bg-[#fffaeb] px-2.5 py-1.5 text-[12.5px] text-[#93370d]">
                <b className="font-semibold">Reabierta:</b> “{t.motivo_reapertura}”
              </span>
            )}
          </span>
          {nuevas.has(t.id) && (
            <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-primary" title="Nueva o con cambios" aria-hidden />
          )}
          <span className="sr-only">{numeroOrden(t.id)}</span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <AppHeader
        titulo={usuario.nombre ? `Hola, ${usuario.nombre}` : "Tareas"}
        subtitulo={
          todas.length
            ? `${todas.length} ${todas.length === 1 ? "tarea pendiente" : "tareas pendientes"} en ${conTareas} ${conTareas === 1 ? "escuela" : "escuelas"}`
            : undefined
        }
      />
      <Pagina>
        <div className="flex w-full max-w-[760px] flex-col gap-4">
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
                  <span
                    className="text-2xl leading-none font-bold tracking-[-0.02em] tabular-nums"
                    style={r.titulo === "Urgentes" && r.n ? { color: r.color } : undefined}
                  >
                    {r.n}
                  </span>
                </span>
                <span className="text-[13px] leading-tight font-semibold">
                  {r.titulo}
                  {r.sub && <span className="block text-[11.5px] font-normal text-muted">{r.sub}</span>}
                </span>
              </Link>
            ))}
          </div>

          {(escuelas?.length ?? 0) > 1 && (
            <nav aria-label="Filtrar por escuela" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] pc:mx-0 pc:flex-wrap pc:px-0">
              {[{ id: null, direccion: "Todas" }, ...(escuelas ?? [])].map((e) => {
                const activa = e.id === escuelaId;
                const n = e.id === null ? todas.length : todas.filter((t) => t.escuela_id === e.id).length;
                return (
                  <Link
                    key={e.id ?? "todas"}
                    href={rutaCon("/", { escuela: e.id ? String(e.id) : null })}
                    replace
                    scroll={false}
                    aria-current={activa ? "page" : undefined}
                    className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                      activa
                        ? "border-foreground bg-foreground text-white"
                        : "border-border-strong bg-surface text-foreground hover:border-muted"
                    }`}
                  >
                    {e.direccion}
                    <span className={activa ? "text-white/70" : "text-muted"}>{n}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {!escuelas?.length ? (
            <p className="tarjeta px-5 py-10 text-center text-muted">No tenés escuelas asignadas.</p>
          ) : !tareas.length ? (
            <div className="tarjeta flex flex-col items-center gap-2 px-5 py-10 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                <IconoOk className="size-6" />
              </span>
              <p className="font-semibold">Todo al día</p>
              <p className="text-sm text-muted">
                {escuelaId ? "No hay tareas pendientes en esta escuela." : "No hay tareas pendientes en tus escuelas."}
              </p>
            </div>
          ) : (
            <>
              {reabiertas.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="px-0.5 text-xs font-bold tracking-[0.04em] text-muted uppercase">Reabiertas</h2>
                  <ul className="flex flex-col gap-2">{reabiertas.map(tarjeta)}</ul>
                </section>
              )}
              {resto.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="px-0.5 text-xs font-bold tracking-[0.04em] text-muted uppercase">Para hacer</h2>
                  <ul className="flex flex-col gap-2">{resto.map(tarjeta)}</ul>
                </section>
              )}
            </>
          )}
        </div>
      </Pagina>
    </>
  );
}
