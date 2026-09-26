"use client";

import { useState, useTransition } from "react";
import { IconoLlave, IconoOk } from "@/components/iconos";
import { ErrorMsg } from "@/components/ui";
import type { Estado } from "@/lib/ordenes";
import { cambiarEstado } from "./actions";

// Botones para mover la orden de estado (supervisor de la escuela o admin).
// Cerrar pide confirmacion: en la obra es facil tocar sin querer.
export function CambiarEstado({
  ordenId,
  estado,
  esAdmin,
}: {
  ordenId: number;
  estado: Estado;
  esAdmin: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ir = (nuevo: Estado) =>
    startTransition(async () => {
      const r = await cambiarEstado(ordenId, nuevo);
      setError(r.error);
      if (!r.error) setConfirmando(false);
    });

  if (estado === "cerrada") {
    // Solo el admin puede reabrir
    if (!esAdmin) return null;
    return (
      <div className="flex flex-col gap-2.5">
        {error && <ErrorMsg mensaje={error} />}
        <button type="button" disabled={pending} onClick={() => ir("en_proceso")} className="btn-secondary self-start">
          {pending ? "Reabriendo…" : "Reabrir orden"}
        </button>
      </div>
    );
  }

  if (confirmando) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary-soft p-4">
        <p className="font-semibold">¿Cerrar la orden?</p>
        <p className="-mt-2 text-sm text-muted">
          Queda registrada la fecha y hora de ahora como cierre del trabajo.
        </p>
        {error && <ErrorMsg mensaje={error} />}
        <div className="flex gap-2.5 *:flex-1">
          <button type="button" disabled={pending} onClick={() => setConfirmando(false)} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={() => ir("cerrada")} className="btn-primary">
            {pending ? "Cerrando…" : "Sí, cerrar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {error && <ErrorMsg mensaje={error} />}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        {estado === "solicitada" ? (
          <button type="button" disabled={pending} onClick={() => ir("en_proceso")} className="btn-oscuro min-h-[50px] sm:flex-1">
            <IconoLlave className="size-[18px]" />
            {pending ? "Guardando…" : "Marcar en proceso"}
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => ir("solicitada")} className="btn-secondary min-h-[50px] text-muted sm:flex-1">
            {pending ? "Guardando…" : "Volver a solicitada"}
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => setConfirmando(true)} className="btn-primary min-h-[50px] sm:flex-1">
          <IconoOk className="size-[18px]" />
          Cerrar orden
        </button>
      </div>
    </div>
  );
}
