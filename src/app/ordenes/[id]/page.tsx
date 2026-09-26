import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { EstadoBadge, PrioridadBadge } from "@/components/badges";
import { getUsuario } from "@/lib/auth";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import type { Estado, Prioridad } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orden · Mantenimiento C7" };

type Orden = {
  id: number;
  fecha: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  ubicacion: string;
  created_at: string;
  escuelas: { nombre: string; direccion: string | null } | null;
  orden_fotos: { id: number; path: string }[];
};

export default async function OrdenPage(props: PageProps<"/ordenes/[id]">) {
  await getUsuario();
  const { id } = await props.params;
  const { creada } = await props.searchParams;
  if (!/^\d+$/.test(id)) notFound();

  const supabase = await createClient();
  // RLS: si la orden no es del usuario (y no es admin) no vuelve nada -> 404
  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select(
      "id, fecha, descripcion, prioridad, estado, ubicacion, created_at, escuelas(nombre, direccion), orden_fotos(id, path)",
    )
    .eq("id", Number(id))
    .maybeSingle<Orden>();

  if (!orden) notFound();

  const { data: urls } = orden.orden_fotos.length
    ? await supabase.storage
        .from("ordenes-fotos")
        .createSignedUrls(orden.orden_fotos.map((f) => f.path), 60 * 60)
    : { data: [] };

  return (
    <>
      <AppHeader titulo={`Orden #${orden.id}`} volverA="/" />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-5">
        {creada && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-500/12 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Orden creada correctamente.
          </p>
        )}

        <section className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <PrioridadBadge prioridad={orden.prioridad} />
            <EstadoBadge estado={orden.estado} />
          </div>
          <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight">
            {orden.escuelas?.nombre}
          </h2>
          {orden.escuelas?.direccion && (
            <p className="text-sm text-muted">{orden.escuelas.direccion}</p>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-3">
          <Dato titulo="Fecha" valor={formatFecha(orden.fecha)} />
          <Dato titulo="Ubicación" valor={orden.ubicacion} />
        </dl>

        <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Descripción
          </h3>
          <p className="mt-1.5 whitespace-pre-wrap">{orden.descripcion}</p>
        </section>

        {!!urls?.length && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Fotos ({urls.length})
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {urls.map((u, i) =>
                u.signedUrl ? (
                  <a
                    key={u.path ?? i}
                    href={u.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square overflow-hidden rounded-xl bg-surface ring-1 ring-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage */}
                    <img src={u.signedUrl} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                  </a>
                ) : null,
              )}
            </div>
          </section>
        )}

        <p className="text-xs text-muted">Creada el {formatFechaHora(orden.created_at)}</p>
      </main>
    </>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{titulo}</dt>
      <dd className="mt-1 break-words font-medium">{valor}</dd>
    </div>
  );
}
