"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { coincide } from "@/lib/buscar";
import { IconoFlecha } from "./iconos";

// La direccion es como conocen cada escuela: va como texto principal
export type EscuelaOpcion = { id: number; direccion: string; nombre: string | null };

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

  const filtradas = useMemo(
    () => {
      const lista = escuelas.filter((e) => coincide(`${e.id} ${e.direccion} ${e.nombre ?? ""}`, busqueda));
      // Si escriben solo un numero, la escuela con ese numero va primero
      // (buscar "56" tambien encuentra "Avelino Diaz 2356", pero la N° 56 es la que buscan)
      const num = /^\d+$/.test(busqueda.trim()) ? Number(busqueda.trim()) : null;
      return num === null ? lista : [...lista.filter((e) => e.id === num), ...lista.filter((e) => e.id !== num)];
    },
    [escuelas, busqueda],
  );

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
          {seleccionada?.direccion ?? "Elegí la escuela por su dirección"}
        </span>
        {/* Flecha hacia abajo (cerrado) o arriba (abierto) */}
        <IconoFlecha
          className={`size-5 text-muted transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`}
        />
      </button>

      {abierto && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-alta">
          <div className="border-b border-border p-2">
            <input
              type="search"
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número o dirección…"
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
                      <span className="font-medium">{e.direccion}</span>
                      {e.nombre && (
                        <span className="text-sm text-muted">{e.nombre}</span>
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
