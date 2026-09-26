"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type EscuelaOpcion = { id: number; nombre: string; direccion: string | null };

// Sin acentos ni mayusculas para buscar "Nro 5" o "rivadavia" como sea que se escriba
function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Desplegable con buscador: la lista de escuelas puede ser larga
export function EscuelaSelect({
  escuelas,
  value,
  onChange,
  id,
}: {
  id?: string;
  escuelas: EscuelaOpcion[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedor = useRef<HTMLDivElement>(null);

  const seleccionada = escuelas.find((e) => e.id === value) ?? null;

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return escuelas;
    return escuelas.filter((e) =>
      normalizar(`${e.nombre} ${e.direccion ?? ""}`).includes(q),
    );
  }, [escuelas, busqueda]);

  // Cerrar al tocar afuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (ev: PointerEvent) => {
      if (!contenedor.current?.contains(ev.target as Node)) setAbierto(false);
    };
    const esc = (ev: KeyboardEvent) => ev.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  const elegir = (id: number) => {
    onChange(id);
    setAbierto(false);
    setBusqueda("");
  };

  return (
    <div ref={contenedor} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${seleccionada ? "" : "text-muted/70"}`}>
          {seleccionada?.nombre ?? "Elegí una escuela"}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`size-5 shrink-0 text-muted transition-transform ${abierto ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-alta">
          <div className="border-b border-border p-2">
            <input
              type="search"
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar escuela…"
              aria-label="Buscar escuela"
              className="h-11 w-full rounded-lg bg-background px-3 text-base outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto overscroll-contain py-1">
            {filtradas.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted">
                No hay escuelas que coincidan.
              </li>
            ) : (
              filtradas.map((e) => (
                <li key={e.id} role="option" aria-selected={e.id === value}>
                  <button
                    type="button"
                    onClick={() => elegir(e.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-fila-hover ${
                      e.id === value ? "bg-primary-soft" : ""
                    }`}
                  >
                    <span className="esc-num">{e.id}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{e.nombre}</span>
                      {e.direccion && (
                        <span className="text-sm text-muted">{e.direccion}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
