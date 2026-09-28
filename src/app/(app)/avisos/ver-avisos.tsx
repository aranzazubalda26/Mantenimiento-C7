"use client";

import { useEffect } from "react";
import { verAvisosSinOrden } from "./actions";

// Al mostrar la pantalla (no al prearmarla): da por leidos los avisos que no se pueden abrir
export function VerAvisos({ ocultos }: { ocultos: number[] }) {
  const clave = ocultos.join(",");
  useEffect(() => {
    verAvisosSinOrden(clave ? clave.split(",").map(Number) : []);
  }, [clave]);
  return null;
}
