"use client";

import { useEffect, useRef } from "react";
import { IconoCamara, IconoX } from "./iconos";

export type FotoLocal = { id: string; file: File; url: string };

export function idUnico() {
  // randomUUID solo existe en contexto seguro (https/localhost); en el celular por la red local no
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Miniaturas + recuadro para sumar fotos. Sin `capture` para que el
// celular ofrezca elegir entre camara y galeria.
export function FotosInput({
  fotos,
  onChange,
  max,
  disabled,
}: {
  fotos: FotoLocal[];
  onChange: (fotos: FotoLocal[]) => void;
  max: number;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);

  // Liberar las URLs de las miniaturas al salir de la pantalla
  const actuales = useRef(fotos);
  useEffect(() => {
    actuales.current = fotos;
  }, [fotos]);
  useEffect(() => () => actuales.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  const agregar = (lista: FileList | null) => {
    if (!lista) return;
    const nuevas = Array.from(lista)
      .filter((f) => f.type.startsWith("image/") || f.name.match(/\.(heic|heif)$/i))
      .slice(0, max - fotos.length)
      .map((file) => ({ id: idUnico(), file, url: URL.createObjectURL(file) }));
    onChange([...fotos, ...nuevas]);
    if (input.current) input.current.value = "";
  };

  const quitar = (id: string) => {
    const foto = fotos.find((f) => f.id === id);
    if (foto) URL.revokeObjectURL(foto.url);
    onChange(fotos.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-2.5">
      {fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((f, i) => (
            <div key={f.id} className="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-[#eef0f3]">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob local, next/image no aplica */}
              <img src={f.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => quitar(f.id)}
                  aria-label={`Quitar foto ${i + 1}`}
                  className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-black/60 text-white"
                >
                  <IconoX className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {fotos.length < max && (
        <label
          className={`flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] border-dashed border-border-strong p-4 text-sm text-muted transition-colors hover:border-primary hover:text-foreground ${
            disabled ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-background text-foreground">
            <IconoCamara />
          </span>
          <span>
            <b className="text-foreground">{fotos.length === 0 ? "Sumar fotos" : "Sumar otra foto"}</b>
            <br />
            Así saben qué buscar cuando llegan
          </span>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            disabled={disabled}
            onChange={(e) => agregar(e.target.files)}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}
