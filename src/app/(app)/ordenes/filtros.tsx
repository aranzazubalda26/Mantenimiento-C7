"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export const RANGOS = [
  // Textos cortos para que entre al lado del filtro de escuela en el celular
  { valor: "", texto: "Fecha" },
  { valor: "hoy", texto: "Hoy" },
  { valor: "7", texto: "7 días" },
  { valor: "30", texto: "30 días" },
] as const;

// Filtros de /ordenes: escuela y rango de fecha. Viven en la URL (?escuela=13&fecha=7)
// para que el boton Atras y los links los conserven.
// Los valores elegidos se guardan en estado local: si se cambian los dos filtros
// seguido, el segundo no pisa al primero mientras la pagina todavia carga.
export function FiltrosOrdenes({
  escuelas,
  escuela: escuelaInicial,
  fecha: fechaInicial,
}: {
  escuelas: { id: number; direccion: string }[];
  escuela: string;
  fecha: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [valores, setValores] = useState({ escuela: escuelaInicial, fecha: fechaInicial });

  const cambiar = (clave: "escuela" | "fecha", valor: string) => {
    const nuevos = { ...valores, [clave]: valor };
    setValores(nuevos);
    const qs = new URLSearchParams();
    const ver = params.get("ver");
    if (ver) qs.set("ver", ver);
    if (nuevos.escuela) qs.set("escuela", nuevos.escuela);
    if (nuevos.fecha) qs.set("fecha", nuevos.fecha);
    const texto = qs.toString();
    startTransition(() => router.replace(texto ? `${pathname}?${texto}` : pathname, { scroll: false }));
  };

  const clase = (activo: boolean) =>
    `h-10 min-w-0 rounded-[10px] border bg-surface pl-3 pr-8 text-sm font-medium shadow-suave outline-none focus:border-primary ${
      activo ? "border-primary text-primary" : "border-border text-foreground"
    }`;

  return (
    <div className={`flex gap-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <select
        aria-label="Filtrar por escuela"
        value={valores.escuela}
        onChange={(e) => cambiar("escuela", e.target.value)}
        className={`${clase(!!valores.escuela)} flex-1 sm:w-64 sm:flex-none`}
      >
        <option value="">Todas las escuelas</option>
        {escuelas.map((e) => (
          <option key={e.id} value={e.id}>
            {e.id} · {e.direccion}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por fecha"
        value={valores.fecha}
        onChange={(e) => cambiar("fecha", e.target.value)}
        className={`${clase(!!valores.fecha)} shrink-0`}
      >
        {RANGOS.map((r) => (
          <option key={r.valor} value={r.valor}>
            {r.texto}
          </option>
        ))}
      </select>
    </div>
  );
}
