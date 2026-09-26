"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EscuelaSelect, type EscuelaOpcion } from "@/components/escuela-select";
import { FotosInput, idUnico, type FotoLocal } from "@/components/fotos-input";
import { Campo } from "@/components/ui";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import {
  MAX_DESCRIPCION,
  MAX_FOTOS,
  MAX_UBICACION,
  PRIORIDADES,
  PRIORIDAD_LABEL,
  type Prioridad,
} from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/client";
import { crearOrden } from "./actions";

const BUCKET = "ordenes-fotos";

const PRIORIDAD_ACTIVA: Record<Prioridad, string> = {
  baja: "bg-slate-600 text-white ring-slate-600",
  media: "bg-sky-600 text-white ring-sky-600",
  alta: "bg-amber-500 text-white ring-amber-500",
  urgente: "bg-red-600 text-white ring-red-600",
};

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function NuevaOrdenForm({
  escuelas,
  usuarioId,
  hoy,
  esAdmin,
}: {
  escuelas: EscuelaOpcion[];
  usuarioId: string;
  hoy: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [escuelaId, setEscuelaId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(hoy);
  const [prioridad, setPrioridad] = useState<Prioridad | null>(null);
  const [ubicacion, setUbicacion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<string | null>(null);

  const escuela = escuelas.find((e) => e.id === escuelaId) ?? null;
  const enviando = progreso !== null;

  if (escuelas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="font-medium">
          {esAdmin ? "Todavía no hay escuelas cargadas." : "No tenés escuelas asignadas."}
        </p>
        <p className="mt-1 text-sm text-muted">
          {esAdmin
            ? "Cargá al menos una para poder crear órdenes."
            : "Pedile al administrador que te asigne tus escuelas."}
        </p>
        {esAdmin && (
          <Link href="/admin/escuelas" className="btn-primary mt-5">
            Cargar escuelas
          </Link>
        )}
      </div>
    );
  }

  if (paso === 1 || !escuela) {
    return (
      <div className="flex flex-col gap-5">
        <Pasos actual={1} />
        <div>
          <h2 className="text-xl font-semibold tracking-tight">¿En qué escuela?</h2>
          <p className="mt-1 text-muted">Elegí la escuela donde está la tarea.</p>
        </div>
        <EscuelaSelect escuelas={escuelas} value={escuelaId} onChange={setEscuelaId} />
        <button
          type="button"
          disabled={!escuelaId}
          onClick={() => setPaso(2)}
          className="btn-primary"
        >
          Continuar
        </button>
      </div>
    );
  }

  const faltante = () => {
    if (!prioridad) return "Elegí la prioridad.";
    if (!ubicacion.trim()) return "Indicá la ubicación dentro del edificio.";
    if (!descripcion.trim()) return "Describí la tarea.";
    if (fotos.length === 0) return "Agregá al menos una foto.";
    return null;
  };

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const falta = faltante();
    if (falta) return setError(falta);
    setError(null);

    const supabase = createClient();
    const subidas: string[] = [];
    try {
      for (const [i, foto] of fotos.entries()) {
        setProgreso(`Subiendo fotos ${i + 1}/${fotos.length}…`);
        const blob = await comprimirImagen(foto.file);
        const path = `${usuarioId}/${idUnico()}.${EXTENSION[blob.type] ?? "jpg"}`;
        const { error: errSubida } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: blob.type || "image/jpeg" });
        if (errSubida) {
          console.error(errSubida);
          throw new Error("No se pudo subir una foto. Revisá la conexión y probá de nuevo.");
        }
        subidas.push(path);
      }

      setProgreso("Guardando orden…");
      const r = await crearOrden({
        escuelaId: escuela.id,
        fecha,
        descripcion,
        prioridad: prioridad!,
        ubicacion,
        fotos: subidas,
      });
      if (!r.ok) throw new Error(r.error);

      router.push(`/ordenes/${r.id}?creada=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal. Probá de nuevo.");
      setProgreso(null);
      // No dejar fotos huerfanas en Storage si la orden no se creo
      if (subidas.length) await supabase.storage.from(BUCKET).remove(subidas);
    }
  };

  return (
    // Cualquier cambio en el formulario borra el error anterior
    <form
      onSubmit={enviar}
      onChange={() => setError(null)}
      className="flex flex-col gap-6"
      noValidate
    >
      <Pasos actual={2} />

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Escuela</p>
          <p className="truncate font-semibold">{escuela.nombre}</p>
          {escuela.direccion && (
            <p className="truncate text-sm text-muted">{escuela.direccion}</p>
          )}
        </div>
        <button
          type="button"
          disabled={enviando}
          onClick={() => setPaso(1)}
          className="shrink-0 text-sm font-semibold text-primary"
        >
          Cambiar
        </button>
      </div>

      <Campo label="Fecha" htmlFor="fecha">
        <input
          id="fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          disabled={enviando}
          required
          className="input"
        />
      </Campo>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Prioridad</legend>
        <div className="grid grid-cols-4 gap-2">
          {PRIORIDADES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={prioridad === p}
              disabled={enviando}
              onClick={() => {
                setPrioridad(p);
                setError(null);
              }}
              className={`h-12 rounded-xl text-sm font-semibold ring-1 transition-colors ${
                prioridad === p ? PRIORIDAD_ACTIVA[p] : "bg-surface ring-border"
              }`}
            >
              {PRIORIDAD_LABEL[p]}
            </button>
          ))}
        </div>
      </fieldset>

      <Campo label="Ubicación dentro del edificio" htmlFor="ubicacion">
        <input
          id="ubicacion"
          type="text"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          maxLength={MAX_UBICACION}
          disabled={enviando}
          placeholder="Ej: Baño de nenas, 1° piso"
          className="input"
        />
      </Campo>

      <Campo label="Descripción de la tarea" htmlFor="descripcion">
        <textarea
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={MAX_DESCRIPCION}
          disabled={enviando}
          rows={4}
          placeholder="¿Qué hay que hacer?"
          className="input h-auto min-h-28 resize-y py-3"
        />
      </Campo>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Fotos</span>
          <span className="text-xs text-muted">
            {fotos.length}/{MAX_FOTOS} · mínimo 1
          </span>
        </div>
        <FotosInput
          fotos={fotos}
          onChange={(f) => {
            setFotos(f);
            setError(null);
          }}
          max={MAX_FOTOS}
          disabled={enviando}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando} className="btn-primary">
        {progreso ?? "Crear orden"}
      </button>
    </form>
  );
}

function Pasos({ actual }: { actual: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-muted">
      <span className={actual === 1 ? "text-primary" : ""}>1. Escuela</span>
      <span className="h-px w-6 bg-border" />
      <span className={actual === 2 ? "text-primary" : ""}>2. Detalle</span>
    </div>
  );
}
