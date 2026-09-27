"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { logout } from "@/app/login/actions";
import { ROL_LABEL, type Rol } from "@/lib/usuarios";
import { IconoEscuela, IconoGente, IconoInicio, IconoMas, IconoSalir, IconoTareas } from "./iconos";

type UsuarioShell = { nombre: string; apellido: string; email: string; rol: Rol | null };

const ShellContext = createContext<{ usuario: UsuarioShell } | null>(null);

// Pantallas donde se esconde la barra de abajo (formularios con sus propios botones)
const SIN_BARRA = ["/ordenes/nueva"];

// Estructura de las pantallas con sesion: contenido + barra de navegacion abajo
// (estilo apps de celular). Escuelas, Usuarios y Salir estan en el menu del avatar.
export function Shell({
  usuario,
  pendientes,
  children,
}: {
  usuario: UsuarioShell;
  pendientes: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const conBarra = !SIN_BARRA.includes(pathname);

  return (
    <ShellContext.Provider value={{ usuario }}>
      <div className="flex min-h-dvh flex-col">{children}</div>
      {conBarra && <BarraInferior rol={usuario.rol} pendientes={pendientes} pathname={pathname} />}
    </ShellContext.Provider>
  );
}

function BarraInferior({ rol, pendientes, pathname }: { rol: Rol | null; pendientes: number; pathname: string }) {
  if (!rol) return null;
  const puedeCrear = rol === "admin" || rol === "inspector";
  const enInicio = pathname === "/" || pathname.startsWith("/escuelas/");
  const enOrdenes = pathname === "/ordenes" || /^\/ordenes\/\d+/.test(pathname);

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className={`mx-auto grid h-16 max-w-md items-center ${puedeCrear ? "grid-cols-3" : "grid-cols-2"}`}>
        <Tab href="/" texto="Inicio" activo={enInicio} icono={<IconoInicio className="size-6" />} />

        {puedeCrear && (
          <Link
            href="/ordenes/nueva"
            aria-label="Nueva orden"
            className="mx-auto -mt-7 flex flex-col items-center gap-1 text-[11.5px] font-semibold text-primary"
          >
            <span className="grid size-14 place-items-center rounded-full bg-primary text-white shadow-alta ring-4 ring-surface transition-transform active:scale-95">
              <IconoMas className="size-7" />
            </span>
            Nueva orden
          </Link>
        )}

        <Tab
          href="/ordenes"
          texto="Órdenes"
          activo={enOrdenes}
          icono={<IconoTareas className="size-6" />}
          contador={pendientes}
        />
      </div>
    </nav>
  );
}

function Tab({
  href,
  texto,
  activo,
  icono,
  contador,
}: {
  href: string;
  texto: string;
  activo: boolean;
  icono: React.ReactNode;
  contador?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`flex h-full flex-col items-center justify-center gap-1 text-[11.5px] font-semibold transition-colors ${
        activo ? "text-primary" : "text-muted"
      }`}
    >
      <span className="relative">
        {icono}
        {!!contador && (
          <span className="absolute -right-3 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10.5px] font-bold text-white tabular-nums">
            {contador > 99 ? "99+" : contador}
          </span>
        )}
      </span>
      {texto}
    </Link>
  );
}

// Avatar del encabezado: abre el menu con el usuario, la administracion y Salir
export function MenuUsuario() {
  const ctx = useContext(ShellContext);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => !caja.current?.contains(e.target as Node) && setAbierto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  if (!ctx) return null;
  const { usuario } = ctx;
  const iniciales = `${usuario.nombre[0] ?? ""}${usuario.apellido[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Mi cuenta"
        aria-expanded={abierto}
        className="avatar size-10 ring-2 ring-surface transition-shadow hover:ring-primary/30"
      >
        {iniciales}
      </button>

      {abierto && (
        <div className="tarjeta absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden shadow-alta">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate font-semibold">
              {usuario.nombre ? `${usuario.nombre} ${usuario.apellido}` : usuario.email}
            </p>
            <p className="truncate text-[13px] text-muted">{usuario.rol ? ROL_LABEL[usuario.rol] : "Sin acceso"}</p>
          </div>
          {usuario.rol === "admin" && (
            <div className="border-b border-border py-1">
              <ItemMenu href="/admin/escuelas" icono={<IconoEscuela />} texto="Escuelas" onClick={() => setAbierto(false)} />
              <ItemMenu href="/admin/usuarios" icono={<IconoGente />} texto="Usuarios" onClick={() => setAbierto(false)} />
            </div>
          )}
          <form action={logout} className="py-1">
            <button type="submit" className="flex min-h-11 w-full items-center gap-3 px-4 font-medium text-danger hover:bg-fila-hover">
              <IconoSalir />
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ItemMenu({
  href,
  icono,
  texto,
  onClick,
}: {
  href: string;
  icono: React.ReactNode;
  texto: string;
  onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex min-h-11 items-center gap-3 px-4 font-medium hover:bg-fila-hover">
      <span className="text-muted">{icono}</span>
      {texto}
    </Link>
  );
}
