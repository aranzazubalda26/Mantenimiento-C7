"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FotosInput, type FotoLocal } from "@/components/fotos-input";
import { Hoja } from "@/components/hoja";
import { IconoOk } from "@/components/iconos";
import { ErrorMsg } from "@/components/ui";
import { conParams } from "@/lib/navegacion";
import { MAX_FOTOS_CIERRE, MAX_NOTA_CIERRE } from "@/lib/ordenes";
import { borrarSubidas, subirFotos } from "@/lib/subir-fotos";
import { marcarFueraDeAlcance, terminarOrden } from "./actions";

// Cierre de una orden pendiente (supervisor/a de la escuela o admin).
// Celular: barra fija sobre la navegacion de abajo, donde llega el pulgar.
//   "Marcar como terminada": fotos del trabajo hecho (obligatorias para el supervisor/a) + nota.
//   "No corresponde a mantenimiento…": fuera de alcance, con motivo obligatorio.
// Al cerrar vuelve a la pantalla anterior, que muestra el aviso con "Deshacer".
// La pantalla que la usa deja lugar abajo para la barra fija (ver ordenes/[id]/page.tsx).
export function CierreOrden({
  ordenId,
  numero,
  lugar,
  usuarioId,
  fotoObligatoria,
  volverHref,
}: {
  ordenId: number;
  numero: string; // "#0142"
  lugar: string; // "Culpina 555 · Aula 4"
  usuarioId: string;
  fotoObligatoria: boolean;
  volverHref: string;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<"terminar" | "fuera" | null>(null);
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [nota, setNota] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const ocupada = progreso !== null;

  const cerrarHoja = () => {
    setModo(null);
    setError(null);
  };

  const listo = (cierre: "terminada" | "fuera") =>
    router.replace(conParams(volverHref, { hecha: String(ordenId), cierre }), { scroll: false });

  const terminar = async () => {
    if (fotoObligatoria && !fotos.length) return setError("Sacá al menos una foto del trabajo terminado.");
    setError(null);
    let subidas: string[] = [];
    try {
      subidas = await subirFotos(
        fotos.map((f) => f.file),
        usuarioId,
        (i, n) => setProgreso(`Subiendo fotos ${i}/${n}…`),
      );
      setProgreso("Guardando…");
      const r = await terminarOrden(ordenId, nota, subidas);
      if (r.error) throw new Error(r.error);
      listo("terminada");
    } catch (e) {
      // Las fotos quedan elegidas para reintentar; los archivos subidos se borran
      await borrarSubidas(subidas);
      setError(e instanceof Error ? e.message : "Algo salió mal. Probá de nuevo.");
      setProgreso(null);
    }
  };

  const fueraDeAlcance = async () => {
    if (!motivo.trim()) return setError("Escribí por qué no corresponde a mantenimiento.");
    setError(null);
    setProgreso("Guardando…");
    const r = await marcarFueraDeAlcance(ordenId, motivo);
    if (r.error) {
      setError(r.error);
      setProgreso(null);
      return;
    }
    listo("fuera");
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex flex-col gap-1.5 border-t border-border bg-surface/95 px-4 py-2.5 backdrop-blur-md pc:static pc:z-auto pc:flex-row pc:border-0 pc:bg-transparent pc:p-0 pc:backdrop-blur-none">
        <button type="button" onClick={() => setModo("terminar")} className="btn-primary min-h-[50px] w-full pc:w-auto pc:flex-1">
          <IconoOk className="size-[18px]" />
          Marcar como terminada
        </button>
        <button
          type="button"
          onClick={() => setModo("fuera")}
          className="min-h-10 rounded-[10px] text-sm font-semibold text-muted hover:text-foreground pc:min-h-[50px] pc:border pc:border-border pc:bg-surface pc:px-4 pc:shadow-suave"
        >
          No corresponde a mantenimiento…
        </button>
      </div>

      {modo === "terminar" && (
        <Hoja titulo="¿Terminaron esta tarea?" subtitulo={`${numero} · ${lugar}`} ocupada={ocupada} onCerrar={cerrarHoja}>
          <div className="flex flex-col gap-2">
            <p className="flex items-baseline justify-between text-sm font-semibold">
              Fotos del trabajo hecho
              <span className={`text-xs ${fotoObligatoria ? "font-semibold text-danger" : "font-normal text-muted"}`}>
                {fotoObligatoria ? "obligatoria" : "opcional"} · {fotos.length}/{MAX_FOTOS_CIERRE}
              </span>
            </p>
            <FotosInput
              fotos={fotos}
              onChange={(f) => {
                setFotos(f);
                setError(null);
              }}
              max={MAX_FOTOS_CIERRE}
              disabled={ocupada}
              titulo="Sacar foto"
              ayuda="Cómo quedó: el inspector/a la ve en la orden"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="nota-cierre" className="text-sm font-semibold">
              Nota para el inspector/a <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id="nota-cierre"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              maxLength={MAX_NOTA_CIERRE}
              disabled={ocupada}
              rows={2}
              placeholder="Ej.: Se cambió el flotante y la goma de la mochila"
              className="input min-h-[72px] resize-y py-3 leading-normal"
            />
          </div>
          {error && <ErrorMsg mensaje={error} />}
          <div className="flex gap-2.5 *:flex-1">
            <button type="button" disabled={ocupada} onClick={cerrarHoja} className="btn-secondary min-h-12">
              Cancelar
            </button>
            <button
              type="button"
              disabled={ocupada || (fotoObligatoria && !fotos.length)}
              onClick={terminar}
              className="btn-primary min-h-12"
            >
              {progreso ?? "Sí, terminada"}
            </button>
          </div>
        </Hoja>
      )}

      {modo === "fuera" && (
        <Hoja
          titulo="Marcar como fuera de alcance"
          subtitulo="Sale de tus tareas. El inspector/a y el admin ven el motivo; si no está de acuerdo, el inspector/a la puede reabrir."
          ocupada={ocupada}
          onCerrar={cerrarHoja}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="motivo-fuera" className="text-sm font-semibold">
              ¿Por qué no corresponde a mantenimiento?
            </label>
            <textarea
              id="motivo-fuera"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setError(null);
              }}
              maxLength={MAX_NOTA_CIERRE}
              disabled={ocupada}
              rows={3}
              autoFocus
              placeholder="Ej.: Es obra: hay que picar y revocar toda la medianera. Se presupuesta aparte."
              className="input min-h-[96px] resize-y py-3 leading-normal"
            />
          </div>
          {error && <ErrorMsg mensaje={error} />}
          <div className="flex gap-2.5 *:flex-1">
            <button type="button" disabled={ocupada} onClick={cerrarHoja} className="btn-secondary min-h-12">
              Cancelar
            </button>
            <button
              type="button"
              disabled={ocupada || !motivo.trim()}
              onClick={fueraDeAlcance}
              className="btn-primary min-h-12 border-[#5b21b6] bg-[#5b21b6] hover:border-[#4c1d95] hover:bg-[#4c1d95]"
            >
              {progreso ?? "Fuera de alcance"}
            </button>
          </div>
        </Hoja>
      )}
    </>
  );
}
