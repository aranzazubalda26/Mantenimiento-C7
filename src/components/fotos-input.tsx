"use client";

import { useEffect, useRef } from "react";

export type FotoLocal = { id: string; file: File; url: string };

export function idUnico() {
  // randomUUID solo existe en contexto seguro (https/localhost); en el celular por la red local no
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Grilla de miniaturas + boton para agregar. Sin `capture` para que el
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
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {fotos.map((f, i) => (
        <div key={f.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface ring-1 ring-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob local, next/image no aplica */}
          <img src={f.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => quitar(f.id)}
              aria-label={`Quitar foto ${i + 1}`}
              className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="size-4" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {fotos.length < max && (
        <label
          className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted transition-colors hover:border-primary hover:text-primary ${
            disabled ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-7" aria-hidden>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-xs font-medium">
            {fotos.length === 0 ? "Agregar fotos" : "Agregar"}
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
