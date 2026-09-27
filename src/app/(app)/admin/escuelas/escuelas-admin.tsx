"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Buscador, ErrorMsg } from "@/components/ui";
import { coincide } from "@/lib/buscar";
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
  direccion: string; // como la conocen: se muestra como titulo
  nombre: string | null; // nombre oficial, opcional
  activa: boolean;
  supervisor_id: string;
  inspector_id: string;
  supervisor: NombreApellido | null;
  inspector: NombreApellido | null;
};

export type Persona = NombreApellido & { id: string; rol: string };

type Equipo = { supervisores: Persona[]; inspectores: Persona[] };

export function EscuelasAdmin({
  escuelas,
  supervisores,
  inspectores,
}: { escuelas: Escuela[] } & Equipo) {
  const [busqueda, setBusqueda] = useState("");
  const equipo = { supervisores, inspectores };

  const filtradas = useMemo(
    () =>
      escuelas.filter((e) =>
        coincide(
          `${e.id} ${e.direccion} ${e.nombre ?? ""} ${nombreCompleto(e.supervisor)} ${nombreCompleto(e.inspector)}`,
          busqueda,
        ),
      ),
    [escuelas, busqueda],
  );

  const activas = escuelas.filter((e) => e.activa).length;
  const desactivadas = escuelas.length - activas;

  return (
    <>
      {supervisores.length === 0 || inspectores.length === 0 ? (
        <div className="tarjeta flex flex-col items-center p-6 text-center">
          <p className="font-semibold">Cada escuela necesita un supervisor y un inspector.</p>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-muted">
            {activas} activa{activas === 1 ? "" : "s"}
            {desactivadas > 0 && ` · ${desactivadas} desactivada${desactivadas === 1 ? "" : "s"}`}
          </h2>
          {escuelas.length > 5 && (
            <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por número, dirección o persona" />
          )}
        </div>

        {escuelas.length === 0 ? (
          <p className="tarjeta px-5 py-12 text-center text-muted">
            Todavía no cargaste ninguna escuela.
          </p>
        ) : filtradas.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted">No hay escuelas que coincidan.</p>
        ) : (
          <ul className="tarjeta divide-y divide-border overflow-hidden">
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
      {/* Numero y direccion primero: es como la gente identifica cada escuela */}
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 sm:col-span-2 sm:grid-cols-[120px_minmax(0,1fr)]">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Número</span>
          <input
            name="numero"
            defaultValue={valores.numero}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Ej: 13"
            autoFocus={autoFocus}
            autoComplete="off"
            className="input num"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Dirección</span>
          <input
            name="direccion"
            defaultValue={valores.direccion}
            placeholder="Ej: Portela 734"
            autoComplete="off"
            className="input"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-sm font-semibold">
          Nombre oficial <span className="font-normal text-muted">(opcional)</span>
        </span>
        <input
          name="nombre"
          defaultValue={valores.nombre}
          placeholder="Ej: Escuela N° 5 D.E. 3"
          autoComplete="off"
          className="input"
        />
      </label>
      <SelectPersona name="supervisor_id" label="Supervisor/a" personas={supervisores} value={valores.supervisorId} />
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
      <span className="text-sm font-semibold">{label}</span>
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
  valores: { numero: "", nombre: "", direccion: "", supervisorId: "", inspectorId: "" },
  intento: 0,
};

function NuevaEscuela(equipo: Equipo) {
  const [state, action, pending] = useActionState(crearEscuela, vacio);

  return (
    <form action={action} className="tarjeta flex flex-col gap-4 p-[18px] pc:p-[22px]">
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
        numero: String(e.id),
        nombre: e.nombre ?? "",
        direccion: e.direccion,
        supervisorId: e.supervisor_id,
        inspectorId: e.inspector_id,
      },
    },
  );

  if (editando) {
    return (
      <li className="bg-fila-hover p-4 pc:px-5">
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
    <li className={`flex flex-col gap-2 px-4 py-3.5 hover:bg-fila-hover sm:flex-row sm:items-center pc:px-5 ${e.activa ? "" : "opacity-60"}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="esc-num mt-0.5">{e.id}</span>
        <div className="min-w-0">
          <p className="font-semibold">
            {e.direccion}
            {!e.activa && (
              <span className="ml-2 inline-flex h-[22px] items-center rounded-full bg-[#eef0f3] px-2 align-middle text-xs font-semibold text-[#475467]">
                Desactivada
              </span>
            )}
          </p>
          {e.nombre && <p className="truncate text-[13px] text-muted">{e.nombre}</p>}
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13.5px]">
            <span>
              <span className="text-muted">Supervisor/a:</span> {nombreCompleto(e.supervisor)}
            </span>
            <span>
              <span className="text-muted">Inspector:</span> {nombreCompleto(e.inspector)}
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5 pl-[38px] sm:pl-0">
        <button type="button" onClick={() => setEditando(true)} className="btn-secondary btn-chico">
          Editar
        </button>
        <form action={cambiarActiva.bind(null, e.id, !e.activa)}>
          <button type="submit" className="btn-secondary btn-chico text-muted">
            {e.activa ? "Desactivar" : "Activar"}
          </button>
        </form>
      </div>
    </li>
  );
}
