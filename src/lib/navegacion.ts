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
