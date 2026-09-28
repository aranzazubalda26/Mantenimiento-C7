"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Avisos sin leer de la campanita, en vivo:
//   - arranca con el numero que calculo el servidor (y se pone al dia en cada navegacion)
//   - Supabase Realtime avisa cuando llega uno nuevo o se marca leido
//   - al volver a la app (celular en segundo plano) se vuelve a contar, por si se perdio algo
// Cuando llega un aviso nuevo tambien se refresca la pantalla (la lista de tareas lo muestra).
export function useAvisosSinLeer(inicial: number, usuarioId: string, activo: boolean) {
  const router = useRouter();
  const [base, setBase] = useState(inicial);
  const [vivo, setVivo] = useState<number | null>(null);
  // El servidor trajo un numero nuevo (navegacion o refresh): manda ese
  if (base !== inicial) {
    setBase(inicial);
    setVivo(null);
  }

  useEffect(() => {
    if (!activo) return;
    const supabase = createClient();
    let cerrado = false;

    const contar = async () => {
      const { count, error } = await supabase
        .from("avisos")
        .select("*", { count: "exact", head: true })
        .is("leido_at", null);
      if (!cerrado && !error && count !== null) setVivo(count);
    };

    const canal = supabase
      .channel(`avisos-${usuarioId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "avisos", filter: `destinatario=eq.${usuarioId}` },
        (cambio) => {
          contar();
          if (cambio.eventType === "INSERT") router.refresh();
        },
      );
    // Realtime necesita el token de la sesion para respetar el RLS
    supabase.realtime.setAuth().then(() => !cerrado && canal.subscribe());

    const alVolver = () => document.visibilityState === "visible" && contar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cerrado = true;
      document.removeEventListener("visibilitychange", alVolver);
      supabase.removeChannel(canal);
    };
  }, [activo, usuarioId, router]);

  return vivo ?? inicial;
}
