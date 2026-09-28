const TZ = "America/Argentina/Buenos_Aires";

// Fecha de hoy en Argentina como YYYY-MM-DD (para inputs type="date")
export function hoyISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// Fecha de hace `dias` dias en Argentina como YYYY-MM-DD (0 = hoy)
export function haceDiasISO(dias: number) {
  return new Date(Date.now() - dias * 864e5).toLocaleDateString("en-CA", { timeZone: TZ });
}

// Momento de hace `dias` dias (ISO, para comparar con columnas timestamptz)
export function momentoHaceDias(dias: number) {
  return new Date(Date.now() - dias * 864e5).toISOString();
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

// Fecha (dd/mm/aaaa) de un momento, en hora de Argentina
export function formatFechaDe(ts: string) {
  return new Date(ts).toLocaleDateString("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Tiempo entre dos momentos: "15 min", "3 h 20 min", "2 días 3 h"
export function duracion(desde: string, hasta: string) {
  const min = Math.max(0, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60000));
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "día" : "días"}${h % 24 ? ` ${h % 24} h` : ""}`;
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

// "26/09/2026 a las 18:22"
export function formatFechaHora(ts: string) {
  return `${formatFechaDe(ts)} a las ${formatHora(ts)}`;
}

// Antiguedad de un momento: "hoy", "ayer", "hace 3 días" (dias calendario en Argentina)
export function hace(ts: string) {
  const dia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  const delta = Math.round(
    (new Date(`${dia(new Date())}T12:00:00Z`).getTime() - new Date(`${dia(new Date(ts))}T12:00:00Z`).getTime()) / 864e5,
  );
  if (delta <= 0) return "hoy";
  if (delta === 1) return "ayer";
  return `hace ${delta} días`;
}
