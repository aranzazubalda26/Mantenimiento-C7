import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { EstadoBadge, PrioridadBadge } from "@/components/badges";
import { getUsuario, puedeCrearOrdenes } from "@/lib/auth";
import { formatFecha } from "@/lib/fechas";
import type { Estado, Prioridad } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";
import { ROL_LABEL } from "@/lib/usuarios";
import { logout } from "./login/actions";

type OrdenFila = {
  id: number;
  fecha: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  ubicacion: string;
  escuelas: { nombre: string } | null;
};

export default async function Home() {
  const usuario = await getUsuario();
  const esAdmin = usuario.rol === "admin";
  const supabase = await createClient();

  // RLS filtra: el admin recibe todas, el inspector solo las suyas
  // Supervisor/inspector: las de sus escuelas (y las que creo el inspector)
  const [{ data: ordenes }, { count: cantEscuelas }, { count: cantUsuarios }] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("id, fecha, descripcion, prioridad, estado, ubicacion, escuelas(nombre)")
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<OrdenFila[]>(),
    esAdmin
      ? supabase.from("escuelas").select("*", { count: "exact", head: true })
      : Promise.resolve({ count: null }),
    esAdmin
      ? supabase.from("perfiles").select("*", { count: "exact", head: true }).eq("activo", true)
      : Promise.resolve({ count: null }),
  ]);

  return (
    <>
      <AppHeader titulo="Mantenimiento C7">
        <form action={logout}>
          <button type="submit" className="btn-secondary">
            Salir
          </button>
        </form>
      </AppHeader>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-5">
        <div>
          <p className="text-xl font-semibold tracking-tight">
            Hola{usuario.nombre ? `, ${usuario.nombre}` : ""}
          </p>
          <p className="truncate text-sm text-muted">
            {usuario.rol ? ROL_LABEL[usuario.rol] : usuario.email}
          </p>
        </div>

        {!usuario.rol ? (
          <p className="rounded-2xl bg-surface p-5 text-sm text-muted ring-1 ring-border">
            Tu usuario no está habilitado. Pedile al administrador que lo revise.
          </p>
        ) : puedeCrearOrdenes(usuario) ? (
          <Link
            href="/ordenes/nueva"
            className="flex items-center gap-4 rounded-2xl bg-primary p-5 text-primary-fg shadow-sm transition-colors hover:bg-primary-hover active:scale-[0.99]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-6" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span>
              <span className="block text-lg font-semibold">Nueva orden de trabajo</span>
              <span className="block text-sm opacity-85">Reportar una tarea en una escuela</span>
            </span>
          </Link>
        ) : null}

        {esAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <Acceso
              href="/admin/escuelas"
              titulo="Escuelas"
              detalle={`${cantEscuelas ?? 0} cargada${cantEscuelas === 1 ? "" : "s"}`}
            />
            <Acceso
              href="/admin/usuarios"
              titulo="Usuarios"
              detalle={`${cantUsuarios ?? 0} activo${cantUsuarios === 1 ? "" : "s"}`}
            />
          </div>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {esAdmin ? "Últimas órdenes" : usuario.rol === "supervisor" ? "Órdenes de mis escuelas" : "Mis órdenes"}
          </h2>

          {!ordenes?.length ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              Todavía no hay órdenes de trabajo.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {ordenes.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/ordenes/${o.id}`}
                    className="flex flex-col gap-1.5 rounded-2xl bg-surface p-4 ring-1 ring-border transition-colors hover:ring-primary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 font-semibold leading-snug">
                        {o.escuelas?.nombre ?? "Escuela"}
                      </span>
                      <PrioridadBadge prioridad={o.prioridad} />
                    </div>
                    <p className="line-clamp-2 text-sm">{o.descripcion}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <EstadoBadge estado={o.estado} />
                      <span>#{o.id}</span>
                      <span>{formatFecha(o.fecha)}</span>
                      <span className="min-w-0 truncate">{o.ubicacion}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Acceso({ href, titulo, detalle }: { href: string; titulo: string; detalle: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-2xl bg-surface p-4 ring-1 ring-border transition-colors hover:ring-primary"
    >
      <span className="min-w-0">
        <span className="block font-semibold">{titulo}</span>
        <span className="block truncate text-sm text-muted">{detalle}</span>
      </span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5 shrink-0 text-muted" aria-hidden>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
