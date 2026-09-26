const TZ = "America/Argentina/Buenos_Aires";

// Fecha de hoy en Argentina como YYYY-MM-DD (para inputs type="date")
export function hoyISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// "Sábado 26 de septiembre" (para el encabezado)
export function fechaLarga() {
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(new Date());
  const valor = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = valor("weekday");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${valor("day")} de ${valor("month")}`;
}

// "Buen día" / "Buenas tardes" / "Buenas noches" segun la hora de Argentina
export function saludo() {
  const hora = Number(
    new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }),
  );
  return hora < 13 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches";
}

// "2026-09-26" -> "Hoy" / "Ayer" / "Mañana" / "Lun 21"
export function fechaCorta(iso: string) {
  const hoy = hoyISO();
  const d = new Date(`${iso}T12:00:00Z`);
  const delta = Math.round((d.getTime() - new Date(`${hoy}T12:00:00Z`).getTime()) / 864e5);
  if (delta === 0) return "Hoy";
  if (delta === -1) return "Ayer";
  if (delta === 1) return "Mañana";
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const base = `${dias[d.getUTCDay()]} ${d.getUTCDate()}`;
  // Fuera de la semana cercana, mostrar tambien el mes
  return Math.abs(delta) > 6 ? `${base}/${d.getUTCMonth() + 1}` : base;
}

// "2026-09-26" -> "26/09/2026" (sin pasar por Date para no correr el dia por zona horaria)
export function formatFecha(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// "16:46"
export function formatHora(ts: string) {
  return new Date(ts).toLocaleTimeString("es-AR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
