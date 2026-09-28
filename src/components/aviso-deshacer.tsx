"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deshacerCierre } from "@/app/(app)/ordenes/[id]/actions";
import { conParams } from "@/lib/navegacion";
import { numeroOrden } from "@/lib/ordenes";

const SEGUNDOS = 10; // la base da 30 s de margen por conexiones lentas (ver private.es_deshacer)

// Aviso de abajo despues de cerrar una orden, con "Deshacer" unos segundos.
// Lo dispara la URL: ?hecha=<id>&cierre=terminada|fuera (ver cierre-orden.tsx).
export function AvisoDeshacer() {
  const params = useSearchParams();
  const hecha = params.get("hecha");
  const id = hecha && /^\d+$/.test(hecha) ? Number(hecha) : null;
  if (!id) return null;
  // key: si se cierra otra orden, arranca de cero
  return <Aviso key={id} ordenId={id} fuera={params.get("cierre") === "fuera"} />;
}

function Aviso({ ordenId, fuera }: { ordenId: number; fuera: boolean }) {
  const router = useRouter();
  const [fase, setFase] = useState<"visible" | "deshecha" | "error">("visible");
  const [pending, startTransition] = useTransition();

  // Pasado el tiempo, saca el aviso de la URL (asi no vuelve a aparecer al recargar)
  useEffect(() => {
    if (pending) return;
    const t = setTimeout(
      () => {
        const actual = window.location.pathname + window.location.search;
        router.replace(conParams(actual, { hecha: null, cierre: null }), { scroll: false });
      },
      (fase === "visible" ? SEGUNDOS : 4) * 1000,
    );
    return () => clearTimeout(t);
  }, [fase, pending, router]);

  const deshacer = () =>
    startTransition(async () => {
      try {
        const r = await deshacerCierre(ordenId);
        setFase(r.error ? "error" : "deshecha");
      } catch {
        // Sin conexion: no se sabe si llego; el mensaje de error dice como seguir
        setFase("error");
      }
    });

  const texto =
    fase === "deshecha"
      ? `Listo: la orden ${numeroOrden(ordenId)} volvió a Pendiente.`
      : fase === "error"
        ? "Ya no se puede deshacer. Pedile al inspector/a que la reabra."
        : `Orden ${numeroOrden(ordenId)} ${fuera ? "marcada fuera de alcance" : "terminada"}.`;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-white shadow-alta pc:bottom-6 pc:left-auto pc:right-6"
    >
      <span className="min-w-0 flex-1">{texto}</span>
      {fase === "visible" && (
        <button
          type="button"
          onClick={deshacer}
          disabled={pending}
          className="-my-1 min-h-10 shrink-0 rounded-lg px-2 font-bold text-[#5eead4] hover:bg-white/10"
        >
          {pending ? "Deshaciendo…" : "Deshacer"}
        </button>
      )}
      {fase === "visible" && !pending && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[#5eead4] motion-safe:animate-[vaciar_10s_linear_forwards]"
        />
      )}
    </div>
  );
}
