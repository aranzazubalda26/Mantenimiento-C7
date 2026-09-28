"use client";

import { useEffect, useId, useRef } from "react";

// Ventana que sube desde abajo en el celular (al alcance del pulgar) y queda
// centrada en la PC. Cierra con Escape o tocando afuera, salvo mientras guarda.
export function Hoja({
  titulo,
  subtitulo,
  ocupada,
  onCerrar,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  ocupada?: boolean; // guardando: no se puede cerrar
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onCerrar);
  const bloqueada = useRef(ocupada);
  useEffect(() => {
    cerrar.current = onCerrar;
    bloqueada.current = ocupada;
  });

  useEffect(() => {
    // Sin scroll de la pantalla de atras mientras esta abierta
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const anterior = document.activeElement as HTMLElement | null;
    // Foco en la hoja, salvo que un campo ya lo haya tomado (autoFocus: abre el teclado)
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !bloqueada.current && cerrar.current();
    document.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = antes;
      document.removeEventListener("keydown", esc);
      anterior?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,24,40,0.45)] pc:items-center pc:p-6"
      onPointerDown={(e) => e.target === e.currentTarget && !ocupada && onCerrar()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-[20px] bg-surface px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2.5 shadow-alta outline-none pc:rounded-2xl pc:p-6"
      >
        <span className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border-strong pc:hidden" aria-hidden />
        <div>
          <h2 id={idTitulo} className="text-lg leading-tight font-bold tracking-[-0.01em]">
            {titulo}
          </h2>
          {subtitulo && <p className="mt-1 text-[13.5px] text-muted">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
