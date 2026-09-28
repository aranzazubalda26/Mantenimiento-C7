import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppHeader, Pagina } from "@/components/app-header";
import { getUsuario } from "@/lib/auth";
import { hoyISO } from "@/lib/fechas";
import { volverSeguro } from "@/lib/navegacion";
import { numeroOrden, type Estado, type Prioridad } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/server";
import { NuevaOrdenForm } from "../../nueva/nueva-orden-form";

export const metadata: Metadata = { title: "Editar orden · Mantenimiento C7" };

type Orden = {
  id: number;
  fecha: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  ubicacion: string;
  escuelas: { id: number; direccion: string; nombre: string | null; inspector_id: string } | null;
  orden_fotos: { id: number; path: string }[];
};

export default async function EditarOrdenPage(props: PageProps<"/ordenes/[id]/editar">) {
  const usuario = await getUsuario();
  const { id } = await props.params;
  const { volver } = await props.searchParams;
  if (!/^\d+$/.test(id)) notFound();

  const supabase = await createClient();
  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select(
      "id, fecha, descripcion, prioridad, estado, ubicacion, escuelas(id, direccion, nombre, inspector_id), orden_fotos(id, path)",
    )
    .eq("id", Number(id))
    // Solo las fotos del problema: las del trabajo terminado no se editan
    .eq("orden_fotos.tipo", "problema")
    .order("id", { referencedTable: "orden_fotos" })
    .maybeSingle<Orden>();
  if (!orden?.escuelas) notFound();

  // Guardar o cancelar vuelve al detalle de la orden (que trae su propio ?volver)
  const detalle = volverSeguro(volver) ?? `/ordenes/${orden.id}`;

  // Solo pendiente, y admin o inspector/a de la escuela (la base tambien lo exige)
  const puedeEditar =
    orden.estado === "solicitada" &&
    (usuario.rol === "admin" || (usuario.rol === "inspector" && orden.escuelas.inspector_id === usuario.id));
  if (!puedeEditar) redirect(detalle);

  const { data: urls } = orden.orden_fotos.length
    ? await supabase.storage.from("ordenes-fotos").createSignedUrls(orden.orden_fotos.map((f) => f.path), 60 * 60)
    : { data: [] };

  const { id: escuelaId, direccion, nombre } = orden.escuelas;

  return (
    <>
      <AppHeader titulo={`Editar orden ${numeroOrden(orden.id)}`} subtitulo={direccion} />
      <Pagina>
        <div className="w-full max-w-[720px]">
          <NuevaOrdenForm
            escuelas={[{ id: escuelaId, direccion, nombre }]}
            usuarioId={usuario.id}
            hoy={hoyISO()}
            esAdmin={usuario.rol === "admin"}
            escuelaInicial={escuelaId}
            edicion={{
              id: orden.id,
              fecha: orden.fecha,
              descripcion: orden.descripcion,
              prioridad: orden.prioridad,
              ubicacion: orden.ubicacion,
              fotos: orden.orden_fotos.map((f) => ({
                id: f.id,
                url: urls?.find((u) => u.path === f.path)?.signedUrl ?? null,
              })),
              volverHref: detalle,
            }}
          />
        </div>
      </Pagina>
    </>
  );
}
