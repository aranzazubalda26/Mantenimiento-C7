"use client";

import { useEffect } from "react";
import { verAvisosSinOrden } from "./actions";

// Al mostrar la pantalla (no al prearmarla): da por leidos los avisos que no se pueden abrir
export function VerAvisos() {
  useEffect(() => {
    verAvisosSinOrden();
  }, []);
  return null;
}
