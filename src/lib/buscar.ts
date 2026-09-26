// Sin acentos ni mayusculas: "Técnica" = "tecnica"
export function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// true si cada palabra buscada aparece en el texto, en cualquier orden.
// "tecnica 12" encuentra "Escuela Técnica N° 12".
export function coincide(texto: string, busqueda: string) {
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return true;
  const t = normalizar(texto);
  return palabras.every((p) => t.includes(p));
}
