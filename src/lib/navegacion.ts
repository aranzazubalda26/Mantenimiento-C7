// Regla del boton "volver" (ver components/volver.tsx):
//   1. Si se sabe de donde vino el usuario, se vuelve ahi. Los links a una pantalla de
//      detalle llevan ese origen en ?volver=/ruta (ver `conVolver`).
//   2. Si no se sabe (link compartido, recien creada), se vuelve a la pantalla "padre":
//      orden -> su escuela, escuela -> inicio.

// "/ordenes/12" + origen "/ordenes?ver=todas" -> "/ordenes/12?volver=%2Fordenes%3Fver%3Dtodas"
export function conVolver(href: string, origen: string) {
  return `${href}${href.includes("?") ? "&" : "?"}volver=${encodeURIComponent(origen)}`;
}

// Solo rutas internas de la app (evita que un link arme redirecciones a otros sitios)
export function volverSeguro(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return null;
  return valor;
}

// Arma "/ruta?a=1&b=2" con los parametros que tengan valor
export function rutaCon(ruta: string, params: Record<string, string | null | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const texto = qs.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}

// Agrega (o quita, con null) parametros a una ruta que ya puede tener los suyos:
// conParams("/ordenes?ver=todas", { hecha: "12" }) -> "/ordenes?ver=todas&hecha=12"
export function conParams(href: string, params: Record<string, string | null>) {
  const [ruta, query = ""] = href.split("?");
  const qs = new URLSearchParams(query);
  for (const [k, v] of Object.entries(params)) {
    if (v === null) qs.delete(k);
    else qs.set(k, v);
  }
  const texto = qs.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}

// Ciudad de las escuelas: se suma a la direccion para que el mapa no la busque en otro lado
const CIUDAD_ESCUELAS = "Ciudad Autónoma de Buenos Aires";

// "Cómo llegar": abre Google Maps (la app en el celular) con la direccion de la escuela
export function linkMapa(direccion: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${direccion}, ${CIUDAD_ESCUELAS}`)}`;
}
