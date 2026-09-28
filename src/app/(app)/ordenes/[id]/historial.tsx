import { IconoAlerta, IconoLapiz, IconoMas, IconoOjo, IconoOk, IconoProhibido } from "@/components/iconos";
import { duracion, formatFecha, formatFechaHora } from "@/lib/fechas";
import { PRIORIDAD_LABEL, esPrioridad } from "@/lib/ordenes";
import { nombreCompleto } from "@/lib/usuarios";

// Un registro del historial (tabla orden_eventos, la escribe la base con triggers)
export type Evento = {
  id: number;
  tipo: "creada" | "editada" | "terminada" | "fuera_de_alcance" | "reabierta" | "vista";
  detalle: Record<string, unknown> | null;
  created_at: string;
  autor: { nombre: string; apellido: string } | null;
};

const CAMPO: Record<string, string> = {
  descripcion: "Descripción",
  ubicacion: "Lugar",
  prioridad: "Prioridad",
  fecha: "Fecha",
};

const ESTILO: Record<Evento["tipo"], { icono: React.ReactNode; clase: string; texto: string }> = {
  creada: { icono: <IconoMas className="size-3.5" />, clase: "bg-primary-soft text-primary", texto: "Cargada" },
  editada: { icono: <IconoLapiz className="size-3.5" />, clase: "bg-[#dce8fd] text-[#1e40af]", texto: "Editada" },
  terminada: { icono: <IconoOk className="size-3.5" />, clase: "bg-[#eef0f3] text-[#475467]", texto: "Terminada" },
  fuera_de_alcance: { icono: <IconoProhibido className="size-3.5" />, clase: "bg-[#ede9fe] text-[#5b21b6]", texto: "Fuera de alcance" },
  reabierta: { icono: <IconoAlerta className="size-3.5" />, clase: "bg-[#fee4e2] text-[#b42318]", texto: "Reabierta" },
  vista: { icono: <IconoOjo className="size-3.5" />, clase: "bg-[#eef0f3] text-[#475467]", texto: "Vista" },
};

// Valor legible de un campo editado
function valor(campo: string, v: unknown) {
  if (campo === "prioridad" && esPrioridad(v)) return PRIORIDAD_LABEL[v];
  if (campo === "fecha" && typeof v === "string") return formatFecha(v);
  return `“${String(v ?? "")}”`;
}

// 1 -> "una foto", 3 -> "3 fotos"
const fotos = (n: number) => (n === 1 ? "una foto" : `${n} fotos`);

// detalle: {"campo": [antes, despues], "fotos_agregadas": n, "fotos_quitadas": n}
function Cambios({ detalle }: { detalle: Record<string, unknown> }) {
  const agregadas = Number(detalle.fotos_agregadas) || 0;
  const quitadas = Number(detalle.fotos_quitadas) || 0;
  return (
    <ul className="mt-0.5 flex flex-col gap-0.5">
      {Object.keys(CAMPO).map((campo) => {
        const par = detalle[campo];
        if (!Array.isArray(par)) return null;
        return (
          <li key={campo} className="break-words">
            <span className="font-medium text-foreground">{CAMPO[campo]}:</span> {valor(campo, par[0])} → {valor(campo, par[1])}
          </li>
        );
      })}
      {agregadas > 0 && <li>Agregó {fotos(agregadas)}</li>}
      {quitadas > 0 && <li>Quitó {fotos(quitadas)}</li>}
    </ul>
  );
}

// Historial de la orden: quien hizo que y cuando (lo ven todos los que ven la orden).
// Es el unico lugar con esos datos: el resto de la pantalla no los repite.
//   `cargada`: created_at de la orden, para "N desde que se cargó" al terminarla
//   `cierreActual`: cerrada_at si esta cerrada; la nota o el motivo de ese cierre ya se
//   muestran arriba, junto a las fotos, y aca no se repiten
export function Historial({
  eventos,
  cargada,
  cierreActual,
}: {
  eventos: Evento[];
  cargada: string;
  cierreActual: string | null;
}) {
  if (!eventos.length) return null;
  return (
    <div>
      <p className="dato-titulo">Historial</p>
      <ol className="flex flex-col">
        {eventos.map((e, i) => {
          const estilo = ESTILO[e.tipo];
          const arriba = e.created_at === cierreActual;
          return (
            <li key={e.id} className="relative flex gap-3 pb-3.5 last:pb-0">
              {/* linea que une los eventos */}
              {i < eventos.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" aria-hidden />}
              <span className={`grid size-7 shrink-0 place-items-center rounded-full ${estilo.clase}`}>{estilo.icono}</span>
              <div className="min-w-0 flex-1 pt-1 text-sm text-muted">
                <p>
                  <span className="font-semibold text-foreground">{estilo.texto}</span>
                  {e.autor && ` por ${nombreCompleto(e.autor)}`} · {formatFechaHora(e.created_at)}
                </p>
                {e.tipo === "editada" && e.detalle && <Cambios detalle={e.detalle} />}
                {e.tipo === "terminada" && <p className="mt-0.5">{duracion(cargada, e.created_at)} desde que se cargó</p>}
                {e.tipo === "terminada" && !arriba && typeof e.detalle?.nota === "string" && (
                  <p className="mt-0.5 break-words text-foreground">Nota: “{e.detalle.nota}”</p>
                )}
                {e.tipo === "fuera_de_alcance" && !arriba && typeof e.detalle?.motivo === "string" && (
                  <p className="mt-0.5 break-words text-foreground">Motivo: “{e.detalle.motivo}”</p>
                )}
                {e.tipo === "reabierta" && typeof e.detalle?.motivo === "string" && (
                  <p className="mt-0.5 break-words text-foreground">Motivo: “{e.detalle.motivo}”</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
