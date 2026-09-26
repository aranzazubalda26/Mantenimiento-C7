"use client";

import { useActionState, useMemo, useState } from "react";
import {
  cambiarActiva,
  crearEscuela,
  editarEscuela,
  type EscuelaState,
} from "./actions";

type Escuela = {
  id: number;
  nombre: string;
  direccion: string | null;
  activa: boolean;
};

const vacio: EscuelaState = { error: null, ok: false, nombre: "", direccion: "" };

function normalizar(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function EscuelasAdmin({ escuelas }: { escuelas: Escuela[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return escuelas;
    return escuelas.filter((e) => normalizar(`${e.nombre} ${e.direccion ?? ""}`).includes(q));
  }, [escuelas, busqueda]);

  const activas = escuelas.filter((e) => e.activa).length;

  return (
    <>
      <NuevaEscuela />

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {activas} activa{activas === 1 ? "" : "s"}
            {escuelas.length > activas && ` · ${escuelas.length - activas} desactivada${escuelas.length - activas === 1 ? "" : "s"}`}
          </h2>
          {escuelas.length > 5 && (
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              aria-label="Buscar escuela"
              className="input h-10 sm:w-64"
            />
          )}
        </div>

        {escuelas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
            Todavía no cargaste ninguna escuela.
          </p>
        ) : filtradas.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted">No hay escuelas que coincidan.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {filtradas.map((e) => (
              <EscuelaFila key={e.id} escuela={e} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function NuevaEscuela() {
  const [state, action, pending] = useActionState(crearEscuela, vacio);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <h2 className="font-semibold">Agregar escuela</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="nombre"
          defaultValue={state.nombre}
          placeholder="Nombre (ej: Escuela N° 5 D.E. 3)"
          aria-label="Nombre de la escuela"
          required
          className="input"
        />
        <input
          name="direccion"
          defaultValue={state.direccion}
          placeholder="Dirección (opcional)"
          aria-label="Dirección"
          className="input"
        />
      </div>
      {state.error && <Error mensaje={state.error} />}
      <button type="submit" disabled={pending} className="btn-primary sm:w-auto sm:self-end sm:px-8">
        {pending ? "Guardando…" : "Agregar"}
      </button>
    </form>
  );
}

function EscuelaFila({ escuela }: { escuela: Escuela }) {
  const [editando, setEditando] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: EscuelaState, formData: FormData) => {
      const r = await editarEscuela(escuela.id, prev, formData);
      if (r.ok) setEditando(false);
      return r;
    },
    { ...vacio, nombre: escuela.nombre, direccion: escuela.direccion ?? "" },
  );

  if (editando) {
    return (
      <li className="p-4">
        <form action={action} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="nombre"
              defaultValue={state.nombre}
              aria-label="Nombre de la escuela"
              required
              autoFocus
              className="input"
            />
            <input
              name="direccion"
              defaultValue={state.direccion}
              placeholder="Dirección (opcional)"
              aria-label="Dirección"
              className="input"
            />
          </div>
          {state.error && <Error mensaje={state.error} />}
          <div className="flex gap-2 sm:justify-end">
            <button type="button" onClick={() => setEditando(false)} className="btn-secondary h-11 flex-1 sm:flex-none">
              Cancelar
            </button>
            <button type="submit" disabled={pending} className="btn-primary h-11 flex-1 sm:w-auto sm:flex-none sm:px-6">
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`flex items-center gap-3 p-4 ${escuela.activa ? "" : "opacity-60"}`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {escuela.nombre}
          {!escuela.activa && (
            <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-border">
              Desactivada
            </span>
          )}
        </p>
        {escuela.direccion && <p className="truncate text-sm text-muted">{escuela.direccion}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={() => setEditando(true)} className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-background">
          Editar
        </button>
        <form action={cambiarActiva.bind(null, escuela.id, !escuela.activa)}>
          <button type="submit" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-background">
            {escuela.activa ? "Desactivar" : "Activar"}
          </button>
        </form>
      </div>
    </li>
  );
}

function Error({ mensaje }: { mensaje: string }) {
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
      {mensaje}
    </p>
  );
}
