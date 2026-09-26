"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EscuelaSelect, type EscuelaOpcion } from "@/components/escuela-select";
import { FotosInput, idUnico, type FotoLocal } from "@/components/fotos-input";
import { Bloque, Campo, ErrorMsg, PieForm } from "@/components/ui";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import {
  LUGARES_COMUNES,
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
  escuelaInicial,
}: {
  escuelas: EscuelaOpcion[];
  usuarioId: string;
  hoy: string;
  esAdmin: boolean;
  escuelaInicial: number | null;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(escuelaInicial ? 2 : 1);
  const [escuelaId, setEscuelaId] = useState<number | null>(escuelaInicial);
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
      <Bloque className="items-center py-10 text-center">
        <div>
          <p className="font-semibold">
            {esAdmin ? "Todavía no hay escuelas cargadas." : "No tenés escuelas asignadas."}
          </p>
          <p className="mt-1 text-sm text-muted">
            {esAdmin
              ? "Cargá al menos una para poder crear órdenes."
              : "Pedile al administrador que te asigne tus escuelas."}
          </p>
        </div>
        {esAdmin && (
          <Link href="/admin/escuelas" className="btn-primary">
            Cargar escuelas
          </Link>
        )}
      </Bloque>
    );
  }

  if (paso === 1 || !escuela) {
    return (
      <div className="flex flex-col gap-4">
        <Pasos actual={1} />
        <Bloque>
          <Campo label="¿En qué escuela es?" htmlFor="escuela">
            <EscuelaSelect id="escuela" escuelas={escuelas} value={escuelaId} onChange={setEscuelaId} />
          </Campo>
        </Bloque>
        <PieForm>
          <Link href="/" className="btn-secondary">
            Cancelar
          </Link>
          <button type="button" disabled={!escuelaId} onClick={() => setPaso(2)} className="btn-primary">
            Continuar
          </button>
        </PieForm>
      </div>
    );
  }

  const faltante = () => {
    if (!descripcion.trim()) return "Escribí qué hay que hacer.";
    if (!ubicacion.trim()) return "Indicá dónde es, dentro de la escuela.";
    if (!prioridad) return "Elegí la prioridad.";
    if (fotos.length === 0) return "Sumá al menos una foto.";
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
    <form onSubmit={enviar} onChange={() => setError(null)} className="flex flex-col gap-4" noValidate>
      <Pasos actual={2} />

      <Bloque>
        <div className="flex items-center gap-3 rounded-[10px] bg-background p-3">
          <span className="esc-num">{escuela.id}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{escuela.direccion}</p>
            {escuela.nombre && <p className="truncate text-[13px] text-muted">{escuela.nombre}</p>}
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => setPaso(1)}
            className="shrink-0 text-[13px] font-semibold text-primary"
          >
            Cambiar
          </button>
        </div>

        <Campo label="Qué hay que hacer" htmlFor="descripcion">
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={MAX_DESCRIPCION}
            disabled={enviando}
            rows={3}
            placeholder="Ej.: Pérdida de agua en la canilla del lavatorio"
            className="input min-h-[100px] resize-y py-3 leading-normal"
          />
        </Campo>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Campo label="Dónde, dentro de la escuela" htmlFor="ubicacion">
            <input
              id="ubicacion"
              type="text"
              list="lugares"
              autoComplete="off"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              maxLength={MAX_UBICACION}
              disabled={enviando}
              placeholder="Ej.: Baños planta baja"
              className="input"
            />
            <datalist id="lugares">
              {LUGARES_COMUNES.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Campo>
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
        </div>
      </Bloque>

      <Bloque>
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Prioridad</legend>
          <div className="segmento w-max">
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
                className={`px-4 ${p === "urgente" && prioridad === p ? "!text-danger" : ""}`}
              >
                {PRIORIDAD_LABEL[p]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Fotos</span>
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
      </Bloque>

      {error && <ErrorMsg mensaje={error} />}

      <PieForm>
        <Link href="/" className="btn-secondary" aria-disabled={enviando}>
          Cancelar
        </Link>
        <button type="submit" disabled={enviando} className="btn-primary">
          {progreso ?? "Crear orden"}
        </button>
      </PieForm>
    </form>
  );
}

function Pasos({ actual }: { actual: 1 | 2 }) {
  const paso = (n: 1 | 2, texto: string) => (
    <span className={`flex items-center gap-2 ${actual === n ? "font-semibold text-foreground" : ""}`}>
      <span
        className={`grid size-[26px] place-items-center rounded-full text-[13px] font-bold ${
          actual === n ? "bg-primary-soft text-primary" : "bg-segmento text-muted"
        }`}
      >
        {n}
      </span>
      {texto}
    </span>
  );
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      {paso(1, "Escuela")}
      <span className="h-px w-6 bg-border-strong" />
      {paso(2, "Detalle")}
    </div>
  );
}
