"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ErrorMsg } from "@/components/ui";
import { nombreCompleto } from "@/lib/usuarios";
import {
  cambiarActiva,
  crearEscuela,
  editarEscuela,
  type EscuelaState,
} from "./actions";

type NombreApellido = { nombre: string; apellido: string };

export type Escuela = {
  id: number;
  nombre: string;
  direccion: string | null;
  activa: boolean;
  supervisor_id: string;
  inspector_id: string;
  supervisor: NombreApellido | null;
  inspector: NombreApellido | null;
};

export type Persona = NombreApellido & { id: string; rol: string };

type Equipo = { supervisores: Persona[]; inspectores: Persona[] };

function normalizar(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function EscuelasAdmin({
  escuelas,
  supervisores,
  inspectores,
}: { escuelas: Escuela[] } & Equipo) {
  const [busqueda, setBusqueda] = useState("");
  const equipo = { supervisores, inspectores };

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return escuelas;
    return escuelas.filter((e) =>
      normalizar(
        `${e.nombre} ${e.direccion ?? ""} ${nombreCompleto(e.supervisor)} ${nombreCompleto(e.inspector)}`,
      ).includes(q),
    );
  }, [escuelas, busqueda]);

  const activas = escuelas.filter((e) => e.activa).length;
  const desactivadas = escuelas.length - activas;

  return (
    <>
      {supervisores.length === 0 || inspectores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center">
          <p className="font-medium">Cada escuela necesita un supervisor y un inspector.</p>
          <p className="mt-1 text-sm text-muted">
            {supervisores.length === 0 && inspectores.length === 0
              ? "Todavía no hay supervisores ni inspectores activos."
              : supervisores.length === 0
                ? "Todavía no hay supervisores activos."
                : "Todavía no hay inspectores activos."}
          </p>
          <Link href="/admin/usuarios" className="btn-primary mt-4">
            Crear usuarios
          </Link>
        </div>
      ) : (
        <NuevaEscuela {...equipo} />
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {activas} activa{activas === 1 ? "" : "s"}
            {desactivadas > 0 && ` · ${desactivadas} desactivada${desactivadas === 1 ? "" : "s"}`}
          </h2>
          {escuelas.length > 5 && (
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar escuela, supervisor…"
              aria-label="Buscar"
              className="input h-10 sm:w-72"
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
              <EscuelaFila key={e.id} escuela={e} {...equipo} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// Campos compartidos por el alta y la edicion
function CamposEscuela({
  valores,
  supervisores,
  inspectores,
  autoFocus,
}: { valores: EscuelaState["valores"]; autoFocus?: boolean } & Equipo) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input
        name="nombre"
        defaultValue={valores.nombre}
        placeholder="Nombre (ej: Escuela N° 5 D.E. 3)"
        aria-label="Nombre de la escuela"
        autoFocus={autoFocus}
        className="input"
      />
      <input
        name="direccion"
        defaultValue={valores.direccion}
        placeholder="Dirección (opcional)"
        aria-label="Dirección"
        className="input"
      />
      <SelectPersona name="supervisor_id" label="Supervisor" personas={supervisores} value={valores.supervisorId} />
      <SelectPersona name="inspector_id" label="Inspector" personas={inspectores} value={valores.inspectorId} />
    </div>
  );
}

function SelectPersona({
  name,
  label,
  personas,
  value,
}: {
  name: string;
  label: string;
  personas: Persona[];
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select name={name} defaultValue={value} className="input">
        <option value="" disabled>
          Elegí {label.toLowerCase()}…
        </option>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.apellido}, {p.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

const vacio: EscuelaState = {
  error: null,
  ok: false,
  valores: { nombre: "", direccion: "", supervisorId: "", inspectorId: "" },
  intento: 0,
};

function NuevaEscuela(equipo: Equipo) {
  const [state, action, pending] = useActionState(crearEscuela, vacio);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <h2 className="font-semibold">Agregar escuela</h2>
      <CamposEscuela key={state.intento} valores={state.valores} {...equipo} />
      {state.error && <ErrorMsg mensaje={state.error} />}
      <button type="submit" disabled={pending} className="btn-primary sm:w-auto sm:self-end sm:px-8">
        {pending ? "Guardando…" : "Agregar"}
      </button>
    </form>
  );
}

function EscuelaFila({ escuela: e, ...equipo }: { escuela: Escuela } & Equipo) {
  const [editando, setEditando] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: EscuelaState, formData: FormData) => {
      const r = await editarEscuela(e.id, prev, formData);
      if (r.ok) setEditando(false);
      return r;
    },
    {
      ...vacio,
      valores: {
        nombre: e.nombre,
        direccion: e.direccion ?? "",
        supervisorId: e.supervisor_id,
        inspectorId: e.inspector_id,
      },
    },
  );

  if (editando) {
    return (
      <li className="p-4">
        <form action={action} className="flex flex-col gap-3">
          <CamposEscuela key={state.intento} valores={state.valores} autoFocus {...equipo} />
          {state.error && <ErrorMsg mensaje={state.error} />}
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
    <li className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center ${e.activa ? "" : "opacity-60"}`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {e.nombre}
          {!e.activa && (
            <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-border">
              Desactivada
            </span>
          )}
        </p>
        {e.direccion && <p className="truncate text-sm text-muted">{e.direccion}</p>}
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
          <span>
            <span className="text-muted">Supervisor:</span> {nombreCompleto(e.supervisor)}
          </span>
          <span>
            <span className="text-muted">Inspector:</span> {nombreCompleto(e.inspector)}
          </span>
        </p>
      </div>
      <div className="-ml-3 flex shrink-0 sm:ml-0">
        <button type="button" onClick={() => setEditando(true)} className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-background">
          Editar
        </button>
        <form action={cambiarActiva.bind(null, e.id, !e.activa)}>
          <button type="submit" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-background">
            {e.activa ? "Desactivar" : "Activar"}
          </button>
        </form>
      </div>
    </li>
  );
}
