"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { IconoOk } from "@/components/iconos";
import { ErrorMsg } from "@/components/ui";
import type { Estado } from "@/lib/ordenes";
import { borrarOrden, reabrirOrden, terminarOrden } from "./actions";

// Botones de la orden segun quien la mira (la base vuelve a controlar todo):
//   pendiente: supervisor/a "Marcar como terminada"; inspector/a y admin "Editar" y "Borrar"
//   terminada: inspector/a "Objetar y reabrir" (con motivo)
// Las acciones delicadas piden confirmacion: en la obra es facil tocar sin querer.

// Margen para que un panel no quede debajo de la barra de abajo del celular
const PANEL = "scroll-mb-[calc(96px+env(safe-area-inset-bottom))] pc:scroll-mb-6";

export function AccionesOrden({
  ordenId,
  estado,
  puedeTerminar,
  puedeEditar,
  puedeReabrir,
  hrefEditar,
  hrefTrasBorrar,
}: {
  ordenId: number;
  estado: Estado;
  puedeTerminar: boolean;
  puedeEditar: boolean;
  puedeReabrir: boolean;
  hrefEditar: string;
  hrefTrasBorrar: string;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<"botones" | "terminar" | "borrar" | "reabrir">("botones");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Al abrir una confirmacion, mostrarla entera (sus botones quedan mas abajo que el que se toco)
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (modo !== "botones") panel.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [modo]);

  const ejecutar =(accion: () => Promise<{ error: string | null }>, alTerminar?: () => void) =>
    startTransition(async () => {
      const r = await accion();
      setError(r.error);
      if (!r.error) {
        setModo("botones");
        setMotivo("");
        alTerminar?.();
      }
    });

  const cancelar = () => {
    setModo("botones");
    setError(null);
  };

  if (modo === "terminar") {
    return (
      <Confirmar
        ref={panel}
        titulo="¿Marcar la orden como terminada?"
        texto="Queda registrada la fecha y hora de ahora."
        boton="Sí, terminada"
        pending={pending}
        error={error}
        onCancelar={cancelar}
        onConfirmar={() => ejecutar(() => terminarOrden(ordenId))}
      />
    );
  }

  if (modo === "borrar") {
    return (
      <Confirmar
        ref={panel}
        peligro
        titulo="¿Borrar la orden?"
        texto="Se borra con sus fotos y su historial. No se puede deshacer."
        boton="Sí, borrar"
        pending={pending}
        error={error}
        onCancelar={cancelar}
        onConfirmar={() => ejecutar(() => borrarOrden(ordenId), () => router.replace(hrefTrasBorrar))}
      />
    );
  }

  if (modo === "reabrir") {
    return (
      <div ref={panel} className={`flex flex-col gap-3 rounded-xl border border-[#fda29b] bg-[#fff4ed] p-4 ${PANEL}`}>
        <label htmlFor="motivo" className="font-semibold">
          ¿Por qué se reabre?
        </label>
        <textarea
          id="motivo"
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            setError(null);
          }}
          maxLength={500}
          rows={3}
          autoFocus
          placeholder="Ej.: el vidrio quedó flojo"
          className="input min-h-[84px] resize-y py-3 leading-normal"
        />
        <p className="-mt-1 text-[13px] text-muted">
          La orden vuelve a Pendiente y el motivo queda a la vista hasta que se vuelva a terminar.
        </p>
        {error && <ErrorMsg mensaje={error} />}
        <div className="flex gap-2.5 *:flex-1">
          <button type="button" disabled={pending} onClick={cancelar} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || !motivo.trim()}
            onClick={() => ejecutar(() => reabrirOrden(ordenId, motivo))}
            className="btn-primary"
          >
            {pending ? "Guardando…" : "Reabrir"}
          </button>
        </div>
      </div>
    );
  }

  if (estado === "cerrada") {
    if (!puedeReabrir) return null;
    return (
      <button type="button" onClick={() => setModo("reabrir")} className="btn-secondary min-h-[50px] w-full text-[#b42318]">
        Objetar y reabrir
      </button>
    );
  }

  if (!puedeTerminar && !puedeEditar) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {puedeTerminar && (
        <button type="button" onClick={() => setModo("terminar")} className="btn-primary min-h-[50px] w-full">
          <IconoOk className="size-[18px]" />
          Marcar como terminada
        </button>
      )}
      {puedeEditar && (
        <div className="flex gap-2.5 *:flex-1">
          <Link href={hrefEditar} className="btn-secondary min-h-[48px]">
            Editar
          </Link>
          <button type="button" onClick={() => setModo("borrar")} className="btn-secondary min-h-[48px] text-danger">
            Borrar
          </button>
        </div>
      )}
    </div>
  );
}

function Confirmar({
  ref,
  titulo,
  texto,
  boton,
  pending,
  error,
  peligro,
  onCancelar,
  onConfirmar,
}: {
  ref: React.Ref<HTMLDivElement>;
  titulo: string;
  texto: string;
  boton: string;
  pending: boolean;
  error: string | null;
  peligro?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div
      ref={ref}
      className={`flex flex-col gap-3 rounded-xl border p-4 ${PANEL} ${
        peligro ? "border-[#fda29b] bg-danger-soft" : "border-primary/30 bg-primary-soft"
      }`}
    >
      <p className="font-semibold">{titulo}</p>
      <p className="-mt-2 text-sm text-muted">{texto}</p>
      {error && <ErrorMsg mensaje={error} />}
      <div className="flex gap-2.5 *:flex-1">
        <button type="button" disabled={pending} onClick={onCancelar} className="btn-secondary">
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirmar}
          className={peligro ? "btn-primary border-danger bg-danger hover:border-danger hover:bg-danger/90" : "btn-primary"}
        >
          {pending ? "Guardando…" : boton}
        </button>
      </div>
    </div>
  );
}
