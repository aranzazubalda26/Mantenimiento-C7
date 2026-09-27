import Link from "next/link";
import { IconoAtras } from "./iconos";

// Boton "volver" de todas las pantallas. Regla de navegacion de la app:
// se vuelve SIEMPRE a la pantalla de la que depende esta (su "padre"),
// sin importar por donde se entro. Asi el boton es predecible.
//   Orden   -> su escuela      (/escuelas/[id])
//   Escuela -> Inicio          (/)
// Las pantallas del menu (Inicio, Ordenes, Escuelas, Usuarios) no llevan "volver".
// Al sumar una pantalla nueva: usar este componente apuntando a su padre.
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
