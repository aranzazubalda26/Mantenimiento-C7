import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader, Pagina } from "@/components/app-header";
import { EstadoBadge, PrioridadBadge, TARJETA_REABIERTA } from "@/components/badges";
import { IconoCalendario, IconoLugar, IconoMapa, IconoOk, IconoProhibido } from "@/components/iconos";
import { Volver } from "@/components/volver";
import { conVolver, linkMapa, volverSeguro } from "@/lib/navegacion";
import { getUsuario } from "@/lib/auth";
import { formatFecha } from "@/lib/fechas";
import { esReabierta, numeroOrden, type Estado, type Prioridad } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";
import { AbrirOrden } from "./abrir-orden";
import { AccionesOrden } from "./acciones-orden";
import { CierreOrden } from "./cierre-orden";
import { Historial, type Evento } from "./historial";

export const metadata: Metadata = { title: "Orden · Mantenimiento C7" };

type Foto = { id: number; path: string; tipo: "problema" | "cierre"; created_at: string };

type Orden = {
  id: number;
  fecha: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  ubicacion: string;
  created_at: string;
  cerrada_at: string | null;
  motivo_reapertura: string | null;
  nota_cierre: string | null;
  escuelas: { id: number; direccion: string; nombre: string | null; supervisor_id: string; inspector_id: string } | null;
  orden_fotos: Foto[];
};

