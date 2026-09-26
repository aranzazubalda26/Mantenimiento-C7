const TZ = "America/Argentina/Buenos_Aires";

// Fecha de hoy en Argentina como YYYY-MM-DD (para inputs type="date")
export function hoyISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// "2026-09-26" -> "26/09/2026" (sin pasar por Date para no correr el dia por zona horaria)
export function formatFecha(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function formatFechaHora(ts: string) {
  return new Date(ts).toLocaleString("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
