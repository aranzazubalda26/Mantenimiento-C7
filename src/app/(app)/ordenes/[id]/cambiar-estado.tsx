"use client";

import { useState, useTransition } from "react";
import { IconoOk } from "@/components/iconos";
import { ErrorMsg } from "@/components/ui";
import type { Estado } from "@/lib/ordenes";
import { cambiarEstado } from "./actions";

// Pendiente -> Terminada (supervisor de la escuela o admin). Pide confirmacion:
// en la obra es facil tocar sin querer. Solo el admin puede reabrir.
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
    if (!esAdmin) return null;
    return (
      <div className="flex flex-col gap-2.5">
        {error && <ErrorMsg mensaje={error} />}
        <button type="button" disabled={pending} onClick={() => ir("solicitada")} className="btn-secondary self-start">
          {pending ? "Reabriendo…" : "Reabrir orden"}
        </button>
      </div>
    );
  }

  if (confirmando) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary-soft p-4">
        <p className="font-semibold">¿Marcar la orden como terminada?</p>
        <p className="-mt-2 text-sm text-muted">Queda registrada la fecha y hora de ahora.</p>
        {error && <ErrorMsg mensaje={error} />}
        <div className="flex gap-2.5 *:flex-1">
          <button type="button" disabled={pending} onClick={() => setConfirmando(false)} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={() => ir("cerrada")} className="btn-primary">
            {pending ? "Guardando…" : "Sí, terminada"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setConfirmando(true)} className="btn-primary min-h-[50px] w-full">
      <IconoOk className="size-[18px]" />
      Marcar como terminada
    </button>
  );
}
