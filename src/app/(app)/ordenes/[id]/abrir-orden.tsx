"use client";

import { useEffect } from "react";
import { abrirOrden } from "./actions";

// Avisa a la base que la orden se abrio (avisos leidos, "vista" del supervisor/a).
// Va en el navegador y no en el servidor para que no cuente cuando Next prearma la pantalla.
export function AbrirOrden({ ordenId }: { ordenId: number }) {
  useEffect(() => {
    abrirOrden(ordenId);
  }, [ordenId]);
  return null;
}
