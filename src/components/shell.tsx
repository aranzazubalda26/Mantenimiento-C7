"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { logout } from "@/app/login/actions";
import { ROL_LABEL, type Rol } from "@/lib/usuarios";
import { IconoEscuela, IconoGente, IconoInicio, IconoLlave, IconoMas, IconoSalir, IconoTareas } from "./iconos";

type UsuarioShell = { nombre: string; apellido: string; email: string; rol: Rol | null };

const ShellContext = createContext<{ usuario: UsuarioShell } | null>(null);

// Pantallas donde se esconde la barra de abajo (formularios con sus propios botones)
const SIN_BARRA = ["/ordenes/nueva"];

// Estructura de las pantallas con sesion.
// Celular: barra de navegacion abajo (estilo app) + menu en el avatar del encabezado.
// PC (desde 900px): la barra lateral fija de siempre.
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
      <div className="min-h-dvh pc:grid pc:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-border bg-surface pc:block">
          <Lateral usuario={usuario} pendientes={pendientes} pathname={pathname} />
        </aside>
        <div className="flex min-h-dvh min-w-0 flex-col">{children}</div>
      </div>
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
      className="fixed inset-x-0 bottom-0 z-30 pc:hidden border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
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

// Avatar del encabezado (solo celular; en PC esta la barra lateral):
// abre el menu con el usuario, la administracion y Salir
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

  return (
    <div ref={caja} className="relative pc:hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Mi cuenta"
        aria-expanded={abierto}
        className="avatar size-10 ring-2 ring-surface transition-shadow hover:ring-primary/30"
      >
        {iniciales(usuario)}
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

// ---------------------------------------------------------------------------
// PC: barra lateral fija (la vista de siempre)

type Item = {
  href: string;
  label: string;
  icono: React.ReactNode;
  roles: Rol[];
  contador?: boolean;
  activa: (pathname: string) => boolean; // en que pantallas queda marcada
};
type Seccion = { titulo: string; items: Item[] };

// Menu de PC segun rol. Para sumar una pantalla nueva, agregarla aca.
const SECCIONES: Seccion[] = [
  {
    titulo: "Órdenes",
    items: [
      { href: "/", label: "Inicio", icono: <IconoInicio />, roles: ["admin", "supervisor", "inspector"], activa: (p) => p === "/" || p.startsWith("/escuelas/") },
      { href: "/ordenes", label: "Órdenes", icono: <IconoTareas />, roles: ["admin", "supervisor", "inspector"], contador: true, activa: (p) => p === "/ordenes" || /^\/ordenes\/\d+/.test(p) },
      { href: "/ordenes/nueva", label: "Nueva orden", icono: <IconoMas />, roles: ["admin", "inspector"], activa: (p) => p === "/ordenes/nueva" },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { href: "/admin/escuelas", label: "Escuelas", icono: <IconoEscuela />, roles: ["admin"], activa: (p) => p.startsWith("/admin/escuelas") },
      { href: "/admin/usuarios", label: "Usuarios", icono: <IconoGente />, roles: ["admin"], activa: (p) => p.startsWith("/admin/usuarios") },
    ],
  },
];

function Lateral({ usuario, pendientes, pathname }: { usuario: UsuarioShell; pendientes: number; pathname: string }) {
  const rol = usuario.rol;
  const secciones = SECCIONES.map((s) => ({ ...s, items: s.items.filter((i) => rol && i.roles.includes(rol)) })).filter(
    (s) => s.items.length > 0,
  );

  return (
    <nav aria-label="Menú principal" className="flex min-h-full flex-col gap-6 px-3.5 pb-4 pt-5">
      <div className="flex items-center gap-2.5 px-2 text-[17px] font-bold tracking-[-0.01em]">
        <span className="grid size-8 place-items-center rounded-[9px] bg-primary text-white">
          <IconoLlave className="size-[18px]" />
        </span>
        Mantenimiento C7
      </div>

      {secciones.map((s) => (
        <div key={s.titulo}>
          <p className="px-2.5 pb-1.5 text-xs font-semibold text-muted">{s.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {s.items.map((item) => {
              const activo = item.activa(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={activo ? "page" : undefined}
                    className={`flex min-h-[42px] items-center gap-3 rounded-lg px-2.5 font-medium transition-colors ${
                      activo ? "bg-primary-soft font-semibold text-primary" : "text-muted hover:bg-background hover:text-foreground"
                    }`}
                  >
                    {item.icono}
                    {item.label}
                    {item.contador && pendientes > 0 && (
                      <span
                        title="Órdenes pendientes"
                        className={`ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full px-[7px] text-xs font-semibold ${
                          activo ? "bg-white text-primary" : "bg-background text-muted"
                        }`}
                      >
                        {pendientes}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex items-center gap-3 rounded-xl border border-border p-2.5">
          <span className="avatar">{iniciales(usuario)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {usuario.nombre ? `${usuario.nombre} ${usuario.apellido}` : usuario.email}
            </p>
            <p className="truncate text-[13px] text-muted">{rol ? ROL_LABEL[rol] : "Sin acceso"}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-[13px] font-medium text-muted hover:border-muted hover:text-foreground"
          >
            <IconoSalir className="size-4" />
            Salir
          </button>
        </form>
      </div>
    </nav>
  );
}

function iniciales(u: UsuarioShell) {
  return `${u.nombre[0] ?? ""}${u.apellido[0] ?? ""}`.toUpperCase() || "?";
}