export default async function OrdenPage(props: PageProps<"/ordenes/[id]">) {
  const usuario = await getUsuario();
  const { id } = await props.params;
  const { creada, editada, volver } = await props.searchParams;
  if (!/^\d+$/.test(id)) notFound();

  const supabase = await createClient();
  // RLS: si el usuario no puede ver la orden no vuelve nada -> 404
  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select(
      "id, fecha, descripcion, prioridad, estado, ubicacion, created_at, cerrada_at, motivo_reapertura, nota_cierre, escuelas(id, nombre, direccion, supervisor_id, inspector_id), orden_fotos(id, path, tipo, created_at)",
    )
    .eq("id", Number(id))
    .order("id", { referencedTable: "orden_fotos" })
    .maybeSingle<Orden>();

  if (!orden) notFound();

  // Fotos del problema (las del inspector/a) y del trabajo hecho en el ultimo cierre
  const fotosProblema = orden.orden_fotos.filter((f) => f.tipo === "problema");
  const fotosCierre =
    orden.estado === "cerrada" ? orden.orden_fotos.filter((f) => f.tipo === "cierre" && f.created_at === orden.cerrada_at) : [];
  const paths = [...fotosProblema, ...fotosCierre].map((f) => f.path);

  const [{ data: urls }, { data: eventos }] = await Promise.all([
    paths.length
      ? supabase.storage.from("ordenes-fotos").createSignedUrls(paths, 60 * 60)
      : Promise.resolve({ data: [] }),
    supabase
      .from("orden_eventos")
      .select("id, tipo, detalle, created_at, autor:perfiles!orden_eventos_autor_fkey(nombre, apellido)")
      .eq("orden_id", orden.id)
      .order("created_at")
      .order("id")
      .returns<Evento[]>(),
  ]);
  const url = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));

  // Que puede hacer cada uno (la base tambien lo exige)
  const esAdmin = usuario.rol === "admin";
  const esSupervisorDeLaEscuela = usuario.rol === "supervisor" && orden.escuelas?.supervisor_id === usuario.id;
  const esInspectorDeLaEscuela = usuario.rol === "inspector" && orden.escuelas?.inspector_id === usuario.id;
  const pendiente = orden.estado === "solicitada";
  const puedeCerrar = pendiente && (esAdmin || esSupervisorDeLaEscuela);
  const puedeEditar = pendiente && (esAdmin || esInspectorDeLaEscuela);
  const puedeReabrir = !pendiente && esInspectorDeLaEscuela;

  const origen = volverSeguro(volver);
  const volverA = destinoVolver(origen, orden.escuelas, usuario.rol === "supervisor");
  const detalleHref = origen ? conVolver(`/ordenes/${orden.id}`, origen) : `/ordenes/${orden.id}`;

  return (
    <>
      <AppHeader
        titulo={`Orden ${numeroOrden(orden.id)}`}
        subtitulo={`${orden.escuelas?.direccion ?? ""} · ${orden.ubicacion}`}
      />
      <AbrirOrden ordenId={orden.id} />
      <Pagina>
        <div className="flex w-full max-w-[720px] flex-col gap-4">
          <Volver {...volverA} />

          {creada && (
            <p role="status" className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
              <IconoOk className="size-[18px]" />
              Orden {numeroOrden(orden.id)} creada correctamente.
            </p>
          )}
          {editada && (
            <p role="status" className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
              <IconoOk className="size-[18px]" />
              Cambios guardados.
            </p>
          )}

          {/* Quien hizo que y cuando (y el motivo de una reapertura) esta solo en el historial */}
          <article className={`tarjeta overflow-hidden ${esReabierta(orden) ? TARJETA_REABIERTA : ""}`}>
            {/* Fotos primero: es lo que hace falta para entender el problema. Se deslizan de costado */}
            {fotosProblema.length > 0 && (
              <Fotos fotos={fotosProblema} url={url} titulo="Foto" className="border-b border-border p-2.5" />
            )}

            <div className="flex flex-col gap-2.5 border-b border-border p-[18px] pc:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="num text-[13px] text-muted">{numeroOrden(orden.id)}</span>
                <EstadoBadge estado={orden.estado} />
                <PrioridadBadge prioridad={orden.prioridad} />
              </div>
              <h2 className="whitespace-pre-wrap text-xl leading-tight font-bold tracking-[-0.01em]">
                {orden.descripcion}
              </h2>
              <div className="flex items-start gap-3">
                <p className="flex min-w-0 flex-1 items-start gap-1.5 text-sm text-muted">
                  <IconoLugar className="mt-0.5 size-4" />
                  <span>
                    <b className="font-semibold text-foreground">{orden.escuelas?.direccion}</b>
                    {orden.escuelas?.nombre && ` (${orden.escuelas.nombre})`}, {orden.ubicacion}
                  </span>
                </p>
                {orden.escuelas && (
                  <a
                    href={linkMapa(orden.escuelas.direccion)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-my-1.5 flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-primary hover:bg-primary-soft"
                  >
                    <IconoMapa className="size-4" />
                    Cómo llegar
                  </a>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted tabular-nums">
                <IconoCalendario className="size-4" />
                {formatFecha(orden.fecha)}
              </p>
            </div>

            {/* Como se resolvio: fotos del despues y nota, o el motivo de fuera de alcance */}
            {orden.estado === "cerrada" && (fotosCierre.length > 0 || orden.nota_cierre) && (
              <div className="flex flex-col gap-2.5 border-b border-border bg-fila-hover p-[18px] pc:p-5">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                  <IconoOk className="size-4" />
                  Trabajo terminado
                </p>
                {orden.nota_cierre && <p className="whitespace-pre-wrap break-words">{orden.nota_cierre}</p>}
                {fotosCierre.length > 0 && <Fotos fotos={fotosCierre} url={url} titulo="Después" />}
              </div>
            )}
            {orden.estado === "fuera_de_alcance" && (
              <div className="flex flex-col gap-1.5 border-b border-[#ddd6fe] bg-[#f5f3ff] p-[18px] pc:p-5">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#5b21b6]">
                  <IconoProhibido className="size-4" />
                  Fuera de alcance: no corresponde a mantenimiento
                </p>
                <p className="whitespace-pre-wrap break-words">{orden.nota_cierre}</p>
              </div>
            )}

            <div className="p-[18px] pc:p-5">
              <Historial eventos={eventos ?? []} cargada={orden.created_at} cierreActual={orden.cerrada_at} />
            </div>

            {(puedeEditar || puedeReabrir) && (
              <div className="border-t border-border p-[18px] pc:p-5">
                <AccionesOrden
                  ordenId={orden.id}
                  estado={orden.estado}
                  puedeEditar={puedeEditar}
                  puedeReabrir={puedeReabrir}
                  hrefEditar={conVolver(`/ordenes/${orden.id}/editar`, detalleHref)}
                  hrefTrasBorrar={volverA.href}
                />
              </div>
            )}
            {puedeCerrar && (
              <div className="pc:border-t pc:border-border pc:p-5">
                <CierreOrden
                  ordenId={orden.id}
                  numero={numeroOrden(orden.id)}
                  lugar={`${orden.escuelas?.direccion ?? ""} · ${orden.ubicacion}`}
                  usuarioId={usuario.id}
                  fotoObligatoria={!esAdmin}
                  volverHref={volverA.href}
                />
              </div>
            )}
          </article>
        </div>
      </Pagina>
    </>
  );
}

// Tira de fotos que se desliza de costado (en la PC entran 3). Tocar una la abre entera.
function Fotos({
  fotos,
  url,
  titulo,
  className = "",
}: {
  fotos: Foto[];
  url: Map<string | null, string | null>;
  titulo: string;
  className?: string;
}) {
  return (
    <div className={`flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] ${className}`}>
      {fotos.map((f, i) => {
        const src = url.get(f.path);
        return (
          <a
            key={f.id}
            href={src ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`relative aspect-[4/3] shrink-0 snap-start overflow-hidden rounded-[10px] bg-[#eef0f3] ${
              fotos.length === 1 ? "w-full sm:w-2/3" : "w-[85%] sm:w-[48%] pc:w-[32%]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage */}
            {src && <img src={src} alt={`${titulo} ${i + 1}`} className="size-full object-cover" />}
            {fotos.length > 1 && (
              <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                {i + 1}/{fotos.length}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}

// "Volver a …": a donde estaba el usuario si se sabe; si no, a la escuela de la orden
// (el supervisor/a, a su lista de tareas)
function destinoVolver(origen: string | null, escuela: { id: number; direccion: string } | null, esSupervisor: boolean) {
  if (origen) {
    const ruta = origen.split("?")[0];
    if (ruta === "/") return { href: origen, a: esSupervisor ? "tareas" : "inicio" };
    if (ruta === "/ordenes") return { href: origen, a: "órdenes" };
    if (ruta === "/avisos") return { href: origen, a: "avisos" };
    if (escuela && ruta === `/escuelas/${escuela.id}`) return { href: origen, a: escuela.direccion };
    return { href: origen, a: "la pantalla anterior" };
  }
  if (esSupervisor) return { href: "/", a: "tareas" };
  return escuela ? { href: `/escuelas/${escuela.id}`, a: escuela.direccion } : { href: "/", a: "inicio" };
}
