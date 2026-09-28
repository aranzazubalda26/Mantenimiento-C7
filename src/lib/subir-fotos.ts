import { comprimirImagen } from "@/lib/comprimir-imagen";
import { BUCKET_FOTOS } from "@/lib/ordenes";
import { createClient } from "@/lib/supabase/client";

// Subida de fotos desde el navegador al bucket privado. Ruta: <usuario>/<uuid>.<ext>
// (las policies de Storage solo dejan subir a la carpeta propia).

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function idUnico() {
  // randomUUID solo existe en contexto seguro (https/localhost); en el celular por la red local no
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Comprime y sube una por una. Si alguna falla, borra las que ya subio y tira
// un error pensado para el usuario. Devuelve las rutas subidas.
export async function subirFotos(
  archivos: File[],
  usuarioId: string,
  alAvanzar?: (subidas: number, total: number) => void,
): Promise<string[]> {
  const supabase = createClient();
  const subidas: string[] = [];
  try {
    for (const [i, archivo] of archivos.entries()) {
      alAvanzar?.(i + 1, archivos.length);
      const blob = await comprimirImagen(archivo);
      const path = `${usuarioId}/${idUnico()}.${EXTENSION[blob.type] ?? "jpg"}`;
      const { error } = await supabase.storage
        .from(BUCKET_FOTOS)
        .upload(path, blob, { contentType: blob.type || "image/jpeg" });
      if (error) {
        console.error(error);
        throw new Error("No se pudo subir una foto. Revisá la conexión y probá de nuevo.");
      }
      subidas.push(path);
    }
    return subidas;
  } catch (e) {
    await borrarSubidas(subidas);
    throw e;
  }
}

// No dejar archivos huerfanos en Storage si despues no se guardo nada
export async function borrarSubidas(paths: string[]) {
  if (paths.length) await createClient().storage.from(BUCKET_FOTOS).remove(paths);
}
