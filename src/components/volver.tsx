import Link from "next/link";
import { IconoAtras } from "./iconos";

// Boton "volver" de todas las pantallas de detalle. Regla de la app (lib/navegacion.ts):
//   - Vuelve a donde estaba el usuario si se sabe (los links traen ?volver=/ruta):
//     "Volver a órdenes", "Volver a Primera Junta 3445", "Volver a inicio".
//   - Si no se sabe, vuelve a la pantalla de la que depende: orden -> su escuela,
//     escuela -> inicio.
// Las pantallas del menu (Inicio, Ordenes, Escuelas, Usuarios) no llevan "volver".
// Al sumar una pantalla de detalle: linkearla con `conVolver` y usar este componente.
export function Volver({ href, a }: { href: string; a: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 max-w-full items-center gap-1.5 self-start font-medium text-muted hover:text-foreground"
    >
      <IconoAtras className="size-[18px]" />
      <span className="truncate">Volver a {a}</span>
    </Link>
  );
}
