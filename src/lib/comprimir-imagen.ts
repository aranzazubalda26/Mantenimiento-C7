// Achica la foto en el celular antes de subirla (menos datos moviles y subida mas rapida).
// Una foto de 4-8 MB queda en ~300-600 KB.
const MAX_LADO = 1600;
const CALIDAD = 0.8;
const TIPOS_DIRECTOS = ["image/jpeg", "image/png", "image/webp"];

export async function comprimirImagen(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // El navegador no puede decodificarla (ej. HEIC fuera de Safari): subir original si se puede
    if (TIPOS_DIRECTOS.includes(file.type)) return file;
    throw new Error(`No se pudo leer la foto "${file.name}". Probá con otra.`);
  }

  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error(`No se pudo procesar la foto "${file.name}".`)),
      "image/jpeg",
      CALIDAD,
    ),
  );
}
